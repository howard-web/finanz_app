"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { lookupSymbol } from "@/lib/market/yahoo";
import { assetSchema, formToObject, zodErrors, type FormState } from "@/lib/validation";

export async function createAsset(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formToObject(formData);
  const parsed = assetSchema.safeParse(values);
  if (!parsed.success) return zodErrors(parsed.error, values);
  const { symbol, shares, buyPrice, buyDate } = parsed.data;

  let quote;
  try {
    quote = await lookupSymbol(symbol);
  } catch {
    return { ok: false, values, message: "Yahoo Finance ist gerade nicht erreichbar. Bitte später erneut versuchen." };
  }
  if (!quote) {
    return { ok: false, values, errors: { symbol: [`Ticker "${symbol}" wurde bei Yahoo nicht gefunden.`] } };
  }

  await db.asset.create({
    data: {
      symbol: quote.symbol,
      name: quote.name,
      shares,
      buyPriceCents: buyPrice,
      currency: quote.currency,
      buyDate,
    },
  });
  revalidatePath("/", "layout");
  return { ok: true, message: `${quote.symbol} hinzugefügt (Kurs in ${quote.currency}).` };
}

export async function updateAsset(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = formToObject(formData);
  const parsed = assetSchema.safeParse(values);
  if (!parsed.success) return zodErrors(parsed.error, values);
  const { shares, buyPrice, buyDate } = parsed.data;

  // Symbol und Währung bleiben beim Bearbeiten unverändert.
  await db.asset.update({ where: { id }, data: { shares, buyPriceCents: buyPrice, buyDate } });
  revalidatePath("/", "layout");
  redirect("/portfolio");
}

export async function deleteAsset(id: string): Promise<void> {
  await db.asset.delete({ where: { id } });
  revalidatePath("/", "layout");
}
