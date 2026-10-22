"""Builds every API response (CONTRACTS.md §8) from plain DataFrames / a forecast Bundle.

Pure functions, no HTTP: easy to test and reuse. Raise `ApiError` for client errors.
"""
import json
import math
from statistics import NormalDist

import numpy as np
import pandas as pd

from src import business
from src.config import PERISHABLE_FAMILIES
from src.forecast import BASELINE_NAME, Bundle

WASTE_TOLERANCE = 0.25   # a perishable row "risks waste" if leftover > 25% of what was ordered
RISK_THRESHOLDS = (0.5, 1.5)  # weekly relative interval width sum(p90 - p10) / sum(pred) -> low | medium | high
RISK_MIN_WEEKLY_UNITS = 7     # below this the series barely sells: always "low"
RISK_LEVELS = ["low", "medium", "high"]


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str, details: dict | None = None):
        super().__init__(message)
        self.status, self.code, self.message, self.details = status, code, message, details or {}


# ---------------------------------------------------------------- helpers
def _num(x, nd: int = 4):
    """JSON-safe float: NaN/inf -> None, numpy -> python."""
    if x is None:
        return None
    x = float(x)
    return None if math.isnan(x) or math.isinf(x) else round(x, nd)


def _records(df: pd.DataFrame, nd: int = 4) -> list[dict]:
    out = df.copy()
    for c in out.columns:
        if pd.api.types.is_datetime64_any_dtype(out[c]):
            out[c] = out[c].dt.strftime("%Y-%m-%d")
    return json.loads(out.to_json(orient="records", double_precision=nd))


def _date(s: str | None, name: str):
    if s is None:
        return None
    try:
        return pd.Timestamp(s)
    except ValueError:
        raise ApiError(422, "invalid_parameter", f"'{name}' must be an ISO date (YYYY-MM-DD)", {name: s})


def filter_df(df: pd.DataFrame, store_nbr: int | None = None, family: str | None = None,
              date_from: str | None = None, date_to: str | None = None) -> pd.DataFrame:
    m = pd.Series(True, index=df.index)
    if store_nbr is not None:
        m &= df["store_nbr"] == store_nbr
    if family is not None:
        m &= df["family"] == family
    if (d := _date(date_from, "date_from")) is not None:
        m &= df["date"] >= d
    if (d := _date(date_to, "date_to")) is not None:
        m &= df["date"] <= d
    return df[m]


def _require_rows(df: pd.DataFrame, **filters):
    if df.empty:
        raise ApiError(404, "not_found", "No data for the given filters",
                       {k: v for k, v in filters.items() if v is not None})


def _wape(a: pd.Series, p: pd.Series):
    s = a.sum()
    return float(np.abs(a - p).sum() / s) if s > 0 else None


def _rmsle(a: pd.Series, p: pd.Series):
    return float(np.sqrt(np.mean((np.log1p(p) - np.log1p(a)) ** 2))) if len(a) else None


def _pct_change(new, old):
    return None if new is None or not old else _num(new / old - 1)


def _improvement(model_v, base_v):
    return None if model_v is None or not base_v else _num(1 - model_v / base_v)


def _sigma(df: pd.DataFrame, b: Bundle) -> pd.Series:
    """Daily std implied by the [p_lo, p_hi] interval (normal approximation)."""
    lo, hi = b.quantiles
    span = NormalDist().inv_cdf(hi) - NormalDist().inv_cdf(lo)
    return ((df["p90"] - df["p10"]) / span).clip(lower=0)


def _z(service_level: float) -> float:
    if not 0.5 <= service_level < 1:
        raise ApiError(422, "invalid_parameter", "service_level must be in [0.5, 1)", {"service_level": service_level})
    return NormalDist().inv_cdf(service_level)


# ---------------------------------------------------------------- catalog / datasets
def meta(train: pd.DataFrame) -> dict:
    fams = sorted(train["family"].unique())
    return {
        "stores": [{"store_nbr": int(s)} for s in sorted(train["store_nbr"].unique())],
        "families": [{"family": f, "is_perishable": f in PERISHABLE_FAMILIES} for f in fams],
        "date_min": train["date"].min().strftime("%Y-%m-%d"),
        "date_max": train["date"].max().strftime("%Y-%m-%d"),
    }


def dataset_summary(train: pd.DataFrame) -> dict:
    return {
        "date_min": train["date"].min().strftime("%Y-%m-%d"),
        "date_max": train["date"].max().strftime("%Y-%m-%d"),
        "n_stores": int(train["store_nbr"].nunique()),
        "n_families": int(train["family"].nunique()),
        "n_rows": int(len(train)),
        "pct_zero_sales": _num((train["sales"] == 0).mean()),
    }


