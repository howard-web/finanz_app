import Link from "next/link";
import { deleteTransaction } from "@/actions/transactions";
import { DeleteButton } from "@/components/DeleteButton";
import { EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import type { Transaction } from "@/generated/prisma/client";

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return <EmptyState>Keine Buchungen in diesem Monat.</EmptyState>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-stone-200">
          <tr>
            <th className="th-cell">Datum</th>
            <th className="th-cell">Kategorie</th>
            <th className="th-cell">Gegenpartei / Notiz</th>
            <th className="th-cell text-right">Betrag</th>
            <th className="th-cell" />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {transactions.map((t) => (
            <tr key={t.id} className="hover:bg-stone-50">
              <td className="td-cell whitespace-nowrap text-stone-600 tabular-nums">{formatDate(t.date)}</td>
              <td className="td-cell">
                <span className="inline-flex items-center gap-1.5">
                  {t.category}
                  {t.recurringRuleId && (
                    <span title="Aus wiederkehrender Buchung" className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                      ↻ Abo
                    </span>
                  )}
                </span>
              </td>
              <td className="td-cell max-w-xs">
                {t.counterparty && <div className="truncate text-stone-800">{t.counterparty}</div>}
                <div className="truncate text-xs text-stone-500" title={t.note ?? undefined}>{t.note}</div>
              </td>
              <td
                className={`td-cell text-right font-medium whitespace-nowrap tabular-nums ${
                  t.type === "INCOME" ? "text-emerald-700" : "text-stone-900"
                }`}
              >
                {t.type === "INCOME" ? "+" : "−"}
                {formatCents(t.amountCents)}
              </td>
              <td className="td-cell text-right whitespace-nowrap">
                <Link href={`/transactions/${t.id}/edit`} className="btn-ghost">
                  Bearbeiten
                </Link>
                <DeleteButton action={deleteTransaction.bind(null, t.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
