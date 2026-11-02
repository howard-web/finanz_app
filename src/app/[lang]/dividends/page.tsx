import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { deleteDividendTransaction, restoreDismissedDividends, unlinkDividend } from "@/actions/dividends";
import { ActionButton, DeleteButton } from "@/components/DeleteButton";
import { ProposalRow, type ProposalView } from "@/components/dividends/ProposalRow";
import { EmptyState, PageHeader, Skeleton, StatCard, toneOf } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { tf } from "@/i18n/translate";
import { db } from "@/lib/db";
import { todayUTC } from "@/lib/dates";
import { getDividendProposals } from "@/lib/dividends";

export default async function DividendsPage() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t.dividends.title} />
      <div className="grid gap-8">
        <Suspense fallback={<Skeleton className="h-24" />}>
          <Totals />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-48" />}>
          <Proposals />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-48" />}>
          <Received />
        </Suspense>
      </div>
    </>
  );
}

async function Totals() {
  await connection();
  const { t, fmt } = await getI18n();
  const d = t.dividends;
  const year = todayUTC().getUTCFullYear();
  const rows = await db.transaction.findMany({
    where: { type: "INCOME", assetSymbol: { not: null } },
    select: { amountCents: true, date: true },
  });
  const sumYear = (y: number) =>
    rows.filter((r) => r.date.getUTCFullYear() === y).reduce((s, r) => s + r.amountCents, 0);
  const total = rows.reduce((s, r) => s + r.amountCents, 0);

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard label={tf(d.receivedYear, { year })} value={fmt.cents(sumYear(year))} tone={toneOf(sumYear(year))} hint={d.receivedYearHint} />
      <StatCard label={tf(d.receivedYear, { year: year - 1 })} value={fmt.cents(sumYear(year - 1))} tone={toneOf(sumYear(year - 1))} />
      <StatCard
        label={d.receivedTotal}
        value={fmt.cents(total)}
        tone={toneOf(total)}
        hint={rows.length === 1 ? d.paymentsOne : tf(d.paymentsMany, { count: rows.length })}
      />
    </div>
  );
}

async function Proposals() {
  await connection();
  const { t, fmt, href } = await getI18n();
  const d = t.dividends;
  const { proposals, dismissedCount, taxRate } = await getDividendProposals();

  const views: ProposalView[] = proposals.map((p) => ({
    key: p.key,
    symbol: p.symbol,
    name: p.name,
    currency: p.currency,
    exDate: p.exDate,
    amountPerShare: p.amountPerShare,
    shares: p.shares,
    grossEUR: p.grossEUR,
    netEstimateEUR: p.netEstimateEUR,
    candidate: p.candidate && {
      id: p.candidate.id,
      date: p.candidate.date.toISOString().slice(0, 10),
      amountCents: p.candidate.amountCents,
      label: p.candidate.label,
    },
  }));

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">
          {d.newTitle} {views.length > 0 && <span className="text-ink-3">({views.length})</span>}
        </h2>
        {dismissedCount > 0 && (
          <span className="text-xs text-ink-3">
            {tf(d.dismissed, { count: dismissedCount })} · <ActionButton action={restoreDismissedDividends}>{d.showAgain}</ActionButton>
          </span>
        )}
      </div>
      {views.length === 0 ? (
        <EmptyState>{d.empty}</EmptyState>
      ) : (
        <>
          <div className="card divide-y divide-line-soft p-0">
            {views.map((p) => (
              <ProposalRow key={p.key} p={p} taxRate={taxRate} />
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-3">
            {tf(d.footnoteBefore, { rate: fmt.rate(taxRate) })} (
            <Link href={href("/settings")} className="underline">{d.footnoteChange}</Link>). {d.footnoteAfter}
          </p>
        </>
      )}
    </section>
  );
}

async function Received() {
  await connection();
  const { t, fmt } = await getI18n();
  const d = t.dividends;
  const rows = await db.transaction.findMany({
    where: { type: "INCOME", assetSymbol: { not: null } },
    orderBy: { date: "desc" },
    take: 200,
  });
  if (rows.length === 0) return null;

  const bySymbol = new Map<string, number>();
  for (const r of rows) bySymbol.set(r.assetSymbol!, (bySymbol.get(r.assetSymbol!) ?? 0) + r.amountCents);

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_16rem]">
      <div>
        <h2 className="mb-2 font-semibold">{d.receivedTitle}</h2>
        <div className="card overflow-x-auto p-2">
          <table className="w-full">
            <thead className="border-b border-line">
              <tr>
                <th className="th-cell">{t.common.date}</th>
                <th className="th-cell">{d.colSecurity}</th>
                <th className="th-cell">{d.colOrigin}</th>
                <th className="th-cell text-right">{d.colNet}</th>
                <th className="th-cell" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="td-cell whitespace-nowrap tabular-nums">{fmt.date(r.date)}</td>
                  <td className="td-cell">
                    <div className="font-medium">{r.assetSymbol}</div>
                    <div className="max-w-xs truncate text-xs text-ink-3">{r.counterparty}</div>
                  </td>
                  <td className="td-cell text-xs text-ink-3">
                    {r.importKey ? d.originCsv : r.dividendKey ? d.originBooked : d.originManual}
                  </td>
                  <td className="td-cell text-right font-medium text-pos tabular-nums">+{fmt.cents(r.amountCents)}</td>
                  <td className="td-cell text-right whitespace-nowrap">
                    {r.importKey ? (
                      <ActionButton action={unlinkDividend.bind(null, r.id)}>{d.unlink}</ActionButton>
                    ) : (
                      <DeleteButton action={deleteDividendTransaction.bind(null, r.id)} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h2 className="mb-2 font-semibold">{d.bySecurity}</h2>
        <div className="card divide-y divide-line-soft p-0 text-sm">
          {[...bySymbol.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([symbol, cents]) => (
              <div key={symbol} className="flex justify-between px-4 py-2">
                <span className="font-medium">{symbol}</span>
                <span className="text-pos tabular-nums">+{fmt.cents(cents)}</span>
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}
