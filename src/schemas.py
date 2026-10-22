"""Schema definitions and validation. Mirrors CONTRACTS.md section 4."""
import pandas as pd

SCHEMAS: dict[str, list[str]] = {
    "raw_train": ["date", "store_nbr", "family", "sales", "onpromotion"],
    "features": [
        "date", "store_nbr", "family", "sales", "onpromotion",
        "dayofweek", "day", "month", "is_payday", "is_holiday",
        "city", "store_type", "cluster",
        "sales_lag_14", "sales_lag_21", "sales_lag_28",
        "sales_roll_mean_7", "sales_roll_mean_28",
    ],
    "predictions": [
        "date", "store_nbr", "family", "onpromotion", "is_holiday",
        "actual", "pred", "baseline_pred",
    ],
    "feature_importance": ["feature", "importance"],
    "effects": ["family", "avg_with", "avg_without", "lift_pct"],
}

METRIC_KEYS = {"rmsle", "mape", "baseline_rmsle", "baseline_mape"}
RECOMMENDATION_KEYS = {
    "store_nbr", "family", "horizon_days", "forecast_units", "safety_stock",
    "recommended_units", "is_perishable", "service_level", "message",
}
KPI_KEYS = {
    "stockout_units_model", "waste_units_model",
    "stockout_units_baseline", "waste_units_baseline",
}


def validate(df: pd.DataFrame, name: str) -> pd.DataFrame:
    """Raise ValueError if df is missing required columns. Extra columns are allowed."""
    missing = [c for c in SCHEMAS[name] if c not in df.columns]
    if missing:
        raise ValueError(f"[{name}] missing columns: {missing}")
    if "date" in SCHEMAS[name] and not pd.api.types.is_datetime64_any_dtype(df["date"]):
        raise ValueError(f"[{name}] 'date' must be datetime64")
    for col in ("pred", "baseline_pred"):
        if col in SCHEMAS[name] and (df[col] < 0).any():
            raise ValueError(f"[{name}] '{col}' has negative values")
    return df


def validate_keys(d: dict, keys: set[str], name: str) -> dict:
    missing = keys - set(d)
    if missing:
        raise ValueError(f"[{name}] missing keys: {sorted(missing)}")
    return d
