import Link from "next/link";
import { deleteAsset } from "@/actions/assets";
import { DeleteButton } from "@/components/DeleteButton";
import { signedClass } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { formatEUR, formatMoney, formatPercent } from "@/lib/money";
import type { PortfolioSummary } from "@/lib/portfolio";

const dash = <span className="text-ink-4">–</span>;

export function PortfolioTable({ summary }: { summary: PortfolioSummary }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-line">
          <tr>
            <th className="th-cell">Wertpapier</th>
            <th className="th-cell text-right">Anzahl</th>
            <th className="th-cell text-right">Ø Kaufpreis</th>
            <th className="th-cell text-right">Kurs</th>
            <th className="th-cell text-right">Wert (EUR)</th>
            <th className="th-cell text-right">G/V (EUR)</th>
            <th className="th-cell text-right">Dividenden</th>
          </tr>
        </thead>
        {summary.positions.map((p) => (
          <tbody key={p.symbol} className="border-b border-line-soft">
            <tr className="hover:bg-surface-2">
              <td className="td-cell">
                <div className="font-medium">{p.symbol}</div>
                <div className="max-w-56 truncate text-xs text-ink-3">{p.name}</div>
              </td>
              <td className="td-cell text-right tabular-nums">{p.shares.toLocaleString("de-DE")}</td>
              <td className="td-cell text-right tabular-nums">{formatMoney(p.avgBuyPrice, p.currency)}</td>
              <td className="td-cell text-right tabular-nums">
                {p.price !== null ? formatMoney(p.price, p.currency) : dash}
                {p.stale && (
                  <div className="text-[0.625rem] text-warn-ink" title={p.fetchedAt ? `Stand ${p.fetchedAt.toLocaleString("de-DE")}` : "Kein Kurs verfügbar"}>
                    {p.fetchedAt ? "veraltet" : "kein Kurs"}
                  </div>
                )}
              </td>
              <td className="td-cell text-right font-medium tabular-nums">{p.valueEUR !== null ? formatEUR(p.valueEUR) : dash}</td>
              <td className={`td-cell text-right tabular-nums ${signedClass(p.pnlEUR)}`}>
                {p.pnlEUR !== null ? formatEUR(p.pnlEUR) : dash}
                {p.pnlPct !== null && <div className="text-xs">{formatPercent(p.pnlPct)}</div>}
              </td>
              <td className="td-cell text-right tabular-nums">
                {p.dividendsEUR > 0 ? <span className="text-pos">+{formatEUR(p.dividendsEUR)}</span> : dash}
              </td>
            </tr>
            {p.lots.map((lot) => (
              <tr key={lot.id} className="text-xs text-ink-3">
                <td className="py-1 pr-3 pl-6" colSpan={2}>
                  Kauf {formatDate(lot.buyDate)}: {lot.shares.toLocaleString("de-DE")} × {formatMoney(lot.buyPriceCents / 100, lot.currency)}
                </td>
                <td className="py-1 pr-3 text-right" colSpan={5}>
                  <Link href={`/portfolio/${lot.id}/edit`} className="btn-ghost">Bearbeiten</Link>
                  <DeleteButton action={deleteAsset.bind(null, lot.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
