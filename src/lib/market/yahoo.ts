import "server-only";
import YahooFinance from "yahoo-finance2";
import { cacheLife } from "next/cache";
import { db } from "@/lib/db";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

/** Kurse werden höchstens alle 6 Stunden neu geholt (End-of-Day reicht). */
const QUOTE_TTL_MS = 6 * 60 * 60 * 1000;

export type Quote = {
  symbol: string;
  price: number;
  currency: string;
  name: string | null;
  fetchedAt: Date;
  /** true, wenn Yahoo nicht erreichbar war und ein älterer Kurs genutzt wird. */
  stale: boolean;
};

type YahooQuote = {
  symbol: string;
  regularMarketPrice?: number;
  currency?: string;
  shortName?: string;
  longName?: string;
};

async function fetchFromYahoo(symbols: string[]): Promise<YahooQuote[]> {
  const result = await yf.quote(symbols, { return: "array" }, { validateResult: false });
  return result as YahooQuote[];
}

async function saveToCache(quotes: YahooQuote[]): Promise<Quote[]> {
  const now = new Date();
  const saved: Quote[] = [];
  for (const q of quotes) {
    if (typeof q.regularMarketPrice !== "number" || !q.currency) continue;
    const data = {
      price: q.regularMarketPrice,
      currency: q.currency,
      name: q.longName ?? q.shortName ?? null,
      fetchedAt: now,
    };
    await db.priceCache.upsert({
      where: { symbol: q.symbol },
      create: { symbol: q.symbol, ...data },
      update: data,
    });
    saved.push({ symbol: q.symbol, ...data, stale: false });
  }
  return saved;
}

/**
 * Liefert aktuelle Kurse für mehrere Symbole. Nutzt den DB-Cache und fragt
 * Yahoo nur für fehlende oder veraltete Einträge (gebündelt in einem Request).
 */
export async function getQuotes(symbols: string[]): Promise<Map<string, Quote>> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const result = new Map<string, Quote>();
  if (unique.length === 0) return result;

  const cached = await db.priceCache.findMany({ where: { symbol: { in: unique } } });
  const now = Date.now();
  for (const row of cached) {
    result.set(row.symbol, {
      ...row,
      stale: now - row.fetchedAt.getTime() > QUOTE_TTL_MS,
    });
  }

  const toFetch = unique.filter((s) => {
    const q = result.get(s);
    return !q || q.stale;
  });
  if (toFetch.length === 0) return result;

  try {
    const fresh = await saveToCache(await fetchFromYahoo(toFetch));
    for (const q of fresh) result.set(q.symbol, q);
  } catch (err) {
    // Yahoo nicht erreichbar: alte Kurse bleiben mit stale=true stehen.
    console.error("[yahoo] quote fehlgeschlagen:", (err as Error).message);
  }
  return result;
}

/**
 * Prüft ein Ticker-Symbol direkt bei Yahoo (ohne Cache) und speichert den Kurs.
 * Gibt null zurück, wenn das Symbol unbekannt ist.
 * Wirft, wenn Yahoo nicht erreichbar ist.
 */
export async function lookupSymbol(symbol: string): Promise<Quote | null> {
  const quotes = await fetchFromYahoo([symbol.toUpperCase()]);
  const [saved] = await saveToCache(quotes);
  return saved ?? null;
}

export type HistoryPoint = { date: string; close: number };

async function fetchHistoryCached(symbol: string, fromISO: string): Promise<HistoryPoint[]> {
  "use cache";
  cacheLife("hours");

  const from = new Date(fromISO);
  const ageDays = (Date.now() - from.getTime()) / 86_400_000;
  const chart = (await yf.chart(
    symbol,
    { period1: from, interval: ageDays > 730 ? "1wk" : "1d" },
    { validateResult: false },
  )) as { quotes: { date: Date | string; close?: number | null }[] };
  return chart.quotes
    .filter((q) => typeof q.close === "number")
    .map((q) => ({ date: new Date(q.date).toISOString().slice(0, 10), close: q.close as number }));
}

/** Historische Schlusskurse ab `from`. Bei Fehlern leeres Array. */
export async function getHistory(symbol: string, from: Date): Promise<HistoryPoint[]> {
  try {
    return await fetchHistoryCached(symbol.toUpperCase(), from.toISOString().slice(0, 10));
  } catch (err) {
    console.error(`[yahoo] chart ${symbol} fehlgeschlagen:`, (err as Error).message);
    return [];
  }
}

export type DividendEvent = {
  /** Ex-Tag als YYYY-MM-DD */
  exDate: string;
  /** Betrag pro Aktie in Handelswährung (brutto) */
  amount: number;
};

async function fetchDividendsCached(symbol: string, fromISO: string): Promise<DividendEvent[]> {
  "use cache";
  cacheLife("hours");

  const chart = (await yf.chart(
    symbol,
    { period1: new Date(fromISO), interval: "1mo", events: "div" },
    { validateResult: false },
  )) as { events?: { dividends?: { amount: number; date: Date | string }[] } };
  return (chart.events?.dividends ?? [])
    .filter((d) => typeof d.amount === "number" && d.amount > 0)
    .map((d) => ({ exDate: new Date(d.date).toISOString().slice(0, 10), amount: d.amount }));
}

/** Dividenden (Ex-Tage) ab `from`. Bei Fehlern leeres Array. */
export async function getDividends(symbol: string, from: Date): Promise<DividendEvent[]> {
  try {
    return await fetchDividendsCached(symbol.toUpperCase(), from.toISOString().slice(0, 10));
  } catch (err) {
    console.error(`[yahoo] dividends ${symbol} fehlgeschlagen:`, (err as Error).message);
    return [];
  }
}
