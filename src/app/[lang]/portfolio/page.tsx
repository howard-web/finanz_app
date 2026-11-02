import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { createAsset } from "@/actions/assets";
import { AssetForm } from "@/components/forms/AssetForm";
import { PortfolioTable } from "@/components/PortfolioTable";
import { EmptyState, Notice, PageHeader, Skeleton, StatCard, toneOf } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { tf } from "@/i18n/translate";
import { toDateInput, todayUTC } from "@/lib/dates";
import { getPortfolio } from "@/lib/portfolio";

export default async function PortfolioPage() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t.portfolio.title} />
      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <section className="card h-fit">
          <h2 className="mb-4 font-semibold">{t.portfolio.addPurchase}</h2>
          <Suspense fallback={<Skeleton className="h-80" />}>
            <NewAssetForm submitLabel={t.common.add} />
          </Suspense>
        </section>
        <Suspense fallback={<Skeleton className="h-96" />}>
          <Holdings />
        </Suspense>
      </div>
    </>
  );
}

async function NewAssetForm({ submitLabel }: { submitLabel: string }) {
  await connection();
  return (
    <AssetForm
      action={createAsset}
      submitLabel={submitLabel}
      defaults={{ symbol: "", shares: "", buyPrice: "", buyDate: toDateInput(todayUTC()) }}
    />
  );
}

async function Holdings() {
  await connection();
  const { t, fmt, href } = await getI18n();
  const p_ = t.portfolio;
  const summary = await getPortfolio();

  if (summary.positions.length === 0) {
    return <EmptyState>{p_.empty}</EmptyState>;
  }

  return (
    <section className="grid gap-4">
      {summary.hasStaleData && (
        <Notice>
          {p_.staleNotice}
          {summary.missingSymbols.length > 0 && ` ${tf(p_.missingPrices, { symbols: summary.missingSymbols.join(", ") })}`}
        </Notice>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label={p_.value} value={fmt.eur(summary.totalValueEUR)} />
        <StatCard label={p_.invested} value={fmt.eur(summary.totalCostEUR)} hint={p_.investedHint} />
        <StatCard
          label={p_.pnl}
          value={fmt.eur(summary.totalPnlEUR)}
          tone={toneOf(summary.totalPnlEUR)}
          hint={summary.totalPnlPct !== null ? fmt.percent(summary.totalPnlPct) : undefined}
        />
        <StatCard
          label={p_.totalReturn}
          value={fmt.eur(summary.totalReturnEUR)}
          tone={toneOf(summary.totalReturnEUR)}
          hint={
            <>
              {p_.totalReturnHintPrefix} {fmt.eur(summary.totalDividendsEUR)}{" "}
              <Link href={href("/dividends")} className="underline">{p_.dividendsLink}</Link>
              {summary.totalReturnPct !== null && ` · ${fmt.percent(summary.totalReturnPct)}`}
            </>
          }
        />
      </div>
      <div className="card p-2">
        <PortfolioTable summary={summary} />
      </div>
      <p className="text-xs text-ink-3">{p_.footnote}</p>
    </section>
  );
}
