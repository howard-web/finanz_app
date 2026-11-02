import { Suspense } from "react";
import { connection } from "next/server";
import { createTransaction } from "@/actions/transactions";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { MonthFilter } from "@/components/MonthFilter";
import { TransactionList } from "@/components/TransactionList";
import { PageHeader, Skeleton, StatCard } from "@/components/ui";
import { db } from "@/lib/db";
import { getMonthTotals } from "@/lib/cashflow";
import { currentMonth, isValidMonth, monthRange, toDateInput, todayUTC } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { materializeRecurring } from "@/lib/recurring";

export default function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  return (
    <>
      <PageHeader title="Cashflow" />
      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <section className="card h-fit">
          <h2 className="mb-4 font-semibold">Neue Buchung</h2>
          <Suspense fallback={<Skeleton className="h-96" />}>
            <NewTransactionForm />
          </Suspense>
        </section>
        <Suspense fallback={<Skeleton className="h-96" />}>
          <MonthView searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function NewTransactionForm() {
  await connection(); // "heute" muss pro Request berechnet werden
  return (
    <TransactionForm
      action={createTransaction}
      allowRecurring
      resetOnSuccess
      submitLabel="Hinzufügen"
      defaults={{ amount: "", type: "EXPENSE", category: "Lebensmittel", date: toDateInput(todayUTC()), note: "" }}
    />
  );
}

async function MonthView({ searchParams }: { searchParams: PageProps<"/transactions">["searchParams"] }) {
  await connection();
  const { month: monthParam } = await searchParams;
  const month = isValidMonth(monthParam) ? monthParam : currentMonth();

  await materializeRecurring();
  const { start, end } = monthRange(month);
  const [transactions, totals] = await Promise.all([
    db.transaction.findMany({
      where: { date: { gte: start, lt: end } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    getMonthTotals(month),
  ]);

  return (
    <section className="grid gap-4">
      <div className="flex justify-end">
        <MonthFilter month={month} basePath="/transactions" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Einnahmen" value={formatCents(totals.income)} />
        <StatCard label="Ausgaben" value={formatCents(totals.expense)} />
        <StatCard
          label="Saldo"
          value={formatCents(totals.net)}
          tone={totals.net > 0 ? "positive" : totals.net < 0 ? "negative" : "neutral"}
        />
      </div>
      <div className="card p-2">
        <TransactionList transactions={transactions} />
      </div>
    </section>
  );
}
