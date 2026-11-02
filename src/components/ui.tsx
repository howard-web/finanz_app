import type { ReactNode } from "react";

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  tone?: "neutral" | "positive" | "negative";
}) {
  const color =
    tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-red-700" : "text-stone-900";
  return (
    <div className="card">
      <div className="text-sm text-stone-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-stone-500">{hint}</div>}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
      {children}
    </div>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <span aria-hidden>⚠️</span>
      <span>
        <strong className="font-semibold">Hinweis: </strong>
        {children}
      </span>
    </div>
  );
}

export function Skeleton({ className = "h-32" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-stone-200/70 ${className}`} />;
}

export function toneOf(n: number | null | undefined): "neutral" | "positive" | "negative" {
  if (!n) return "neutral";
  return n > 0 ? "positive" : "negative";
}

export function signedClass(n: number | null | undefined): string {
  if (!n) return "text-stone-700";
  return n > 0 ? "text-emerald-700" : "text-red-700";
}
