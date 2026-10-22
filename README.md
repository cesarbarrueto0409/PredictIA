# Sales Forecast — Inventory Planning (Hackathon)

Platform to upload sales history, train a model and forecast the next 2 weeks of sales per
store and product family, with an actionable order recommendation.

**Read [CONTRACTS.md](CONTRACTS.md) before writing any code.**

## Quick start

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate    |  Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
python scripts/smoke_test.py          # end-to-end check on fake data
streamlit run app/app.py              # open the app
```

Data: download the Kaggle dataset **"Store Sales - Time Series Forecasting"** and put the CSVs in
`data/raw/` (`train.csv`, `stores.csv`, `holidays_events.csv`, `transactions.csv`, `oil.csv`).
CSVs are git-ignored; share them via Drive/USB, never commit them.

## Team & roles

| Role | Branch       | File               | Prompt for your AI                       |
|------|--------------|--------------------|------------------------------------------|
| A — Data      | `feat/data`     | `src/data.py`     | [prompts/role_a_data.md](prompts/role_a_data.md)         |
| B — Model     | `feat/model`    | `src/model.py`    | [prompts/role_b_model.md](prompts/role_b_model.md)       |
| C — Business  | `feat/business` | `src/business.py` | [prompts/role_c_business.md](prompts/role_c_business.md) |
| D — App/Story | `feat/app`      | `app/`            | [prompts/role_d_app.md](prompts/role_d_app.md)           |

Every module already has a **working v0**, so the app runs end to end from minute one.
Each role improves its own file without breaking its contract.

## Git workflow

### One-time setup (repo owner)

The local repo is already initialized with an initial commit on `main`. To publish it:

```bash
# Option 1: GitHub CLI
gh repo create forecast-hackathon --private --source=. --remote=origin --push

# Option 2: create an empty repo on github.com, then:
git remote add origin https://github.com/<user>/forecast-hackathon.git
git push -u origin main
```

Then add teammates: GitHub → Settings → Collaborators.

### Each teammate

```bash
git clone https://github.com/<user>/forecast-hackathon.git
cd forecast-hackathon
git checkout -b feat/<your-role>        # data | model | business | app
```

### While working (commit small and often)

```bash
git add src/model.py                    # only your files
git commit -m "model: add tweedie objective"
git push -u origin feat/<your-role>
```

### Merging to main (at the integration checkpoints)

```bash
git checkout main && git pull
git merge feat/<your-role>
python scripts/smoke_test.py            # MUST pass
git push
# then everyone updates their branch:
git checkout feat/<your-role> && git merge main
```

Rules:
1. Only touch the files you own (see CONTRACTS.md §2). Shared files: ask in the group chat first.
2. Never commit data (`*.csv`, `*.parquet`) — `.gitignore` blocks it.
3. `smoke_test.py` must pass before pushing to `main`.
4. Commit message prefix = your area: `data:`, `model:`, `business:`, `app:`, `docs:`.

## Timeline (3.5 h)

| Time       | What                                                                |
|------------|---------------------------------------------------------------------|
| 0:00–0:20  | Clone, install, run smoke test and app, each AI reads CONTRACTS.md  |
| 0:20–2:00  | Each role improves its module on its branch                         |
| **2:00**   | **Integration 1** — merge all branches, run app on real data        |
| 2:00–3:00  | Improvements + polish                                               |
| **3:00**   | **Code freeze** — bug fixes only                                    |
| 3:00–3:30  | Rehearse the pitch                                                  |

## Project structure

```
├── CONTRACTS.md        schemas, signatures, stack (source of truth)
├── app/app.py          Streamlit UI (Role D)
├── src/
│   ├── config.py       shared constants & paths
│   ├── schemas.py      schema validation
│   ├── mocks.py        fake data satisfying every schema
│   ├── data.py         Role A
│   ├── model.py        Role B
│   ├── business.py     Role C
│   └── pipeline.py     glue: data -> model -> outputs
├── scripts/smoke_test.py
├── prompts/            ready-to-paste prompts per role
└── data/raw/           Kaggle CSVs (git-ignored)
```
