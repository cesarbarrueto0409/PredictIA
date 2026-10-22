"""PredictIA REST API (CONTRACTS.md §8). Base path /api/v1.

Run:   uvicorn api.main:app --reload --port 8000
Docs:  http://localhost:8000/docs
Env:   PREDICTIA_MOCK=1      use fake data (no CSVs needed, trains in seconds)
       PREDICTIA_AUTOTRAIN=0 do not train a model on startup when none is saved
"""
import io
import itertools
import os
import threading
import uuid
from contextlib import asynccontextmanager

import pandas as pd
from fastapi import APIRouter, FastAPI, File, Query, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.exceptions import HTTPException as StarletteHTTPException

from src import forecast, mocks, schemas, service
from src.config import PROCESSED_DIR, RAW_DIR
from src.data import load_raw
from src.service import ApiError

MOCK = os.getenv("PREDICTIA_MOCK", "0") == "1"
AUTOTRAIN = os.getenv("PREDICTIA_AUTOTRAIN", "1") == "1"
MODELS_DIR = PROCESSED_DIR / "models" / ("mock" if MOCK else "real")
DEFAULT_DATASET = "ds_default"


# ---------------------------------------------------------------- in-memory state
class State:
    def __init__(self):
        self.datasets: dict[str, dict] = {}   # id -> {"train": df, "summary": dict}
        self.models: dict[str, forecast.Bundle] = {}
        self.latest_model: str | None = None
        self.jobs: dict[str, dict] = {}
        self.aux: dict = {}                   # stores/holidays/transactions/oil for feature building
        self.lock = threading.Lock()
        self._ds_counter = itertools.count(1)

    def add_dataset(self, train: pd.DataFrame, dataset_id: str | None = None) -> str:
        dataset_id = dataset_id or f"ds_{next(self._ds_counter):03d}"
        self.datasets[dataset_id] = {"train": train, "summary": service.dataset_summary(train)}
        return dataset_id

    def add_model(self, b: forecast.Bundle):
        with self.lock:
            self.models[b.model_id] = b
            self.latest_model = b.model_id


S = State()


def _prepare_train(df: pd.DataFrame) -> pd.DataFrame:
    try:
        schemas.validate(df.assign(date=pd.to_datetime(df["date"])) if "date" in df else df, "raw_train")
    except (ValueError, KeyError) as e:
        raise ApiError(422, "invalid_dataset", str(e), {"required_columns": schemas.SCHEMAS["raw_train"]})
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    return df


def _start_training(dataset_id: str, horizon_days: int, validation_days: int, quantiles: list[float]) -> str:
    job_id = f"job_{uuid.uuid4().hex[:6]}"
    S.jobs[job_id] = {"job_id": job_id, "status": "queued", "progress": 0.0, "model_id": None, "message": "Queued"}

    def run():
        job = S.jobs[job_id]

        def progress(p: float, msg: str):
            job.update(status="running", progress=round(p, 2), message=msg)

        try:
            b = forecast.train_bundle(S.datasets[dataset_id]["train"], S.aux, dataset_id,
                                      horizon_days, validation_days, tuple(quantiles), progress)
            forecast.save_bundle(b, MODELS_DIR)
            S.add_model(b)
            job.update(status="done", progress=1.0, model_id=b.model_id, message=f"Trained in {b.train_seconds}s")
        except Exception as e:  # surfaced through GET /train/{job_id}
            job.update(status="failed", message=f"{type(e).__name__}: {e}")

    threading.Thread(target=run, daemon=True).start()
    return job_id


@asynccontextmanager
async def lifespan(app: FastAPI):
    if MOCK:
        S.aux = {"stores": mocks.mock_stores(), "holidays": mocks.mock_holidays()}
        S.add_dataset(mocks.mock_raw_train(days=200), DEFAULT_DATASET)
    elif (RAW_DIR / "train.csv").exists():
        raw = load_raw(RAW_DIR)
        S.aux = {k: raw[k] for k in ("stores", "holidays", "transactions", "oil")}
        S.add_dataset(raw["train"], DEFAULT_DATASET)
    for b in forecast.load_bundles(MODELS_DIR):
        S.add_model(b)
    if AUTOTRAIN and S.latest_model is None and DEFAULT_DATASET in S.datasets:
        _start_training(DEFAULT_DATASET, 14, 14, [0.1, 0.5, 0.9])
    yield


