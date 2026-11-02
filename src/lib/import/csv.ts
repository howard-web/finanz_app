import type { ColumnMapping, ParsedRow } from "./types";

// ---------------------------------------------------------------------------
// Datei lesen
// ---------------------------------------------------------------------------

/**
 * Dekodiert eine Datei. Deutsche Banken liefern oft Windows-1252/ISO-8859-1,
 * neuere Exporte UTF-8. Ist die Datei kein gültiges UTF-8, wird Windows-1252 genutzt.
 */
export function decodeFile(buffer: ArrayBuffer): { text: string; encoding: string } {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return { text: text.replace(/^﻿/, ""), encoding: "UTF-8" };
  } catch {
    return { text: new TextDecoder("windows-1252").decode(buffer), encoding: "Windows-1252" };
  }
}

// ---------------------------------------------------------------------------
// CSV parsen
// ---------------------------------------------------------------------------

/** RFC-4180-artiger Parser: Anführungszeichen, "" als Escape, Zeilenumbrüche in Feldern. */
export function parseCsvWith(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.map((r) => r.map((f) => f.trim())).filter((r) => r.some((f) => f !== ""));
}

const DELIMITERS = [";", ",", "\t"] as const;

/**
 * Wählt das Trennzeichen, das die meisten Zeilen mit derselben (>= 3) Spaltenzahl ergibt.
 * Vorspann-Zeilen (Kontoinfos vor der Tabelle) stören so nicht.
 */
export function parseCsv(text: string): { delimiter: string; rows: string[][] } {
  let best = { delimiter: ";" as string, rows: [] as string[][], score: -1 };
  for (const d of DELIMITERS) {
    const rows = parseCsvWith(text, d);
    const counts = new Map<number, number>();
    for (const r of rows) if (r.length >= 3) counts.set(r.length, (counts.get(r.length) ?? 0) + 1);
    const score = Math.max(0, ...counts.values());
    if (score > best.score) best = { delimiter: d, rows, score };
  }
  return { delimiter: best.delimiter, rows: best.rows };
}

// ---------------------------------------------------------------------------
// Spalten erkennen
// ---------------------------------------------------------------------------

export function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Muster in Prioritätsreihenfolge, bezogen auf normalisierte Spaltennamen.
// Abgedeckt: Sparkasse, ING, DKB, comdirect, Volksbank/Raiffeisen, N26, Commerzbank u.a.
const PATTERNS: Record<keyof ColumnMapping, string[]> = {
  date: ["buchungstag", "buchungsdatum", "buchung", "booking date", "datum", "date"],
  amount: ["betrag", "betrag eur", "betrag in eur", "umsatz in eur", "umsatz", "amount eur", "amount"],
  debit: ["soll", "belastung", "ausgang", "debit"],
  credit: ["haben", "gutschrift", "eingang", "credit"],
  counterparty: [
    "beguenstigter zahlungspflichtiger",
    "auftraggeber empfaenger",
    "zahlungsempfaenger in",
    "zahlungsempfaenger",
    "name zahlungsbeteiligter",
    "partner name",
    "payee",
    "empfaenger",
    "beguenstigter",
    "auftraggeber",
  ],
  counterpartyIncome: ["zahlungspflichtige r", "zahlungspflichtiger"],
  purpose: ["verwendungszweck", "payment reference", "buchungstext", "beschreibung", "description", "vorgang"],
};

function findColumn(headers: string[], patterns: string[], taken: Set<number>): number | null {
  // 1. exakte Treffer in Prioritätsreihenfolge, 2. Präfix-Treffer
  for (const p of patterns) {
    const i = headers.findIndex((h, idx) => !taken.has(idx) && h === p);
    if (i >= 0) return i;
  }
  for (const p of patterns) {
    const i = headers.findIndex((h, idx) => !taken.has(idx) && h.startsWith(p + " "));
    if (i >= 0) return i;
  }
  return null;
}

export function detectMapping(header: string[]): ColumnMapping {
  const headers = header.map(normalizeHeader);
  const taken = new Set<number>();
  const pick = (key: keyof ColumnMapping) => {
    const i = findColumn(headers, PATTERNS[key], taken);
    if (i !== null) taken.add(i);
    return i;
  };

  const date = pick("date");
  const amount = pick("amount");
  const debit = amount === null ? pick("debit") : null;
  const credit = amount === null ? pick("credit") : null;
  // Einnahmen-Spalte zuerst, damit "zahlungspflichtige" nicht als Ausgaben-Gegenpartei landet
  const counterpartyIncome = pick("counterpartyIncome");
  const counterparty = pick("counterparty");
  const purpose = pick("purpose");

  return { date, amount, debit, credit, counterparty, counterpartyIncome, purpose };
}

