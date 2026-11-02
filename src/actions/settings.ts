"use server";

import { db } from "@/lib/db";
import { todayUTC } from "@/lib/dates";
import { revalidateApp } from "@/lib/revalidate";
import { formToObject, msg, openingBalanceSchema, zodErrors, type FormState } from "@/lib/validation";

export async function saveOpeningBalance(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formToObject(formData);
  const parsed = openingBalanceSchema.safeParse(values);
  if (!parsed.success) return zodErrors(parsed.error, values);
  const { amount, date } = parsed.data;

  if (date > todayUTC()) {
    return { ok: false, values, errors: { date: [msg("dateInFuture")] } };
  }

  const data = { openingBalanceCents: amount, openingBalanceDate: date };
  await db.appSettings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });

  revalidateApp();
  return { ok: true, message: msg("openingSaved"), values };
}

export async function clearOpeningBalance(): Promise<void> {
  await db.appSettings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: { openingBalanceCents: 0, openingBalanceDate: null },
  });
  revalidateApp();
}
