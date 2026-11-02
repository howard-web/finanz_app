"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { parseDateInput, todayUTC } from "@/lib/dates";
import { getDividendProposals } from "@/lib/dividends";
import { parseAmountToCents, parseDecimal } from "@/lib/money";
import { revalidateApp } from "@/lib/revalidate";
import { DEFAULT_LOCALE, hasLocale } from "@/i18n/config";
import { dictionaries } from "@/i18n/dictionaries";
import { tf } from "@/i18n/translate";
import { getFormatters } from "@/lib/format";
import { formToObject, msg, type FormState } from "@/lib/validation";

const keySchema = z.string().regex(/^[A-Z0-9.\-=^]+\|\d{4}-\d{2}-\d{2}$/);

async function findProposal(key: string) {
  const { proposals } = await getDividendProposals();
  return proposals.find((p) => p.key === key) ?? null;
}

/**
 * Bucht einen Vorschlag als Einnahme (Betrag = tatsächlich erhaltenes Netto).
 * `lang` bestimmt nur die Sprache der gespeicherten Notiz.
 */
export async function bookDividend(lang: string, key: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = formToObject(formData);
  const proposal = await findProposal(keySchema.parse(key));
  if (!proposal) return { ok: false, message: msg("dividendGone") };

  const cents = parseAmountToCents(values.amount ?? "");
  const date = parseDateInput(values.date ?? "");
  const errors: NonNullable<FormState["errors"]> = {};
  if (cents === null || cents <= 0) errors.amount = [msg("dividendAmount")];
  if (!date) errors.date = [msg("dateInvalid")];
  else if (date > todayUTC()) errors.date = [msg("dateInFuture")];
  if (Object.keys(errors).length) return { ok: false, errors, values };

  const l = hasLocale(lang) ? lang : DEFAULT_LOCALE;
  const fmt = getFormatters(l);
  const note = tf(dictionaries[l].dividends.bookedNote, {
    symbol: proposal.symbol,
    shares: fmt.number(proposal.shares),
    perShare: fmt.number(proposal.amountPerShare),
    currency: proposal.currency,
    gross: fmt.eur(proposal.grossEUR),
  });
  await db.transaction.create({
    data: {
      amountCents: cents!,
      type: "INCOME",
      category: "Dividende",
      date: date!,
      counterparty: proposal.name ?? proposal.symbol,
      note,
      assetSymbol: proposal.symbol,
      dividendKey: proposal.key,
    },
  });
  revalidateApp();
  return { ok: true };
}

/** Verknüpft einen Vorschlag mit einer vorhandenen Einnahme (z.B. aus CSV-Import). */
export async function linkDividend(key: string, transactionId: string): Promise<void> {
  const proposal = await findProposal(keySchema.parse(key));
  if (!proposal) throw new Error("Vorschlag nicht mehr vorhanden.");
  const t = await db.transaction.findUniqueOrThrow({ where: { id: transactionId } });
  if (t.type !== "INCOME" || t.dividendKey) throw new Error("Buchung kann nicht verknüpft werden.");

  await db.transaction.update({
    where: { id: transactionId },
    data: { dividendKey: proposal.key, assetSymbol: proposal.symbol, category: "Dividende" },
  });
  revalidateApp();
}

export async function dismissDividend(key: string): Promise<void> {
  const k = keySchema.parse(key);
  await db.dividendDismissal.upsert({ where: { key: k }, create: { key: k }, update: {} });
  revalidateApp();
}

export async function restoreDismissedDividends(): Promise<void> {
  await db.dividendDismissal.deleteMany();
  revalidateApp();
}

/** Löst die Verknüpfung; die Buchung bleibt erhalten, der Vorschlag erscheint wieder. */
export async function unlinkDividend(transactionId: string): Promise<void> {
  await db.transaction.update({
    where: { id: transactionId },
    data: { dividendKey: null, assetSymbol: null },
  });
  revalidateApp();
}

export async function deleteDividendTransaction(transactionId: string): Promise<void> {
  await db.transaction.delete({ where: { id: transactionId } });
  revalidateApp();
}

export async function saveDividendTaxRate(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formToObject(formData);
  const raw = (values.taxRate ?? "").trim();
  const n = raw === "0" ? 0 : parseDecimal(raw);
  if (n === null || n < 0 || n > 100) {
    return { ok: false, values, errors: { taxRate: [msg("taxRateRange")] } };
  }
  const data = { dividendTaxRate: n / 100 };
  await db.appSettings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
  revalidateApp();
  return { ok: true, message: msg("saved"), values };
}
