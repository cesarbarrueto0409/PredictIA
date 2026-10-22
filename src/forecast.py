"""Backend training bundle for the API: point + quantile models, validation and future forecasts.

A `Bundle` holds only DataFrames (no model objects), so it is cheap to pickle and every
API response can be computed from it without retraining.
"""
import pickle
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable

import lightgbm as lgb
import numpy as np
import pandas as pd

from src import data, model
from src.config import (CATEGORICAL_COLS, FEATURE_COLS, HORIZON_DAYS, PERISHABLE_FAMILIES,
                        TARGET)

QUANTILE_PARAMS = {**model.PARAMS, "objective": "quantile", "n_estimators": 300, "learning_rate": 0.08}
MAX_VALIDATION_DAYS = 28
BASELINE_NAME = "same_weekday_2_weeks_ago"  # sales_lag_14: same weekday, respects the 14-day horizon


@dataclass
class Bundle:
    model_id: str
    dataset_id: str
    created_at: str
    horizon_days: int
    validation_days: int
    quantiles: tuple[float, float]       # (low, high), e.g. (0.1, 0.9)
    valid: pd.DataFrame                  # date, store_nbr, family, onpromotion, is_holiday, is_perishable,
                                         # actual, pred, p10, p90, baseline_pred
    future: pd.DataFrame                 # date, store_nbr, family, onpromotion, is_perishable, pred, p10, p90
    baseline_sigma: pd.Series            # daily residual std of the baseline, index (store_nbr, family)
    importance: pd.DataFrame
    train_seconds: float = 0.0
    extra: dict = field(default_factory=dict)


def _X(df: pd.DataFrame) -> pd.DataFrame:
    X = df[FEATURE_COLS].copy()
    for c in CATEGORICAL_COLS:
        X[c] = X[c].astype("category")
    return X


def _fit_quantile(train_df: pd.DataFrame, alpha: float):
    m = lgb.LGBMRegressor(**{**QUANTILE_PARAMS, "alpha": alpha})
    m.fit(_X(train_df), np.log1p(train_df[TARGET]))  # quantiles are preserved by log1p (monotone)
    return m


def _predict(m, df: pd.DataFrame) -> np.ndarray:
    return np.clip(np.expm1(m.predict(_X(df))), 0, None)


def _future_raw(train: pd.DataFrame, horizon_days: int) -> pd.DataFrame:
    """Raw rows for the days after the last date. Sales are placeholders (never used: all
    sales features are lagged >= HORIZON_DAYS). Promotions are unknown, so we assume the
    same promo as the same weekday 14 days earlier."""
    last = train["date"].max()
    dates = pd.date_range(last + pd.Timedelta(days=1), periods=horizon_days, freq="D")
    keys = train[["store_nbr", "family"]].drop_duplicates()
    fut = keys.merge(pd.DataFrame({"date": dates}), how="cross")
    prev = train.loc[train["date"] > last - pd.Timedelta(days=14), ["date", "store_nbr", "family", "onpromotion"]]
    prev = prev.assign(date=prev["date"] + pd.Timedelta(days=14))
    fut = fut.merge(prev, on=["date", "store_nbr", "family"], how="left")
    fut["onpromotion"] = fut["onpromotion"].fillna(0).astype(int)
    fut["sales"] = 0.0
    return fut


def train_bundle(train: pd.DataFrame, aux: dict | None = None, dataset_id: str = "ds_default",
                 horizon_days: int = HORIZON_DAYS, validation_days: int = 14,
                 quantiles: tuple[float, ...] = (0.1, 0.5, 0.9),
                 progress: Callable[[float, str], None] = lambda p, m: None) -> Bundle:
    if not 1 <= horizon_days <= HORIZON_DAYS:
        raise ValueError(f"horizon_days must be between 1 and {HORIZON_DAYS} (features are lagged {HORIZON_DAYS} days)")
    if not 7 <= validation_days <= MAX_VALIDATION_DAYS:
        raise ValueError(f"validation_days must be between 7 and {MAX_VALIDATION_DAYS}")
    q_lo, q_hi = min(quantiles), max(quantiles)
    if not 0 < q_lo < 0.5 < q_hi < 1:
        raise ValueError("quantiles must include one value < 0.5 and one > 0.5")

    t0 = time.time()
    aux = aux or {}
    train = train.assign(date=pd.to_datetime(train["date"]))
    last = train["date"].max()

    progress(0.05, "Building features")
    raw = pd.concat([train.drop(columns=[c for c in ("id",) if c in train.columns]),
                     _future_raw(train, horizon_days)], ignore_index=True)
    feats = data.build_features(raw, aux.get("stores"), aux.get("holidays"),
                                aux.get("transactions"), aux.get("oil"))
    hist, fut = feats[feats["date"] <= last], feats[feats["date"] > last]
    tr, va = model.split_train_valid(hist, validation_days)

    progress(0.30, "Training point model")
    m = model.train_model(tr)
    progress(0.55, f"Training quantile model p{int(q_lo * 100)}")
    m_lo = _fit_quantile(tr, q_lo)
    progress(0.75, f"Training quantile model p{int(q_hi * 100)}")
    m_hi = _fit_quantile(tr, q_hi)

    progress(0.90, "Forecasting validation window and future")

    def score(df: pd.DataFrame) -> pd.DataFrame:
        out = df[["date", "store_nbr", "family", "onpromotion", "is_holiday"]].copy()
        out["is_perishable"] = out["family"].isin(PERISHABLE_FAMILIES)
        out["pred"] = model.predict(m, df)
        out["p10"] = np.minimum(_predict(m_lo, df), out["pred"])
        out["p90"] = np.maximum(_predict(m_hi, df), out["pred"])
        return out.reset_index(drop=True)

    valid = score(va)
    valid["actual"] = va[TARGET].to_numpy()
    valid["baseline_pred"] = va["sales_lag_14"].fillna(0).clip(lower=0).to_numpy()
    future = score(fut).drop(columns="is_holiday")

    # Per series (not per family): a family-level std is dominated by big stores and would
    # over-buffer small ones, making the baseline look artificially safe.
    recent = tr[tr["date"] > tr["date"].max() - pd.Timedelta(days=28)]
    resid = recent[TARGET] - recent["sales_lag_14"].fillna(0)
    baseline_sigma = resid.groupby([recent["store_nbr"], recent["family"]]).std().fillna(0)

    now = datetime.now()
    b = Bundle(
        model_id=f"model_{now:%Y%m%d_%H%M%S}", dataset_id=dataset_id, created_at=now.isoformat(timespec="seconds"),
        horizon_days=horizon_days, validation_days=validation_days, quantiles=(q_lo, q_hi),
        valid=valid, future=future, baseline_sigma=baseline_sigma,
        importance=model.feature_importance(m), train_seconds=round(time.time() - t0, 1),
    )
    progress(1.0, "Done")
    return b


def save_bundle(b: Bundle, models_dir: Path) -> Path:
    models_dir.mkdir(parents=True, exist_ok=True)
    path = models_dir / f"{b.model_id}.pkl"
    with open(path, "wb") as fh:
        pickle.dump(b, fh)
    return path


def load_bundles(models_dir: Path) -> list[Bundle]:
    if not models_dir.exists():
        return []
    out = []
    for p in sorted(models_dir.glob("model_*.pkl")):
        try:
            with open(p, "rb") as fh:
                out.append(pickle.load(fh))
        except Exception:  # stale pickle from an older code version
            continue
    return out
