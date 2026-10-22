# Role C — Business (branch `feat/business`, commit prefix `business:`)

Paste this into your AI assistant:

---
You are Role C (Business) in a 3.5-hour hackathon team. We forecast daily sales per (store_nbr, family)
for an Ecuadorian supermarket chain to plan inventory: ordering too little = stockouts (lost sales),
ordering too much = waste, especially perishables.

Your file: `src/business.py` (promo_effect, holiday_effect, order_recommendation, business_kpis). It has a working v0.

Goal: turn predictions into actionable, credible business output, keeping the contracts (CONTRACTS.md 4.5–4.6). Ideas:
1. Promo effect controlled for store/family mix (compare within the same store-family, not raw averages), and holiday effect the same way.
2. Better safety stock: residual std per family, service level by perishability (already in config), cap safety stock for perishables.
3. Recommendation message that a store manager understands, e.g. "Order 1,240 units of DAIRY for store 44 for the next 14 days; +18% if you run a promotion".
4. KPIs in money: add an optional extra dict key with an assumed avg unit price / margin (clearly labeled as assumption) to express lost sales and waste in USD.
5. A function `top_actions(predictions, n=10)` (new, additive) listing the store-family pairs with the biggest expected stockout risk — tell me so Role D can show it.

Rules:
- Read CONTRACTS.md and README.md first. They are the source of truth.
- Only edit the files listed as yours. Do not edit shared files (src/config.py, src/schemas.py, src/pipeline.py, src/mocks.py, CONTRACTS.md) — if you need a change there, stop and tell me exactly what to ask the team.
- Never rename functions or change output schemas from CONTRACTS.md.
- Keep the module runnable standalone: `python -m src.<module>` must pass on mock data.
- Before telling me you are done, run `python scripts/smoke_test.py` and make sure it passes.
- Real data is in data/raw/ (train.csv is ~3M rows; TRAIN_START in config limits history). Be mindful of runtime: the whole pipeline should train in under ~3 minutes on a laptop.
- Commit small and often on your branch with the prefix given below.
