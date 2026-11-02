import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-3">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  featured = false,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  tone?: "neutral" | "positive" | "negative";
  /** Hervorgehobene Karte (z.B. Net Worth). */
  featured?: boolean;
}) {
  if (featured) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white shadow-lg shadow-blue-700/20">
        <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-white/10 blur-2xl" />
        <div className="text-xs font-medium tracking-wide text-white/75 uppercase">{label}</div>
        <div className="mt-2 text-[1.7rem] leading-none font-semibold tracking-tight tabular-nums">{value}</div>
        {hint && <div className="mt-2 text-xs text-white/75 [&_a]:text-white">{hint}</div>}
      </div>
    );
  }
  const color = tone === "positive" ? "text-pos" : tone === "negative" ? "text-neg" : "text-ink";
  return (
    <div className="card">
      <div className="text-xs font-medium tracking-wide text-ink-3 uppercase">{label}</div>
      <div className={`mt-2 text-[1.7rem] leading-none font-semibold tracking-tight tabular-nums ${color}`}>{value}</div>
      {hint && <div className="mt-2 text-xs text-ink-3">{hint}</div>}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-surface/50 p-8 text-center text-sm text-ink-3">
      {children}
    </div>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-warn-line bg-warn-soft px-4 py-3 text-sm text-warn-ink">
      <TriangleAlert aria-hidden className="mt-0.5 size-[1.1em] shrink-0" />
      <span>
        <strong className="font-semibold">Hinweis: </strong>
        {children}
      </span>
    </div>
  );
}

export function Skeleton({ className = "h-32" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-surface-3/70 ${className}`} />;
}

export function toneOf(n: number | null | undefined): "neutral" | "positive" | "negative" {
  if (!n) return "neutral";
  return n > 0 ? "positive" : "negative";
}

export function signedClass(n: number | null | undefined): string {
  if (!n) return "text-ink";
  return n > 0 ? "text-pos" : "text-neg";
}
