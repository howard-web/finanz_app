import type { ParsedRow } from "./types";

/**
 * Stabiler Schlüssel pro Zeile: Datum, Betrag und Text. Gleiche Zeilen innerhalb
 * einer Datei (z.B. zwei gleiche Kaffees am selben Tag) erhalten einen laufenden
 * Zähler. Derselbe Export, erneut importiert, ergibt also dieselben Schlüssel.
 */
export function buildImportKeys(rows: ParsedRow[]): string[] {
  const seen = new Map<string, number>();
  return rows.map((r) => {
    const text = `${r.counterparty}|${r.purpose}`.toLowerCase().replace(/\s+/g, " ").trim();
    const base = `${r.date}|${r.amountCents}|${text}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return `${base}#${n}`;
  });
}