/** Sucht in den ersten Zeilen die Kopfzeile (Datum + Betrag erkennbar). */
export function detectLayout(rows: string[][]): { headerIndex: number; mapping: ColumnMapping } | null {
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    if (rows[i].length < 3) continue;
    const mapping = detectMapping(rows[i]);
    if (mapping.date !== null && (mapping.amount !== null || (mapping.debit !== null && mapping.credit !== null))) {
      return { headerIndex: i, mapping };
    }
  }
  return null;
}

/** Bekannte Bank anhand typischer Spaltennamen erraten (nur zur Anzeige). */
export function guessBank(header: string[]): string | null {
  const h = new Set(header.map(normalizeHeader));
  if (h.has("beguenstigter zahlungspflichtiger") && h.has("auftragskonto")) return "Sparkasse";
  if (h.has("auftraggeber empfaenger") && h.has("buchung")) return "ING";
  if (h.has("zahlungsempfaenger in") || h.has("zahlungspflichtige r")) return "DKB";
  if (h.has("umsatz in eur")) return "comdirect";
  if (h.has("name zahlungsbeteiligter")) return "Volksbank / Raiffeisenbank";
  if (h.has("partner name") || h.has("payee")) return "N26";
  return null;
}

// ---------------------------------------------------------------------------
// Werte parsen
// ---------------------------------------------------------------------------

/** "01.11.2026", "01.11.26", "2026-11-01", "01/11/2026" -> "2026-11-01" */
export function parseDate(value: string): string | null {
  const v = value.trim();
  let y: number, m: number, d: number;
  let match = v.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2}|\d{4})$/);
  if (match) {
    d = +match[1];
    m = +match[2];
    y = match[3].length === 2 ? 2000 + +match[3] : +match[3];
  } else if ((match = v.match(/^(\d{4})-(\d{2})-(\d{2})/))) {
    y = +match[1];
    m = +match[2];
    d = +match[3];
  } else {
    return null;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * Betrag mit Vorzeichen in Cent. Versteht deutsches ("-1.234,56") und
 * englisches ("-1,234.56") Format, Währungszeichen und nachgestelltes Minus.
 */
export function parseSignedAmount(value: string): number | null {
  let v = value.replace(/\s|€|eur/gi, "");
  if (!v) return null;
  let negative = false;
  if (v.startsWith("-") || v.startsWith("−")) {
    negative = true;
    v = v.slice(1);
  } else if (v.startsWith("+")) {
    v = v.slice(1);
  }
  if (v.endsWith("-")) {
    negative = true;
    v = v.slice(0, -1);
  }
  // Dezimaltrenner = letztes Komma/Punkt, wenn danach 1-2 Ziffern folgen
  const dec = v.match(/[.,](\d{1,2})$/);
  let intPart = v;
  let fracPart = "";
  if (dec) {
    intPart = v.slice(0, dec.index);
    fracPart = dec[1];
  }
  intPart = intPart.replace(/[.,']/g, "");
  if (!/^\d+$/.test(intPart || "0") || !/^\d*$/.test(fracPart)) return null;
  const cents = parseInt(intPart || "0", 10) * 100 + parseInt(fracPart.padEnd(2, "0") || "0", 10);
  return negative ? -cents : cents;
}

// ---------------------------------------------------------------------------
// Zeilen extrahieren
// ---------------------------------------------------------------------------

export type ExtractResult = {
  rows: ParsedRow[];
  /** Zeilen, die kein gültiges Datum/keinen Betrag hatten (z.B. Saldo-Zeilen am Ende). */
  skipped: number;
};

export function extractRows(
  rows: string[][],
  headerIndex: number,
  mapping: ColumnMapping,
  options: { invertSign?: boolean } = {},
): ExtractResult {
  const out: ParsedRow[] = [];
  let skipped = 0;
  const cell = (r: string[], i: number | null) => (i === null ? "" : (r[i] ?? "").trim());

  for (const r of rows.slice(headerIndex + 1)) {
    const date = parseDate(cell(r, mapping.date));
    let amount: number | null = null;
    if (mapping.amount !== null) {
      amount = parseSignedAmount(cell(r, mapping.amount));
    } else if (mapping.debit !== null || mapping.credit !== null) {
      const debit = parseSignedAmount(cell(r, mapping.debit)) ?? 0;
      const credit = parseSignedAmount(cell(r, mapping.credit)) ?? 0;
      // Soll-Spalten enthalten teils positive, teils negative Werte
      amount = Math.abs(credit) - Math.abs(debit);
    }
    if (!date || amount === null || amount === 0) {
      skipped++;
      continue;
    }
    if (options.invertSign) amount = -amount;

    const counterparty =
      amount > 0 && mapping.counterpartyIncome !== null
        ? cell(r, mapping.counterpartyIncome) || cell(r, mapping.counterparty)
        : cell(r, mapping.counterparty);

    out.push({
      date,
      amountCents: amount,
      counterparty: counterparty.replace(/\s+/g, " ").slice(0, 200),
      purpose: cell(r, mapping.purpose).replace(/\s+/g, " ").slice(0, 500),
    });
  }
  return { rows: out, skipped };
}
