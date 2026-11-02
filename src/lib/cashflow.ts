import "server-only";
import { db } from "@/lib/db";
import { monthRange } from "@/lib/dates";

/** Saldo aller Buchungen (Einnahmen − Ausgaben) in Cent. */
export async function getCashBalanceCents(): Promise<number> {
  const groups = await db.transaction.groupBy({ by: ["type"], _sum: { amountCents: true } });
  let balance = 0;
  for (const g of groups) {
    const sum = g._sum.amountCents ?? 0;
    balance += g.type === "INCOME" ? sum : -sum;
  }
  return balance;
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

/** Monatliche Fixkosten aus aktiven Abo-Regeln (jährliche anteilig /12). */
export async function getMonthlyFixedCostsCents(): Promise<number> {
  const rules = await db.recurringRule.findMany({ where: { active: true, type: "EXPENSE" } });
  return Math.round(
    rules.reduce((s, r) => s + (r.interval === "YEARLY" ? r.amountCents / 12 : r.amountCents), 0),
  );
}