# ---------------------------------------------------------------- forecast & metrics
def forecast(b: Bundle, store_nbr=None, family=None, date_from=None, date_to=None) -> dict:
    v = b.valid.assign(is_future=False, y_real=b.valid["actual"])
    f = b.future.assign(is_future=True, y_real=np.nan)
    cols = ["date", "store_nbr", "family", "is_future", "y_real", "pred", "p10", "p90"]
    df = filter_df(pd.concat([v[cols], f[cols]], ignore_index=True), store_nbr, family, date_from, date_to)
    _require_rows(df, store_nbr=store_nbr, family=family, date_from=date_from, date_to=date_to)
    if store_nbr is None or family is None:  # aggregate over the unfiltered dimension(s)
        df = df.groupby(["date", "is_future"], as_index=False).agg(
            y_real=("y_real", lambda s: s.sum(min_count=1)), pred=("pred", "sum"),
            p10=("p10", "sum"), p90=("p90", "sum"))
    df = df.sort_values("date").rename(columns={"pred": "y_pred", "p10": "y_p10", "p90": "y_p90"})
    return {
        "store_nbr": store_nbr, "family": family,
        "points": _records(df[["date", "y_real", "y_pred", "y_p10", "y_p90", "is_future"]], nd=2),
    }


def metrics(b: Bundle, **filters) -> dict:
    v = filter_df(b.valid, **filters)
    _require_rows(v, **filters)
    a = v["actual"]
    mw, bw = _wape(a, v["pred"]), _wape(a, v["baseline_pred"])
    mr, br = _rmsle(a, v["pred"]), _rmsle(a, v["baseline_pred"])
    return {
        "model": {"wape": _num(mw), "rmsle": _num(mr), "bias": _num((v["pred"] - a).mean()),
                  "interval_coverage": _num(((a >= v["p10"]) & (a <= v["p90"])).mean())},
        "baseline": {"name": BASELINE_NAME, "wape": _num(bw), "rmsle": _num(br),
                     "bias": _num((v["baseline_pred"] - a).mean())},
        "improvement": {"wape_pct": _improvement(mw, bw), "rmsle_pct": _improvement(mr, br)},
    }


def metrics_horizon(b: Bundle, **filters) -> dict:
    v = filter_df(b.valid, **filters)
    _require_rows(v, **filters)
    week = (v["date"] - b.valid["date"].min()).dt.days // 7 + 1
    rows = [{"week": int(w), "wape": _num(_wape(g["actual"], g["pred"])),
             "baseline_wape": _num(_wape(g["actual"], g["baseline_pred"]))}
            for w, g in v.groupby(week)]
    return {"by_week": rows}


def metrics_ranking(b: Bundle, order: str = "worst", limit: int = 20, **filters) -> dict:
    if order not in ("best", "worst"):
        raise ApiError(422, "invalid_parameter", "order must be 'best' or 'worst'", {"order": order})
    v = filter_df(b.valid, **filters)
    _require_rows(v, **filters)
    g = v.assign(abs_err=(v["actual"] - v["pred"]).abs()).groupby(["store_nbr", "family"], as_index=False).agg(
        abs_err=("abs_err", "sum"), sales_total=("actual", "sum"))
    g = g[g["sales_total"] > 0]  # WAPE undefined for series with no sales
    g["wape"] = g["abs_err"] / g["sales_total"]
    g = g.sort_values("wape", ascending=(order == "best")).head(limit)
    return {"items": _records(g[["store_nbr", "family", "wape", "sales_total"]])}


# ---------------------------------------------------------------- business
def business_kpis(b: Bundle, service_level: float = 0.9, only_perishable: bool = False, **filters) -> dict:
    z = _z(service_level)
    v = filter_df(b.valid, **filters)
    if only_perishable:
        v = v[v["is_perishable"]]
    _require_rows(v, only_perishable=only_perishable or None, **filters)
    a, per = v["actual"], v["is_perishable"]

    def kpis(order: pd.Series) -> dict:
        short, left = (a - order).clip(lower=0), (order - a).clip(lower=0)
        waste_units = float(left[per].sum())
        ordered_per = float(order[per].sum())
        risky = (left[per] > WASTE_TOLERANCE * order[per]) & (order[per] > 0)
        return {
            "stockout_risk": _num((a > order).mean()),
            "waste_risk": _num(risky.mean()) if per.any() else 0.0,
            "fill_rate": _num(1 - short.sum() / a.sum()) if a.sum() > 0 else None,
            "waste_units": _num(waste_units, 1),
            "waste_pct": _num(waste_units / ordered_per) if ordered_per > 0 else 0.0,
        }

    m = kpis(v["pred"] + z * _sigma(v, b))
    keys = pd.MultiIndex.from_arrays([v["store_nbr"], v["family"]])
    base_sigma = pd.Series(b.baseline_sigma.reindex(keys).to_numpy(), index=v.index).fillna(0)
    base = kpis(v["baseline_pred"] + z * base_sigma)
    return {
        "model": m, "baseline": base,
        "delta": {"stockout_risk_pct": _pct_change(m["stockout_risk"], base["stockout_risk"]),
                  "waste_units_pct": _pct_change(m["waste_units"], base["waste_units"])},
    }


