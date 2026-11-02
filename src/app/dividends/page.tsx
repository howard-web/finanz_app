import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { deleteDividendTransaction, restoreDismissedDividends, unlinkDividend } from "@/actions/dividends";
import { ActionButton, DeleteButton } from "@/components/DeleteButton";
import { ProposalRow, type ProposalView } from "@/components/dividends/ProposalRow";
import { EmptyState, PageHeader, Skeleton, StatCard } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDate, todayUTC } from "@/lib/dates";
import { getDividendProposals } from "@/lib/dividends";
import { formatCents, formatPercent } from "@/lib/money";

export default function DividendsPage() {
  return (
    <>
      <PageHeader title="Dividenden" />
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
      <StatCard label={`Erhalten ${year}`} value={formatCents(sumYear(year))} hint="netto, gebucht oder verknüpft" />
      <StatCard label={`Erhalten ${year - 1}`} value={formatCents(sumYear(year - 1))} />
      <StatCard label="Erhalten gesamt" value={formatCents(total)} hint={`${rows.length} ${rows.length === 1 ? "Zahlung" : "Zahlungen"}`} />
    </div>
  );
}

async function Proposals() {
  await connection();
  const { proposals, dismissedCount, taxRate } = await getDividendProposals();
  const taxRateLabel = formatPercent(taxRate).replace("+", "");

  const views: ProposalView[] = proposals.map((p) => ({
    key: p.key,
    symbol: p.symbol,
    name: p.name,
    currency: p.currency,
    exDate: p.exDate,
    exDateLabel: formatDate(new Date(p.exDate)),
    amountPerShare: p.amountPerShare,
    shares: p.shares,
    grossEUR: p.grossEUR,
    netEstimateEUR: p.netEstimateEUR,
    candidate: p.candidate && {
      id: p.candidate.id,
      dateLabel: formatDate(p.candidate.date),
      amountCents: p.candidate.amountCents,
      label: p.candidate.label,
    },
  }));

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Neue Dividenden {views.length > 0 && <span className="text-stone-500">({views.length})</span>}</h2>
        {dismissedCount > 0 && (
          <span className="text-xs text-stone-500">
            {dismissedCount} ignoriert · <ActionButton action={restoreDismissedDividends}>wieder anzeigen</ActionButton>
          </span>
        )}
      </div>
      {views.length === 0 ? (
        <EmptyState>
          Keine offenen Dividenden. Erkannt werden Ausschüttungen deiner Wertpapiere ab dem Kaufdatum, Daten von Yahoo Finance.
        </EmptyState>
      ) : (
        <>
          <div className="card divide-y divide-stone-100 p-0">
            {views.map((p) => (
              <ProposalRow key={p.key} p={p} taxRateLabel={taxRateLabel} />
            ))}
          </div>
          <p className="mt-2 text-xs text-stone-500">
            Vorgeschlagen ist das geschätzte Netto mit {taxRateLabel} Steuer (<Link href="/settings" className="underline">ändern</Link>). Trag den Betrag ein, der wirklich auf dem Konto ankam, und als Datum den Tag der Gutschrift (oft einige Tage bis Wochen nach dem Ex-Tag). Hast du die Gutschrift schon per CSV importiert, nutze „Verknüpfen“, sonst wird sie doppelt gezählt.
          </p>
        </>
      )}
    </section>
  );
}

async function Received() {
  await connection();
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
        <h2 className="mb-2 font-semibold">Erhaltene Dividenden</h2>
        <div className="card overflow-x-auto p-2">
          <table className="w-full">
            <thead className="border-b border-stone-200">
              <tr>
                <th className="th-cell">Datum</th>
                <th className="th-cell">Wertpapier</th>
                <th className="th-cell">Herkunft</th>
                <th className="th-cell text-right">Netto</th>
                <th className="th-cell" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="td-cell whitespace-nowrap tabular-nums">{formatDate(r.date)}</td>
                  <td className="td-cell">
                    <div className="font-medium">{r.assetSymbol}</div>
                    <div className="max-w-xs truncate text-xs text-stone-500">{r.counterparty}</div>
                  </td>
                  <td className="td-cell text-xs text-stone-500">{r.importKey ? "CSV-Import, verknüpft" : r.dividendKey ? "gebucht" : "manuell"}</td>
                  <td className="td-cell text-right font-medium text-emerald-700 tabular-nums">+{formatCents(r.amountCents)}</td>
                  <td className="td-cell text-right whitespace-nowrap">
                    {r.importKey ? (
                      <ActionButton action={unlinkDividend.bind(null, r.id)}>Verknüpfung lösen</ActionButton>
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
        <h2 className="mb-2 font-semibold">Je Wertpapier</h2>
        <div className="card divide-y divide-stone-100 p-0 text-sm">
          {[...bySymbol.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([symbol, cents]) => (
              <div key={symbol} className="flex justify-between px-4 py-2">
                <span className="font-medium">{symbol}</span>
                <span className="tabular-nums">{formatCents(cents)}</span>
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}
