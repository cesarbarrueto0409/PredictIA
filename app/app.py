"""Role D — App & storytelling. Run: streamlit run app/app.py

v0: working baseline. TODO(Role D): polish layout, storytelling copy, colors,
download button for recommendations, Spanish UI text if the jury prefers.
"""
import sys
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src import business, mocks, model, pipeline  # noqa: E402
from src.config import RAW_DIR  # noqa: E402
from src.data import load_raw  # noqa: E402

st.set_page_config(page_title="Sales Forecast", page_icon="📦", layout="wide")


@st.cache_data(show_spinner="Training model…")
def run(train: pd.DataFrame, stores, holidays, transactions) -> dict:
    out = pipeline.run_all(train, stores, holidays, transactions)
    out.pop("model")  # not hashable/serializable for cache; importance already extracted
    return out


# ---------- Sidebar: data source & filters ----------
st.sidebar.title("📦 Sales Forecast")
source = st.sidebar.radio("Data source", ["Upload CSVs", "Local data/raw", "Demo (fake data)"])

train = stores = holidays = transactions = None
if source == "Upload CSVs":
    up_train = st.sidebar.file_uploader("train.csv (required)", type="csv")
    up_stores = st.sidebar.file_uploader("stores.csv (optional)", type="csv")
    up_hol = st.sidebar.file_uploader("holidays_events.csv (optional)", type="csv")
    if up_train:
        train = pd.read_csv(up_train, parse_dates=["date"])
        stores = pd.read_csv(up_stores) if up_stores else None
        holidays = pd.read_csv(up_hol, parse_dates=["date"]) if up_hol else None
elif source == "Local data/raw":
    try:
        raw = load_raw(RAW_DIR)
        train, stores, holidays, transactions = raw["train"], raw["stores"], raw["holidays"], raw["transactions"]
    except FileNotFoundError as e:
        st.sidebar.error(str(e))
else:
    train = mocks.mock_raw_train(days=200)

if train is None:
    st.title("Sales forecast for inventory planning")
    st.info("Upload `train.csv` in the sidebar (or choose demo data) to start.")
    st.stop()

res = run(train, stores, holidays, transactions)
preds, feats, metrics = res["predictions"], res["features"], res["metrics"]

store = st.sidebar.selectbox("Store", sorted(preds["store_nbr"].unique()))
family = st.sidebar.selectbox("Product family", sorted(preds["family"].unique()))

# ---------- Tabs ----------
t_sum, t_fc, t_acc, t_drv, t_rec = st.tabs(
    ["Summary", "Forecast", "Accuracy", "Promotions & holidays", "Order recommendation"])

with t_sum:
    st.header("Ordering too little loses sales. Ordering too much wastes perishables.")
    kpi = business.business_kpis(preds)
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("RMSLE (model)", f"{metrics['rmsle']:.3f}",
              f"{metrics['rmsle'] - metrics['baseline_rmsle']:+.3f} vs baseline", delta_color="inverse")
    c2.metric("MAPE (model)", f"{metrics['mape']:.1f}%",
              f"{metrics['mape'] - metrics['baseline_mape']:+.1f} pp vs baseline", delta_color="inverse")
    c3.metric("Lost-sale units (model)", f"{kpi['stockout_units_model']:,.0f}",
              f"{kpi['stockout_units_model'] - kpi['stockout_units_baseline']:+,.0f} vs baseline",
              delta_color="inverse")
    c4.metric("Perishable waste units (model)", f"{kpi['waste_units_model']:,.0f}",
              f"{kpi['waste_units_model'] - kpi['waste_units_baseline']:+,.0f} vs baseline",
              delta_color="inverse")
    st.caption("Baseline = order what we sold 14 days ago. Validation = last 14 days of history.")

with t_fc:
    s = preds[(preds["store_nbr"] == store) & (preds["family"] == family)]
    hist = feats[(feats["store_nbr"] == store) & (feats["family"] == family)].tail(90)
    long = pd.concat([
        hist[["date", "sales"]].rename(columns={"sales": "value"}).assign(series="History"),
        s[["date", "pred"]].rename(columns={"pred": "value"}).assign(series="Predicted"),
        s[["date", "baseline_pred"]].rename(columns={"baseline_pred": "value"}).assign(series="Baseline"),
    ])
    fig = px.line(long, x="date", y="value", color="series",
                  title=f"Actual vs predicted — store {store}, {family}")
    st.plotly_chart(fig, use_container_width=True)

with t_acc:
    col1, col2 = st.columns(2)
    col1.subheader("Error by family")
    col1.dataframe(model.metrics_by(preds, "family"), use_container_width=True)
    col2.subheader("Error by store")
    col2.dataframe(model.metrics_by(preds, "store_nbr"), use_container_width=True)
    agg = preds.groupby("date")[["actual", "pred", "baseline_pred"]].sum().reset_index()
    st.plotly_chart(px.line(agg, x="date", y=["actual", "pred", "baseline_pred"],
                            title="Total chain: actual vs predicted"), use_container_width=True)

with t_drv:
    col1, col2 = st.columns(2)
    pe = business.promo_effect(feats)
    col1.plotly_chart(px.bar(pe, x="lift_pct", y="family", orientation="h",
                             title="Sales lift with promotion (%)"), use_container_width=True)
    he = business.holiday_effect(feats)
    col2.plotly_chart(px.bar(he, x="lift_pct", y="family", orientation="h",
                             title="Sales lift on holidays (%)"), use_container_width=True)
    st.plotly_chart(px.bar(res["importance"].head(15), x="importance", y="feature", orientation="h",
                           title="What drives the forecast (feature importance)"), use_container_width=True)

with t_rec:
    rec = business.order_recommendation(preds, store, family)
    st.success(rec["message"])
    c1, c2, c3 = st.columns(3)
    c1.metric("Forecast units", f"{rec['forecast_units']:,.0f}")
    c2.metric("Safety stock", f"{rec['safety_stock']:,.0f}")
    c3.metric("Recommended order", f"{rec['recommended_units']:,}")
