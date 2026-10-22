"""Compare the original point model with one small MVP candidate on real data.

Run: python scripts/model_experiments.py
Build features first with: python -m src.data --real
The final 14 days are a comparative holdout, not used for fitting.
"""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np
import pandas as pd

from src import model
from src.data import load_features


def main():
    features = load_features()
    train, valid = model.split_train_valid(features)
    original = model.PARAMS.copy()
    results = []
    print(f"Train: {len(train):,} rows; validation: {valid.date.min()} to {valid.date.max()}")
    try:
        for name, leaves, trees in [("v0", 127, 600), ("mvp", 63, 300)]:
            model.PARAMS.update(num_leaves=leaves, n_estimators=trees)
            start = time.perf_counter()
            fitted = model.train_model(train)
            seconds = time.perf_counter() - start
            out = valid[["date", "store_nbr", "family", "onpromotion", "is_holiday"]].copy()
            out["actual"] = valid["sales"].to_numpy()
            out["pred"] = model.predict(fitted, valid)
            out["baseline_pred"] = valid["sales_lag_14"].fillna(0).clip(lower=0).to_numpy()
            assert np.isfinite(out["pred"]).all() and (out["pred"] >= 0).all()
            metrics = model.evaluate(out)
            error = out["pred"] - out["actual"]
            results.append({
                "experiment": name, **metrics,
                "wape": error.abs().sum() / out["actual"].sum(),
                "bias": error.mean(), "train_seconds": seconds,
            })
            print(pd.DataFrame(results).to_string(index=False), flush=True)
            groups = out.groupby("family").agg(actual=("actual", "sum"))
            groups["wape"] = error.abs().groupby(out["family"]).sum() / groups["actual"].replace(0, np.nan)
            groups["bias"] = error.groupby(out["family"]).mean()
            print("Hardest families (validation sales > 1000):")
            print(groups[groups["actual"] > 1000].sort_values("wape", ascending=False).head(3))
    finally:
        model.PARAMS.clear()
        model.PARAMS.update(original)


if __name__ == "__main__":
    main()
