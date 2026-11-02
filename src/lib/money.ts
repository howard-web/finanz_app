const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

/** Formatiert einen Cent-Betrag als Euro, z.B. 123456 -> "1.234,56 €". */
export function formatCents(cents: number): string {
  return eurFormatter.format(cents / 100);
}

/** Formatiert einen Euro-Betrag (Float). */
export function formatEUR(amount: number): string {
  return eurFormatter.format(amount);
}

/** Formatiert einen Betrag in beliebiger Währung (GBp wird als Pence angezeigt). */
export function formatMoney(amount: number, currency: string): string {
  if (currency === "GBp" || currency === "GBX") {
    return `${amount.toLocaleString("de-DE", { maximumFractionDigits: 2 })} GBp`;
  }
  try {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toLocaleString("de-DE", { maximumFractionDigits: 2 })} ${currency}`;
  }
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: "exceptZero",
  }).format(value);
}

/**
 * Wandelt eine Eingabe wie "12,50", "12.50" oder "1.234,56" in Cent um.
 * Gibt null zurück, wenn die Eingabe keine gültige Zahl ist.
 */
export function parseAmountToCents(input: string): number | null {
  let s = input.trim().replace(/\s|€/g, "");
  if (!s) return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.234" ohne Komma = Tausenderpunkt
    s = s.replace(/\./g, "");
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Math.round(parseFloat(s) * 100);
}

/** Cent -> String für Formular-Vorbelegung, z.B. 1250 -> "12,50". */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
