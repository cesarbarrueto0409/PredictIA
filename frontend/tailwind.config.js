/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        ground: "var(--ground)",
        surface: "var(--surface)",
        raised: "var(--raised)",
        active: "var(--active)",
        line: "var(--border)",
        rule: "var(--rule)",
        control: "var(--control)",
        ink: "var(--text)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        accent: "var(--accent)",
        positive: "var(--positive)",
        negative: "var(--negative)",
        warning: "var(--warning)",
        "chart-real": "var(--chart-real)",
        "chart-forecast": "var(--chart-forecast)",
        "chart-3": "var(--chart-3)",
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sheet: "16px",
        card: "8px",
        control: "6px",
        chip: "4px",
      },
      fontSize: {
        title: ["22px", { lineHeight: "28px", letterSpacing: "-0.02em" }],
        section: ["16px", { lineHeight: "22px" }],
        kpi: ["28px", { lineHeight: "32px", letterSpacing: "-0.02em" }],
        body: ["14px", { lineHeight: "20px" }],
        small: ["13px", { lineHeight: "18px" }],
      },
    },
  },
  plugins: [],
};
