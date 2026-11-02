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

export const INTERVAL_LABELS: Record<RecurringInterval, string> = {
  WEEKLY: "wöchentlich",
  MONTHLY: "monatlich",
  QUARTERLY: "vierteljährlich",
  YEARLY: "jährlich",
};

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
