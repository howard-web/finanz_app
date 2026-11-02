import "server-only";
import { db } from "@/lib/db";
import { todayUTC } from "@/lib/dates";
import { getFxRates } from "@/lib/market/fx";
import { getDividends } from "@/lib/market/yahoo";
import type { Asset } from "@/generated/prisma/client";

export const DEFAULT_DIVIDEND_TAX_RATE = 0.26375;

/** Zeitraum nach dem Ex-Tag, in dem eine Gutschrift auf dem Konto erwartet wird. */
const PAYMENT_WINDOW_DAYS = 60;

export function dividendKey(symbol: string, exDate: string) {
  return `${symbol}|${exDate}`;
}

export type DividendCandidate = {
  id: string;
  date: Date;
  amountCents: number;
  label: string;
};

export type DividendProposal = {
  key: string;
  symbol: string;
  name: string | null;
  currency: string;
  exDate: string;
  amountPerShare: number;
  /** Bestand am Ex-Tag (Käufe vor dem Ex-Tag). */
  shares: number;
  grossEUR: number;
  netEstimateEUR: number;
  /** Vorhandene, noch nicht verknüpfte Einnahme (z.B. aus CSV-Import), die passen könnte. */
  candidate: DividendCandidate | null;
};

export async function getDividendTaxRate(): Promise<number> {
  const s = await db.appSettings.findUnique({ where: { id: 1 }, select: { dividendTaxRate: true } });
  return s?.dividendTaxRate ?? DEFAULT_DIVIDEND_TAX_RATE;
}

/**
 * Offene Dividenden-Vorschläge: Ex-Tage aus Yahoo für den eigenen Bestand,
 * die weder gebucht/verknüpft noch ignoriert sind.
 */
export async function getDividendProposals(): Promise<{
  proposals: DividendProposal[];
  dismissedCount: number;
  taxRate: number;
}> {
  const [assets, taxRate, dismissals, linked] = await Promise.all([
    db.asset.findMany(),
    getDividendTaxRate(),
    db.dividendDismissal.findMany({ select: { key: true } }),
    db.transaction.findMany({ where: { dividendKey: { not: null } }, select: { dividendKey: true } }),
  ]);
  if (assets.length === 0) return { proposals: [], dismissedCount: dismissals.length, taxRate };

  const done = new Set([...dismissals.map((d) => d.key), ...linked.map((t) => t.dividendKey!)]);
  const today = todayUTC().toISOString().slice(0, 10);

  const bySymbol = new Map<string, Asset[]>();
  for (const a of assets) bySymbol.set(a.symbol, [...(bySymbol.get(a.symbol) ?? []), a]);
  const fx = await getFxRates(assets.map((a) => a.currency));

  const raw: Omit<DividendProposal, "candidate">[] = [];
  await Promise.all(
    [...bySymbol.entries()].map(async ([symbol, lots]) => {
      const firstBuy = new Date(Math.min(...lots.map((l) => l.buyDate.getTime())));
      const events = await getDividends(symbol, firstBuy);
      const rate = fx.rate(lots[0].currency);
      if (rate === null) return;

      for (const ev of events) {
        if (ev.exDate > today) continue;
        const key = dividendKey(symbol, ev.exDate);
        if (done.has(key)) continue;
        // Anspruch haben nur Aktien, die vor dem Ex-Tag gekauft wurden
        const shares = lots
          .filter((l) => l.buyDate.toISOString().slice(0, 10) < ev.exDate)
          .reduce((s, l) => s + l.shares, 0);
        if (shares <= 0) continue;

        const grossEUR = round2(shares * ev.amount * rate);
        raw.push({
          key,
          symbol,
          name: lots[0].name,
          currency: lots[0].currency,
          exDate: ev.exDate,
          amountPerShare: ev.amount,
          shares,
          grossEUR,
          netEstimateEUR: round2(grossEUR * (1 - taxRate)),
        });
      }
    }),
  );
  raw.sort((a, b) => b.exDate.localeCompare(a.exDate));

  const proposals = await attachCandidates(raw);
  return { proposals, dismissedCount: dismissals.length, taxRate };
}

/** Sucht für jeden Vorschlag eine passende, noch freie Einnahme (z.B. per CSV importiert). */
async function attachCandidates(raw: Omit<DividendProposal, "candidate">[]): Promise<DividendProposal[]> {
  if (raw.length === 0) return [];
  const minDate = new Date(raw[raw.length - 1].exDate);
  const maxDate = new Date(new Date(raw[0].exDate).getTime() + PAYMENT_WINDOW_DAYS * 86_400_000);

  const incomes = await db.transaction.findMany({
    where: { type: "INCOME", dividendKey: null, date: { gte: minDate, lte: maxDate } },
    select: { id: true, date: true, amountCents: true, category: true, counterparty: true, note: true },
  });
  const used = new Set<string>();

  return raw.map((p) => {
    const ex = new Date(p.exDate).getTime();
    const nameWord = (p.name ?? "").split(/\s+/)[0]?.toLowerCase() ?? "";
    const baseSymbol = p.symbol.split(".")[0].toLowerCase();

    const matches = incomes.filter((t) => {
      if (used.has(t.id)) return false;
      const days = (t.date.getTime() - ex) / 86_400_000;
      if (days < 0 || days > PAYMENT_WINDOW_DAYS) return false;
      const eur = t.amountCents / 100;
      // netto liegt typischerweise zwischen ~30 % (hohe Quellensteuer) und 100 % (Freibetrag) vom Brutto
      if (eur < p.grossEUR * 0.3 || eur > p.grossEUR * 1.05) return false;
      const text = `${t.counterparty ?? ""} ${t.note ?? ""}`.toLowerCase();
      return (
        t.category === "Dividende" ||
        /dividend|ertrag|ausschuett|ausschütt/.test(text) ||
        (nameWord.length > 2 && text.includes(nameWord)) ||
        text.includes(baseSymbol)
      );
    });
    matches.sort(
      (a, b) => Math.abs(a.amountCents / 100 - p.netEstimateEUR) - Math.abs(b.amountCents / 100 - p.netEstimateEUR),
    );
    const best = matches[0];
    if (!best) return { ...p, candidate: null };
    used.add(best.id);
    return {
      ...p,
      candidate: {
        id: best.id,
        date: best.date,
        amountCents: best.amountCents,
        label: [best.counterparty, best.note].filter(Boolean).join(" · ") || best.category,
      },
    };
  });
}

/** Erhaltene (gebuchte/verknüpfte) Dividenden je Symbol in EUR. */
export async function getDividendTotalsBySymbol(): Promise<Map<string, number>> {
  const groups = await db.transaction.groupBy({
    by: ["assetSymbol"],
    where: { type: "INCOME", assetSymbol: { not: null } },
    _sum: { amountCents: true },
  });
  return new Map(groups.map((g) => [g.assetSymbol!, (g._sum.amountCents ?? 0) / 100]));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
