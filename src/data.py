"""Role A — Data. Loads raw CSVs and builds the `features` table (CONTRACTS.md 4.1).

Run on real data:  python -m src.data --real   (builds + saves data/processed/features.parquet)
Run on mocks:      python -m src.data
"""
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

from src import schemas
from src.config import HORIZON_DAYS, PROCESSED_DIR, RAW_DIR, TRAIN_START

GROUP = ["store_nbr", "family"]
EARTHQUAKE_START, EARTHQUAKE_END = pd.Timestamp("2016-04-16"), pd.Timestamp("2016-05-15")
# Lag warm-up: longest lag (35) + longest window (28) + margin.
WARMUP_DAYS = 70


# ---------------------------------------------------------------- loading
def load_raw(raw_dir: Path = RAW_DIR) -> dict[str, pd.DataFrame | None]:
    """Keys: train (required), stores, holidays, transactions, oil (None if file missing)."""
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
        "oil": read("oil.csv"),
    }
    if out["train"] is None:
        raise FileNotFoundError(f"train.csv not found in {raw_dir}")
    return out


# ---------------------------------------------------------------- helpers
def _complete_grid(df: pd.DataFrame) -> pd.DataFrame:
    """Add missing dates (e.g. Dec 25, stores closed) so shift(n) == n calendar days.
    Added rows get sales=0, onpromotion=0 and _filled=1 (dropped at the end)."""
    dates = pd.date_range(df["date"].min(), df["date"].max(), freq="D")
    keys = df[GROUP].drop_duplicates()
    grid = keys.merge(pd.DataFrame({"date": dates}), how="cross")
    out = grid.merge(df, on=["date", *GROUP], how="left")
    out["_filled"] = out["sales"].isna().astype(int)
    out["sales"] = out["sales"].fillna(0.0)
    out["onpromotion"] = out["onpromotion"].fillna(0).astype(int)
    return out


def _holiday_tables(holidays: pd.DataFrame | None):
    """Return (national_days, regional[date,state], local[date,city], event_days).
    Rules: transferred=True -> not celebrated that day; Work Day -> working day (not holiday);
    Holiday/Transfer/Bridge/Additional -> day off; Event -> separate flag."""
    empty = pd.DataFrame(columns=["date", "locale_name"])
    if holidays is None:
        return set(), empty, empty, set()
    h = holidays.copy()
    h["date"] = pd.to_datetime(h["date"])
    h = h[h["transferred"].astype(str).str.lower() != "true"]
    off = h[h["type"].isin(["Holiday", "Transfer", "Bridge", "Additional"])]
    national = set(off.loc[off["locale"] == "National", "date"])
    regional = off.loc[off["locale"] == "Regional", ["date", "locale_name"]].drop_duplicates()
    local = off.loc[off["locale"] == "Local", ["date", "locale_name"]].drop_duplicates()
    events = set(h.loc[h["type"] == "Event", "date"])
    return national, regional, local, events


def _match(df: pd.DataFrame, table: pd.DataFrame, col: str) -> np.ndarray:
    if table.empty or col not in df.columns:
        return np.zeros(len(df), dtype=int)
    keys = set(zip(table["date"], table["locale_name"]))
    return np.fromiter((k in keys for k in zip(df["date"], df[col])), dtype=bool, count=len(df)).astype(int)


def _oil_series(oil: pd.DataFrame | None, dates: pd.DatetimeIndex) -> pd.Series:
    """Daily oil price, forward-filled over weekends/gaps."""
    if oil is None:
        return pd.Series(np.nan, index=dates)
    s = oil.assign(date=pd.to_datetime(oil["date"])).set_index("date")["dcoilwtico"]
    full = pd.date_range(min(s.index.min(), dates.min()), max(s.index.max(), dates.max()), freq="D")
    return s.reindex(full).ffill().bfill().reindex(dates)


