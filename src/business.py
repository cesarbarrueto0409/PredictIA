"""Role C — Business. Promo/holiday effects, order recommendation, KPIs (CONTRACTS.md 4.5-4.6).

v0: working baseline. TODO(Role C): money impact (unit price assumptions),
better safety stock, promo-aware recommendation ("if you run a promo, order +X%").
"""
import math

import numpy as np
import pandas as pd
from statistics import NormalDist

from src import schemas
from src.config import (HORIZON_DAYS, PERISHABLE_FAMILIES, SERVICE_LEVEL_DEFAULT,
                        SERVICE_LEVEL_PERISHABLE)


def _effect(features: pd.DataFrame, flag: pd.Series) -> pd.DataFrame:
    df = features.assign(_flag=flag.to_numpy())
    t = df.groupby(["family", "_flag"])["sales"].mean().unstack("_flag")
    out = pd.DataFrame({
        "family": t.index,
        "avg_with": t.get(True, pd.Series(np.nan, index=t.index)).to_numpy(),
        "avg_without": t.get(False, pd.Series(np.nan, index=t.index)).to_numpy(),
    })
    out["lift_pct"] = (out["avg_with"] / out["avg_without"] - 1) * 100
    out = out.sort_values("lift_pct", ascending=False).reset_index(drop=True)
    return schemas.validate(out, "effects")


def promo_effect(features: pd.DataFrame) -> pd.DataFrame:
    return _effect(features, features["onpromotion"] > 0)


def holiday_effect(features: pd.DataFrame) -> pd.DataFrame:
    return _effect(features, features["is_holiday"] == 1)


def order_recommendation(predictions: pd.DataFrame, store_nbr: int, family: str) -> dict:
    s = predictions[(predictions["store_nbr"] == store_nbr) & (predictions["family"] == family)]
    perishable = family in PERISHABLE_FAMILIES
    level = SERVICE_LEVEL_PERISHABLE if perishable else SERVICE_LEVEL_DEFAULT
    horizon = int(s["date"].nunique()) or HORIZON_DAYS
    forecast = float(s["pred"].sum())
    resid_std = float((s["actual"] - s["pred"]).std(ddof=0)) if len(s) > 1 else 0.0
    safety = NormalDist().inv_cdf(level) * resid_std * math.sqrt(horizon)
    units = int(math.ceil(max(forecast + safety, 0)))
    msg = (f"Order {units:,} units of {family} for store {store_nbr} for the next {horizon} days "
           f"({forecast:,.0f} forecast + {safety:,.0f} safety stock, {level:.0%} service level"
           f"{', perishable' if perishable else ''}).")
    return schemas.validate_keys({
        "store_nbr": int(store_nbr), "family": family, "horizon_days": horizon,
        "forecast_units": forecast, "safety_stock": float(safety), "recommended_units": units,
        "is_perishable": perishable, "service_level": level, "message": msg,
    }, schemas.RECOMMENDATION_KEYS, "recommendation")


def business_kpis(predictions: pd.DataFrame) -> dict:
    a = predictions["actual"]
    per = predictions["family"].isin(PERISHABLE_FAMILIES)
    out = {}
    for name, col in (("model", "pred"), ("baseline", "baseline_pred")):
        p = predictions[col]
        out[f"stockout_units_{name}"] = float((a - p).clip(lower=0).sum())
        out[f"waste_units_{name}"] = float((p - a).clip(lower=0)[per].sum())
    return schemas.validate_keys(out, schemas.KPI_KEYS, "kpis")


if __name__ == "__main__":
    from src.mocks import mock_features, mock_predictions
    f, p = mock_features(), mock_predictions()
    print(promo_effect(f), holiday_effect(f), sep="\n")
    print(order_recommendation(p, 1, "DAIRY")["message"])
    print(business_kpis(p))
    print("business.py OK")
