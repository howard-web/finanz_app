import { z } from "zod";
import { parseAmountToCents } from "./money";
import { parseDateInput } from "./dates";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  RECURRING_INTERVALS,
  TRANSACTION_TYPES,
} from "./categories";

const amountCents = z
  .string()
  .transform((v, ctx) => {
    const cents = parseAmountToCents(v);
    if (cents === null || cents <= 0) {
      ctx.addIssue({ code: "custom", message: "Bitte einen Betrag größer 0 eingeben." });
      return z.NEVER;
    }
    return cents;
  });

const dateField = z.string().transform((v, ctx) => {
  const d = parseDateInput(v);
  if (!d) {
    ctx.addIssue({ code: "custom", message: "Bitte ein gültiges Datum wählen." });
    return z.NEVER;
  }
  return d;
});

const note = z
  .string()
  .trim()
  .max(500, "Notiz ist zu lang.")
  .transform((v) => (v === "" ? null : v));

const positiveNumber = (label: string) =>
  z.string().transform((v, ctx) => {
    const n = Number(v.trim().replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      ctx.addIssue({ code: "custom", message: `${label} muss größer 0 sein.` });
      return z.NEVER;
    }
    return n;
  });

function withCategoryCheck<T extends { type: string; category: string }>(
  schema: z.ZodType<T>,
) {
  return schema.refine(
    (d) =>
      (d.type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).includes(
        d.category as never,
      ),
    { message: "Kategorie passt nicht zum Typ.", path: ["category"] },
  );
}

export const transactionSchema = withCategoryCheck(
  z.object({
    amount: amountCents,
    type: z.enum(TRANSACTION_TYPES, { message: "Typ fehlt." }),
    category: z.string().min(1, "Kategorie fehlt."),
    date: dateField,
    note: note,
    isRecurring: z
      .string()
      .optional()
      .transform((v) => v === "on"),
    interval: z.enum(RECURRING_INTERVALS).default("MONTHLY"),
  }),
);

export const recurringRuleUpdateSchema = withCategoryCheck(
  z.object({
    amount: amountCents,
    type: z.enum(TRANSACTION_TYPES),
    category: z.string().min(1, "Kategorie fehlt."),
    note: note,
    interval: z.enum(RECURRING_INTERVALS),
  }),
);

export const assetSchema = z.object({
  symbol: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9.\-=^]{1,20}$/, "Ungültiges Ticker-Symbol."),
  shares: positiveNumber("Anzahl"),
  buyPrice: amountCents,
  buyDate: dateField,
});

export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
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
  return {
    ok: false,
    values,
    message: "Bitte die markierten Felder prüfen.",
    errors: z.flattenError(error).fieldErrors as Record<string, string[]>,
  };
}
