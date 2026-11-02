"use client";

import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import type { FormState } from "@/lib/validation";
import { FieldError, FormMessage } from "./FormFeedback";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults: { amount: string; date: string };
  maxDate: string;
};

export function OpeningBalanceForm({ action, defaults, maxDate }: Props) {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState(action, {});
  const v = { ...defaults, ...state.values };

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="amount" className="field-label">{t.settings.openingAmount}</label>
          <input id="amount" name="amount" inputMode="decimal" placeholder={t.settings.openingAmountPlaceholder} defaultValue={v.amount} className="field tabular-nums" required />
          <FieldError state={state} name="amount" />
        </div>
        <div>
          <label htmlFor="date" className="field-label">{t.settings.openingDate}</label>
          <input id="date" name="date" type="date" max={maxDate} defaultValue={v.date} className="field" required />
          <FieldError state={state} name="date" />
        </div>
      </div>
      <p className="text-xs text-ink-3">{t.settings.openingHint}</p>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? t.common.saving : t.common.save}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
