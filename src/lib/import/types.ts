/** Eine normalisierte Zeile aus einem Kontoauszug. */
export type ParsedRow = {
  /** YYYY-MM-DD */
  date: string;
  /** Vorzeichenbehaftet: negativ = Ausgabe, positiv = Einnahme. */
  amountCents: number;
  counterparty: string;
  purpose: string;
};

export type ColumnMapping = {
  date: number | null;
  /** Eine Betragsspalte mit Vorzeichen ... */
  amount: number | null;
  /** ... oder getrennte Soll-/Haben-Spalten. */
  debit: number | null;
  credit: number | null;
  /** Gegenpartei bei Ausgaben (Empfänger). */
  counterparty: number | null;
  /** Gegenpartei bei Einnahmen (Zahler), falls die Bank dafür eine eigene Spalte hat. */
  counterpartyIncome: number | null;
  purpose: number | null;
};

export type RowStatus = "new" | "imported" | "possible-duplicate";

export type AnalyzedRow = {
  index: number;
  status: RowStatus;
  /** Bei möglichem Duplikat: die vorhandene Buchung (Anzeige formatiert der Browser). */
  match?: { date: string; category: string; note: string | null; amountCents: number };
  suggestedCategory: string;
  /** Woher der Vorschlag kommt. */
  suggestionSource: "history" | "rule" | "default";
};
