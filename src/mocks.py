"""Fake data that satisfies every schema, so roles can work in parallel."""
import numpy as np
import pandas as pd

from src import schemas
from src.config import VALID_DAYS

FAMILIES = ["DAIRY", "PRODUCE", "BEVERAGES", "GROCERY I", "CLEANING"]
STORES = [1, 2, 3]


def mock_raw_train(days: int = 120, seed: int = 0) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2017-04-01", periods=days, freq="D")
    idx = pd.MultiIndex.from_product([dates, STORES, FAMILIES], names=["date", "store_nbr", "family"])
    df = idx.to_frame(index=False)
    base = rng.uniform(20, 500, size=len(STORES) * len(FAMILIES))
    weekly = 1 + 0.3 * np.sin(2 * np.pi * df["date"].dt.dayofweek / 7)
    df["onpromotion"] = rng.poisson(2, len(df))
    df["sales"] = (np.tile(base, days) * weekly * (1 + 0.05 * df["onpromotion"])
                   * rng.lognormal(0, 0.15, len(df))).round(2)
    df.insert(0, "id", range(len(df)))
    return df


def mock_features(days: int = 120, seed: int = 0) -> pd.DataFrame:
    df = mock_raw_train(days, seed).drop(columns="id")
    df = df.sort_values(["store_nbr", "family", "date"]).reset_index(drop=True)
    df["dayofweek"] = df["date"].dt.dayofweek
    df["day"] = df["date"].dt.day
    df["month"] = df["date"].dt.month
    df["is_payday"] = ((df["day"] == 15) | df["date"].dt.is_month_end).astype(int)
    df["is_holiday"] = (df["date"].dt.strftime("%m-%d").isin(["05-01", "05-24"])).astype(int)
    df["city"] = df["store_nbr"].map({1: "Quito", 2: "Guayaquil", 3: "Cuenca"})
    df["store_type"] = df["store_nbr"].map({1: "A", 2: "B", 3: "D"})
    df["cluster"] = df["store_nbr"]
    g = df.groupby(["store_nbr", "family"])["sales"]
    for lag in (14, 21, 28):
        df[f"sales_lag_{lag}"] = g.shift(lag)
    for w in (7, 28):
        df[f"sales_roll_mean_{w}"] = g.transform(lambda s: s.shift(14).rolling(w).mean())
    return df


def mock_predictions(days: int = 120, seed: int = 0) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    f = mock_features(days, seed)
    v = f[f["date"] > f["date"].max() - pd.Timedelta(days=VALID_DAYS)].copy()
    v["actual"] = v["sales"]
    v["pred"] = (v["actual"] * rng.lognormal(0, 0.1, len(v))).clip(lower=0)
    v["baseline_pred"] = v["sales_lag_14"].fillna(0).clip(lower=0)
    cols = schemas.SCHEMAS["predictions"]
    return v[cols].reset_index(drop=True)


if __name__ == "__main__":
    schemas.validate(mock_raw_train(), "raw_train")
    schemas.validate(mock_features(), "features")
    schemas.validate(mock_predictions(), "predictions")
    print("mocks OK")