app = FastAPI(title="PredictIA API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# ---------------------------------------------------------------- error format
def _err(status: int, code: str, message: str, details=None) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message, "details": details or {}}})


@app.exception_handler(ApiError)
async def _api_error(_: Request, e: ApiError):
    return _err(e.status, e.code, e.message, e.details)


@app.exception_handler(RequestValidationError)
async def _validation_error(_: Request, e: RequestValidationError):
    return _err(422, "invalid_parameter", "Invalid request parameters",
                {"errors": [{"loc": list(x["loc"]), "msg": x["msg"]} for x in e.errors()]})


@app.exception_handler(StarletteHTTPException)
async def _http_error(_: Request, e: StarletteHTTPException):
    return _err(e.status_code, "not_found" if e.status_code == 404 else "http_error", str(e.detail))


@app.exception_handler(Exception)
async def _unhandled(_: Request, e: Exception):
    return _err(500, "internal_error", f"{type(e).__name__}: {e}")


# ---------------------------------------------------------------- dependencies
def _bundle(model_id: str | None) -> forecast.Bundle:
    mid = model_id or S.latest_model
    if mid is None:
        running = [j for j in S.jobs.values() if j["status"] in ("queued", "running")]
        raise ApiError(503, "model_not_ready", "No trained model yet" + (" — training in progress" if running else
                       " — call POST /train"), {"jobs": running})
    if mid not in S.models:
        raise ApiError(404, "not_found", f"Unknown model_id '{mid}'", {"available": list(S.models)})
    return S.models[mid]


def _train_df(dataset_id: str | None) -> pd.DataFrame:
    # Default: the dataset of the latest model (so /meta matches /forecast), else the newest upload.
    latest_ds = S.models[S.latest_model].dataset_id if S.latest_model else None
    did = dataset_id or (latest_ds if latest_ds in S.datasets else (list(S.datasets)[-1] if S.datasets else None))
    if did is None:
        raise ApiError(503, "no_dataset", "No dataset loaded — call POST /datasets")
    if did not in S.datasets:
        raise ApiError(404, "not_found", f"Unknown dataset_id '{did}'", {"available": list(S.datasets)})
    return S.datasets[did]["train"]


def _filters(store_nbr, family, date_from, date_to) -> dict:
    return {"store_nbr": store_nbr, "family": family, "date_from": date_from, "date_to": date_to}


# ---------------------------------------------------------------- routes
r = APIRouter(prefix="/api/v1")


@r.get("/health")
def health():
    return {"status": "ok", "mock": MOCK, "datasets": list(S.datasets), "models": list(S.models),
            "latest_model": S.latest_model}


@r.get("/meta")
def get_meta(dataset_id: str | None = None):
    return service.meta(_train_df(dataset_id))


@r.post("/datasets")
async def upload_dataset(file: UploadFile = File(...)):
    try:
        df = pd.read_csv(io.BytesIO(await file.read()))
    except Exception as e:
        raise ApiError(422, "invalid_dataset", f"Could not parse CSV: {e}")
    did = S.add_dataset(_prepare_train(df))
    return {"dataset_id": did, "summary": S.datasets[did]["summary"]}


@r.get("/datasets/{dataset_id}/summary")
def get_dataset_summary(dataset_id: str):
    _train_df(dataset_id)
    return S.datasets[dataset_id]["summary"]


class TrainRequest(BaseModel):
    dataset_id: str = DEFAULT_DATASET
    horizon_days: int = Field(14, ge=1, le=14)
    validation_days: int = Field(14, ge=7, le=forecast.MAX_VALIDATION_DAYS)
    quantiles: list[float] = [0.1, 0.5, 0.9]


@r.post("/train")
def post_train(req: TrainRequest):
    _train_df(req.dataset_id)
    return {"job_id": _start_training(req.dataset_id, req.horizon_days, req.validation_days, req.quantiles),
            "status": "queued"}


