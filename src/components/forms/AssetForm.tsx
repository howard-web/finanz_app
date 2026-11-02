"use client";

import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import type { FormState } from "@/lib/validation";
import { FieldError, FormMessage } from "./FormFeedback";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults: { symbol: string; shares: string; buyPrice: string; buyDate: string };
  /** Beim Bearbeiten ist das Symbol fix. */
  lockSymbol?: boolean;
  currency?: string;
  submitLabel?: string;
};

export function AssetForm({ action, defaults, lockSymbol, currency, submitLabel }: Props) {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState(action, {});
  // Bei Fehlern Eingaben behalten; nach Erfolg auf Vorgaben zurück.
  const v = state.ok ? defaults : { ...defaults, ...state.values };

  return (
    <form action={formAction} className="grid gap-4">
      <div>
        <label htmlFor="symbol" className="field-label">{t.portfolio.ticker}</label>
        <input
          id="symbol"
          name="symbol"
          defaultValue={v.symbol}
          readOnly={lockSymbol}
          placeholder={t.portfolio.tickerPlaceholder}
          className="field uppercase"
          autoComplete="off"
          required
        />
        <FieldError state={state} name="symbol" />
        {!lockSymbol && <p className="mt-1 text-xs text-ink-3">{t.portfolio.tickerHint}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="shares" className="field-label">{t.portfolio.shares}</label>
          <input id="shares" name="shares" inputMode="decimal" defaultValue={v.shares} placeholder={t.portfolio.sharesPlaceholder} className="field tabular-nums" required />
          <FieldError state={state} name="shares" />
        </div>
        <div>
          <label htmlFor="buyPrice" className="field-label">
            {t.portfolio.buyPrice}
            {currency ? ` (${currency})` : ""}
          </label>
          <input id="buyPrice" name="buyPrice" inputMode="decimal" defaultValue={v.buyPrice} placeholder={t.common.amountPlaceholder} className="field tabular-nums" required />
          <FieldError state={state} name="buyPrice" />
        </div>
      </div>
      <div>
        <label htmlFor="buyDate" className="field-label">{t.portfolio.buyDate}</label>
        <input id="buyDate" name="buyDate" type="date" defaultValue={v.buyDate} className="field" required />
        <FieldError state={state} name="buyDate" />
      </div>
      {!lockSymbol && <p className="text-xs text-ink-3">{t.portfolio.currencyHint}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? t.portfolio.checkingTicker : (submitLabel ?? t.common.save)}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
