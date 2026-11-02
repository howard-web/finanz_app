import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateRecurringRule } from "@/actions/recurring";
import { RecurringRuleForm } from "@/components/forms/RecurringRuleForm";
import { PageHeader, Skeleton } from "@/components/ui";
import { db } from "@/lib/db";
import { centsToInput } from "@/lib/money";
import type { TransactionType } from "@/lib/categories";

export default function EditRecurringPage({ params }: PageProps<"/recurring/[id]/edit">) {
  return (
    <>
      <PageHeader title="Wiederkehrende Buchung bearbeiten">
        <Link href="/recurring" className="btn-secondary">Zurück</Link>
      </PageHeader>
      <section className="card max-w-md">
        <Suspense fallback={<Skeleton className="h-80" />}>
          <EditForm params={params} />
        </Suspense>
      </section>
    </>
  );
}

async function EditForm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await db.recurringRule.findUnique({ where: { id } });
  if (!r) notFound();
  return (
    <RecurringRuleForm
      action={updateRecurringRule.bind(null, r.id)}
      defaults={{
        amount: centsToInput(r.amountCents),
        type: r.type as TransactionType,
        category: r.category,
        note: r.note ?? "",
        interval: r.interval,
      }}
    />
  );
}
