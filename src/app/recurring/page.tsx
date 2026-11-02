import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { deleteRecurringRule, toggleRecurringRule } from "@/actions/recurring";
import { ActionButton, DeleteButton } from "@/components/DeleteButton";
import { EmptyState, PageHeader, Skeleton, StatCard } from "@/components/ui";
import { getMonthlyFixedCostsCents } from "@/lib/cashflow";
import { INTERVAL_LABELS, type RecurringInterval } from "@/lib/categories";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { materializeRecurring } from "@/lib/recurring";

export default function RecurringPage() {
  return (
    <>
      <PageHeader title="Abos & Daueraufträge">
        <Link href="/transactions" className="btn-secondary">
          + Neu (über Cashflow)
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
  await materializeRecurring();
  const [rules, fixedCosts] = await Promise.all([
    db.recurringRule.findMany({
      orderBy: [{ active: "desc" }, { type: "asc" }, { amountCents: "desc" }],
      include: { _count: { select: { transactions: true } } },
    }),
    getMonthlyFixedCostsCents(),
  ]);

  if (rules.length === 0) {
    return (
      <EmptyState>
        Noch keine wiederkehrenden Buchungen. Lege eine Buchung im Cashflow an und setze den Haken bei „Wiederkehrend“.
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Fixkosten pro Monat" value={formatCents(fixedCosts)} hint="andere Intervalle anteilig umgerechnet" />
        <StatCard label="Fixkosten pro Jahr" value={formatCents(fixedCosts * 12)} />
        <StatCard label="Aktive Regeln" value={String(rules.filter((r) => r.active).length)} />
      </div>
      <div className="card overflow-x-auto p-2">
        <table className="w-full">
          <thead className="border-b border-line">
            <tr>
              <th className="th-cell">Kategorie</th>
              <th className="th-cell">Notiz</th>
              <th className="th-cell">Intervall</th>
              <th className="th-cell">Nächste Buchung</th>
              <th className="th-cell text-right">Betrag</th>
              <th className="th-cell" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {rules.map((r) => (
              <tr key={r.id} className={r.active ? "" : "text-ink-4"}>
                <td className="td-cell">{r.category}</td>
                <td className="td-cell text-ink-3">{r.note}</td>
                <td className="td-cell">{INTERVAL_LABELS[r.interval as RecurringInterval]}</td>
                <td className="td-cell tabular-nums">
                  {r.active ? formatDate(r.nextDue) : <span className="text-xs font-medium">pausiert</span>}
                  <div className="text-xs text-ink-4">{r._count.transactions} gebucht seit {formatDate(r.startDate)}</div>
                </td>
                <td className={`td-cell text-right font-medium tabular-nums ${r.type === "INCOME" ? "text-pos" : ""}`}>
                  {r.type === "INCOME" ? "+" : "−"}
                  {formatCents(r.amountCents)}
                </td>
                <td className="td-cell text-right whitespace-nowrap">
                  <Link href={`/recurring/${r.id}/edit`} className="btn-ghost">Bearbeiten</Link>
                  <ActionButton action={toggleRecurringRule.bind(null, r.id)}>
                    {r.active ? "Pausieren" : "Fortsetzen"}
                  </ActionButton>
                  <DeleteButton action={deleteRecurringRule.bind(null, r.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-3">
        Beim Löschen einer Regel bleiben bereits gebuchte Transaktionen erhalten. Beim Fortsetzen werden verpasste Termine nicht nachgebucht.
      </p>
    </div>
  );
}