# ---------------------------------------------------------------- main builder
def build_features(train: pd.DataFrame, stores: pd.DataFrame | None = None,
                   holidays: pd.DataFrame | None = None,
                   transactions: pd.DataFrame | None = None,
                   oil: pd.DataFrame | None = None) -> pd.DataFrame:
    df = train.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df[df["date"] >= pd.Timestamp(TRAIN_START) - pd.Timedelta(days=WARMUP_DAYS)]
    df = df.drop(columns=[c for c in ("id",) if c in df.columns])
    df["sales"] = df["sales"].clip(lower=0).astype(float)
    df = _complete_grid(df)

    # --- store attributes
    if stores is not None:
        s = stores.rename(columns={"type": "store_type"})
        df = df.merge(s[["store_nbr", "city", "state", "store_type", "cluster"]], on="store_nbr", how="left")
    for col, default in (("city", "UNKNOWN"), ("state", "UNKNOWN"), ("store_type", "UNKNOWN"), ("cluster", 0)):
        if col not in df.columns:
            df[col] = default
        df[col] = df[col].fillna(default)
    df["cluster"] = df["cluster"].astype(int)

    # --- calendar
    d = df["date"]
    df["dayofweek"] = d.dt.day_of_week
    df["day"] = d.dt.day
    df["month"] = d.dt.month
    df["weekofyear"] = d.dt.isocalendar().week.astype(int).to_numpy()
    df["is_weekend"] = (df["dayofweek"] >= 5).astype(int)
    df["is_payday"] = ((df["day"] == 15) | d.dt.is_month_end).astype(int)
    xmas = pd.to_datetime(d.dt.year.astype(str) + "-12-25")
    df["days_to_christmas"] = (xmas - d).dt.days.where(lambda x: x >= 0, 99).clip(upper=99)
    df["is_earthquake"] = d.between(EARTHQUAKE_START, EARTHQUAKE_END).astype(int)

    # --- holidays & events
    national, regional, local, events = _holiday_tables(holidays)
    df["is_national_holiday"] = d.isin(national).astype(int)
    df["is_local_holiday"] = (_match(df, regional, "state") | _match(df, local, "city")).astype(int)
    df["is_holiday"] = (df["is_national_holiday"] | df["is_local_holiday"]).astype(int)
    df["is_event"] = d.isin(events).astype(int)

    # --- promotions (known in advance, no lag needed)
    df["store_promo_total"] = df.groupby(["store_nbr", "date"])["onpromotion"].transform("sum")
    df["has_promo"] = (df["onpromotion"] > 0).astype(int)

    # --- oil (lagged HORIZON_DAYS: future price is unknown at order time)
    dates = pd.DatetimeIndex(sorted(df["date"].unique()))
    oil_daily = _oil_series(oil, dates).shift(HORIZON_DAYS)
    df["oil_lag_14"] = df["date"].map(oil_daily)

    # --- sales lags / rolling stats, all shifted >= HORIZON_DAYS (no leakage)
    df = df.sort_values([*GROUP, "date"]).reset_index(drop=True)
    g = df.groupby(GROUP, sort=False)["sales"]
    for lag in (14, 21, 28, 35):
        df[f"sales_lag_{lag}"] = g.shift(lag)
    df["sales_dow_mean_4w"] = df[["sales_lag_14", "sales_lag_21", "sales_lag_28", "sales_lag_35"]].mean(axis=1)
    shifted = g.shift(HORIZON_DAYS)
    sg = shifted.groupby([df["store_nbr"], df["family"]], sort=False)
    for w in (7, 14, 28):
        df[f"sales_roll_mean_{w}"] = sg.transform(lambda s, w=w: s.rolling(w, min_periods=1).mean())
    df["sales_roll_std_28"] = sg.transform(lambda s: s.rolling(28, min_periods=2).std())
    df["promo_roll_mean_28"] = (df.groupby(GROUP, sort=False)["onpromotion"]
                                .transform(lambda s: s.shift(HORIZON_DAYS).rolling(28, min_periods=1).mean()))

    # --- transactions (store traffic), lagged
    if transactions is not None:
        t = transactions.assign(date=pd.to_datetime(transactions["date"]))
        df = df.merge(t[["date", "store_nbr", "transactions"]], on=["date", "store_nbr"], how="left")
        df = df.sort_values([*GROUP, "date"]).reset_index(drop=True)
        df["transactions_lag_14"] = df.groupby(GROUP, sort=False)["transactions"].shift(HORIZON_DAYS)
        df = df.drop(columns="transactions")
    else:
        df["transactions_lag_14"] = np.nan

    df = df[(df["date"] >= pd.Timestamp(TRAIN_START)) & (df["_filled"] == 0)]
    df = df.drop(columns="_filled").reset_index(drop=True)
    return schemas.validate(df, "features")


# ---------------------------------------------------------------- persistence & insights
def save_features(features: pd.DataFrame, path: Path = PROCESSED_DIR / "features.parquet") -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    features.to_parquet(path, index=False)
    return path


def load_features(path: Path = PROCESSED_DIR / "features.parquet") -> pd.DataFrame:
    return pd.read_parquet(path)


def data_quality_report(train: pd.DataFrame) -> dict:
    """Facts for the pitch: zero-sales series, store openings, date range."""
    df = train.assign(date=pd.to_datetime(train["date"]))
    by_series = df.groupby(GROUP)["sales"].sum()
    first_sale = df[df["sales"] > 0].groupby("store_nbr")["date"].min()
    fam_zero = df.groupby("family")["sales"].apply(lambda s: (s == 0).mean()).sort_values(ascending=False)
    return {
        "date_range": (df["date"].min().date(), df["date"].max().date()),
        "n_stores": int(df["store_nbr"].nunique()),
        "n_families": int(df["family"].nunique()),
        "series_never_sold": int((by_series == 0).sum()),
        "stores_opened_late": first_sale[first_sale > df["date"].min() + pd.Timedelta(days=30)].dt.date.to_dict(),
        "families_most_zero_days_pct": (fam_zero.head(5) * 100).round(1).to_dict(),
    }


if __name__ == "__main__":
    if "--real" in sys.argv:
        t0 = time.time()
        raw = load_raw()
        print(f"loaded raw in {time.time() - t0:.1f}s")
        t0 = time.time()
        f = build_features(raw["train"], raw["stores"], raw["holidays"], raw["transactions"], raw["oil"])
        print(f"built features {f.shape} in {time.time() - t0:.1f}s")
        print(f"saved to {save_features(f)}")
        print(f.isna().mean().round(3)[lambda s: s > 0])
        for k, v in data_quality_report(raw["train"]).items():
            print(f"{k}: {v}")
    else:
        from src.mocks import mock_raw_train
        f = build_features(mock_raw_train(days=200))
        print(f.head(), f.shape, sep="\n")
    print("data.py OK")
