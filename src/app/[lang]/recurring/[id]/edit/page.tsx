import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateRecurringRule } from "@/actions/recurring";
import { RecurringRuleForm } from "@/components/forms/RecurringRuleForm";
import { PageHeader, Skeleton } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { db } from "@/lib/db";
import type { TransactionType } from "@/lib/categories";

export default async function EditRecurringPage({ params }: PageProps<"/[lang]/recurring/[id]/edit">) {
  const { t, href } = await getI18n();
  return (
    <>
      <PageHeader title={t.recurring.editTitle}>
        <Link href={href("/recurring")} className="btn-secondary">{t.common.back}</Link>
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
  const { lang, fmt } = await getI18n();
  const r = await db.recurringRule.findUnique({ where: { id } });
  if (!r) notFound();
  return (
    <RecurringRuleForm
      action={updateRecurringRule.bind(null, lang, r.id)}
      defaults={{
        amount: fmt.centsInput(r.amountCents),
        type: r.type as TransactionType,
        category: r.category,
        note: r.note ?? "",
        interval: r.interval,
      }}
    />
  );
}
