export const TRANSACTION_TYPES = ["INCOME", "EXPENSE"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const EXPENSE_CATEGORIES = [
  "Miete",
  "Lebensmittel",
  "Essen gehen",
  "Abo",
  "Versicherung",
  "Mobilität",
  "Shopping",
  "Freizeit",
  "Gesundheit",
  "Nebenkosten",
  "Sonstiges",
] as const;

export const INCOME_CATEGORIES = [
  "Gehalt",
  "Bonus",
  "Dividende",
  "Zinsen",
  "Geschenk",
  "Sonstiges",
] as const;

export const RECURRING_INTERVALS = ["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"] as const;
export type RecurringInterval = (typeof RECURRING_INTERVALS)[number];

/** Anzahl Termine pro Jahr, z.B. für die Umrechnung auf monatliche Fixkosten. */
export const INTERVALS_PER_YEAR: Record<RecurringInterval, number> = {
  WEEKLY: 52,
  MONTHLY: 12,
  QUARTERLY: 4,
  YEARLY: 1,
};

export function categoriesFor(type: TransactionType): readonly string[] {
  return type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

/**
 * Feste Farbzuordnung für das Ausgaben-Diagramm. Die Reihenfolge ist zugleich
 * die Reihenfolge der Tortenstücke (im Uhrzeigersinn), damit immer dieselben
 * Farben nebeneinander liegen. Nicht aufgeführte Kategorien landen in "Weitere".
 */
export const EXPENSE_CHART_SLOTS: { category: string; color: string }[] = [
  { category: "Miete", color: "var(--cat-1)" },
  { category: "Lebensmittel", color: "var(--cat-2)" },
  { category: "Nebenkosten", color: "var(--cat-3)" },
  { category: "Mobilität", color: "var(--cat-4)" },
  { category: "Abo", color: "var(--cat-5)" },
  { category: "Essen gehen", color: "var(--cat-6)" },
];
export const EXPENSE_CHART_OTHER_COLOR = "var(--cat-other)";
