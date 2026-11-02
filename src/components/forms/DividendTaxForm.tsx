"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/validation";
import { FieldError, FormMessage } from "./FormFeedback";

export function DividendTaxForm({
  action,
  defaultRate,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaultRate: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="grid gap-3">
      <div className="flex items-end gap-3">
        <div>
          <label htmlFor="taxRate" className="field-label">Steuersatz für Netto-Schätzung</label>
          <div className="relative w-32">
            <input id="taxRate" name="taxRate" inputMode="decimal" defaultValue={state.values?.taxRate ?? defaultRate}
              className="field pr-7 text-right tabular-nums" />
            <span className="pointer-events-none absolute top-2 right-3 text-sm text-ink-4">%</span>
          </div>
        </div>
        <button type="submit" className="btn-secondary" disabled={pending}>{pending ? "…" : "Speichern"}</button>
        <FormMessage state={state} />
      </div>
      <FieldError state={state} name="taxRate" />
      <p className="text-xs text-ink-3">
        26,375 % = Abgeltungsteuer + Soli (ohne Kirchensteuer). Solange dein Freistellungsauftrag nicht ausgeschöpft ist: 0 %. Das ist nur ein Vorschlag, beim Buchen trägst du den tatsächlich erhaltenen Betrag ein.
      </p>
    </form>
  );
}
