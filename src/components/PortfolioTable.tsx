import Link from "next/link";
import { deleteAsset } from "@/actions/assets";
import { DeleteButton } from "@/components/DeleteButton";
import { signedClass } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { tf } from "@/i18n/translate";
import type { PortfolioSummary } from "@/lib/portfolio";

const dash = <span className="text-ink-4">–</span>;

export async function PortfolioTable({ summary }: { summary: PortfolioSummary }) {
  const { t, fmt, href } = await getI18n();
  const p_ = t.portfolio;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-line">
          <tr>
            <th className="th-cell">{p_.colSecurity}</th>
            <th className="th-cell text-right">{p_.colShares}</th>
            <th className="th-cell text-right">{p_.colAvgPrice}</th>
            <th className="th-cell text-right">{p_.colPrice}</th>
            <th className="th-cell text-right">{p_.colValue}</th>
            <th className="th-cell text-right">{p_.colPnl}</th>
            <th className="th-cell text-right">{p_.colDividends}</th>
          </tr>
        </thead>
        {summary.positions.map((p) => (
          <tbody key={p.symbol} className="border-b border-line-soft">
            <tr className="hover:bg-surface-2">
              <td className="td-cell">
                <div className="font-medium">{p.symbol}</div>
                <div className="max-w-56 truncate text-xs text-ink-3">{p.name}</div>
              </td>
              <td className="td-cell text-right tabular-nums">{fmt.number(p.shares)}</td>
              <td className="td-cell text-right tabular-nums">{fmt.money(p.avgBuyPrice, p.currency)}</td>
              <td className="td-cell text-right tabular-nums">
                {p.price !== null ? fmt.money(p.price, p.currency) : dash}
                {p.stale && (
                  <div className="text-[0.625rem] text-warn-ink" title={p.fetchedAt ? tf(p_.priceAsOf, { date: fmt.dateTime(p.fetchedAt) }) : p_.noPriceAvailable}>
                    {p.fetchedAt ? p_.stale : p_.noPrice}
                  </div>
                )}
              </td>
              <td className="td-cell text-right font-medium tabular-nums">{p.valueEUR !== null ? fmt.eur(p.valueEUR) : dash}</td>
              <td className={`td-cell text-right tabular-nums ${signedClass(p.pnlEUR)}`}>
                {p.pnlEUR !== null ? fmt.eur(p.pnlEUR) : dash}
                {p.pnlPct !== null && <div className="text-xs">{fmt.percent(p.pnlPct)}</div>}
              </td>
              <td className="td-cell text-right tabular-nums">
                {p.dividendsEUR > 0 ? <span className="text-pos">+{fmt.eur(p.dividendsEUR)}</span> : dash}
              </td>
            </tr>
            {p.lots.map((lot) => (
              <tr key={lot.id} className="text-xs text-ink-3">
                <td className="py-1 pr-3 pl-6" colSpan={2}>
                  {tf(p_.lot, {
                    date: fmt.date(lot.buyDate),
                    shares: fmt.number(lot.shares),
                    price: fmt.money(lot.buyPriceCents / 100, lot.currency),
                  })}
                </td>
                <td className="py-1 pr-3 text-right" colSpan={5}>
                  <Link href={href(`/portfolio/${lot.id}/edit`)} className="btn-ghost">{t.common.edit}</Link>
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
