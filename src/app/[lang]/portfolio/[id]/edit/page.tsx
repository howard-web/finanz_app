import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateAsset } from "@/actions/assets";
import { AssetForm } from "@/components/forms/AssetForm";
import { PageHeader, Skeleton } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { db } from "@/lib/db";
import { toDateInput } from "@/lib/dates";

export default async function EditAssetPage({ params }: PageProps<"/[lang]/portfolio/[id]/edit">) {
  const { t, href } = await getI18n();
  return (
    <>
      <PageHeader title={t.portfolio.editTitle}>
        <Link href={href("/portfolio")} className="btn-secondary">{t.common.back}</Link>
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
  const a = await db.asset.findUnique({ where: { id } });
  if (!a) notFound();
  return (
    <AssetForm
      action={updateAsset.bind(null, lang, a.id)}
      lockSymbol
      currency={a.currency}
      defaults={{
        symbol: a.symbol,
        shares: fmt.numberInput(a.shares),
        buyPrice: fmt.centsInput(a.buyPriceCents),
        buyDate: toDateInput(a.buyDate),
      }}
    />
  );
}
