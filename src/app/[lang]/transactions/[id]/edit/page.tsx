import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { updateTransaction } from "@/actions/transactions";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { PageHeader, Skeleton } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { db } from "@/lib/db";
import { toDateInput } from "@/lib/dates";
import type { TransactionType } from "@/lib/categories";

export default async function EditTransactionPage({ params }: PageProps<"/[lang]/transactions/[id]/edit">) {
  const { t, href } = await getI18n();
  return (
    <>
      <PageHeader title={t.cashflow.editTitle}>
        <Link href={href("/transactions")} className="btn-secondary">
          {t.common.back}
        </Link>
      </PageHeader>
      <section className="card max-w-md">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <EditForm params={params} />
        </Suspense>
      </section>
    </>
  );
}

async function EditForm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { lang, t, fmt } = await getI18n();
  const tx = await db.transaction.findUnique({ where: { id } });
  if (!tx) notFound();
  return (
    <>
      {tx.recurringRuleId && (
        <p className="mb-4 rounded-lg bg-accent-soft p-3 text-xs text-accent-ink">{t.cashflow.fromRuleNotice}</p>
      )}
      <TransactionForm
        action={updateTransaction.bind(null, lang, tx.id)}
        defaults={{
          amount: fmt.centsInput(tx.amountCents),
          type: tx.type as TransactionType,
          category: tx.category,
          date: toDateInput(tx.date),
          note: tx.note ?? "",
        }}
      />
    </>
  );
}
