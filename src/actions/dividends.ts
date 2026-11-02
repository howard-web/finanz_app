"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseDateInput, todayUTC } from "@/lib/dates";
import { getDividendProposals } from "@/lib/dividends";
import { formatEUR, parseAmountToCents } from "@/lib/money";
import { formToObject, type FormState } from "@/lib/validation";

const keySchema = z.string().regex(/^[A-Z0-9.\-=^]+\|\d{4}-\d{2}-\d{2}$/);

async function findProposal(key: string) {
  const { proposals } = await getDividendProposals();
  return proposals.find((p) => p.key === key) ?? null;
}

/** Bucht einen Vorschlag als Einnahme (Betrag = tatsächlich erhaltenes Netto). */
export async function bookDividend(key: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = formToObject(formData);
  const proposal = await findProposal(keySchema.parse(key));
  if (!proposal) return { ok: false, message: "Vorschlag nicht mehr vorhanden (schon gebucht?)." };

  const cents = parseAmountToCents(values.amount ?? "");
  const date = parseDateInput(values.date ?? "");
  const errors: Record<string, string[]> = {};
  if (cents === null || cents <= 0) errors.amount = ["Bitte den erhaltenen Betrag eingeben."];
  if (!date) errors.date = ["Bitte ein Datum wählen."];
  else if (date > todayUTC()) errors.date = ["Datum liegt in der Zukunft."];
  if (Object.keys(errors).length) return { ok: false, errors, values };

  const perShare = proposal.amountPerShare.toLocaleString("de-DE", { maximumFractionDigits: 4 });
  await db.transaction.create({
    data: {
      amountCents: cents!,
      type: "INCOME",
      category: "Dividende",
      date: date!,
      counterparty: proposal.name ?? proposal.symbol,
      note: `Dividende ${proposal.symbol}: ${proposal.shares.toLocaleString("de-DE")} × ${perShare} ${proposal.currency} (brutto ${formatEUR(proposal.grossEUR)})`,
      assetSymbol: proposal.symbol,
      dividendKey: proposal.key,
    },
  });
  revalidatePath("/", "layout");
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
  revalidatePath("/", "layout");
}

export async function dismissDividend(key: string): Promise<void> {
  const k = keySchema.parse(key);
  await db.dividendDismissal.upsert({ where: { key: k }, create: { key: k }, update: {} });
  revalidatePath("/", "layout");
}

export async function restoreDismissedDividends(): Promise<void> {
  await db.dividendDismissal.deleteMany();
  revalidatePath("/", "layout");
}

/** Löst die Verknüpfung; die Buchung bleibt erhalten, der Vorschlag erscheint wieder. */
export async function unlinkDividend(transactionId: string): Promise<void> {
  await db.transaction.update({
    where: { id: transactionId },
    data: { dividendKey: null, assetSymbol: null },
  });
  revalidatePath("/", "layout");
}

export async function deleteDividendTransaction(transactionId: string): Promise<void> {
  await db.transaction.delete({ where: { id: transactionId } });
  revalidatePath("/", "layout");
}

export async function saveDividendTaxRate(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formToObject(formData);
  const n = Number((values.taxRate ?? "").trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    return { ok: false, values, errors: { taxRate: ["Bitte einen Wert zwischen 0 und 100 eingeben."] } };
  }
  const data = { dividendTaxRate: n / 100 };
  await db.appSettings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
  revalidatePath("/", "layout");
  return { ok: true, message: "Gespeichert.", values };
}
