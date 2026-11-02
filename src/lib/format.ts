import type { Locale } from "@/i18n/config";

/** Intl-Locale je App-Sprache. Englisch mit britischen Konventionen (Tag/Monat/Jahr, € vor der Zahl). */
export const INTL_LOCALE: Record<Locale, string> = { de: "de-DE", en: "en-GB" };

export type Formatters = ReturnType<typeof build>;

function build(locale: Locale) {
  const intl = INTL_LOCALE[locale];
  const eurFmt = new Intl.NumberFormat(intl, { style: "currency", currency: "EUR" });
  const eurCompact = new Intl.NumberFormat(intl, { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1 });
  const pctFmt = new Intl.NumberFormat(intl, { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "exceptZero" });
  const pct1 = new Intl.NumberFormat(intl, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const rateFmt = new Intl.NumberFormat(intl, { style: "percent", maximumFractionDigits: 3 });
  const dateFmt = new Intl.DateTimeFormat(intl, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
  const dateLongFmt = new Intl.DateTimeFormat(intl, { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
  const dateShortFmt = new Intl.DateTimeFormat(intl, { day: "2-digit", month: "short", timeZone: "UTC" });
  const monthFmt = new Intl.DateTimeFormat(intl, { month: "long", year: "numeric", timeZone: "UTC" });
  const dateTimeFmt = new Intl.DateTimeFormat(intl, { dateStyle: "short", timeStyle: "short" });

  return {
    locale,
    intl,
    /** Cent-Betrag als Euro, z.B. 123456 -> "1.234,56 €" / "€1,234.56" */
    cents: (cents: number) => eurFmt.format(cents / 100),
    eur: (amount: number) => eurFmt.format(amount),
    eurCompact: (amount: number) => eurCompact.format(amount),
    /** Betrag in beliebiger Währung (GBp als Pence). */
    money(amount: number, currency: string) {
      if (currency === "GBp" || currency === "GBX") {
        return `${amount.toLocaleString(intl, { maximumFractionDigits: 2 })} GBp`;
      }
      try {
        return new Intl.NumberFormat(intl, { style: "currency", currency }).format(amount);
      } catch {
        return `${amount.toLocaleString(intl, { maximumFractionDigits: 2 })} ${currency}`;
      }
    },
    /** Prozent mit Vorzeichen, z.B. "+12,34 %" */
    percent: (value: number) => pctFmt.format(value),
    /** Anteil ohne Vorzeichen, eine Nachkommastelle, z.B. "12,3 %" */
    share: (value: number) => pct1.format(value),
    /** Satz mit bis zu 3 Nachkommastellen, z.B. Steuersatz "26,375 %" */
    rate: (value: number) => rateFmt.format(value),
    number: (value: number, maxFractionDigits = 4) => value.toLocaleString(intl, { maximumFractionDigits: maxFractionDigits }),
    date: (d: Date) => dateFmt.format(d),
    dateLong: (d: Date) => dateLongFmt.format(d),
    dateShort: (d: Date) => dateShortFmt.format(d),
    dateTime: (d: Date) => dateTimeFmt.format(d),
    /** "2026-11" -> "November 2026" */
    month(month: string) {
      const [y, m] = month.split("-").map(Number);
      return monthFmt.format(new Date(Date.UTC(y, m - 1, 1)));
    },
    /** Cent -> Eingabewert im Formular, z.B. "12,50" / "12.50" */
    centsInput: (cents: number) => {
      const s = (cents / 100).toFixed(2);
      return locale === "de" ? s.replace(".", ",") : s;
    },
    /** Zahl -> Eingabewert (Anzahl Aktien, Steuersatz) */
    numberInput: (value: number) => (locale === "de" ? String(value).replace(".", ",") : String(value)),
  };
}

const cache = new Map<Locale, Formatters>();

export function getFormatters(locale: Locale): Formatters {
  let f = cache.get(locale);
  if (!f) {
    f = build(locale);
    cache.set(locale, f);
  }
  return f;
}
