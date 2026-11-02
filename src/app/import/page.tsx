import { Suspense } from "react";
import { connection } from "next/server";
import { undoImport } from "@/actions/import";
import { DeleteButton } from "@/components/DeleteButton";
import { ImportWizard } from "@/components/import/ImportWizard";
import { PageHeader, Skeleton } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";

export default function ImportPage() {
  return (
    <>
      <PageHeader title="Kontoauszug importieren" />
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
      <h2 className="mb-2 font-semibold">Letzte Importe</h2>
      <div className="card divide-y divide-stone-100 p-0">
        {batches.map((b) => (
          <div key={b.importBatch} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <div>
              <span className="font-medium">{b._count._all} Buchungen</span>
              <span className="text-stone-500">
                {" "}· {formatDate(b._min.date!)} – {formatDate(b._max.date!)} · importiert am{" "}
                {b._max.createdAt!.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
              </span>
            </div>
            <DeleteButton action={undo.bind(null, b.importBatch!)} label="Rückgängig" />
          </div>
        ))}
      </div>
    </section>
  );
}
