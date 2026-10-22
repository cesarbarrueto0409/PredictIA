"""Checks every API endpoint returns the shape agreed in CONTRACTS.md §8.

Run on fake data (fast):   python scripts/api_contract_test.py
Run on real data (~1 min): python scripts/api_contract_test.py --real
"""
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
REAL = "--real" in sys.argv
os.environ["PREDICTIA_MOCK"] = "0" if REAL else "1"
os.environ["PREDICTIA_AUTOTRAIN"] = "0"  # this test trains explicitly through POST /train

from fastapi.testclient import TestClient  # noqa: E402

from api.main import app  # noqa: E402

# Shapes from CONTRACTS.md §8.2. Types: int, float (int accepted), str, bool, None-able via tuple.
NUM = (int, float)
OPT_NUM = (int, float, type(None))
SHAPES = {
    "/meta": {"stores": [{"store_nbr": int}], "families": [{"family": str, "is_perishable": bool}],
              "date_min": str, "date_max": str},
    "/datasets": {"dataset_id": str, "summary": {"date_min": str, "date_max": str, "n_stores": int,
                                                 "n_families": int, "n_rows": int, "pct_zero_sales": NUM}},
    "/train": {"job_id": str, "status": str},
    "/train/{job_id}": {"job_id": str, "status": str, "progress": NUM, "model_id": (str, type(None)), "message": str},
    "/forecast": {"store_nbr": (int, type(None)), "family": (str, type(None)),
                  "points": [{"date": str, "y_real": OPT_NUM, "y_pred": NUM, "y_p10": NUM, "y_p90": NUM,
                              "is_future": bool}]},
    "/metrics": {"model": {"wape": OPT_NUM, "rmsle": OPT_NUM, "bias": OPT_NUM, "interval_coverage": OPT_NUM},
                 "baseline": {"name": str, "wape": OPT_NUM, "rmsle": OPT_NUM, "bias": OPT_NUM},
                 "improvement": {"wape_pct": OPT_NUM, "rmsle_pct": OPT_NUM}},
    "/metrics/horizon": {"by_week": [{"week": int, "wape": OPT_NUM, "baseline_wape": OPT_NUM}]},
    "/metrics/ranking": {"items": [{"store_nbr": int, "family": str, "wape": NUM, "sales_total": NUM}]},
    "/business-kpis": {k: {"stockout_risk": OPT_NUM, "waste_risk": OPT_NUM, "fill_rate": OPT_NUM,
                           "waste_units": OPT_NUM, "waste_pct": OPT_NUM} for k in ("model", "baseline")}
                      | {"delta": {"stockout_risk_pct": OPT_NUM, "waste_units_pct": OPT_NUM}},
    "/order-suggestion": {"week_start": str, "page": int, "total": int,
                          "items": [{"store_nbr": int, "family": str, "forecast": NUM, "recommended_order": int,
                                     "safety_stock": NUM, "risk": str, "is_perishable": bool}]},
    "/eda/timeseries": {"points": [{"date": str, "sales": NUM}]},
    "/eda/top": {"items": [{"key": (str, int), "sales": NUM}]},
    "/eda/seasonality": {"by_weekday": [{"weekday": int, "avg_sales": NUM}],
                         "by_month": [{"month": int, "avg_sales": NUM}]},
    "/eda/heatmap": {"stores": [int], "families": [str], "values": [[NUM]]},
    "/eda/promo-lift": {"items": [{"family": str, "avg_promo": OPT_NUM, "avg_no_promo": OPT_NUM, "lift_pct": OPT_NUM}]},
    "/eda/volatility": {"items": [{"family": str, "cv": OPT_NUM}]},
    "error": {"error": {"code": str, "message": str, "details": dict}},
}

failures: list[str] = []


def check(obj, shape, path="$"):
    if isinstance(shape, dict):
        if not isinstance(obj, dict):
            return failures.append(f"{path}: expected object, got {type(obj).__name__}")
        for k, sub in shape.items():
            if k not in obj:
                failures.append(f"{path}.{k}: missing")
            else:
                check(obj[k], sub, f"{path}.{k}")
    elif isinstance(shape, list):
        if not isinstance(obj, list):
            return failures.append(f"{path}: expected array, got {type(obj).__name__}")
        if not obj:
            failures.append(f"{path}: empty array")
        for i, item in enumerate(obj[:50]):
            check(item, shape[0], f"{path}[{i}]")
    else:
        types = shape if isinstance(shape, tuple) else (shape,)
        if isinstance(obj, bool) and bool not in types:  # bool is a subclass of int
            failures.append(f"{path}: got bool, expected {types}")
        elif not isinstance(obj, types):
            failures.append(f"{path}: got {type(obj).__name__} ({obj!r}), expected {[t.__name__ for t in types]}")


