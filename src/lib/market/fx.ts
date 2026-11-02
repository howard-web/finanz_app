import "server-only";
import { getQuotes } from "./yahoo";

export const BASE_CURRENCY = "EUR";

/** Untereinheiten, die Yahoo für manche Börsen liefert (z.B. London in Pence). */
const SUBUNITS: Record<string, { currency: string; factor: number }> = {
  GBp: { currency: "GBP", factor: 0.01 },
  GBX: { currency: "GBP", factor: 0.01 },
  ZAc: { currency: "ZAR", factor: 0.01 },
  ILA: { currency: "ILS", factor: 0.01 },
};

function normalize(currency: string) {
  return SUBUNITS[currency] ?? { currency: currency.toUpperCase(), factor: 1 };
}

/** Yahoo-Ticker für den Kurs CUR -> EUR. USD/EUR heißt bei Yahoo "EUR=X". */
function fxSymbol(currency: string): string {
  return currency === "USD" ? "EUR=X" : `${currency}EUR=X`;
}

export type FxRates = {
  /** Multiplikator: Betrag in `currency` * rate = Betrag in EUR. */
  rate: (currency: string) => number | null;
  stale: boolean;
};

/** Holt alle nötigen Umrechnungskurse nach EUR in einem Rutsch. */
export async function getFxRates(currencies: string[]): Promise<FxRates> {
  const needed = [
    ...new Set(currencies.map((c) => normalize(c).currency).filter((c) => c !== BASE_CURRENCY)),
  ];
  const quotes = await getQuotes(needed.map(fxSymbol));
  let stale = false;
  const base = new Map<string, number>([[BASE_CURRENCY, 1]]);
  for (const cur of needed) {
    const q = quotes.get(fxSymbol(cur));
    if (q) {
      base.set(cur, q.price);
      stale ||= q.stale;
    }
  }
  return {
    stale,
    rate(currency) {
      const { currency: cur, factor } = normalize(currency);
      const r = base.get(cur);
      return r === undefined ? null : r * factor;
    },
  };
}
