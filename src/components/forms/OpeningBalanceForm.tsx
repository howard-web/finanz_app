"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/validation";
import { FieldError, FormMessage } from "./FormFeedback";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults: { amount: string; date: string };
  maxDate: string;
};

export function OpeningBalanceForm({ action, defaults, maxDate }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const v = { ...defaults, ...state.values };

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="amount" className="field-label">Kontostand (€)</label>
          <input id="amount" name="amount" inputMode="decimal" placeholder="z.B. 2.450,00" defaultValue={v.amount} className="field tabular-nums" required />
          <FieldError state={state} name="amount" />
        </div>
        <div>
          <label htmlFor="date" className="field-label">am (Tagesende)</label>
          <input id="date" name="date" type="date" max={maxDate} defaultValue={v.date} className="field" required />
          <FieldError state={state} name="date" />
        </div>
      </div>
      <p className="text-xs text-ink-3">
        Trage den Kontostand ein, wie er auf dem Kontoauszug am Ende dieses Tages steht. Buchungen am Stichtag und davor sind darin schon enthalten und werden nicht nochmal gezählt. Bei Dispo einen negativen Betrag eintragen.
      </p>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Speichern …" : "Speichern"}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
