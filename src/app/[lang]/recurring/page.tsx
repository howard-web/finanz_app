import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { deleteRecurringRule, toggleRecurringRule } from "@/actions/recurring";
import { ActionButton, DeleteButton } from "@/components/DeleteButton";
import { EmptyState, PageHeader, Skeleton, StatCard } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { categoryLabel, tf } from "@/i18n/translate";
import { getMonthlyFixedCostsCents } from "@/lib/cashflow";
import type { RecurringInterval } from "@/lib/categories";
import { db } from "@/lib/db";
import { materializeRecurring } from "@/lib/recurring";

export default async function RecurringPage() {
  const { t, href } = await getI18n();
  return (
    <>
      <PageHeader title={t.recurring.title}>
        <Link href={href("/transactions")} className="btn-secondary">
          {t.recurring.newViaCashflow}
        </Link>
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-64" />}>
        <RecurringList />
      </Suspense>
    </>
  );
}

async function RecurringList() {
  await connection();
  const { t, fmt, href } = await getI18n();
  const r_ = t.recurring;
  await materializeRecurring();
  const [rules, fixedCosts] = await Promise.all([
    db.recurringRule.findMany({
      orderBy: [{ active: "desc" }, { type: "asc" }, { amountCents: "desc" }],
      include: { _count: { select: { transactions: true } } },
    }),
    getMonthlyFixedCostsCents(),
  ]);

  if (rules.length === 0) {
    return <EmptyState>{r_.empty}</EmptyState>;
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={r_.fixedPerMonth} value={fmt.cents(fixedCosts)} hint={r_.fixedPerMonthHint} />
        <StatCard label={r_.fixedPerYear} value={fmt.cents(fixedCosts * 12)} />
        <StatCard label={r_.activeRules} value={String(rules.filter((r) => r.active).length)} />
      </div>
      <div className="card overflow-x-auto p-2">
        <table className="w-full">
          <thead className="border-b border-line">
            <tr>
              <th className="th-cell">{t.common.category}</th>
              <th className="th-cell">{t.common.note}</th>
              <th className="th-cell">{t.common.interval}</th>
              <th className="th-cell">{r_.colNextBooking}</th>
              <th className="th-cell text-right">{t.common.amount}</th>
              <th className="th-cell" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {rules.map((r) => (
              <tr key={r.id} className={r.active ? "" : "text-ink-4"}>
                <td className="td-cell">{categoryLabel(t, r.category)}</td>
                <td className="td-cell text-ink-3">{r.note}</td>
                <td className="td-cell">{t.intervals[r.interval as RecurringInterval] ?? r.interval}</td>
                <td className="td-cell tabular-nums">
                  {r.active ? fmt.date(r.nextDue) : <span className="text-xs font-medium">{r_.paused}</span>}
                  <div className="text-xs text-ink-4">{tf(r_.bookedSince, { count: r._count.transactions, date: fmt.date(r.startDate) })}</div>
                </td>
                <td className={`td-cell text-right font-medium tabular-nums ${r.type === "INCOME" ? "text-pos" : "text-neg"}`}>
                  {r.type === "INCOME" ? "+" : "−"}
                  {fmt.cents(r.amountCents)}
                </td>
                <td className="td-cell text-right whitespace-nowrap">
                  <Link href={href(`/recurring/${r.id}/edit`)} className="btn-ghost">{t.common.edit}</Link>
                  <ActionButton action={toggleRecurringRule.bind(null, r.id)}>
                    {r.active ? r_.pause : r_.resume}
                  </ActionButton>
                  <DeleteButton action={deleteRecurringRule.bind(null, r.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-3">{r_.footnote}</p>
    </div>
  );
}
