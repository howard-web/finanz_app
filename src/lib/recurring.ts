import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { todayUTC } from "@/lib/dates";
import type { RecurringRule } from "@/generated/prisma/client";

/** Termin Nr. k einer Regel. Immer vom Startdatum aus gerechnet, damit z.B. der 31. nicht wandert. */
export function occurrence(rule: Pick<RecurringRule, "startDate" | "interval">, k: number): Date {
  return addMonthsUTC(rule.startDate, rule.interval === "YEARLY" ? 12 * k : k);
}

/** Monate addieren in UTC; Monatsende wird geklemmt (31.01. + 1 Monat = 28./29.02.). */
function addMonthsUTC(date: Date, months: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(date.getUTCDate(), lastDay)));
}

/** Index des ersten Termins, der >= `date` liegt. */
function firstIndexOnOrAfter(rule: Pick<RecurringRule, "startDate" | "interval">, date: Date) {
  let k = 0;
  while (occurrence(rule, k) < date) k++;
  return k;
}

/** Nächster Termin nach heute (für Reaktivierung, verpasste Termine werden übersprungen). */
export function nextOccurrenceAfterToday(rule: Pick<RecurringRule, "startDate" | "interval">) {
  const today = todayUTC();
  let k = firstIndexOnOrAfter(rule, today);
  if (occurrence(rule, k).getTime() === today.getTime()) k++;
  return occurrence(rule, k);
}

/**
 * Legt für alle aktiven Regeln die fälligen Buchungen an (bis einschließlich heute).
 * Idempotent dank Unique-Constraint (recurringRuleId, date) und upsert.
 */
async function materialize(): Promise<number> {
  const today = todayUTC();
  const due = await db.recurringRule.findMany({
    where: { active: true, nextDue: { lte: today } },
  });
  let created = 0;

  for (const rule of due) {
    await db.$transaction(async (tx) => {
      let k = firstIndexOnOrAfter(rule, rule.nextDue);
      let date = occurrence(rule, k);
      while (date <= today) {
        await tx.transaction.upsert({
          where: { recurringRuleId_date: { recurringRuleId: rule.id, date } },
          create: {
            amountCents: rule.amountCents,
            type: rule.type,
            category: rule.category,
            note: rule.note,
            date,
            recurringRuleId: rule.id,
          },
          update: {},
        });
        created++;
        k++;
        date = occurrence(rule, k);
      }
      await tx.recurringRule.update({ where: { id: rule.id }, data: { nextDue: date } });
    });
  }
  return created;
}

/** Pro Request höchstens einmal ausführen. */
export const materializeRecurring = cache(materialize);
