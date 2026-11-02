import { Suspense } from "react";
import { connection } from "next/server";
import { saveDividendTaxRate } from "@/actions/dividends";
import { clearOpeningBalance, saveOpeningBalance } from "@/actions/settings";
import { DeleteButton } from "@/components/DeleteButton";
import { DividendTaxForm } from "@/components/forms/DividendTaxForm";
import { OpeningBalanceForm } from "@/components/forms/OpeningBalanceForm";
import { PageHeader, Skeleton, signedClass } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { tf } from "@/i18n/translate";
import { getCashBalance } from "@/lib/cashflow";
import { toDateInput, todayUTC } from "@/lib/dates";
import { getDividendTaxRate } from "@/lib/dividends";
import { materializeRecurring } from "@/lib/recurring";

export default async function SettingsPage() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t.settings.title} />
      <Suspense fallback={<Skeleton className="h-80 max-w-2xl" />}>
        <SettingsSections />
      </Suspense>
    </>
  );
}

async function SettingsSections() {
  await connection();
  const { t, fmt } = await getI18n();
  const s = t.settings;
  await materializeRecurring();
  const [cash, taxRate] = await Promise.all([getCashBalance(), getDividendTaxRate()]);
  const today = toDateInput(todayUTC());

  return (
    <div className="grid max-w-2xl gap-6">
      <section className="card">
        <h2 className="font-semibold">{s.openingTitle}</h2>
        <p className="mb-4 text-sm text-ink-3">{s.openingSubtitle}</p>
        <OpeningBalanceForm
          action={saveOpeningBalance}
          maxDate={today}
          defaults={{
            amount: cash.opening ? fmt.centsInput(cash.opening.cents) : "",
            date: cash.opening ? toDateInput(cash.opening.date) : today,
          }}
        />
        {cash.opening && (
          <div className="mt-4 border-t border-line-soft pt-3">
            <DeleteButton action={clearOpeningBalance} label={s.removeOpening} />
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">{s.dividendsTitle}</h2>
        <DividendTaxForm action={saveDividendTaxRate} defaultRate={fmt.number(taxRate * 100, 3)} />
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">{s.reconcileTitle}</h2>
        <dl className="grid gap-2 text-sm">
          <Row label={cash.opening ? tf(s.openingOn, { date: fmt.date(cash.opening.date) }) : s.opening}>
            {cash.opening ? (
              <span className={signedClass(cash.opening.cents)}>{fmt.cents(cash.opening.cents)}</span>
            ) : (
              <span className="text-ink-4">{s.notSet}</span>
            )}
          </Row>
          <Row label={cash.opening ? s.flowSince : s.flowAll}>
            <span className={signedClass(cash.flowCents)}>
              {cash.flowCents > 0 ? "+" : ""}
              {fmt.cents(cash.flowCents)}
            </span>
          </Row>
          <div className="flex justify-between border-t border-line pt-2 font-semibold">
            <dt>{s.balanceApp}</dt>
            <dd className={`tabular-nums ${signedClass(cash.balanceCents)}`}>{fmt.cents(cash.balanceCents)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-ink-3">
          {s.reconcileHint}
          {cash.ignoredCount > 0 &&
            ` ${cash.ignoredCount === 1 ? s.ignoredOne : tf(s.ignoredMany, { count: cash.ignoredCount })}`}
        </p>
      </section>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-2">{label}</dt>
      <dd className="tabular-nums">{children}</dd>
    </div>
  );
}