def _risk(width: float, forecast_units: float, perishable: bool) -> str:
    """Uncertainty level, one step higher for perishables (waste is costlier)."""
    if forecast_units < RISK_MIN_WEEKLY_UNITS:
        return "low"
    rel = width / forecast_units
    lvl = int(rel >= RISK_THRESHOLDS[0]) + int(rel >= RISK_THRESHOLDS[1])
    return RISK_LEVELS[min(lvl + int(perishable), 2)]


def order_suggestion(b: Bundle, week_start: str | None = None, service_level: float = 0.9,
                     store_nbr=None, family=None, page: int = 1, page_size: int = 50) -> dict:
    z = _z(service_level)
    if page < 1 or not 1 <= page_size <= 2000:
        raise ApiError(422, "invalid_parameter", "page >= 1 and 1 <= page_size <= 2000")
    cols = ["date", "store_nbr", "family", "is_perishable", "pred", "p10", "p90"]
    allp = pd.concat([b.valid[cols], b.future[cols]], ignore_index=True)
    start = _date(week_start, "week_start") if week_start else (
        b.future["date"].min() if not b.future.empty else b.valid["date"].min())
    df = filter_df(allp, store_nbr, family, start.strftime("%Y-%m-%d"),
                   (start + pd.Timedelta(days=6)).strftime("%Y-%m-%d"))
    if df.empty:
        raise ApiError(422, "out_of_range", "week_start outside the forecast range",
                       {"week_start": str(start.date()), "min": str(allp["date"].min().date()),
                        "max": str(allp["date"].max().date())})
    df = df.assign(var=_sigma(df, b) ** 2, width=df["p90"] - df["p10"])
    g = df.groupby(["store_nbr", "family", "is_perishable"], as_index=False).agg(
        forecast=("pred", "sum"), var=("var", "sum"), width=("width", "sum"))
    g["safety_stock"] = z * np.sqrt(g["var"])
    g["recommended_order"] = np.ceil(g["forecast"] + g["safety_stock"]).astype(int)
    g["risk"] = [_risk(w, f, p) for w, f, p in zip(g["width"], g["forecast"], g["is_perishable"])]
    g = g.sort_values(["store_nbr", "family"]).reset_index(drop=True)
    page_df = g.iloc[(page - 1) * page_size: page * page_size]
    items = page_df[["store_nbr", "family", "forecast", "recommended_order", "safety_stock", "risk", "is_perishable"]]
    return {"week_start": start.strftime("%Y-%m-%d"), "items": _records(items, nd=1), "page": page, "total": int(len(g))}


# ---------------------------------------------------------------- EDA (on raw train)
def eda_timeseries(train: pd.DataFrame, granularity: str = "day", **filters) -> dict:
    if granularity not in ("day", "week"):
        raise ApiError(422, "invalid_parameter", "granularity must be 'day' or 'week'")
    df = filter_df(train, **filters)
    _require_rows(df, **filters)
    s = df.groupby("date")["sales"].sum()
    if granularity == "week":
        s = s.resample("W-MON", label="left", closed="left").sum()
    return {"points": _records(s.rename("sales").reset_index(), nd=2)}


def eda_top(train: pd.DataFrame, by: str = "family", limit: int = 10, **filters) -> dict:
    col = {"family": "family", "store": "store_nbr"}.get(by)
    if col is None:
        raise ApiError(422, "invalid_parameter", "by must be 'family' or 'store'")
    df = filter_df(train, **filters)
    s = df.groupby(col)["sales"].sum().sort_values(ascending=False).head(limit)
    return {"items": _records(pd.DataFrame({"key": s.index, "sales": s.to_numpy()}), nd=2)}


def eda_seasonality(train: pd.DataFrame, **filters) -> dict:
    daily = filter_df(train, **filters).groupby("date")["sales"].sum()
    wd = daily.groupby(daily.index.dayofweek).mean()
    mo = daily.groupby(daily.index.month).mean()
    return {"by_weekday": [{"weekday": int(k), "avg_sales": _num(v, 2)} for k, v in wd.items()],
            "by_month": [{"month": int(k), "avg_sales": _num(v, 2)} for k, v in mo.items()]}


def eda_heatmap(train: pd.DataFrame, **filters) -> dict:
    p = filter_df(train, **filters).pivot_table(index="store_nbr", columns="family", values="sales",
                                                 aggfunc="sum", fill_value=0)
    return {"stores": [int(s) for s in p.index], "families": list(p.columns),
            "values": [[_num(x, 1) for x in row] for row in p.to_numpy()]}


def eda_promo_lift(train: pd.DataFrame, **filters) -> dict:
    e = business.promo_effect(filter_df(train, **filters))
    e = e.rename(columns={"avg_with": "avg_promo", "avg_without": "avg_no_promo"})
    return {"items": _records(e[["family", "avg_promo", "avg_no_promo", "lift_pct"]], nd=2)}


def eda_volatility(train: pd.DataFrame, **filters) -> dict:
    daily = filter_df(train, **filters).groupby(["family", "date"])["sales"].sum()
    g = daily.groupby("family")
    cv = (g.std() / g.mean()).replace([np.inf, -np.inf], np.nan).sort_values(ascending=False)
    return {"items": [{"family": f, "cv": _num(v)} for f, v in cv.items()]}
