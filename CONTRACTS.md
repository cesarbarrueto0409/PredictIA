# CONTRACTS — single source of truth

> **Every AI assistant must read this file before writing code.**
> Contracts (schemas, function signatures, file names) can only change after the
> team agrees. If you change one, update this file in the same commit and tell the team.

## 0. Problem

Supermarket chain in Ecuador (Kaggle "Store Sales – Favorita"). Predict daily sales per
`(store_nbr, family)` for the next weeks to plan inventory orders (avoid stockouts and
waste of perishables). Validation = **last 14 days** of `train.csv`.

## 1. Stack (fixed)

| Concern       | Choice                                  |
|---------------|-----------------------------------------|
| Language      | Python 3.11+                            |
| Data          | pandas, numpy, pyarrow (parquet)        |
| Model         | LightGBM (global model, all series)     |
| Charts        | Plotly                                  |
| UI            | Streamlit (`streamlit run app/app.py`)  |
| Intermediate  | `.parquet` files in `data/processed/`   |
| Config        | `src/config.py` (paths, constants)      |
| Validation    | `src/schemas.py` (`validate(df, name)`) |

No other frameworks (no Dash, no Flask, no PyTorch, no notebooks in `src/`).
Notebooks are allowed only in `notebooks/` for exploration and are never imported.

## 2. Ownership

| Role | Owner files                              | Must NOT edit                    |
|------|------------------------------------------|----------------------------------|
| A — Data      | `src/data.py`                   | everything else                  |
| B — Model     | `src/model.py`                  | everything else                  |
| C — Business  | `src/business.py`               | everything else                  |
| D — App/Story | `app/`                          | everything else                  |
| Shared (ask first) | `src/config.py`, `src/schemas.py`, `src/pipeline.py`, `src/mocks.py`, `CONTRACTS.md` | |

## 3. Raw inputs (`data/raw/`, from Kaggle, never committed)

| File                  | Columns                                                         |
|-----------------------|-----------------------------------------------------------------|
| `train.csv`           | `id, date, store_nbr, family, sales, onpromotion`               |
| `stores.csv`          | `store_nbr, city, state, type, cluster`                         |
| `holidays_events.csv` | `date, type, locale, locale_name, description, transferred`     |
| `transactions.csv`    | `date, store_nbr, transactions`                                 |

## 4. Schemas (enforced by `src/schemas.py`)

### 4.1 `features` — output of Role A, input of Roles B and C
One row per `(date, store_nbr, family)`. Sorted by `store_nbr, family, date`.

| Column                 | Type           | Notes                                           |
|------------------------|----------------|-------------------------------------------------|
| `date`                 | datetime64[ns] |                                                 |
| `store_nbr`            | int            |                                                 |
| `family`               | str            | e.g. `DAIRY`, `PRODUCE`                         |
| `sales`                | float          | target, `>= 0`                                  |
| `onpromotion`          | int            | # items on promo that day                       |
| `dayofweek`            | int            | 0 = Monday                                      |
| `day`                  | int            |                                                 |
| `month`                | int            |                                                 |
| `is_payday`            | int (0/1)      | 15th and last day of month (public wages)       |
| `is_holiday`           | int (0/1)      | national, or regional/local matching the store; ignore `transferred=True` |
| `city`                 | str            | from stores.csv (`"UNKNOWN"` if missing)        |
| `store_type`           | str            | `type` from stores.csv                          |
| `cluster`              | int            |                                                 |
| `sales_lag_14`         | float          | sales 14 days before (NaN allowed at start)     |
| `sales_lag_21`         | float          |                                                 |
| `sales_lag_28`         | float          |                                                 |
| `sales_roll_mean_7`    | float          | mean of last 7 days, **shifted by 14**          |
| `sales_roll_mean_28`   | float          | mean of last 28 days, **shifted by 14**         |

**Leakage rule:** every sales-derived feature must be shifted by `>= HORIZON_DAYS` (14),
so the model can predict the whole validation window without knowing its sales.
Extra features are welcome, but must be added to `FEATURE_COLS` in `config.py`
(tell the team).

### 4.2 `predictions` — output of Role B, input of Roles C and D
One row per `(date, store_nbr, family)` in the **validation window only**.