@r.get("/train/{job_id}")
def get_train(job_id: str):
    if job_id not in S.jobs:
        raise ApiError(404, "not_found", f"Unknown job_id '{job_id}'")
    return S.jobs[job_id]


@r.get("/forecast")
def get_forecast(model_id: str | None = None, store_nbr: int | None = None, family: str | None = None,
                 date_from: str | None = None, date_to: str | None = None):
    return service.forecast(_bundle(model_id), store_nbr, family, date_from, date_to)


@r.get("/metrics")
def get_metrics(model_id: str | None = None, store_nbr: int | None = None, family: str | None = None,
                date_from: str | None = None, date_to: str | None = None):
    return service.metrics(_bundle(model_id), **_filters(store_nbr, family, date_from, date_to))


@r.get("/metrics/horizon")
def get_metrics_horizon(model_id: str | None = None, store_nbr: int | None = None, family: str | None = None):
    return service.metrics_horizon(_bundle(model_id), store_nbr=store_nbr, family=family)


@r.get("/metrics/ranking")
def get_metrics_ranking(model_id: str | None = None, order: str = "worst", limit: int = Query(20, ge=1, le=500),
                        store_nbr: int | None = None, family: str | None = None):
    return service.metrics_ranking(_bundle(model_id), order, limit, store_nbr=store_nbr, family=family)


@r.get("/business-kpis")
def get_business_kpis(model_id: str | None = None, service_level: float = 0.9, only_perishable: bool = False,
                      store_nbr: int | None = None, family: str | None = None,
                      date_from: str | None = None, date_to: str | None = None):
    return service.business_kpis(_bundle(model_id), service_level, only_perishable,
                                 **_filters(store_nbr, family, date_from, date_to))


@r.get("/order-suggestion")
def get_order_suggestion(model_id: str | None = None, week_start: str | None = None, service_level: float = 0.9,
                         store_nbr: int | None = None, family: str | None = None,
                         page: int = 1, page_size: int = 50):
    return service.order_suggestion(_bundle(model_id), week_start, service_level, store_nbr, family, page, page_size)


@r.get("/eda/timeseries")
def get_eda_timeseries(granularity: str = "day", dataset_id: str | None = None, store_nbr: int | None = None,
                       family: str | None = None, date_from: str | None = None, date_to: str | None = None):
    return service.eda_timeseries(_train_df(dataset_id), granularity, **_filters(store_nbr, family, date_from, date_to))


@r.get("/eda/top")
def get_eda_top(by: str = "family", limit: int = Query(10, ge=1, le=100), dataset_id: str | None = None,
                store_nbr: int | None = None, family: str | None = None,
                date_from: str | None = None, date_to: str | None = None):
    return service.eda_top(_train_df(dataset_id), by, limit, **_filters(store_nbr, family, date_from, date_to))


@r.get("/eda/seasonality")
def get_eda_seasonality(dataset_id: str | None = None, store_nbr: int | None = None, family: str | None = None,
                        date_from: str | None = None, date_to: str | None = None):
    return service.eda_seasonality(_train_df(dataset_id), **_filters(store_nbr, family, date_from, date_to))


@r.get("/eda/heatmap")
def get_eda_heatmap(dataset_id: str | None = None, date_from: str | None = None, date_to: str | None = None):
    return service.eda_heatmap(_train_df(dataset_id), date_from=date_from, date_to=date_to)


@r.get("/eda/promo-lift")
def get_eda_promo_lift(dataset_id: str | None = None, store_nbr: int | None = None,
                       date_from: str | None = None, date_to: str | None = None):
    return service.eda_promo_lift(_train_df(dataset_id), store_nbr=store_nbr, date_from=date_from, date_to=date_to)


@r.get("/eda/volatility")
def get_eda_volatility(dataset_id: str | None = None, store_nbr: int | None = None,
                       date_from: str | None = None, date_to: str | None = None):
    return service.eda_volatility(_train_df(dataset_id), store_nbr=store_nbr, date_from=date_from, date_to=date_to)


app.include_router(r)
