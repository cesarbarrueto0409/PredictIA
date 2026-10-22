# PredictIA — Design System & UI Reference (Streamlit & Plotly)
> Editorial data observatory on warm paper — a single orange ember punctuating monochrome precision.

**Theme:** light  
**Platform:** Streamlit (`app/app.py`) & Plotly Express / Graph Objects  
**Audience:** Supermarket store managers, supply chain directors, and hackathon jury (non-technical first, technically robust underneath).

PredictIA speaks in a quiet, editorial voice: warm paper-white canvas, monospaced-precision data cards, and a single orange ember that punctuates the monochrome like a highlighter on an executive inventory report. Color is rationed: surfaces read 95% achromatic with Ember Orange appearing only as functional punctuation for model forecasts, lift highlights, and key recommendations.

---

## 1. Color Tokens

| Name | Value | Token / Hex | Role in PredictIA |
|------|-------|-------------|-------------------|
| **Graphite** | `#202020` | `--color-graphite` | Primary text, titles, KPI numbers, actual sales historical line |
| **Canvas White** | `#ffffff` | `--color-canvas-white` | Main page background, Plotly chart canvas, elevated cards |
| **Ash** | `#efefef` | `--color-ash` | Sidebar background, secondary container panels, tab borders |
| **Fog** | `#f5f5f5` | `--color-fog` | Table header background, neutral metric containers |
| **Ivory** | `#ebe6dd` | `--color-ivory` | Warm paper wash for the **Order Recommendation** hero callout |
| **Steel** | `#4d4d4d` | `--color-steel` | Subtitles, descriptive copy, axis titles |
| **Slate** | `#828282` | `--color-slate` | Captions, parameter labels, muted baseline lines |
| **Mist** | `#e8e8e8` | `--color-mist` | Hairline dividers, subtle chart gridlines |
| **Ember Orange** | `#ff682c` | `--color-ember-orange` | **Primary visual accent:** Model forecast line, promo lift bars, primary action badge |
| **Brass** | `#816729` | `--color-brass` | **Secondary accent:** Baseline comparison line, holiday lift bars, perishable warning tags |

---

## 2. Streamlit Configuration (`.streamlit/config.toml`)

The design system is implemented natively in Streamlit via the project configuration:

```toml
[server]
maxUploadSize = 500

[theme]
base = "light"
primaryColor = "#ff682c"              # Ember Orange (active tabs, slider handles, focused inputs)
backgroundColor = "#ffffff"           # Canvas White
secondaryBackgroundColor = "#efefef"  # Ash (sidebar & secondary cards)
textColor = "#202020"                 # Graphite
font = "sans serif"
```

---

## 3. Custom CSS Enhancements (`app/style.css` or `st.markdown`)

To achieve the signature editorial feel (asymmetric cards, clean borders, no heavy shadows), inject the following CSS block into `app/app.py`:

```html
<style>
  /* Asymmetric Card for Order Recommendations */
  .stRecommendationCard {
    background-color: #ebe6dd;
    border-radius: 6px 0px 0px 0px;
    padding: 24px 32px;
    border-left: 3px solid #ff682c;
    margin-bottom: 24px;
  }
  
  /* KPI metric card typography */
  div[data-testid="stMetricValue"] {
    color: #202020;
    font-weight: 500;
    letter-spacing: -0.02em;
  }
  
  /* Clean tabs */
  button[data-baseweb="tab"] {
    font-weight: 500;
    color: #4d4d4d;
  }
  button[data-baseweb="tab"][aria-selected="true"] {
    color: #202020 !important;
    border-bottom-color: #ff682c !important;
  }
</style>
```

---

## 4. Plotly Chart Design Standards

Visuals are strictly functional: no 3D charts, no neon rainbow palettes. Visual hierarchy is established by stroke weight and contrast against the Canvas White surface.

### Color Mapping for Time Series & Comparisons

```python
PREDICTIA_PALETTE = {
    "History": "#202020",      # Graphite (thick 2px solid)
    "Actual": "#202020",       # Graphite (validation ground truth)
    "Predicted": "#ff682c",    # Ember Orange (primary forecast line)
    "Baseline": "#816729",     # Brass (dashed or thinner comparison)
}
```

