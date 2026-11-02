import { z } from "zod";
import { parseAmountToCents, parseDecimal } from "./money";
import { parseDateInput } from "./dates";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  RECURRING_INTERVALS,
  TRANSACTION_TYPES,
} from "./categories";
import type { Msg } from "@/i18n/translate";

// Alle Fehlermeldungen sind Schlüssel aus `msg` im Wörterbuch (src/i18n/dictionaries).
// Server Actions kennen die Sprache nicht; übersetzt wird im Browser.

const amountCents = z.string().transform((v, ctx) => {
  const cents = parseAmountToCents(v);
  if (cents === null || cents <= 0) {
    ctx.addIssue({ code: "custom", message: "amountPositive" });
    return z.NEVER;
  }
  return cents;
});

const dateField = z.string().transform((v, ctx) => {
  const d = parseDateInput(v);
  if (!d) {
    ctx.addIssue({ code: "custom", message: "dateInvalid" });
    return z.NEVER;
  }
  return d;
});

const note = z
  .string()
  .trim()
  .max(500, "noteTooLong")
  .transform((v) => (v === "" ? null : v));

const positiveNumber = (messageKey: string) =>
  z.string().transform((v, ctx) => {
    const n = parseDecimal(v);
    if (n === null || n <= 0) {
      ctx.addIssue({ code: "custom", message: messageKey });
      return z.NEVER;
    }
    return n;
  });

function withCategoryCheck<T extends { type: string; category: string }>(schema: z.ZodType<T>) {
  return schema.refine(
    (d) => (d.type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).includes(d.category as never),
    { message: "categoryMismatch", path: ["category"] },
  );
}

export const transactionSchema = withCategoryCheck(
  z.object({
    amount: amountCents,
    type: z.enum(TRANSACTION_TYPES, { message: "typeMissing" }),
    category: z.string().min(1, "categoryMissing"),
    date: dateField,
    note: note,
    isRecurring: z
      .string()
      .optional()
      .transform((v) => v === "on"),
    interval: z.enum(RECURRING_INTERVALS, { message: "invalid" }).default("MONTHLY"),
  }),
);

export const recurringRuleUpdateSchema = withCategoryCheck(
  z.object({
    amount: amountCents,
    type: z.enum(TRANSACTION_TYPES, { message: "typeMissing" }),
    category: z.string().min(1, "categoryMissing"),
    note: note,
    interval: z.enum(RECURRING_INTERVALS, { message: "invalid" }),
  }),
);

export const assetSchema = z.object({
  symbol: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9.\-=^]{1,20}$/, "tickerInvalid"),
  shares: positiveNumber("sharesPositive"),
  buyPrice: amountCents,
  buyDate: dateField,
});

export const openingBalanceSchema = z.object({
  amount: z.string().transform((v, ctx) => {
    const cents = parseAmountToCents(v);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "amountRequired" });
      return z.NEVER;
    }
    return cents;
  }),
  date: dateField,
});

export type FormState = {
  ok?: boolean;
  message?: Msg;
  errors?: Record<string, Msg[] | undefined>;
  /** Eingegebene Werte, damit das Formular nach dem automatischen Reset (React 19) gefüllt bleibt. */
  values?: Record<string, string>;
};

/** Wandelt FormData in ein Objekt aus Strings um (Checkboxen fehlen, wenn nicht gesetzt). */
export function formToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    // interne Next.js-Felder ($ACTION_...) ignorieren
    if (typeof v === "string" && !k.startsWith("$")) obj[k] = v;
  }
  return obj;
}

export function zodErrors(error: z.ZodError, values?: Record<string, string>): FormState {
  const fieldErrors = z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
  const errors: Record<string, Msg[]> = {};
  for (const [field, keys] of Object.entries(fieldErrors)) {
    if (keys?.length) errors[field] = keys.map((key) => ({ key }));
  }
  return { ok: false, values, message: { key: "checkFields" }, errors };
}

/** Kurzform für eine einzelne Meldung. */
export function msg(key: string, params?: Msg["params"]): Msg {
  return { key, params };
}
