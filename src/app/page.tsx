import { Suspense } from "react";
import Link from "next/link";
import { HandCoins } from "lucide-react";
import { connection } from "next/server";
import { ExpenseBars } from "@/components/charts/ExpenseBars";
import { PortfolioLine } from "@/components/charts/PortfolioLine";
import { MonthFilter } from "@/components/MonthFilter";
import { EmptyState, Notice, PageHeader, Skeleton, StatCard } from "@/components/ui";
import { getCashBalance, getExpensesByCategory, getMonthlyFixedCostsCents } from "@/lib/cashflow";
import { currentMonth, formatDate, formatMonth, isValidMonth } from "@/lib/dates";
import { formatCents, formatEUR, formatPercent } from "@/lib/money";
import { getDividendProposals } from "@/lib/dividends";
import { getPortfolio, getPortfolioHistory } from "@/lib/portfolio";
import { materializeRecurring } from "@/lib/recurring";

export default function DashboardPage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Dein Überblick über Konto, Depot und Ausgaben" />
      <Suspense fallback={null}>
        <DividendNotice />
      </Suspense>
      <Suspense fallback={<StatsSkeleton />}>
        <Stats />
      </Suspense>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-80" />}>
          <ExpensesCard searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-80" />}>
          <PortfolioCard />
        </Suspense>
      </div>
    </>
  );
}

async function DividendNotice() {
  await connection();
  const { proposals } = await getDividendProposals();
  if (proposals.length === 0) return null;
  const gross = proposals.reduce((s, p) => s + p.grossEUR, 0);
  return (
    <Link
      href="/dividends"
      className="mb-5 flex items-center justify-between gap-2 rounded-xl border border-accent-line bg-accent-soft px-4 py-3 text-sm text-accent-ink hover:bg-accent/15"
    >
      <span>
        <HandCoins aria-hidden className="mr-2 inline size-[1.1em] align-[-0.15em]" />
        {proposals.length} neue Dividende{proposals.length === 1 ? "" : "n"} erkannt ({formatEUR(gross)} brutto). Jetzt prüfen und buchen.
      </span>
      <span aria-hidden>→</span>
    </Link>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}

async function Stats() {
  await connection();
  await materializeRecurring();
  const [cash, portfolio, fixedCents] = await Promise.all([
    getCashBalance(),
    getPortfolio(),
    getMonthlyFixedCostsCents(),
  ]);
  const netWorth = cash.balanceCents / 100 + portfolio.totalValueEUR;

  return (
    <>
      {portfolio.hasStaleData && <Notice>Einige Kurse sind veraltet. Net Worth basiert auf den zuletzt bekannten Werten.</Notice>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard featured label="Net Worth" value={formatEUR(netWorth)} hint="Kontostand + Depotwert" />
        <StatCard
          label="Kontostand"
          value={formatCents(cash.balanceCents)}
          tone={cash.balanceCents < 0 ? "negative" : "neutral"}
          hint={
            cash.opening ? (
              <>Startguthaben {formatCents(cash.opening.cents)} am {formatDate(cash.opening.date)} + Buchungen</>
            ) : (
              <>
                Saldo aller Buchungen ·{" "}
                <Link href="/settings" className="underline">Startguthaben setzen</Link>
              </>
            )
          }
        />
        <StatCard
          label="Depotwert"
          value={formatEUR(portfolio.totalValueEUR)}
          hint={
            portfolio.positions.length > 0 ? (
              <span className={portfolio.totalPnlEUR >= 0 ? "text-pos" : "text-neg"}>
                G/V {formatEUR(portfolio.totalPnlEUR)}
                {portfolio.totalPnlPct !== null && ` (${formatPercent(portfolio.totalPnlPct)})`}
              </span>
            ) : (
              "noch keine Positionen"
            )
          }
        />
        <StatCard label="Fixkosten / Monat" value={formatCents(fixedCents)} hint={<Link href="/recurring" className="underline">Abos ansehen</Link>} />
      </div>
    </>
  );
}

async function ExpensesCard({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  await connection();
  const { month: monthParam } = await searchParams;
  const month = isValidMonth(monthParam) ? monthParam : currentMonth();
  await materializeRecurring();
  const rows = await getExpensesByCategory(month);
  const total = rows.reduce((s, r) => s + r.cents, 0);
  const data = rows.map((r) => ({ category: r.category, amount: r.cents / 100, share: r.cents / total }));

  return (
    <section className="card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Ausgaben nach Kategorie</h2>
          <p className="text-sm text-ink-3">
            {formatMonth(month)}: {formatCents(total)}
          </p>
        </div>
        <MonthFilter month={month} basePath="/" />
      </div>
      {data.length > 0 ? <ExpenseBars data={data} /> : <EmptyState>Keine Ausgaben in diesem Monat.</EmptyState>}
    </section>
  );
}

async function PortfolioCard() {
  await connection();
  const history = await getPortfolioHistory();
  return (
    <section className="card">
      <h2 className="font-semibold">Depotwert-Entwicklung</h2>
      <p className="mb-2 text-sm text-ink-3">Historische Schlusskurse × Bestand ab Kaufdatum, in EUR</p>
      {history.length > 1 ? (
        <PortfolioLine data={history} />
      ) : (
        <EmptyState>
          Noch keine Kursdaten. <Link href="/portfolio" className="underline">Wertpapier hinzufügen</Link>
        </EmptyState>
      )}
    </section>
  );
}
