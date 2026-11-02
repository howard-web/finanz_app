"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { categoriesFor, type TransactionType } from "@/lib/categories";
import { formatCents } from "@/lib/money";
import { formatDate, parseDateInput } from "@/lib/dates";
import { buildImportKeys } from "@/lib/import/keys";
import { materializeRecurring } from "@/lib/recurring";
import { suggestCategoryByRule } from "@/lib/import/rules";
import type { AnalyzedRow, ParsedRow } from "@/lib/import/types";

const MAX_ROWS = 5000;

const rowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amountCents: z.number().int().refine((n) => n !== 0 && Math.abs(n) < 1e12),
  counterparty: z.string().max(200),
  purpose: z.string().max(500),
});
const rowsSchema = z.array(rowSchema).min(1).max(MAX_ROWS);

const typeOf = (r: ParsedRow): TransactionType => (r.amountCents > 0 ? "INCOME" : "EXPENSE");
const normalizeParty = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Toleranz für "mögliches Duplikat" gegenüber manuellen/Abo-Buchungen. */
const DUPLICATE_WINDOW_DAYS = 3;

/**
 * Prüft die Zeilen gegen die Datenbank: bereits importiert, mögliche Dubletten
 * (manuelle oder Abo-Buchung mit gleichem Betrag in ±3 Tagen) und Kategorie-Vorschläge.
 */
export async function analyzeImport(input: ParsedRow[]): Promise<AnalyzedRow[]> {
  const rows = rowsSchema.parse(input);
  const keys = buildImportKeys(rows);
  // Fällige Abo-Buchungen zuerst anlegen, sonst werden Dubletten (z.B. Miete) übersehen
  await materializeRecurring();

  const imported = new Set(
    (
      await db.transaction.findMany({
        where: { importKey: { in: keys } },
        select: { importKey: true },
      })
    ).map((t) => t.importKey),
  );

  // Kandidaten für Dubletten: nicht importierte Buchungen im Zeitraum der Datei
  const dates = rows.map((r) => parseDateInput(r.date)!.getTime());
  const window = DUPLICATE_WINDOW_DAYS * 86_400_000;
  const candidates = await db.transaction.findMany({
    where: {
      importKey: null,
      date: { gte: new Date(Math.min(...dates) - window), lte: new Date(Math.max(...dates) + window) },
    },
    select: { id: true, date: true, amountCents: true, type: true, category: true, note: true },
  });
  const usedCandidates = new Set<string>();

  // Gelernte Kategorien: letzte Kategorie je Gegenpartei aus früheren Buchungen
  const parties = [...new Set(rows.map((r) => r.counterparty).filter(Boolean))];
  const history = await db.transaction.findMany({
    where: { counterparty: { in: parties } },
    orderBy: { createdAt: "desc" },
    select: { counterparty: true, category: true, type: true },
  });
  const learned = new Map<string, string>();
  for (const h of history) {
    const k = `${h.type}|${normalizeParty(h.counterparty!)}`;
    if (!learned.has(k)) learned.set(k, h.category);
  }

  return rows.map((r, index): AnalyzedRow => {
    const type = typeOf(r);
    const cents = Math.abs(r.amountCents);

    // Kategorie-Vorschlag: Historie > Regel > "Sonstiges"
    const allowed = categoriesFor(type);
    let suggestedCategory = learned.get(`${type}|${normalizeParty(r.counterparty)}`);
    let suggestionSource: AnalyzedRow["suggestionSource"] = "history";
    if (!suggestedCategory || !allowed.includes(suggestedCategory)) {
      suggestedCategory = suggestCategoryByRule(type, `${r.counterparty} ${r.purpose}`) ?? undefined;
      suggestionSource = "rule";
    }
    if (!suggestedCategory) {
      suggestedCategory = "Sonstiges";
      suggestionSource = "default";
    }

    if (imported.has(keys[index])) {
      return { index, status: "imported", suggestedCategory, suggestionSource };
    }

    const t = dates[index];
    const match = candidates.find(
      (c) =>
        !usedCandidates.has(c.id) &&
        c.type === type &&
        c.amountCents === cents &&
        Math.abs(c.date.getTime() - t) <= window,
    );
    if (match) {
      usedCandidates.add(match.id);
      return {
        index,
        status: "possible-duplicate",
        match: `${formatDate(match.date)} · ${match.category}${match.note ? ` · ${match.note}` : ""} · ${formatCents(match.amountCents)}`,
        suggestedCategory,
        suggestionSource,
      };
    }
    return { index, status: "new", suggestedCategory, suggestionSource };
  });
}

const importSchema = z.object({
  rows: rowsSchema,
  selections: z
    .array(z.object({ index: z.number().int().min(0), category: z.string().min(1) }))
    .min(1, "Keine Zeilen ausgewählt."),
});

export type ImportResult =
  | { ok: true; created: number; skipped: number; batch: string; months: string[] }
  | { ok: false; message: string };

/**
 * Importiert die ausgewählten Zeilen. `rows` ist immer die komplette Datei, damit
 * die Schlüssel (inkl. laufender Nummer für gleiche Zeilen) stabil bleiben.
 */
export async function importTransactions(input: {
  rows: ParsedRow[];
  selections: { index: number; category: string }[];
}): Promise<ImportResult> {
  const parsed = importSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Ungültige Daten." };
  }
  const { rows, selections } = parsed.data;
  const keys = buildImportKeys(rows);
  const batch = randomUUID();

  const data = [];
  for (const { index, category } of selections) {
    const r = rows[index];
    if (!r) return { ok: false, message: `Zeile ${index + 1} existiert nicht.` };
    const type = typeOf(r);
    if (!categoriesFor(type).includes(category)) {
      return { ok: false, message: `Kategorie „${category}“ passt nicht zu Zeile ${index + 1}.` };
    }
    data.push({
      amountCents: Math.abs(r.amountCents),
      type,
      category,
      date: parseDateInput(r.date)!,
      counterparty: r.counterparty || null,
      note: r.purpose || null,
      importKey: keys[index],
      importBatch: batch,
    });
  }

  // Bereits importierte Schlüssel überspringen (z.B. Datei doppelt hochgeladen)
  const existing = new Set(
    (
      await db.transaction.findMany({
        where: { importKey: { in: data.map((d) => d.importKey) } },
        select: { importKey: true },
      })
    ).map((t) => t.importKey),
  );
  const fresh = data.filter((d) => !existing.has(d.importKey));
  if (fresh.length > 0) await db.transaction.createMany({ data: fresh });

  revalidatePath("/", "layout");
  return {
    ok: true,
    created: fresh.length,
    skipped: data.length - fresh.length,
    batch,
    months: [...new Set(fresh.map((d) => d.date.toISOString().slice(0, 7)))].sort(),
  };
}

/** Macht einen Import vollständig rückgängig. */
export async function undoImport(batch: string): Promise<{ deleted: number }> {
  const id = z.uuid().parse(batch);
  const { count } = await db.transaction.deleteMany({ where: { importBatch: id } });
  revalidatePath("/", "layout");
  return { deleted: count };
}
