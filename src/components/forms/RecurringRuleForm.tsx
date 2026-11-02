"use client";

import { useActionState, useState } from "react";
import { categoriesFor, INTERVAL_LABELS, RECURRING_INTERVALS, type TransactionType } from "@/lib/categories";
import type { FormState } from "@/lib/validation";
import { FieldError, FormMessage } from "./FormFeedback";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults: { amount: string; type: TransactionType; category: string; note: string; interval: string };
};

export function RecurringRuleForm({ action, defaults }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [type, setType] = useState<TransactionType>(defaults.type);
  const categories = categoriesFor(type);
  const v = { ...defaults, ...state.values };

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="type" className="field-label">Typ</label>
          <select id="type" name="type" value={type} onChange={(e) => setType(e.target.value as TransactionType)} className="field">
            <option value="EXPENSE">Ausgabe</option>
            <option value="INCOME">Einnahme</option>
          </select>
        </div>
        <div>
          <label htmlFor="interval" className="field-label">Intervall</label>
          <select id="interval" name="interval" defaultValue={v.interval} className="field">
            {RECURRING_INTERVALS.map((i) => (
              <option key={i} value={i}>{INTERVAL_LABELS[i]}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="amount" className="field-label">Betrag (€)</label>
        <input id="amount" name="amount" inputMode="decimal" defaultValue={v.amount} className="field tabular-nums" required />
        <FieldError state={state} name="amount" />
      </div>
      <div>
        <label htmlFor="category" className="field-label">Kategorie</label>
        <select
          id="category"
          name="category"
          key={`${type}-${v.category}`}
          defaultValue={categories.includes(v.category) ? v.category : categories[0]}
          className="field"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <FieldError state={state} name="category" />
      </div>
      <div>
        <label htmlFor="note" className="field-label">Notiz</label>
        <input id="note" name="note" defaultValue={v.note} className="field" maxLength={500} />
      </div>
      <p className="text-xs text-stone-500">Änderungen gelten für künftige Buchungen. Bereits gebuchte bleiben unverändert.</p>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Speichern …" : "Speichern"}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
