"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { materializeRecurring } from "@/lib/recurring";
import { revalidateApp } from "@/lib/revalidate";
import { hasLocale, localizePath, DEFAULT_LOCALE } from "@/i18n/config";
import { formToObject, msg, transactionSchema, zodErrors, type FormState } from "@/lib/validation";

export async function createTransaction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formToObject(formData);
  const parsed = transactionSchema.safeParse(values);
  if (!parsed.success) return zodErrors(parsed.error, values);
  const { amount, type, category, date, note, isRecurring, interval } = parsed.data;

  if (isRecurring) {
    // Regel anlegen; fällige Buchungen (inkl. der ersten) erzeugt materializeRecurring.
    await db.recurringRule.create({
      data: { amountCents: amount, type, category, note, interval, startDate: date, nextDue: date },
    });
    await materializeRecurring();
  } else {
    await db.transaction.create({ data: { amountCents: amount, type, category, date, note } });
  }

  revalidateApp();
  return {
    ok: true,
    message: msg(isRecurring ? "recurringCreated" : "transactionSaved"),
    // Typ, Kategorie und Datum für die nächste Eingabe behalten
    values: { type: values.type, category: values.category, date: values.date, amount: "", note: "" },
  };
}

export async function updateTransaction(
  lang: string,
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formToObject(formData);
  const parsed = transactionSchema.safeParse(values);
  if (!parsed.success) return zodErrors(parsed.error, values);
  const { amount, type, category, date, note } = parsed.data;

  await db.transaction.update({
    where: { id },
    data: { amountCents: amount, type, category, date, note },
  });
  revalidateApp();
  const l = hasLocale(lang) ? lang : DEFAULT_LOCALE;
  redirect(localizePath(l, `/transactions?month=${date.toISOString().slice(0, 7)}`));
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transaction.delete({ where: { id } });
  revalidateApp();
}
