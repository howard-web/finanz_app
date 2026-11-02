import "server-only";
import { db } from "@/lib/db";
import { getQuotes, getHistory } from "@/lib/market/yahoo";
import { getFxRates } from "@/lib/market/fx";
import { getDividendTotalsBySymbol } from "@/lib/dividends";
import type { Asset } from "@/generated/prisma/client";

export type Position = {
  symbol: string;
  name: string | null;
  currency: string;
  shares: number;
  /** Durchschnittlicher Kaufpreis in Handelswährung. */
  avgBuyPrice: number;
  price: number | null;
  /** Werte in EUR (Kosten mit aktuellem FX-Kurs umgerechnet). */
  valueEUR: number | null;
  costEUR: number | null;
  pnlEUR: number | null;
  pnlPct: number | null;
  /** Erhaltene Dividenden (netto, gebucht/verknüpft) in EUR. */
  dividendsEUR: number;
  stale: boolean;
  fetchedAt: Date | null;
  lots: Asset[];
};

export type PortfolioSummary = {
  positions: Position[];
  totalValueEUR: number;
  totalCostEUR: number;
  totalPnlEUR: number;
  totalPnlPct: number | null;
  totalDividendsEUR: number;
  /** Kursgewinn + Dividenden */
  totalReturnEUR: number;
  totalReturnPct: number | null;
  /** Mindestens ein Kurs ist veraltet oder fehlt. */
  hasStaleData: boolean;
  missingSymbols: string[];
};

export async function getPortfolio(): Promise<PortfolioSummary> {
  const assets = await db.asset.findMany({ orderBy: [{ symbol: "asc" }, { buyDate: "asc" }] });

  const groups = new Map<string, Asset[]>();
  for (const a of assets) groups.set(a.symbol, [...(groups.get(a.symbol) ?? []), a]);

  const quotes = await getQuotes([...groups.keys()]);
  const [fx, dividends] = await Promise.all([
    getFxRates(assets.map((a) => a.currency)),
    getDividendTotalsBySymbol(),
  ]);

  const positions: Position[] = [];
  for (const [symbol, lots] of groups) {
    const shares = lots.reduce((s, l) => s + l.shares, 0);
    const cost = lots.reduce((s, l) => s + l.shares * (l.buyPriceCents / 100), 0);
    const currency = lots[0].currency;
    const quote = quotes.get(symbol);
    const rate = fx.rate(currency);
    const price = quote?.price ?? null;

    const valueEUR = price !== null && rate !== null ? shares * price * rate : null;
    const costEUR = rate !== null ? cost * rate : null;
    const pnlEUR = valueEUR !== null && costEUR !== null ? valueEUR - costEUR : null;

    positions.push({
      symbol,
      name: quote?.name ?? lots[0].name,
      currency,
      shares,
      avgBuyPrice: cost / shares,
      price,
      valueEUR,
      costEUR,
      pnlEUR,
      pnlPct: pnlEUR !== null && costEUR ? pnlEUR / costEUR : null,
      dividendsEUR: dividends.get(symbol) ?? 0,
      stale: !quote || quote.stale || fx.stale,
      fetchedAt: quote?.fetchedAt ?? null,
      lots,
    });
  }

  const priced = positions.filter((p) => p.valueEUR !== null && p.costEUR !== null);
  const totalValueEUR = priced.reduce((s, p) => s + (p.valueEUR ?? 0), 0);
  const totalCostEUR = priced.reduce((s, p) => s + (p.costEUR ?? 0), 0);
  const totalPnlEUR = totalValueEUR - totalCostEUR;
  const totalDividendsEUR = positions.reduce((s, p) => s + p.dividendsEUR, 0);
  const totalReturnEUR = totalPnlEUR + totalDividendsEUR;

  return {
    positions: positions.sort((a, b) => (b.valueEUR ?? 0) - (a.valueEUR ?? 0)),
    totalValueEUR,
    totalCostEUR,
    totalPnlEUR,
    totalPnlPct: totalCostEUR ? totalPnlEUR / totalCostEUR : null,
    totalDividendsEUR,
    totalReturnEUR,
    totalReturnPct: totalCostEUR ? totalReturnEUR / totalCostEUR : null,
    hasStaleData: positions.some((p) => p.stale),
    missingSymbols: positions.filter((p) => p.valueEUR === null).map((p) => p.symbol),
  };
}

export type ValuePoint = { date: string; value: number };

/**
 * Depotwert über die Zeit: historische Schlusskurse × Bestand ab Kaufdatum.
 * Vereinfachung: Umrechnung nach EUR mit dem aktuellen FX-Kurs.
 */
export async function getPortfolioHistory(): Promise<ValuePoint[]> {
  const assets = await db.asset.findMany();
  if (assets.length === 0) return [];

  const fx = await getFxRates(assets.map((a) => a.currency));
  const bySymbol = new Map<string, Asset[]>();
  for (const a of assets) bySymbol.set(a.symbol, [...(bySymbol.get(a.symbol) ?? []), a]);

  const series = await Promise.all(
    [...bySymbol.entries()].map(async ([symbol, lots]) => {
      const from = new Date(Math.min(...lots.map((l) => l.buyDate.getTime())));
      const history = await getHistory(symbol, from);
      return { lots, history, rate: fx.rate(lots[0].currency) ?? 0 };
    }),
  );

  const dates = [...new Set(series.flatMap((s) => s.history.map((h) => h.date)))].sort();
  const cursor = series.map(() => -1);

  return dates.map((date) => {
    let value = 0;
    series.forEach((s, i) => {
      // letzten bekannten Schlusskurs bis einschließlich `date` finden
      while (cursor[i] + 1 < s.history.length && s.history[cursor[i] + 1].date <= date) {
        cursor[i]++;
      }
      if (cursor[i] < 0) return;
      const close = s.history[cursor[i]].close;
      const shares = s.lots
        .filter((l) => l.buyDate.toISOString().slice(0, 10) <= date)
        .reduce((sum, l) => sum + l.shares, 0);
      value += shares * close * s.rate;
    });
    return { date, value: Math.round(value * 100) / 100 };
  });
}
