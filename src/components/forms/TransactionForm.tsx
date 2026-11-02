"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  categoriesFor,
  INTERVAL_LABELS,
  RECURRING_INTERVALS,
  type TransactionType,
} from "@/lib/categories";
import type { FormState } from "@/lib/validation";
import { FieldError, FormMessage } from "./FormFeedback";

type Values = {
  amount: string;
  type: TransactionType;
  category: string;
  date: string;
  note: string;
};

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults: Values;
  /** Wiederkehrend-Option anzeigen (nur beim Anlegen). */
  allowRecurring?: boolean;
  submitLabel?: string;
  /** Vorgaben für ein neues Formular nach erfolgreichem Speichern. */
  resetOnSuccess?: boolean;
};

export function TransactionForm({
  action,
  defaults,
  allowRecurring = false,
  submitLabel = "Speichern",
  resetOnSuccess = false,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [type, setType] = useState<TransactionType>(defaults.type);
  // Checkbox-Zustand gilt nur für den aktuellen Action-State; danach zählt der
  // vom Server zurückgegebene Wert (bei Fehler erhalten, nach Erfolg leer).
  const [override, setOverride] = useState<{ state: FormState; on: boolean } | null>(null);
  const recurring = override?.state === state ? override.on : state.values?.isRecurring === "on";
  const formRef = useRef<HTMLFormElement>(null);
  const categories = categoriesFor(type);
  // Nach einer Action setzt React das Formular auf defaultValue zurück, daher
  // kommen die zuletzt eingegebenen Werte aus dem Action-State.
  const v = { ...defaults, ...state.values };

  useEffect(() => {
    if (state.ok && resetOnSuccess) {
      (formRef.current?.elements.namedItem("amount") as HTMLInputElement | null)?.focus();
    }
  }, [state, resetOnSuccess]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      <fieldset>
        <legend className="field-label">Typ</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["EXPENSE", "INCOME"] as const).map((t) => (
            <label
              key={t}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium ${
                type === t
                  ? t === "INCOME"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-red-400 bg-red-50 text-red-800"
                  : "border-stone-300 text-stone-600 hover:bg-stone-50"
              }`}
            >
              <input
                type="radio"
                name="type"
                value={t}
                checked={type === t}
                onChange={() => setType(t)}
                className="sr-only"
              />
              {t === "INCOME" ? "Einnahme" : "Ausgabe"}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="amount" className="field-label">
            Betrag (€)
          </label>
          <input
            id="amount"
            name="amount"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={v.amount}
            className="field tabular-nums"
            required
          />
          <FieldError state={state} name="amount" />
        </div>
        <div>
          <label htmlFor="date" className="field-label">
            {recurring ? "Erste Buchung am" : "Datum"}
          </label>
          <input id="date" name="date" type="date" defaultValue={v.date} className="field" required />
          <FieldError state={state} name="date" />
        </div>
      </div>

      <div>
        <label htmlFor="category" className="field-label">
          Kategorie
        </label>
        <select
          id="category"
          name="category"
          key={`${type}-${v.category}`}
          defaultValue={categories.includes(v.category) ? v.category : categories[0]}
          className="field"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <FieldError state={state} name="category" />
      </div>

      <div>
        <label htmlFor="note" className="field-label">
          Notiz <span className="font-normal text-stone-400">(optional)</span>
        </label>
        <input id="note" name="note" defaultValue={v.note} className="field" maxLength={500} />
        <FieldError state={state} name="note" />
      </div>

      {allowRecurring && (
        <div className="rounded-lg bg-stone-50 p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="isRecurring"
              checked={recurring}
              onChange={(e) => setOverride({ state, on: e.target.checked })}
              className="size-4 accent-blue-600"
            />
            Wiederkehrend (Abo, Miete, Gehalt …)
          </label>
          {recurring && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-stone-600">Intervall:</span>
              <select name="interval" defaultValue={state.values?.interval ?? "MONTHLY"} className="field w-auto py-1">
                {RECURRING_INTERVALS.map((i) => (
                  <option key={i} value={i}>
                    {INTERVAL_LABELS[i]}
                  </option>
                ))}
              </select>
            </div>
          )}
          {recurring && (
            <p className="mt-2 text-xs text-stone-500">
              Fällige Buchungen werden automatisch angelegt, auch rückwirkend ab dem Startdatum.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Speichern …" : submitLabel}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
