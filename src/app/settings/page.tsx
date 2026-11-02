import { Suspense } from "react";
import { connection } from "next/server";
import { saveDividendTaxRate } from "@/actions/dividends";
import { clearOpeningBalance, saveOpeningBalance } from "@/actions/settings";
import { DeleteButton } from "@/components/DeleteButton";
import { DividendTaxForm } from "@/components/forms/DividendTaxForm";
import { OpeningBalanceForm } from "@/components/forms/OpeningBalanceForm";
import { PageHeader, Skeleton, signedClass } from "@/components/ui";
import { getCashBalance } from "@/lib/cashflow";
import { formatDate, toDateInput, todayUTC } from "@/lib/dates";
import { centsToInput, formatCents } from "@/lib/money";
import { getDividendTaxRate } from "@/lib/dividends";
import { materializeRecurring } from "@/lib/recurring";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Einstellungen" />
      <Suspense fallback={<Skeleton className="h-80 max-w-2xl" />}>
        <OpeningBalanceSection />
      </Suspense>
    </>
  );
}

async function OpeningBalanceSection() {
  await connection();
  await materializeRecurring();
  const [cash, taxRate] = await Promise.all([getCashBalance(), getDividendTaxRate()]);
  const today = toDateInput(todayUTC());

  return (
    <div className="grid max-w-2xl gap-6">
      <section className="card">
        <h2 className="font-semibold">Startguthaben</h2>
        <p className="mb-4 text-sm text-ink-3">
          Damit Net Worth deinem echten Kontostand entspricht und nicht bei 0 € beginnt.
        </p>
        <OpeningBalanceForm
          action={saveOpeningBalance}
          maxDate={today}
          defaults={{
            amount: cash.opening ? centsToInput(cash.opening.cents) : "",
            date: cash.opening ? toDateInput(cash.opening.date) : today,
          }}
        />
        {cash.opening && (
          <div className="mt-4 border-t border-line-soft pt-3">
            <DeleteButton action={clearOpeningBalance} label="Startguthaben entfernen" />
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">Dividenden</h2>
        <DividendTaxForm
          action={saveDividendTaxRate}
          defaultRate={(taxRate * 100).toLocaleString("de-DE", { maximumFractionDigits: 3 })}
        />
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">Kontostand-Abgleich</h2>
        <dl className="grid gap-2 text-sm">
          <Row label={cash.opening ? `Startguthaben am ${formatDate(cash.opening.date)}` : "Startguthaben"}>
            {cash.opening ? formatCents(cash.opening.cents) : <span className="text-ink-4">nicht gesetzt</span>}
          </Row>
          <Row label={cash.opening ? "Buchungen seit dem Stichtag" : "Saldo aller Buchungen"}>
            <span className={signedClass(cash.flowCents)}>
              {cash.flowCents > 0 ? "+" : ""}
              {formatCents(cash.flowCents)}
            </span>
          </Row>
          <div className="flex justify-between border-t border-line pt-2 font-semibold">
            <dt>Kontostand laut App</dt>
            <dd className="tabular-nums">{formatCents(cash.balanceCents)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-ink-3">
          Vergleiche den Betrag mit deinem Bankkonto. Weicht er ab, fehlen Buchungen, oder das Startguthaben stimmt nicht.
          {cash.ignoredCount > 0 &&
            ` ${cash.ignoredCount} Buchung${cash.ignoredCount === 1 ? "" : "en"} am oder vor dem Stichtag ${cash.ignoredCount === 1 ? "fließt" : "fließen"} nicht in den Kontostand ein (sie sind im Startguthaben enthalten), zählen aber weiter in den Monatsauswertungen.`}
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
