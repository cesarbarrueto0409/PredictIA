export const FAMILY_LABELS: Record<string, string> = {
  PRODUCE: "Frutas y verduras",
  DAIRY: "Lácteos",
  MEATS: "Carnes",
  "BREAD/BAKERY": "Panadería",
  BEVERAGES: "Bebidas",
  "GROCERY I": "Abarrotes",
  CLEANING: "Limpieza",
  "FROZEN FOODS": "Congelados",
};

export const RISK_LABELS: Record<string, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
};

export const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export function familyLabel(family: string): string {
  return FAMILY_LABELS[family] ?? family;
}

export const PRESENTATION_HINT =
  "El modo presentación oculta controles secundarios y agranda las cifras para proyectar.";

export const SHORT_FAMILY_LABELS: Record<string, string> = {
  PRODUCE: "Frutas",
  DAIRY: "Lácteos",
  MEATS: "Carnes",
  "BREAD/BAKERY": "Panadería",
  BEVERAGES: "Bebidas",
  "GROCERY I": "Abarrotes",
  CLEANING: "Limpieza",
  "FROZEN FOODS": "Congelados",
};

export function shortFamilyLabel(family: string): string {
  return SHORT_FAMILY_LABELS[family] ?? family;
}
