import Link from "next/link";
import { deleteTransaction } from "@/actions/transactions";
import { DeleteButton } from "@/components/DeleteButton";
import { EmptyState } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { categoryLabel } from "@/i18n/translate";
import type { Transaction } from "@/generated/prisma/client";

export async function TransactionList({ transactions }: { transactions: Transaction[] }) {
  const { t, fmt, href } = await getI18n();
  if (transactions.length === 0) {
    return <EmptyState>{t.cashflow.empty}</EmptyState>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-line">
          <tr>
            <th className="th-cell">{t.cashflow.colDate}</th>
            <th className="th-cell">{t.cashflow.colCategory}</th>
            <th className="th-cell">{t.cashflow.colParty}</th>
            <th className="th-cell text-right">{t.cashflow.colAmount}</th>
            <th className="th-cell" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft">
          {transactions.map((tx) => (
            <tr key={tx.id} className="hover:bg-surface-2">
              <td className="td-cell whitespace-nowrap text-ink-2 tabular-nums">{fmt.date(tx.date)}</td>
              <td className="td-cell">
                <span className="inline-flex items-center gap-1.5">
                  {categoryLabel(t, tx.category)}
                  {tx.recurringRuleId && (
                    <span title={t.cashflow.recurringBadgeTitle} className="rounded bg-accent-soft px-1.5 py-0.5 text-[0.625rem] font-medium text-accent-ink">
                      {t.cashflow.recurringBadge}
                    </span>
                  )}
                </span>
              </td>
              <td className="td-cell max-w-xs">
                {tx.counterparty && <div className="truncate text-ink">{tx.counterparty}</div>}
                <div className="truncate text-xs text-ink-3" title={tx.note ?? undefined}>{tx.note}</div>
              </td>
              <td className={`td-cell text-right font-medium whitespace-nowrap tabular-nums ${tx.type === "INCOME" ? "text-pos" : "text-neg"}`}>
                {tx.type === "INCOME" ? "+" : "−"}
                {fmt.cents(tx.amountCents)}
              </td>
              <td className="td-cell text-right whitespace-nowrap">
                <Link href={href(`/transactions/${tx.id}/edit`)} className="btn-ghost">
                  {t.common.edit}
                </Link>
                <DeleteButton action={deleteTransaction.bind(null, tx.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
