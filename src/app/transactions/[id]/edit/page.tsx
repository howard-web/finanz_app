import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { updateTransaction } from "@/actions/transactions";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { PageHeader, Skeleton } from "@/components/ui";
import { db } from "@/lib/db";
import { toDateInput } from "@/lib/dates";
import { centsToInput } from "@/lib/money";
import type { TransactionType } from "@/lib/categories";

export default function EditTransactionPage({ params }: PageProps<"/transactions/[id]/edit">) {
  return (
    <>
      <PageHeader title="Buchung bearbeiten">
        <Link href="/transactions" className="btn-secondary">
          Zurück
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
  const t = await db.transaction.findUnique({ where: { id } });
  if (!t) notFound();
  return (
    <>
      {t.recurringRuleId && (
        <p className="mb-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
          Diese Buchung stammt aus einer wiederkehrenden Regel. Änderungen gelten nur für diese eine Buchung.
        </p>
      )}
      <TransactionForm
        action={updateTransaction.bind(null, t.id)}
        defaults={{
          amount: centsToInput(t.amountCents),
          type: t.type as TransactionType,
          category: t.category,
          date: toDateInput(t.date),
          note: t.note ?? "",
        }}
      />
    </>
  );
}
