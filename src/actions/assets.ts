"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { lookupSymbol } from "@/lib/market/yahoo";
import { revalidateApp } from "@/lib/revalidate";
import { DEFAULT_LOCALE, hasLocale, localizePath } from "@/i18n/config";
import { assetSchema, formToObject, msg, zodErrors, type FormState } from "@/lib/validation";

export async function createAsset(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formToObject(formData);
  const parsed = assetSchema.safeParse(values);
  if (!parsed.success) return zodErrors(parsed.error, values);
  const { symbol, shares, buyPrice, buyDate } = parsed.data;

  let quote;
  try {
    quote = await lookupSymbol(symbol);
  } catch {
    return { ok: false, values, message: msg("yahooUnavailable") };
  }
  if (!quote) {
    return { ok: false, values, errors: { symbol: [msg("tickerNotFound", { symbol })] } };
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
  revalidateApp();
  return { ok: true, message: msg("assetAdded", { symbol: quote.symbol, currency: quote.currency }) };
}

export async function updateAsset(lang: string, id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = formToObject(formData);
  const parsed = assetSchema.safeParse(values);
  if (!parsed.success) return zodErrors(parsed.error, values);
  const { shares, buyPrice, buyDate } = parsed.data;

  // Symbol und Währung bleiben beim Bearbeiten unverändert.
  await db.asset.update({ where: { id }, data: { shares, buyPriceCents: buyPrice, buyDate } });
  revalidateApp();
  redirect(localizePath(hasLocale(lang) ? lang : DEFAULT_LOCALE, "/portfolio"));
}

export async function deleteAsset(id: string): Promise<void> {
  await db.asset.delete({ where: { id } });
  revalidateApp();
}
