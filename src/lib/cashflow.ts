import "server-only";
import { db } from "@/lib/db";
import { monthRange } from "@/lib/dates";
import { INTERVALS_PER_YEAR, type RecurringInterval } from "@/lib/categories";

export type CashBalance = {
  /** Aktueller Kontostand in Cent (Startguthaben + Buchungen nach dem Stichtag). */
  balanceCents: number;
  /** Startguthaben, falls gesetzt. */
  opening: { cents: number; date: Date } | null;
  /** Summe der Buchungen, die in den Kontostand einfließen. */
  flowCents: number;
  /** Buchungen am/vor dem Stichtag, die ignoriert werden (im Startguthaben enthalten). */
  ignoredCount: number;
};

/**
 * Kontostand: Startguthaben am Ende des Stichtags + alle Buchungen danach.
 * Ohne Startguthaben: Saldo aller Buchungen.
 */
export async function getCashBalance(): Promise<CashBalance> {
  const settings = await db.appSettings.findUnique({ where: { id: 1 } });
  const opening =
    settings?.openingBalanceDate != null
      ? { cents: settings.openingBalanceCents, date: settings.openingBalanceDate }
      : null;

  const where = opening ? { date: { gt: opening.date } } : {};
  const [groups, ignoredCount] = await Promise.all([
    db.transaction.groupBy({ by: ["type"], where, _sum: { amountCents: true } }),
    opening ? db.transaction.count({ where: { date: { lte: opening.date } } }) : 0,
  ]);

  let flowCents = 0;
  for (const g of groups) {
    const sum = g._sum.amountCents ?? 0;
    flowCents += g.type === "INCOME" ? sum : -sum;
  }
  return {
    balanceCents: (opening?.cents ?? 0) + flowCents,
    opening,
    flowCents,
    ignoredCount,
  };
}

export async function getMonthTotals(month: string) {
  const { start, end } = monthRange(month);
  const groups = await db.transaction.groupBy({
    by: ["type"],
    where: { date: { gte: start, lt: end } },
    _sum: { amountCents: true },
  });
  const income = groups.find((g) => g.type === "INCOME")?._sum.amountCents ?? 0;
  const expense = groups.find((g) => g.type === "EXPENSE")?._sum.amountCents ?? 0;
  return { income, expense, net: income - expense };
}

export async function getExpensesByCategory(month: string) {
  const { start, end } = monthRange(month);
  const groups = await db.transaction.groupBy({
    by: ["category"],
    where: { type: "EXPENSE", date: { gte: start, lt: end } },
    _sum: { amountCents: true },
  });
  return groups
    .map((g) => ({ category: g.category, cents: g._sum.amountCents ?? 0 }))
    .filter((g) => g.cents > 0)
    .sort((a, b) => b.cents - a.cents);
}

/** Monatliche Fixkosten aus aktiven Abo-Regeln (andere Intervalle anteilig umgerechnet, z.B. wöchentlich ×52/12). */
export async function getMonthlyFixedCostsCents(): Promise<number> {
  const rules = await db.recurringRule.findMany({ where: { active: true, type: "EXPENSE" } });
  return Math.round(
    rules.reduce(
      (s, r) => s + (r.amountCents * (INTERVALS_PER_YEAR[r.interval as RecurringInterval] ?? 12)) / 12,
      0,
    ),
  );
}
