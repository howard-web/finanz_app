/**
 * Wandelt eine Betragseingabe in Cent um. Versteht deutsche und englische
 * Schreibweise: "12,50", "12.50", "1.234,56", "1,234.56", "1.234", "-150".
 * Regel: Das letzte Komma bzw. der letzte Punkt ist nur dann Dezimaltrenner,
 * wenn danach 1–2 Ziffern folgen; sonst sind es Tausendertrenner.
 * Gibt null zurück, wenn die Eingabe keine gültige Zahl ist.
 */
export function parseAmountToCents(input: string): number | null {
  let s = input.trim().replace(/[\s€]|eur/gi, "");
  if (!s) return null;
  let negative = false;
  if (/^[-−]/.test(s)) {
    negative = true;
    s = s.slice(1);
  }
  const dec = s.match(/[.,](\d{1,2})$/);
  let intPart = dec ? s.slice(0, dec.index) : s;
  const fracPart = dec ? dec[1].padEnd(2, "0") : "00";
  // Tausendertrenner nur in korrekten Dreiergruppen akzeptieren
  if (/[.,]/.test(intPart)) {
    if (!/^\d{1,3}([.,]\d{3})+$/.test(intPart)) return null;
    intPart = intPart.replace(/[.,]/g, "");
  }
  if (!/^\d+$/.test(intPart)) return null;
  const cents = parseInt(intPart, 10) * 100 + parseInt(fracPart, 10);
  return negative ? -cents : cents;
}

/** Zahl wie Aktienanzahl oder Prozentsatz: "1,5" und "1.5" werden beide akzeptiert. */
export function parseDecimal(input: string): number | null {
  const s = input.trim().replace(/\s/g, "");
  if (!/^\d+([.,]\d+)?$/.test(s)) return null;
  return Number(s.replace(",", "."));
}
