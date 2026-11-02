"use client";

import { useState, useTransition } from "react";
import { useI18n } from "@/i18n/client";

/** Zweistufiges Löschen ohne Browser-Dialog: erst "Löschen", dann "Wirklich?". */
export function DeleteButton({ action, label }: { action: () => Promise<void>; label?: string }) {
  const { t } = useI18n();
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!armed) {
    return (
      <button type="button" className="btn-ghost" onClick={() => setArmed(true)}>
        {label ?? t.common.delete}
      </button>
    );
  }
  return (
    <span className="inline-flex gap-1">
      <button
        type="button"
        disabled={pending}
        className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
        onClick={() => startTransition(() => action())}
      >
        {pending ? "…" : t.common.reallyDelete}
      </button>
      <button type="button" className="btn-ghost" onClick={() => setArmed(false)}>
        {t.common.no}
      </button>
    </span>
  );
}

export function ActionButton({
  action,
  children,
}: {
  action: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn-ghost"
      disabled={pending}
      onClick={() => startTransition(() => action())}
    >
      {pending ? "…" : children}
    </button>
  );
}
