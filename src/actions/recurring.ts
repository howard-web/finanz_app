"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { nextOccurrenceAfterToday } from "@/lib/recurring";
import { formToObject, recurringRuleUpdateSchema, zodErrors, type FormState } from "@/lib/validation";

export async function updateRecurringRule(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formToObject(formData);
  const parsed = recurringRuleUpdateSchema.safeParse(values);
  if (!parsed.success) return zodErrors(parsed.error, values);
  const { amount, type, category, note, interval } = parsed.data;

  const rule = await db.recurringRule.findUniqueOrThrow({ where: { id } });
  const data: Parameters<typeof db.recurringRule.update>[0]["data"] = {
    amountCents: amount,
    type,
    category,
    note,
    interval,
  };
  // Intervallwechsel: nächster Termin neu berechnen, damit nichts nachgebucht wird.
  if (interval !== rule.interval) {
    data.nextDue = nextOccurrenceAfterToday({ startDate: rule.startDate, interval });
  }
  await db.recurringRule.update({ where: { id }, data });

  revalidatePath("/", "layout");
  redirect("/recurring");
}

export async function toggleRecurringRule(id: string): Promise<void> {
  const rule = await db.recurringRule.findUniqueOrThrow({ where: { id } });
  await db.recurringRule.update({
    where: { id },
    data: rule.active
      ? { active: false }
      : // Beim Fortsetzen werden verpasste Termine nicht nachgebucht.
        { active: true, nextDue: nextOccurrenceAfterToday(rule) },
  });
  revalidatePath("/", "layout");
}

/** Löscht die Regel. Bereits gebuchte Transaktionen bleiben erhalten. */
export async function deleteRecurringRule(id: string): Promise<void> {
  await db.recurringRule.delete({ where: { id } });
  revalidatePath("/", "layout");
}
