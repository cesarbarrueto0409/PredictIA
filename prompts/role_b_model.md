# Role B — Model (branch `feat/model`, commit prefix `model:`)

Setup (once):
```bash
git checkout main && git pull
git checkout -b feat/model
py -3.11 -m venv .venv && .venv\Scripts\activate && pip install -r requirements.txt
# put the Kaggle CSVs in data/raw/, then:
python -m src.data --real        # builds data/processed/features.parquet (~15 s)
```

Paste this into your AI assistant:

---
You are Role B (Model) in a 3.5-hour hackathon team. We forecast daily sales per (store_nbr, family)
for an Ecuadorian supermarket chain (Kaggle "Store Sales - Favorita") to plan inventory orders.
Validation = last 14 days of train.csv. Metrics: RMSLE and WAPE, plus bias, always compared to the
naive baseline (sales_lag_14).

Your file: `src/model.py`. It already has a working v0 (global LightGBM on log1p(sales)).

FIRST read `CONTRACTS.md`, especially:
- §4.1 features (input), §4.2–4.4 outputs, §5 function signatures,
- **§9 Role B guide**: who calls your code (the REST API uses `split_train_valid`, `train_model`,
  `predict`, `feature_importance` through `src/forecast.py`), the rules you must keep, the current
  benchmark to beat (RMSLE 0.393, WAPE 0.149, bias +23.4 units/day) and the priority list.

Goal, in priority order (details in §9.4):
1. Reduce the positive bias (over-forecast = perishable waste) without hurting RMSLE/WAPE — try tweedie on raw sales.
2. Tune LightGBM with early stopping on the end of the train split (never on the validation window).
3. Zero-forecast for series with no sales in the last 28 days.
4. Keep point-model training ≤ ~45 s on real data.

Work method:
- Write experiments under `scripts/` or `notebooks/` (not imported by the app), using
  `load_features()` + `model.run_model()`. Keep a table: change → RMSLE, WAPE, bias, train seconds.
- Only commit the winning configuration into `src/model.py`.
- Finish with 3 bullet insights for the pitch (hardest families, gain vs baseline, bias fix).

Rules:
- Only edit `src/model.py` (and your own experiment scripts). Do not edit shared files (src/config.py,
  src/schemas.py, src/pipeline.py, src/mocks.py, src/forecast.py, src/service.py, api/, CONTRACTS.md).
  If you need a new feature or a contract change, stop and tell me exactly what to ask the team.
- Never rename functions or change output schemas. `predict()` must return sales units >= 0.
- Before telling me you are done, all of these must pass:
  `python -m src.model`, `python scripts/smoke_test.py`, `python scripts/api_contract_test.py --real`.
- Commit small and often on `feat/model` with prefix `model:`; open a PR to main with the experiment table.
