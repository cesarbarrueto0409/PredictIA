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
    "store_nbr", "family", "city", "store_type", "cluster",
    "onpromotion", "dayofweek", "day", "month", "is_payday", "is_holiday",
    "sales_lag_14", "sales_lag_21", "sales_lag_28",
    "sales_roll_mean_7", "sales_roll_mean_28",
]

PERISHABLE_FAMILIES = {
    "DAIRY", "MEATS", "POULTRY", "SEAFOOD", "PRODUCE", "BREAD/BAKERY", "EGGS", "DELI",
}

# Service level for safety stock: lower for perishables (waste is expensive).
SERVICE_LEVEL_PERISHABLE = 0.90
SERVICE_LEVEL_DEFAULT = 0.97

RANDOM_SEED = 42
