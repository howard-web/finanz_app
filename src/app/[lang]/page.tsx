import { Suspense } from "react";
import Link from "next/link";
import { HandCoins } from "lucide-react";
import { connection } from "next/server";
import { ExpenseDonut } from "@/components/charts/ExpenseDonut";
import { PortfolioLine } from "@/components/charts/PortfolioLine";
import { MonthFilter } from "@/components/MonthFilter";
import { EmptyState, Notice, PageHeader, Skeleton, StatCard, toneOf } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { tf } from "@/i18n/translate";
import { getCashBalance, getExpensesByCategory, getMonthlyFixedCostsCents } from "@/lib/cashflow";
import { currentMonth, isValidMonth } from "@/lib/dates";
import { getDividendProposals } from "@/lib/dividends";
import { getPortfolio, getPortfolioHistory } from "@/lib/portfolio";
import { materializeRecurring } from "@/lib/recurring";

export default async function DashboardPage({ searchParams }: PageProps<"/[lang]">) {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t.dashboard.title} subtitle={t.dashboard.subtitle} />
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
  const { t, fmt, href } = await getI18n();
  const { proposals } = await getDividendProposals();
  if (proposals.length === 0) return null;
  const gross = fmt.eur(proposals.reduce((s, p) => s + p.grossEUR, 0));
  return (
    <Link
      href={href("/dividends")}
      className="mb-5 flex items-center justify-between gap-2 rounded-xl border border-accent-line bg-accent-soft px-4 py-3 text-sm text-accent-ink hover:bg-accent/15"
    >
      <span>
        <HandCoins aria-hidden className="mr-2 inline size-[1.1em] align-[-0.15em]" />
        {proposals.length === 1
          ? tf(t.dashboard.dividendNoticeOne, { gross })
          : tf(t.dashboard.dividendNoticeMany, { count: proposals.length, gross })}
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
  const { t, fmt, href } = await getI18n();
  const d = t.dashboard;
  await materializeRecurring();
  const [cash, portfolio, fixedCents] = await Promise.all([
    getCashBalance(),
    getPortfolio(),
    getMonthlyFixedCostsCents(),
  ]);
  const netWorth = cash.balanceCents / 100 + portfolio.totalValueEUR;

  return (
    <>
      {portfolio.hasStaleData && <Notice>{d.staleNotice}</Notice>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard featured tone={toneOf(netWorth)} label={d.netWorth} value={fmt.eur(netWorth)} hint={d.netWorthHint} />
        <StatCard
          label={d.balance}
          value={fmt.cents(cash.balanceCents)}
          tone={toneOf(cash.balanceCents)}
          hint={
            cash.opening ? (
              tf(d.balanceWithOpening, { amount: fmt.cents(cash.opening.cents), date: fmt.date(cash.opening.date) })
            ) : (
              <>
                {d.balanceAllBookings} ·{" "}
                <Link href={href("/settings")} className="underline">{d.setOpening}</Link>
              </>
            )
          }
        />
        <StatCard
          label={d.portfolioValue}
          value={fmt.eur(portfolio.totalValueEUR)}
          hint={
            portfolio.positions.length > 0 ? (
              <span className={portfolio.totalPnlEUR >= 0 ? "text-pos" : "text-neg"}>
                {d.pnlShort} {fmt.eur(portfolio.totalPnlEUR)}
                {portfolio.totalPnlPct !== null && ` (${fmt.percent(portfolio.totalPnlPct)})`}
              </span>
            ) : (
              d.noPositions
            )
          }
        />
        <StatCard
          label={d.fixedCosts}
          value={fmt.cents(fixedCents)}
          hint={<Link href={href("/recurring")} className="underline">{d.viewSubscriptions}</Link>}
        />
      </div>
    </>
  );
}

async function ExpensesCard({ searchParams }: { searchParams: PageProps<"/[lang]">["searchParams"] }) {
  await connection();
  const { t, fmt } = await getI18n();
  const { month: monthParam } = await searchParams;
  const month = isValidMonth(monthParam) ? monthParam : currentMonth();
  await materializeRecurring();
  const rows = await getExpensesByCategory(month);
  const data = rows.map((r) => ({ category: r.category, amount: r.cents / 100 }));

  return (
    <section className="card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">{t.dashboard.expensesTitle}</h2>
          <p className="text-sm text-ink-3">{t.dashboard.expensesSubtitle}</p>
        </div>
        <MonthFilter month={month} basePath="/" />
      </div>
      {data.length > 0 ? (
        <ExpenseDonut data={data} totalLabel={fmt.month(month)} />
      ) : (
        <EmptyState>{t.dashboard.noExpenses}</EmptyState>
      )}
    </section>
  );
}

async function PortfolioCard() {
  await connection();
  const { t, href } = await getI18n();
  const history = await getPortfolioHistory();
  return (
    <section className="card">
      <h2 className="font-semibold">{t.dashboard.portfolioTitle}</h2>
      <p className="mb-2 text-sm text-ink-3">{t.dashboard.portfolioSubtitle}</p>
      {history.length > 1 ? (
        <PortfolioLine data={history} />
      ) : (
        <EmptyState>
          {t.dashboard.noPriceData} <Link href={href("/portfolio")} className="underline">{t.dashboard.addSecurity}</Link>
        </EmptyState>
      )}
    </section>
  );
}