### Chart Template Guidelines
* **Background:** `paper_bgcolor="#ffffff"`, `plot_bgcolor="#ffffff"`
* **Grid:** X and Y axis gridlines in `#e8e8e8` (Mist), width 1. No vertical grid lines unless required.
* **Fonts:** Title and labels in `color="#202020"`, font family `Inter, system-ui, sans-serif`.
* **Margins:** Compact margins (`l=40, r=20, t=50, b=40`) to maximize data density.
* **Bar Charts (Lift / Importance):**
  * Promotion Lift: `#ff682c` (Ember Orange)
  * Holiday Lift: `#816729` (Brass)
  * Feature Importance: Monochrome `#202020` bars with top 3 highlighted in `#ff682c`.

---

## 5. Screen & Tab Specifications

The app is structured around 5 functional views aligned with `CONTRACTS.md`:

### Tab 1: Summary (Executive Narrative)
* **Goal:** Tell the business story in 5 seconds (*Ordering too little = stockouts; ordering too much = waste*).
* **Components:**
  * Top headline in Graphite.
  * 4 KPI cards (`st.metric`):
    1. **RMSLE (Model vs Baseline):** Validation accuracy.
    2. **MAPE (Model vs Baseline):** Percentage error.
    3. **Lost-Sale Units:** Estimated stockout volume prevented.
    4. **Perishable Waste Units:** Food/perishables saved from spoilage.
  * Context banner explaining the baseline (naive 14-day lag).

### Tab 2: Forecast (Time Series Observatory)
* **Goal:** Inspect demand pattern per Store and Product Family.
* **Components:**
  * Interactive Plotly line graph: Historical 90 days (`#202020`), Validation Actual (`#202020`), Model Forecast (`#ff682c`), and Naive Baseline (`#816729`).
  * Shaded vertical band marking promotion windows or national holidays.

### Tab 3: Accuracy & Diagnostics
* **Goal:** Transparency and model error accountability for technical evaluation.
* **Components:**
  * Error by Family (table or horizontal bar chart sorted by RMSLE).
  * Error by Store (identifies high-performing vs irregular stores).
  * Total chain aggregated comparison line.

### Tab 4: Promotions & Holidays (Demand Drivers)
* **Goal:** Explain *why* demand shifts.
* **Components:**
  * Side-by-side bar charts for **Promo Lift (%)** and **Holiday Lift (%)** across families.
  * Feature Importance bar chart (LightGBM split/gain importance).

### Tab 5: Order Recommendation (Action Center)
* **Goal:** Immediate operational decision for the store manager.
* **Components:**
  * **Hero Recommendation Box (Ivory `#ebe6dd`):** Plain human-readable instruction:
    > *"Order 1,240 units of DAIRY for store 44 for the next 14 days (1,050 forecast + 190 safety stock, 95% service level, perishable)."*
  * **Metric Breakdown:** Forecast Units, Safety Stock, Total Recommended Units.
  * **Action Button:** Download full store recommendation table as CSV.

---

## 6. Do's and Don'ts

### Do
- **Keep pages 95% achromatic:** White and Ash dominate, Ember Orange guides the user's eye to decisions.
- **Explain metrics simply:** E.g., *"Lost sales = demand unmet due to under-ordering"*; don't leave raw math without operational context.
- **Differentiate perishables:** Highlight perishable categories (Dairy, Poultry, Produce) because waste there carries the highest financial and ethical penalty.
- **Use consistent color meanings:** Graphite is always historical reality; Orange is always PredictIA's model; Brass is always the naive baseline.

### Don't
- **Do not introduce arbitrary colors (blue, purple, teal):** Stick to Graphite, White, Ash, Ember Orange, and Brass.
- **Do not show raw model errors without comparison:** Always compare against the naive baseline so the value-add is self-evident.
- **Do not clutter the recommendation tab:** The store manager needs one number to order, not an uncertainty distribution chart. Keep technical diagnostics in Tabs 3 and 4.
