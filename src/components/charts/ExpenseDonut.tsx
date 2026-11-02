"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { EXPENSE_CHART_OTHER_COLOR, EXPENSE_CHART_SLOTS } from "@/lib/categories";
import { useI18n } from "@/i18n/client";
import { categoryLabel, tf } from "@/i18n/translate";
import type { Dictionary } from "@/i18n/dictionaries";
import { useRemScale } from "./useRemScale";

type Row = { category: string; amount: number };
type Slice = { key: string; label: string; color: string; amount: number; share: number; parts?: Row[] };


/** Gruppiert die Kategorien in feste Farb-Slots plus "Weitere" (in Ring-Reihenfolge). */
function toSlices(data: Row[], t: Dictionary): Slice[] {
  const total = data.reduce((s, r) => s + r.amount, 0);
  const slices: Slice[] = [];
  for (const slot of EXPENSE_CHART_SLOTS) {
    const row = data.find((r) => r.category === slot.category);
    if (row && row.amount > 0) {
      slices.push({ key: slot.category, label: categoryLabel(t, slot.category), color: slot.color, amount: row.amount, share: row.amount / total });
    }
  }
  const known = new Set(EXPENSE_CHART_SLOTS.map((s) => s.category));
  const rest = data.filter((r) => !known.has(r.category) && r.amount > 0).sort((a, b) => b.amount - a.amount);
  if (rest.length > 0) {
    const amount = rest.reduce((s, r) => s + r.amount, 0);
    slices.push({ key: "__other", label: t.charts.other, color: EXPENSE_CHART_OTHER_COLOR, amount, share: amount / total, parts: rest });
  }
  return slices;
}

export function ExpenseDonut({ data, totalLabel }: { data: Row[]; totalLabel: string }) {
  const s = useRemScale();
  const { t, fmt } = useI18n();
  const percent = (share: number) => fmt.share(share);
  const slices = toSlices(data, t);
  const total = slices.reduce((sum, x) => sum + x.amount, 0);
  const size = 13 * 16 * s; // 13rem

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
      <div className="relative mx-auto" style={{ width: size, height: size }} role="img" aria-label={t.charts.expensesAria}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="amount"
              nameKey="label"
              innerRadius="62%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="var(--surface)"
              strokeWidth={2 * s}
              isAnimationActive={false}
            >
              {slices.map((x) => (
                <Cell key={x.key} fill={x.color} />
              ))}
            </Pie>
            <Tooltip
              // über der Summe in der Mitte anzeigen
              wrapperStyle={{ zIndex: 10 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const x = payload[0].payload as Slice;
                return (
                  <div className="rounded-xl border border-line bg-surface px-3 py-2 text-sm shadow-md">
                    <div className="flex items-center gap-2 font-medium">
                      <span className="size-[0.7em] rounded-sm" style={{ background: x.color }} aria-hidden />
                      {x.label}
                    </div>
                    <div className="tabular-nums">{fmt.eur(x.amount)}</div>
                    <div className="text-xs text-ink-3">{tf(t.charts.shareOfExpenses, { share: percent(x.share) })}</div>
                    {x.parts && <div className="mt-1 text-xs text-ink-3">{x.parts.map((p) => categoryLabel(t, p.category)).join(", ")}</div>}
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Summe in der Mitte */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-ink-3">{totalLabel}</span>
          <span className="text-lg font-semibold tracking-tight tabular-nums">{fmt.eur(total)}</span>
        </div>
      </div>

      {/* Legende in derselben Reihenfolge wie die Stücke (im Uhrzeigersinn ab 12 Uhr) */}
      <ul className="grid gap-1.5 text-sm">
        {slices.map((x) => (
          <li key={x.key}>
            <div className="flex items-center gap-2.5">
              <span className="size-[0.8em] shrink-0 rounded-[0.2rem]" style={{ background: x.color }} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-ink">{x.label}</span>
              <span className="tabular-nums">{fmt.eur(x.amount)}</span>
              <span className="w-[4.2em] text-right text-xs text-ink-3 tabular-nums">{percent(x.share)}</span>
            </div>
            {x.parts && (
              <ul className="mt-1 mb-0.5 grid gap-1 border-l border-line pl-3 ml-[0.35em] text-xs text-ink-3">
                {x.parts.map((p) => (
                  <li key={p.category} className="flex gap-2">
                    <span className="min-w-0 flex-1 truncate">{categoryLabel(t, p.category)}</span>
                    <span className="tabular-nums">{fmt.eur(p.amount)}</span>
                    <span className="w-[5em] text-right tabular-nums">{percent(p.amount / total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
