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
    weekly = 1 + 0.3 * np.sin(2 * np.pi * df["date"].dt.day_of_week / 7)
    df["onpromotion"] = rng.poisson(2, len(df))
    df["sales"] = (np.tile(base, days) * weekly * (1 + 0.05 * df["onpromotion"])
                   * rng.lognormal(0, 0.15, len(df))).round(2)
    df.insert(0, "id", range(len(df)))
    return df


def mock_stores() -> pd.DataFrame:
    return pd.DataFrame({"store_nbr": STORES, "city": ["Quito", "Guayaquil", "Cuenca"],
                         "state": ["Pichincha", "Guayas", "Azuay"], "type": ["A", "B", "D"],
                         "cluster": [1, 2, 3]})


def mock_holidays() -> pd.DataFrame:
    return pd.DataFrame({
        "date": pd.to_datetime(["2017-05-01", "2017-05-24", "2017-07-25", "2017-05-14"]),
        "type": ["Holiday", "Holiday", "Holiday", "Event"],
        "locale": ["National", "National", "Local", "National"],
        "locale_name": ["Ecuador", "Ecuador", "Guayaquil", "Ecuador"],
        "description": ["Dia del Trabajo", "Batalla de Pichincha", "Fundacion de Guayaquil", "Dia de la Madre"],
        "transferred": [False, False, False, False],
    })


def mock_features(days: int = 120, seed: int = 0) -> pd.DataFrame:
    # Built with the real feature builder so mocks always match FEATURE_COLS.
    from src.data import build_features
    return build_features(mock_raw_train(days, seed), mock_stores(), mock_holidays())


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
