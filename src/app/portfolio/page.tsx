import { Suspense } from "react";
import { connection } from "next/server";
import { createAsset } from "@/actions/assets";
import { AssetForm } from "@/components/forms/AssetForm";
import { PortfolioTable } from "@/components/PortfolioTable";
import { EmptyState, Notice, PageHeader, Skeleton, StatCard, toneOf } from "@/components/ui";
import { toDateInput, todayUTC } from "@/lib/dates";
import { formatEUR, formatPercent } from "@/lib/money";
import { getPortfolio } from "@/lib/portfolio";

export default function PortfolioPage() {
  return (
    <>
      <PageHeader title="Portfolio" />
      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <section className="card h-fit">
          <h2 className="mb-4 font-semibold">Kauf erfassen</h2>
          <Suspense fallback={<Skeleton className="h-80" />}>
            <NewAssetForm />
          </Suspense>
        </section>
        <Suspense fallback={<Skeleton className="h-96" />}>
          <Holdings />
        </Suspense>
      </div>
    </>
  );
}

async function NewAssetForm() {
  await connection();
  return (
    <AssetForm
      action={createAsset}
      submitLabel="Hinzufügen"
      defaults={{ symbol: "", shares: "", buyPrice: "", buyDate: toDateInput(todayUTC()) }}
    />
  );
}

async function Holdings() {
  await connection();
  const summary = await getPortfolio();

  if (summary.positions.length === 0) {
    return <EmptyState>Noch keine Wertpapiere erfasst.</EmptyState>;
  }

  return (
    <section className="grid gap-4">
      {summary.hasStaleData && (
        <Notice>
          Einige Kurse konnten nicht aktualisiert werden. Es werden die zuletzt bekannten Werte angezeigt.
          {summary.missingSymbols.length > 0 && ` Ohne Kurs: ${summary.missingSymbols.join(", ")}.`}
        </Notice>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Depotwert" value={formatEUR(summary.totalValueEUR)} />
        <StatCard label="Investiert" value={formatEUR(summary.totalCostEUR)} hint="zum aktuellen Wechselkurs" />
        <StatCard
          label="Gewinn / Verlust"
          value={formatEUR(summary.totalPnlEUR)}
          tone={toneOf(summary.totalPnlEUR)}
          hint={summary.totalPnlPct !== null ? formatPercent(summary.totalPnlPct) : undefined}
        />
      </div>
      <div className="card p-2">
        <PortfolioTable summary={summary} />
      </div>
      <p className="text-xs text-stone-500">
        Kurse von Yahoo Finance (Cache bis zu 6 h). Fremdwährungen werden mit dem aktuellen Kurs in EUR umgerechnet. Währungsgewinne beim Einstand werden dabei nicht berücksichtigt.
      </p>
    </section>
  );
}
