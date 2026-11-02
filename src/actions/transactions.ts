"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { materializeRecurring } from "@/lib/recurring";
import { formToObject, transactionSchema, zodErrors, type FormState } from "@/lib/validation";

function revalidateAll() {
  revalidatePath("/", "layout");
}

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

  revalidateAll();
  return {
    ok: true,
    message: isRecurring ? "Wiederkehrende Buchung angelegt." : "Buchung gespeichert.",
    // Typ, Kategorie und Datum für die nächste Eingabe behalten
    values: { type: values.type, category: values.category, date: values.date, amount: "", note: "" },
  };
}

export async function updateTransaction(
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
  revalidateAll();
  redirect(`/transactions?month=${date.toISOString().slice(0, 7)}`);
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transaction.delete({ where: { id } });
  revalidateAll();
}
