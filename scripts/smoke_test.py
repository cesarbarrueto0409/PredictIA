"""End-to-end check on fake data. Must pass before merging to main.
Run: python scripts/smoke_test.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src import business, mocks, model, pipeline, schemas  # noqa: E402

out = pipeline.run_all(mocks.mock_raw_train(days=200))
schemas.validate(out["features"], "features")
schemas.validate(out["predictions"], "predictions")
schemas.validate(out["importance"], "feature_importance")
schemas.validate_keys(out["metrics"], schemas.METRIC_KEYS, "metrics")
schemas.validate(business.promo_effect(out["features"]), "effects")
schemas.validate(business.holiday_effect(out["features"]), "effects")
p = out["predictions"]
business.order_recommendation(p, int(p["store_nbr"].iloc[0]), p["family"].iloc[0])
business.business_kpis(p)
model.metrics_by(p, "family")
print("SMOKE TEST PASSED", out["metrics"])
