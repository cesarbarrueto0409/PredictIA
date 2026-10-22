"""Shared configuration. Changes must be announced to the team (see CONTRACTS.md)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"

# Validation window = last VALID_DAYS of train.csv. Lags must be >= HORIZON_DAYS.
VALID_DAYS = 14
HORIZON_DAYS = 14

# Train only on recent history to keep training fast during the hackathon.
TRAIN_START = "2016-01-01"

KEY_COLS = ["date", "store_nbr", "family"]
TARGET = "sales"

CATEGORICAL_COLS = ["store_nbr", "family", "city", "store_type", "cluster"]
FEATURE_COLS = [
    # identity
    "store_nbr", "family", "city", "store_type", "cluster",
    # calendar
    "dayofweek", "day", "month", "weekofyear", "is_weekend", "is_payday",
    "days_to_christmas", "is_earthquake",
    # holidays & events
    "is_holiday", "is_national_holiday", "is_local_holiday", "is_event",
    # promotions
    "onpromotion", "has_promo", "store_promo_total", "promo_roll_mean_28",
    # sales history (all shifted >= HORIZON_DAYS)
    "sales_lag_14", "sales_lag_21", "sales_lag_28", "sales_lag_35", "sales_dow_mean_4w",
    "sales_roll_mean_7", "sales_roll_mean_14", "sales_roll_mean_28", "sales_roll_std_28",
    # external (lagged)
    "oil_lag_14", "transactions_lag_14",
]

PERISHABLE_FAMILIES = {
    "DAIRY", "MEATS", "POULTRY", "SEAFOOD", "PRODUCE", "BREAD/BAKERY", "EGGS", "DELI",
}

# Service level for safety stock: lower for perishables (waste is expensive).
SERVICE_LEVEL_PERISHABLE = 0.90
SERVICE_LEVEL_DEFAULT = 0.97

RANDOM_SEED = 42
