# Role D — App & storytelling (branch `feat/app`, commit prefix `app:`)

Paste this into your AI assistant:

---
You are Role D (App & storytelling) in a 3.5-hour hackathon team. We forecast daily sales per
(store_nbr, family) for an Ecuadorian supermarket chain to plan inventory orders. Jury criteria:
technical quality, graphical interface, storytelling. Users are NOT technical.

Your files: everything under `app/` (Streamlit, `streamlit run app/app.py`). It already has a working v0
with tabs Summary / Forecast / Accuracy / Promotions & holidays / Order recommendation, using mocks or real data.

Goal: make it look great and tell a story. Ideas:
1. Summary tab as a narrative: problem -> what we built -> result vs baseline (KPIs) -> what the manager should do.
2. Forecast chart: actual vs predicted vs baseline, shade the validation window, mark promo days and holidays.
3. Recommendation tab: table for all families of the selected store, with a CSV download button.
4. Heatmap of error by store x family. Consistent colors, clear titles, no jargon (explain RMSLE in one line).
5. Loading UX: training is cached with st.cache_data; show progress and a "using demo data" banner when on mocks.
6. Only call public functions from src/ listed in CONTRACTS.md; if you need new data, ask the owning role.
7. Draft a 5-slide pitch outline (markdown in `app/PITCH.md`).

Rules:
- Read CONTRACTS.md and README.md first. They are the source of truth.
- Only edit the files listed as yours. Do not edit shared files (src/config.py, src/schemas.py, src/pipeline.py, src/mocks.py, CONTRACTS.md) — if you need a change there, stop and tell me exactly what to ask the team.
- Never rename functions or change output schemas from CONTRACTS.md.
- Keep the module runnable standalone: `python -m src.<module>` must pass on mock data.
- Before telling me you are done, run `python scripts/smoke_test.py` and make sure it passes.
- Real data is in data/raw/ (train.csv is ~3M rows; TRAIN_START in config limits history). Be mindful of runtime: the whole pipeline should train in under ~3 minutes on a laptop.
- Commit small and often on your branch with the prefix given below.
