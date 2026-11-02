import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateAsset } from "@/actions/assets";
import { AssetForm } from "@/components/forms/AssetForm";
import { PageHeader, Skeleton } from "@/components/ui";
import { db } from "@/lib/db";
import { toDateInput } from "@/lib/dates";
import { centsToInput } from "@/lib/money";

export default function EditAssetPage({ params }: PageProps<"/portfolio/[id]/edit">) {
  return (
    <>
      <PageHeader title="Kauf bearbeiten">
        <Link href="/portfolio" className="btn-secondary">Zurück</Link>
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
  const a = await db.asset.findUnique({ where: { id } });
  if (!a) notFound();
  return (
    <AssetForm
      action={updateAsset.bind(null, a.id)}
      lockSymbol
      currency={a.currency}
      defaults={{
        symbol: a.symbol,
        shares: String(a.shares).replace(".", ","),
        buyPrice: centsToInput(a.buyPriceCents),
        buyDate: toDateInput(a.buyDate),
      }}
    />
  );
}
