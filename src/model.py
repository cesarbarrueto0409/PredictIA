"""Role B — Model. LightGBM global model + naive baseline (CONTRACTS.md 4.2-4.4).

v0: working baseline. TODO(Role B): tune hyperparameters, try tweedie objective,
compare against seasonal-naive, per-family error analysis.
"""
import lightgbm as lgb
import numpy as np
import pandas as pd

from src import schemas
from src.config import CATEGORICAL_COLS, FEATURE_COLS, RANDOM_SEED, TARGET, VALID_DAYS

PARAMS = dict(
    objective="regression", learning_rate=0.05, num_leaves=127, min_child_samples=50,
    feature_fraction=0.8, bagging_fraction=0.8, bagging_freq=1, n_estimators=600,
    random_state=RANDOM_SEED, verbose=-1,
)


def _X(df: pd.DataFrame) -> pd.DataFrame:
    X = df[FEATURE_COLS].copy()
    for c in CATEGORICAL_COLS:
        X[c] = X[c].astype("category")
    return X


def split_train_valid(features: pd.DataFrame, valid_days: int = VALID_DAYS):
    cutoff = features["date"].max() - pd.Timedelta(days=valid_days)
    return features[features["date"] <= cutoff].copy(), features[features["date"] > cutoff].copy()


def train_model(train_df: pd.DataFrame):
    model = lgb.LGBMRegressor(**PARAMS)
    # Train on log1p(sales) so the loss approximates RMSLE.
    model.fit(_X(train_df), np.log1p(train_df[TARGET]))
    return model


def predict(model, df: pd.DataFrame) -> np.ndarray:
    return np.clip(np.expm1(model.predict(_X(df))), 0, None)


def _rmsle(y, p) -> float:
    return float(np.sqrt(np.mean((np.log1p(p) - np.log1p(y)) ** 2)))


def _mape(y, p) -> float:
    m = y > 0
    return float(np.mean(np.abs(p[m] - y[m]) / y[m]) * 100) if m.any() else float("nan")


def evaluate(predictions: pd.DataFrame) -> dict:
    y = predictions["actual"].to_numpy()
    return schemas.validate_keys({
        "rmsle": _rmsle(y, predictions["pred"].to_numpy()),
        "mape": _mape(y, predictions["pred"].to_numpy()),
        "baseline_rmsle": _rmsle(y, predictions["baseline_pred"].to_numpy()),
        "baseline_mape": _mape(y, predictions["baseline_pred"].to_numpy()),
    }, schemas.METRIC_KEYS, "metrics")


def metrics_by(predictions: pd.DataFrame, by: str) -> pd.DataFrame:
    rows = [{by: k, "rmsle": _rmsle(g["actual"].to_numpy(), g["pred"].to_numpy()),
             "mape": _mape(g["actual"].to_numpy(), g["pred"].to_numpy())}
            for k, g in predictions.groupby(by)]
    return pd.DataFrame(rows).sort_values("rmsle", ascending=False).reset_index(drop=True)


def feature_importance(model) -> pd.DataFrame:
    imp = pd.DataFrame({"feature": model.feature_name_,
                        "importance": model.booster_.feature_importance("gain")})
    return imp.sort_values("importance", ascending=False).reset_index(drop=True)


def run_model(features: pd.DataFrame):
    train_df, valid_df = split_train_valid(features)
    model = train_model(train_df)
    out = valid_df[["date", "store_nbr", "family", "onpromotion", "is_holiday"]].copy()
    out["actual"] = valid_df[TARGET].to_numpy()
    out["pred"] = predict(model, valid_df)
    out["baseline_pred"] = valid_df["sales_lag_14"].fillna(0).clip(lower=0).to_numpy()
    out = schemas.validate(out.reset_index(drop=True), "predictions")
    return out, evaluate(out), model


if __name__ == "__main__":
    from src.mocks import mock_features
    preds, metrics, model = run_model(mock_features(days=200))
    print(metrics)
    print(metrics_by(preds, "family"))
    print("model.py OK")
