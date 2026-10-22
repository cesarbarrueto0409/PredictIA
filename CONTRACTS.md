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

**Extra feature columns (data v1)** — all listed in `config.FEATURE_COLS`:

| Column                | Notes                                                              |
|-----------------------|--------------------------------------------------------------------|
| `state`               | from stores.csv (not a model feature, used for regional holidays)  |
| `weekofyear`, `is_weekend` | calendar                                                      |
| `days_to_christmas`   | 0–98 in the run-up to Dec 25, 99 otherwise                         |
| `is_earthquake`       | 2016-04-16 … 2016-05-15 (Manabí earthquake relief period)          |
| `is_national_holiday` | Holiday/Transfer/Bridge/Additional, national; `Work Day` is NOT a holiday |
| `is_local_holiday`    | regional (matches store `state`) or local (matches store `city`)   |
| `is_event`            | national events (Mother's Day, World Cup, Black Friday…)           |
| `has_promo`           | `onpromotion > 0`                                                  |
| `store_promo_total`   | items on promo in the whole store that day                         |
| `promo_roll_mean_28`  | onpromotion rolling mean, shifted 14                               |
| `sales_lag_35`, `sales_dow_mean_4w` | lag 35; mean of lags 14/21/28/35 (same weekday)      |
| `sales_roll_mean_14`, `sales_roll_std_28` | shifted 14                                     |
| `oil_lag_14`          | daily WTI oil price (ffilled), shifted 14 (NaN if oil.csv missing) |
| `transactions_lag_14` | store transactions shifted 14 (NaN if transactions.csv missing)    |

Missing dates (Dec 25, stores closed) are filled with 0 internally so `shift(n)` means
`n` calendar days, and then dropped from the output.

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
| `onpromotion`   | int (0/1)      |                                       |
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
    # keys: "train" (required), "stores", "holidays", "transactions", "oil" (None if file missing)
def build_features(train: pd.DataFrame, stores: pd.DataFrame | None = None,
                   holidays: pd.DataFrame | None = None,
                   transactions: pd.DataFrame | None = None,
                   oil: pd.DataFrame | None = None) -> pd.DataFrame: ...
    # returns schema "features"
def save_features(features, path=PROCESSED_DIR / "features.parquet") -> Path: ...
def load_features(path=PROCESSED_DIR / "features.parquet") -> pd.DataFrame: ...
def data_quality_report(train: pd.DataFrame) -> dict: ...   # facts for the pitch

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
def run_all(train: pd.DataFrame, stores=None, holidays=None, transactions=None, oil=None) -> dict: ...
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

## 8. API contract (reference — from `COORDINACION_EQUIPO.md` §5.2–5.4)

> Reference only while the app stays on Streamlit. If a REST API is added, this is the
> agreed surface. Base `/api/v1`, JSON, `snake_case`, ISO dates, CORS for the front.
> Errors: `{ "error": { "code", "message", "details" } }`.
> Common query params: `store_nbr`, `family`, `date_from`, `date_to`.

### 8.1 Endpoint summary (§5.2)

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Service liveness |
| GET | `/meta` | Stores and families catalog |
| POST | `/datasets` | Upload CSV |
| GET | `/datasets/{dataset_id}/summary` | Dataset summary |
| GET | `/eda/timeseries` | Sales over time |
| GET | `/eda/top` | Top families or stores |
| GET | `/eda/seasonality` | Weekly and monthly seasonality |
| GET | `/eda/heatmap` | Store × family matrix |
| GET | `/eda/promo-lift` | Promo lift by family |
| GET | `/eda/volatility` | Coefficient of variation by family |
| POST | `/train` | Launch training |
| GET | `/train/{job_id}` | Training status |
| GET | `/forecast` | Actual vs. forecast with intervals |
| GET | `/metrics` | WAPE, RMSLE, bias, coverage, baseline |
| GET | `/metrics/horizon` | Error by horizon week |
| GET | `/metrics/ranking` | Best and worst store-family |
| GET | `/business-kpis` | Stockout, waste, fill rate |
| GET | `/order-suggestion` | Recommended order |

### 8.2 Details and examples (§5.3)

**`GET /meta`**
```json
{
  "stores": [{ "store_nbr": 1 }, { "store_nbr": 2 }],
  "families": [
    { "family": "DAIRY", "is_perishable": true },
    { "family": "BEVERAGES", "is_perishable": false }
  ],
  "date_min": "2013-01-01",
  "date_max": "2017-08-15"
}
```

**`POST /datasets`** (multipart, field `file`)
```json
{
  "dataset_id": "ds_001",
  "summary": {
    "date_min": "2013-01-01",
    "date_max": "2017-08-15",
    "n_stores": 54,
    "n_families": 33,
    "n_rows": 3000888,
    "pct_zero_sales": 0.31
  }
}
```

**`POST /train`**
```json
// request
{ "dataset_id": "ds_001", "horizon_days": 28, "validation_days": 28, "quantiles": [0.1, 0.5, 0.9] }
// response
{ "job_id": "job_123", "status": "queued" }
```

**`GET /train/{job_id}`**
```json
{ "job_id": "job_123", "status": "running", "progress": 0.45, "model_id": null, "message": "Entrenando modelo" }
```
`status` ∈ `queued | running | done | failed`. When `done`, `model_id` carries a value.

**`GET /forecast`**
Params: `model_id`, `store_nbr`, `family`, `date_from`, `date_to`.
```json
{
  "store_nbr": 1,
  "family": "DAIRY",
  "points": [
    { "date": "2017-08-01", "y_real": 120, "y_pred": 115.4, "y_p10": 90.2, "y_p90": 142.7, "is_future": false },
    { "date": "2017-08-16", "y_real": null, "y_pred": 118.0, "y_p10": 92.0, "y_p90": 145.0, "is_future": true }
  ]
}
```

**`GET /metrics`**
Params: `model_id`, optional filters.
```json
{
  "model": { "wape": 0.21, "rmsle": 0.45, "bias": -1.3, "interval_coverage": 0.78 },
  "baseline": { "name": "same_weekday_last_week", "wape": 0.34, "rmsle": 0.62, "bias": 0.4 },
  "improvement": { "wape_pct": 0.38, "rmsle_pct": 0.27 }
}
```

**`GET /metrics/horizon`**
```json
{ "by_week": [
  { "week": 1, "wape": 0.18, "baseline_wape": 0.30 },
  { "week": 2, "wape": 0.21, "baseline_wape": 0.33 }
] }
```

**`GET /metrics/ranking`**
Params: `model_id`, `order=best|worst`, `limit=20`.
```json
{ "items": [
  { "store_nbr": 3, "family": "PRODUCE", "wape": 0.12, "sales_total": 15230 }
] }
```

**`GET /business-kpis`**
Params: `model_id`, `service_level=0.9`, `only_perishable=false`.
```json
{
  "model":    { "stockout_risk": 0.12, "waste_risk": 0.18, "fill_rate": 0.94, "waste_units": 8200, "waste_pct": 0.07 },
  "baseline": { "stockout_risk": 0.21, "waste_risk": 0.29, "fill_rate": 0.88, "waste_units": 13100, "waste_pct": 0.11 },
  "delta":    { "stockout_risk_pct": -0.43, "waste_units_pct": -0.37 }
}
```

**`GET /order-suggestion`**
Params: `model_id`, `week_start`, `service_level=0.9`, `store_nbr`, `family`, `page`, `page_size`.
```json
{
  "week_start": "2017-08-16",
  "items": [
    {
      "store_nbr": 1,
      "family": "DAIRY",
      "forecast": 820,
      "recommended_order": 905,
      "safety_stock": 85,
      "risk": "medium",
      "is_perishable": true
    }
  ],
  "page": 1,
  "total": 1782
}
```
`risk` ∈ `low | medium | high`. Proposed rule: relative interval width `(p90 - p10) / y_pred` and perishability.

**EDA endpoints**

- `GET /eda/timeseries?granularity=day|week&store_nbr&family` → `{ "points": [{ "date", "sales" }] }`
- `GET /eda/top?by=family|store&limit=10` → `{ "items": [{ "key", "sales" }] }`
- `GET /eda/seasonality` → `{ "by_weekday": [{ "weekday": 0, "avg_sales": 0 }], "by_month": [{ "month": 1, "avg_sales": 0 }] }`
- `GET /eda/heatmap` → `{ "stores": [], "families": [], "values": [[0]] }`
- `GET /eda/promo-lift` → `{ "items": [{ "family", "avg_promo", "avg_no_promo", "lift_pct" }] }`
- `GET /eda/volatility` → `{ "items": [{ "family", "cv" }] }`

### 8.3 Implementation priority (backend) (§5.4)

1. **P0 (unblocks the front):** `/meta`, `/forecast`, `/metrics`, `/order-suggestion`.
2. **P1:** `/datasets`, `/train`, `/train/{job_id}`, `/business-kpis`.
3. **P2:** `/metrics/horizon`, `/metrics/ranking`, all `/eda/*`.

> If time is tight, the backend may precompute everything after training and serve JSON
> from files. Valid for a hackathon as long as the contract is respected.
