"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEUR } from "@/lib/money";
import { useRemScale } from "./useRemScale";

type Row = { category: string; amount: number; share: number };

/**
 * Ausgaben nach Kategorie als sortierte horizontale Balken: Längen lassen sich
 * genauer vergleichen als Tortenstücke, und es braucht nur eine Farbe.
 */
export function ExpenseBars({ data }: { data: Row[] }) {
  const s = useRemScale();
  const height = Math.max(160, data.length * 36 + 16) * s;
  return (
    <div style={{ height }} role="img" aria-label="Ausgaben nach Kategorie">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4 * s, right: 96 * s, bottom: 4 * s, left: 4 * s }} barCategoryGap={8 * s}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="category"
            width={110 * s}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--chart-text-secondary)", fontSize: 13 * s }}
          />
          <Tooltip
            cursor={{ fill: "var(--chart-cursor)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as Row;
              return (
                <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-md">
                  <div className="font-medium">{row.category}</div>
                  <div className="tabular-nums">{formatEUR(row.amount)}</div>
                  <div className="text-xs text-ink-3">{(row.share * 100).toFixed(1).replace(".", ",")} % der Ausgaben</div>
                </div>
              );
            }}
          />
          <Bar dataKey="amount" fill="var(--chart-series-1)" radius={[0, 4, 4, 0]} maxBarSize={24 * s} isAnimationActive={false}>
            <LabelList
              dataKey="amount"
              position="right"
              formatter={(v) => formatEUR(Number(v))}
              style={{ fill: "var(--chart-text-secondary)", fontSize: 12 * s, fontVariantNumeric: "tabular-nums" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
