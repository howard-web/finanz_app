"use client";

import { useActionState, useTransition } from "react";
import { bookDividend, dismissDividend, linkDividend } from "@/actions/dividends";
import { FieldError, FormMessage } from "@/components/forms/FormFeedback";
import { useI18n } from "@/i18n/client";
import { tf } from "@/i18n/translate";
import type { FormState } from "@/lib/validation";

export type ProposalView = {
  key: string;
  symbol: string;
  name: string | null;
  currency: string;
  /** Ex-Tag als YYYY-MM-DD */
  exDate: string;
  amountPerShare: number;
  shares: number;
  grossEUR: number;
  netEstimateEUR: number;
  /** Vorhandene Einnahme, die passen könnte (Datum als YYYY-MM-DD). */
  candidate: { id: string; date: string; amountCents: number; label: string } | null;
};

const isoToDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

export function ProposalRow({ p, taxRate }: { p: ProposalView; taxRate: number }) {
  const { lang, t, fmt } = useI18n();
  const d = t.dividends;
  const [state, formAction, pending] = useActionState<FormState, FormData>(bookDividend.bind(null, lang, p.key), {});
  const [busy, startTransition] = useTransition();
  const v = { amount: fmt.centsInput(Math.round(p.netEstimateEUR * 100)), date: p.exDate, ...state.values };
  const rate = fmt.rate(taxRate);

  return (
    <div className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-start">
      <div>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-semibold">{p.symbol}</span>
          <span className="truncate text-sm text-ink-3">{p.name}</span>
        </div>
        <div className="mt-0.5 text-sm text-ink-2">
          {tf(d.exDateLine, {
            date: fmt.date(isoToDate(p.exDate)),
            shares: fmt.number(p.shares),
            perShare: fmt.money(p.amountPerShare, p.currency),
          })}{" "}
          <span className="font-medium tabular-nums">{tf(d.gross, { amount: fmt.eur(p.grossEUR) })}</span>
          <span className="text-ink-4"> · {tf(d.netEstimate, { amount: fmt.eur(p.netEstimateEUR), rate })}</span>
        </div>
        {p.candidate && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-ink">
            <span>
              {d.candidateFound} <strong>{fmt.date(isoToDate(p.candidate.date))}</strong> · {p.candidate.label} ·{" "}
              <strong className="tabular-nums">{fmt.cents(p.candidate.amountCents)}</strong>
            </span>
            <button
              type="button"
              className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              disabled={busy}
              onClick={() => startTransition(() => linkDividend(p.key, p.candidate!.id))}
            >
              {d.link}
            </button>
          </div>
        )}
      </div>

      <form action={formAction} className="flex flex-wrap items-start gap-2">
        <div>
          <label className="sr-only" htmlFor={`amount-${p.key}`}>{d.receivedAmount}</label>
          <div className="relative w-28">
            <input id={`amount-${p.key}`} name="amount" defaultValue={v.amount} inputMode="decimal"
              className="field pr-6 text-right tabular-nums" title={d.receivedAmountTitle} />
            <span className="pointer-events-none absolute top-2 right-2 text-sm text-ink-4">€</span>
          </div>
          <FieldError state={state} name="amount" />
        </div>
        <div>
          <label className="sr-only" htmlFor={`date-${p.key}`}>{d.creditDate}</label>
          <input id={`date-${p.key}`} name="date" type="date" defaultValue={v.date} className="field w-40" title={d.creditDateTitle} />
          <FieldError state={state} name="date" />
        </div>
        <button type="submit" className="btn-primary" disabled={pending || busy}>
          {pending ? "…" : d.book}
        </button>
        <button type="button" className="btn-ghost self-center" disabled={busy}
          onClick={() => startTransition(() => dismissDividend(p.key))}>
          {d.dismiss}
        </button>
        <div className="basis-full"><FormMessage state={state} /></div>
      </form>
    </div>
  );
}