| Column          | Type           | Notes                                 |
|-----------------|----------------|---------------------------------------|
| `date`          | datetime64[ns] |                                       |
| `store_nbr`     | int            |                                       |
| `family`        | str            |                                       |
| `onpromotion`   | int            |                                       |
| `is_holiday`    | int (0/1)      |                                       |
| `actual`        | float          | real sales                            |
| `pred`          | float          | model prediction, `>= 0`              |
| `baseline_pred` | float          | naive baseline (`sales_lag_14`), `>= 0` |

### 4.3 `metrics` — dict returned by Role B
```python
{"rmsle": float, "mape": float, "baseline_rmsle": float, "baseline_mape": float}
```
MAPE is computed only on rows with `actual > 0`.

### 4.4 `feature_importance` — DataFrame from Role B
Columns: `feature: str, importance: float` (sorted descending).

### 4.5 `effects` — DataFrames from Role C
`promo_effect(features)` and `holiday_effect(features)` return:

| Column           | Type  | Notes                                       |
|------------------|-------|---------------------------------------------|
| `family`         | str   |                                             |
| `avg_with`       | float | avg daily sales with promo / on holiday     |
| `avg_without`    | float | avg daily sales without                     |
| `lift_pct`       | float | `(avg_with / avg_without - 1) * 100`        |

### 4.6 `recommendation` — dict from Role C
```python
{
  "store_nbr": int, "family": str, "horizon_days": int,
  "forecast_units": float,      # sum of pred over the horizon
  "safety_stock": float,
  "recommended_units": int,     # ceil(forecast_units + safety_stock)
  "is_perishable": bool,
  "service_level": float,
  "message": str,               # human sentence, e.g. "Order 1,240 units of DAIRY for store 44 for the next 14 days"
}
```

## 5. Function signatures (do not rename)

```python
# src/data.py  (Role A)
def load_raw(raw_dir: Path = RAW_DIR) -> dict[str, pd.DataFrame]: ...
    # keys: "train" (required), "stores", "holidays", "transactions" (None if file missing)
def build_features(train: pd.DataFrame, stores: pd.DataFrame | None = None,
                   holidays: pd.DataFrame | None = None,
                   transactions: pd.DataFrame | None = None) -> pd.DataFrame: ...
    # returns schema "features"

# src/model.py  (Role B)
def split_train_valid(features: pd.DataFrame, valid_days: int = VALID_DAYS) -> tuple[pd.DataFrame, pd.DataFrame]: ...
def train_model(train_df: pd.DataFrame): ...           # returns fitted model
def predict(model, df: pd.DataFrame) -> np.ndarray: ...  # non-negative
def evaluate(predictions: pd.DataFrame) -> dict: ...    # schema "metrics"
def metrics_by(predictions: pd.DataFrame, by: str) -> pd.DataFrame: ...  # by in {"store_nbr","family"}; cols: [by, rmsle, mape]
def feature_importance(model) -> pd.DataFrame: ...       # schema "feature_importance"
def run_model(features: pd.DataFrame) -> tuple[pd.DataFrame, dict, object]: ...
    # returns (predictions, metrics, model)

# src/business.py  (Role C)
def promo_effect(features: pd.DataFrame) -> pd.DataFrame: ...    # schema "effects"
def holiday_effect(features: pd.DataFrame) -> pd.DataFrame: ...  # schema "effects"
def order_recommendation(predictions: pd.DataFrame, store_nbr: int, family: str) -> dict: ...
def business_kpis(predictions: pd.DataFrame) -> dict: ...
    # {"stockout_units_model", "waste_units_model", "stockout_units_baseline", "waste_units_baseline"}
    # stockout = sum(max(actual - pred, 0)); waste = sum(max(pred - actual, 0)) on perishables

# src/pipeline.py  (shared glue, used by the app)
def run_all(train: pd.DataFrame, stores=None, holidays=None, transactions=None) -> dict: ...
    # {"features", "predictions", "metrics", "model", "importance"}
```

## 6. Mocks

`src/mocks.py` generates fake data that satisfies every schema
(`mock_raw_train`, `mock_features`, `mock_predictions`). Use them to work without
waiting for other roles. Run `python -m src.mocks` to check.

## 7. Definition of done for each role

- Your module runs standalone: `python -m src.<module>` executes a self-test on mocks.
- Outputs pass `schemas.validate(df, "<name>")`.
- `python scripts/smoke_test.py` passes before every merge to `main`.
