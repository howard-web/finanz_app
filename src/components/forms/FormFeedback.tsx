"use client";

import { useI18n } from "@/i18n/client";
import { translateMsg } from "@/i18n/translate";
import type { FormState } from "@/lib/validation";

export function FieldError({ state, name }: { state: FormState; name: string }) {
  const { t } = useI18n();
  const msg = state.errors?.[name]?.[0];
  return msg ? <p className="field-error">{translateMsg(t, msg)}</p> : null;
}

export function FormMessage({ state }: { state: FormState }) {
  const { t } = useI18n();
  if (!state.message) return null;
  return (
    <p role="status" className={`text-sm ${state.ok ? "text-pos" : "text-neg"}`}>
      {translateMsg(t, state.message)}
    </p>
  );
}
