import type { FormState } from "@/lib/validation";

export function FieldError({ state, name }: { state: FormState; name: string }) {
  const msg = state.errors?.[name]?.[0];
  return msg ? <p className="field-error">{msg}</p> : null;
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <p
      role="status"
      className={`text-sm ${state.ok ? "text-pos" : "text-neg"}`}
    >
      {state.message}
    </p>
  );
}
