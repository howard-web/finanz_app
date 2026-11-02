"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEUR } from "@/lib/money";
import { useRemScale } from "./useRemScale";

type Point = { date: string; value: number };

const RANGES = [
  { key: "1M", label: "1M", days: 31 },
  { key: "6M", label: "6M", days: 183 },
  { key: "1Y", label: "1J", days: 366 },
  { key: "MAX", label: "Max", days: Infinity },
] as const;

const shortDate = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
const compactEUR = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1 });

export function PortfolioLine({ data }: { data: Point[] }) {
  const s = useRemScale();
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("MAX");

  const visible = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)!.days;
    if (!Number.isFinite(days) || data.length === 0) return data;
    const last = new Date(data[data.length - 1].date).getTime();
    const cutoff = new Date(last - days * 86_400_000).toISOString().slice(0, 10);
    return data.filter((p) => p.date >= cutoff);
  }, [data, range]);

  return (
    <div>
      <div className="mb-3 flex justify-end gap-1" role="group" aria-label="Zeitraum">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRange(r.key)}
            aria-pressed={range === r.key}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              range === r.key ? "bg-ink text-canvas" : "text-ink-2 hover:bg-surface-2"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="h-64" role="img" aria-label="Depotwert über die Zeit">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={visible} margin={{ top: 8 * s, right: 8 * s, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="pv-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-series-1)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--chart-series-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => shortDate.format(new Date(d))}
              tickLine={false}
              axisLine={false}
              minTickGap={40 * s}
              tick={{ fill: "var(--chart-text-secondary)", fontSize: 12 * s }}
            />
            <YAxis
              tickFormatter={(v) => compactEUR.format(v)}
              tickLine={false}
              axisLine={false}
              width={64 * s}
              domain={["auto", "auto"]}
              tick={{ fill: "var(--chart-text-secondary)", fontSize: 12 * s }}
            />
            <Tooltip
              cursor={{ stroke: "var(--chart-text-secondary)", strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as Point;
                return (
                  <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-md">
                    <div className="text-xs text-ink-3">{longDate.format(new Date(p.date))}</div>
                    <div className="font-medium tabular-nums">{formatEUR(p.value)}</div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--chart-series-1)"
              strokeWidth={2}
              fill="url(#pv-fill)"
              dot={false}
              activeDot={{ r: 4 * s, strokeWidth: 2, stroke: "var(--surface)" }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