def call(client, method, url, shape_key, status=200, **kw):
    t0 = time.time()
    resp = client.request(method, "/api/v1" + url, **kw)
    ms = (time.time() - t0) * 1000
    before = len(failures)
    if resp.status_code != status:
        failures.append(f"{method} {url}: HTTP {resp.status_code} (expected {status}) {resp.text[:300]}")
    else:
        check(resp.json(), SHAPES[shape_key], f"{method} {url}")
    print(f"{'OK  ' if len(failures) == before else 'FAIL'} {resp.status_code} {ms:7.0f}ms  {method} {url}")
    return resp.json() if resp.headers.get("content-type", "").startswith("application/json") else None


with TestClient(app) as c:
    print(f"mode: {'REAL data' if REAL else 'MOCK data'}")
    assert c.get("/api/v1/health").json()["status"] == "ok"

    # P1: datasets + training
    if REAL:
        csv = (Path(__file__).resolve().parents[1] / "data" / "raw" / "train.csv").read_bytes()[:3_000_000]
        csv = csv[:csv.rfind(b"\n") + 1]
    else:
        from src.mocks import mock_raw_train
        csv = mock_raw_train(days=60).to_csv(index=False).encode()
    up = call(c, "POST", "/datasets", "/datasets", files={"file": ("train.csv", csv, "text/csv")})
    s = c.get(f"/api/v1/datasets/{up['dataset_id']}/summary").json()
    check({"summary": s}, {"summary": SHAPES["/datasets"]["summary"]}, "GET /datasets/{id}/summary")

    job = call(c, "POST", "/train", "/train", json={"dataset_id": "ds_default", "horizon_days": 14,
                                                    "validation_days": 14, "quantiles": [0.1, 0.5, 0.9]})
    while (st := c.get(f"/api/v1/train/{job['job_id']}").json())["status"] in ("queued", "running"):
        time.sleep(1)
    check(st, SHAPES["/train/{job_id}"], "GET /train/{job_id}")
    print(f"     training: {st['status']} — {st['message']}")
    if st["status"] != "done":
        failures.append(f"training failed: {st['message']}")
        sys.exit("\n".join(failures))
    mid = st["model_id"]

    # P0
    meta = call(c, "GET", "/meta", "/meta")
    store, fam = meta["stores"][0]["store_nbr"], next(f["family"] for f in meta["families"] if f["is_perishable"])
    fc = call(c, "GET", f"/forecast?model_id={mid}&store_nbr={store}&family={fam}", "/forecast")
    call(c, "GET", "/forecast", "/forecast")  # aggregated, latest model
    call(c, "GET", f"/metrics?model_id={mid}", "/metrics")
    call(c, "GET", f"/order-suggestion?model_id={mid}&page_size=20", "/order-suggestion")
    # P1/P2
    call(c, "GET", f"/business-kpis?model_id={mid}&service_level=0.9", "/business-kpis")
    call(c, "GET", f"/business-kpis?only_perishable=true", "/business-kpis")
    call(c, "GET", f"/metrics/horizon?model_id={mid}", "/metrics/horizon")
    call(c, "GET", f"/metrics/ranking?order=worst&limit=5", "/metrics/ranking")
    call(c, "GET", f"/metrics/ranking?order=best&limit=5", "/metrics/ranking")
    for url in ("/eda/timeseries?granularity=week", f"/eda/timeseries?store_nbr={store}&family={fam}",
                "/eda/top?by=family&limit=5", "/eda/top?by=store&limit=5", "/eda/seasonality",
                "/eda/heatmap", "/eda/promo-lift", "/eda/volatility"):
        call(c, "GET", url, url.split("?")[0])

    # errors use the agreed envelope
    call(c, "GET", "/forecast?model_id=nope", "error", status=404)
    call(c, "GET", "/forecast?store_nbr=99999", "error", status=404)
    call(c, "GET", "/metrics/ranking?order=middle", "error", status=422)
    call(c, "GET", "/order-suggestion?week_start=1999-01-01", "error", status=422)
    call(c, "POST", "/train", "error", status=422, json={"horizon_days": 28})
    call(c, "POST", "/datasets", "error", status=422, files={"file": ("x.csv", b"a,b\n1,2\n", "text/csv")})

    # semantic checks
    pts = fc["points"]
    past, fut = [p for p in pts if not p["is_future"]], [p for p in pts if p["is_future"]]
    if not past or not fut:
        failures.append("/forecast: expected both validation (is_future=false) and future points")
    if any(p["y_real"] is not None for p in fut):
        failures.append("/forecast: future points must have y_real = null")
    if any(not (p["y_p10"] <= p["y_pred"] <= p["y_p90"]) for p in pts):
        failures.append("/forecast: expected y_p10 <= y_pred <= y_p90")
    if past and fut and max(p["date"] for p in past) >= min(p["date"] for p in fut):
        failures.append("/forecast: future dates must come after validation dates")

print()
if failures:
    print(f"{len(failures)} CONTRACT FAILURES:")
    print("\n".join(f"  - {f}" for f in failures))
    sys.exit(1)
print("API CONTRACT TEST PASSED")
