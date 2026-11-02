import { Suspense } from "react";
import { connection } from "next/server";
import { undoImport } from "@/actions/import";
import { DeleteButton } from "@/components/DeleteButton";
import { ImportWizard } from "@/components/import/ImportWizard";
import { PageHeader, Skeleton } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { tf } from "@/i18n/translate";
import { db } from "@/lib/db";

export default async function ImportPage() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t.import.title} />
      <div className="grid gap-8">
        <ImportWizard />
        <Suspense fallback={<Skeleton className="h-24" />}>
          <ImportHistory />
        </Suspense>
      </div>
    </>
  );
}

async function ImportHistory() {
  await connection();
  const { t, fmt } = await getI18n();
  const batches = await db.transaction.groupBy({
    by: ["importBatch"],
    where: { importBatch: { not: null } },
    _count: { _all: true },
    _min: { date: true },
    _max: { date: true, createdAt: true },
    orderBy: { _max: { createdAt: "desc" } },
    take: 10,
  });
  if (batches.length === 0) return null;

  // Server Action als Wrapper, weil undoImport ein Ergebnis zurückgibt
  async function undo(batch: string) {
    "use server";
    await undoImport(batch);
  }

  return (
    <section>
      <h2 className="mb-2 font-semibold">{t.import.historyTitle}</h2>
      <div className="card divide-y divide-line-soft p-0">
        {batches.map((b) => (
          <div key={b.importBatch} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <div>
              <span className="font-medium">{tf(t.import.historyRow, { count: b._count._all })}</span>
              <span className="text-ink-3">
                {" · "}
                {tf(t.import.historyMeta, {
                  from: fmt.date(b._min.date!),
                  to: fmt.date(b._max.date!),
                  date: fmt.dateTime(b._max.createdAt!),
                })}
              </span>
            </div>
            <DeleteButton action={undo.bind(null, b.importBatch!)} label={t.import.undo} />
          </div>
        ))}
      </div>
    </section>
  );
}
