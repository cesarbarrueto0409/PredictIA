"""Role A — Data. Loads raw CSVs and builds the `features` table (CONTRACTS.md 4.1).

v0: working baseline. TODO(Role A): improve holidays (transferred/bridge days),
add transactions/oil features, earthquake 2016-04-16 flag, etc.
"""
from pathlib import Path

import numpy as np
import pandas as pd

from src import schemas
from src.config import RAW_DIR, TRAIN_START


def load_raw(raw_dir: Path = RAW_DIR) -> dict[str, pd.DataFrame | None]:
    def read(name: str) -> pd.DataFrame | None:
        p = Path(raw_dir) / name
        if not p.exists():
            return None
        return pd.read_csv(p) if name == "stores.csv" else pd.read_csv(p, parse_dates=["date"])

    out = {
        "train": read("train.csv"),
        "stores": read("stores.csv"),
        "holidays": read("holidays_events.csv"),
        "transactions": read("transactions.csv"),
    }
    if out["train"] is None:
        raise FileNotFoundError(f"train.csv not found in {raw_dir}")
    return out


def _holiday_flag(df: pd.DataFrame, holidays: pd.DataFrame | None) -> pd.Series:
    if holidays is None:
        return pd.Series(0, index=df.index)
    h = holidays[holidays["transferred"].astype(str).str.lower() != "true"].copy()
    h["date"] = pd.to_datetime(h["date"])
    national = set(h.loc[h["locale"] == "National", "date"])
    flag = df["date"].isin(national)
    local = h[h["locale"].isin(["Regional", "Local"])][["date", "locale_name"]].drop_duplicates()
    for col in ("city", "state"):
        if col in df.columns:
            m = df[["date", col]].merge(local, left_on=["date", col], right_on=["date", "locale_name"],
                                        how="left", indicator=True)
            flag |= (m["_merge"] == "both").to_numpy()
    return flag.astype(int)


def build_features(train: pd.DataFrame, stores: pd.DataFrame | None = None,
                   holidays: pd.DataFrame | None = None,
                   transactions: pd.DataFrame | None = None) -> pd.DataFrame:
    df = train.copy()
    df["date"] = pd.to_datetime(df["date"])
    # Keep 28+14 extra days before TRAIN_START so lags are filled from day one.
    df = df[df["date"] >= pd.Timestamp(TRAIN_START) - pd.Timedelta(days=60)]
    df = df.drop(columns=[c for c in ("id",) if c in df.columns])
    df["sales"] = df["sales"].clip(lower=0).astype(float)
    df["onpromotion"] = df["onpromotion"].fillna(0).astype(int)

    if stores is not None:
        s = stores.rename(columns={"type": "store_type"})
        df = df.merge(s[["store_nbr", "city", "state", "store_type", "cluster"]], on="store_nbr", how="left")
    for col, default in (("city", "UNKNOWN"), ("state", "UNKNOWN"), ("store_type", "UNKNOWN"), ("cluster", 0)):
        if col not in df.columns:
            df[col] = default
        df[col] = df[col].fillna(default)
    df["cluster"] = df["cluster"].astype(int)

    df["dayofweek"] = df["date"].dt.dayofweek
    df["day"] = df["date"].dt.day
    df["month"] = df["date"].dt.month
    df["is_payday"] = ((df["day"] == 15) | df["date"].dt.is_month_end).astype(int)
    df["is_holiday"] = _holiday_flag(df, holidays).to_numpy()

    df = df.sort_values(["store_nbr", "family", "date"]).reset_index(drop=True)
    g = df.groupby(["store_nbr", "family"], sort=False)["sales"]
    for lag in (14, 21, 28):
        df[f"sales_lag_{lag}"] = g.shift(lag)
    shifted = g.shift(14)
    sg = shifted.groupby([df["store_nbr"], df["family"]], sort=False)
    for w in (7, 28):
        df[f"sales_roll_mean_{w}"] = sg.transform(lambda s: s.rolling(w, min_periods=1).mean())

    df = df[df["date"] >= pd.Timestamp(TRAIN_START)].reset_index(drop=True)
    return schemas.validate(df, "features")


if __name__ == "__main__":
    from src.mocks import mock_raw_train
    f = build_features(mock_raw_train(days=200))
    print(f.head(), f.shape, sep="\n")
    print("data.py OK")
