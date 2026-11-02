"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEUR } from "@/lib/money";

type Row = { category: string; amount: number; share: number };

/**
 * Ausgaben nach Kategorie als sortierte horizontale Balken: Längen lassen sich
 * genauer vergleichen als Tortenstücke, und es braucht nur eine Farbe.
 */
export function ExpenseBars({ data }: { data: Row[] }) {
  const height = Math.max(160, data.length * 36 + 16);
  return (
    <div style={{ height }} role="img" aria-label="Ausgaben nach Kategorie">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 96, bottom: 4, left: 4 }} barCategoryGap={8}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="category"
            width={110}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--chart-text-secondary)", fontSize: 13 }}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as Row;
              return (
                <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow-md">
                  <div className="font-medium">{row.category}</div>
                  <div className="tabular-nums">{formatEUR(row.amount)}</div>
                  <div className="text-xs text-stone-500">{(row.share * 100).toFixed(1).replace(".", ",")} % der Ausgaben</div>
                </div>
              );
            }}
          />
          <Bar dataKey="amount" fill="var(--chart-series-1)" radius={[0, 4, 4, 0]} maxBarSize={24} isAnimationActive={false}>
            <LabelList
              dataKey="amount"
              position="right"
              formatter={(v) => formatEUR(Number(v))}
              style={{ fill: "var(--chart-text-secondary)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
