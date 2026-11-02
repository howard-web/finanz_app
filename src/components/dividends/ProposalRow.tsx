"use client";

import { useActionState, useTransition } from "react";
import { bookDividend, dismissDividend, linkDividend } from "@/actions/dividends";
import { FieldError, FormMessage } from "@/components/forms/FormFeedback";
import { centsToInput, formatCents, formatEUR, formatMoney } from "@/lib/money";
import type { FormState } from "@/lib/validation";

export type ProposalView = {
  key: string;
  symbol: string;
  name: string | null;
  currency: string;
  exDateLabel: string;
  exDate: string;
  amountPerShare: number;
  shares: number;
  grossEUR: number;
  netEstimateEUR: number;
  candidate: { id: string; dateLabel: string; amountCents: number; label: string } | null;
};

export function ProposalRow({ p, taxRateLabel }: { p: ProposalView; taxRateLabel: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(bookDividend.bind(null, p.key), {});
  const [busy, startTransition] = useTransition();
  const v = { amount: centsToInput(Math.round(p.netEstimateEUR * 100)), date: p.exDate, ...state.values };

  return (
    <div className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-start">
      <div>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-semibold">{p.symbol}</span>
          <span className="truncate text-sm text-ink-3">{p.name}</span>
        </div>
        <div className="mt-0.5 text-sm text-ink-2">
          Ex-Tag {p.exDateLabel} · {p.shares.toLocaleString("de-DE")} × {formatMoney(p.amountPerShare, p.currency)} ={" "}
          <span className="font-medium tabular-nums">{formatEUR(p.grossEUR)} brutto</span>
          <span className="text-ink-4"> · ≈ {formatEUR(p.netEstimateEUR)} netto ({taxRateLabel} Steuer)</span>
        </div>
        {p.candidate && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-ink">
            <span>
              Passende Buchung gefunden: <strong>{p.candidate.dateLabel}</strong> · {p.candidate.label} ·{" "}
              <strong className="tabular-nums">{formatCents(p.candidate.amountCents)}</strong>
            </span>
            <button
              type="button"
              className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              disabled={busy}
              onClick={() => startTransition(() => linkDividend(p.key, p.candidate!.id))}
            >
              Verknüpfen
            </button>
          </div>
        )}
      </div>

      <form action={formAction} className="flex flex-wrap items-start gap-2">
        <div>
          <label className="sr-only" htmlFor={`amount-${p.key}`}>Erhaltener Betrag</label>
          <div className="relative w-28">
            <input id={`amount-${p.key}`} name="amount" defaultValue={v.amount} inputMode="decimal"
              className="field pr-6 text-right tabular-nums" title="Tatsächlich erhaltener Betrag (netto)" />
            <span className="pointer-events-none absolute top-2 right-2 text-sm text-ink-4">€</span>
          </div>
          <FieldError state={state} name="amount" />
        </div>
        <div>
          <label className="sr-only" htmlFor={`date-${p.key}`}>Gutschrift am</label>
          <input id={`date-${p.key}`} name="date" type="date" defaultValue={v.date} className="field w-40" title="Datum der Gutschrift" />
          <FieldError state={state} name="date" />
        </div>
        <button type="submit" className="btn-primary" disabled={pending || busy}>
          {pending ? "…" : "Buchen"}
        </button>
        <button type="button" className="btn-ghost self-center" disabled={busy}
          onClick={() => startTransition(() => dismissDividend(p.key))}>
          Ignorieren
        </button>
        <div className="basis-full"><FormMessage state={state} /></div>
      </form>
    </div>
  );
}
