"use client";

import Link from "next/link";
import { FileUp } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { analyzeImport, importTransactions, undoImport, type ImportResult } from "@/actions/import";
import { categoriesFor } from "@/lib/categories";
import { useI18n } from "@/i18n/client";
import { categoryLabel, tf, translateMsg } from "@/i18n/translate";
import { decodeFile, detectLayout, detectMapping, extractRows, guessBank, parseCsv } from "@/lib/import/csv";
import type { AnalyzedRow, ColumnMapping, RowStatus } from "@/lib/import/types";

type FileInfo = {
  name: string;
  encoding: string;
  delimiter: string;
  bank: string | null;
  raw: string[][];
};

type Choice = { include: boolean; category: string; touched: boolean };

const EMPTY_MAPPING: ColumnMapping = {
  date: null, amount: null, debit: null, credit: null, counterparty: null, counterpartyIncome: null, purpose: null,
};

const STATUS_CLASS: Record<RowStatus, string> = {
  new: "bg-pos-soft text-pos",
  "possible-duplicate": "bg-warn-soft text-warn-ink",
  imported: "bg-surface-2 text-ink-3",
};

const isoToDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

export function ImportWizard() {
  const { t, fmt, href } = useI18n();
  const im = t.import;
  const shortDate = (iso: string) => fmt.date(isoToDate(iso));
  const statusLabel: Record<RowStatus, string> = {
    new: im.statusNew,
    "possible-duplicate": im.statusDuplicate,
    imported: im.statusImported,
  };
  const [file, setFile] = useState<FileInfo | null>(null);
  const [headerIndex, setHeaderIndex] = useState(0);
  const [mapping, setMapping] = useState<ColumnMapping>(EMPTY_MAPPING);
  const [invertSign, setInvertSign] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<AnalyzedRow[] | null>(null);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [filter, setFilter] = useState<RowStatus | "all">("all");
  const [result, setResult] = useState<Extract<ImportResult, { ok: true }> | null>(null);
  const [undone, setUndone] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const header = file?.raw[headerIndex] ?? [];
  const extracted = useMemo(
    () => (file ? extractRows(file.raw, headerIndex, mapping, { invertSign }) : { rows: [], skipped: 0 }),
    [file, headerIndex, mapping, invertSign],
  );
  const mappingComplete = mapping.date !== null && (mapping.amount !== null || (mapping.debit !== null && mapping.credit !== null));

  function reset() {
    setFile(null);
    setAnalysis(null);
    setResult(null);
    setUndone(null);
    setError(null);
    setInvertSign(false);
  }

  async function handleFile(f: File) {
    reset();
    if (f.size > 10 * 1024 * 1024) {
      setError(im.fileTooLarge);
      return;
    }
    const { text, encoding } = decodeFile(await f.arrayBuffer());
    const { delimiter, rows } = parseCsv(text);
    if (rows.length < 2) {
      setError(im.noRows);
      return;
    }
    const layout = detectLayout(rows);
    setFile({
      name: f.name,
      encoding,
      delimiter,
      bank: layout ? guessBank(rows[layout.headerIndex]) : null,
      raw: rows,
    });
    setHeaderIndex(layout?.headerIndex ?? 0);
    setMapping(layout?.mapping ?? detectMapping(rows[0]));
    if (!layout) setError(im.notDetected);
  }

  function changeHeader(i: number) {
    setHeaderIndex(i);
    setMapping(detectMapping(file!.raw[i] ?? []));
    setAnalysis(null);
  }

  function changeMapping(key: keyof ColumnMapping, value: string) {
    setMapping((m) => ({ ...m, [key]: value === "" ? null : Number(value) }));
    setAnalysis(null);
  }

  function analyze() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await analyzeImport(extracted.rows);
        setAnalysis(res);
        setChoices(res.map((a) => ({ include: a.status === "new", category: a.suggestedCategory, touched: false })));
        setFilter("all");
      } catch {
        setError(im.analyzeFailed);
      }
    });
  }

  /** Kategorie setzen und auf unveränderte Zeilen mit gleicher Gegenpartei übertragen. */
  function setCategory(index: number, category: string) {
    const row = extracted.rows[index];
    const party = row.counterparty.toLowerCase();
    const isIncome = row.amountCents > 0;
    setChoices((cs) =>
      cs.map((c, i) => {
        if (i === index) return { ...c, category, touched: true };
        const r = extracted.rows[i];
        if (!c.touched && party && r.counterparty.toLowerCase() === party && r.amountCents > 0 === isIncome) {
          return { ...c, category };
        }
        return c;
      }),
    );
  }

  function runImport() {
    setError(null);
    const selections = choices
      .map((c, index) => ({ ...c, index }))
      .filter((c) => c.include && analysis![c.index].status !== "imported")
      .map(({ index, category }) => ({ index, category }));
    startTransition(async () => {
      const res = await importTransactions({ rows: extracted.rows, selections });
      if (res.ok) setResult(res);
      else setError(translateMsg(t, res.message));
    });
  }

  function undo() {
    if (!result) return;
    startTransition(async () => {
      const { deleted } = await undoImport(result.batch);
      setUndone(deleted);
    });
  }

  // ------------------------------------------------------------------ Ergebnis
  if (result) {
    return (
      <section className="card max-w-xl">
        {undone === null ? (
          <>
            <h2 className="text-lg font-semibold">{tf(im.resultImported, { count: result.created })}</h2>
            {result.skipped > 0 && (
              <p className="mt-1 text-sm text-ink-3">{tf(im.resultSkipped, { count: result.skipped })}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {result.months.length > 0 && (
                <Link href={href(`/transactions?month=${result.months[result.months.length - 1]}`)} className="btn-primary">
                  {im.toCashflow}
                </Link>
              )}
              <button type="button" className="btn-secondary" onClick={reset}>{im.importAnother}</button>
              <button type="button" className="btn-secondary" onClick={undo} disabled={pending || result.created === 0}>
                {pending ? "…" : im.undoImport}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">{im.undoneTitle}</h2>
            <p className="mt-1 text-sm text-ink-3">{tf(im.undoneText, { count: undone })}</p>
            <button type="button" className="btn-secondary mt-4" onClick={reset}>{im.importNew}</button>
          </>
        )}
      </section>
    );
  }

  // ------------------------------------------------------------------ Upload
  if (!file) {
    return (
      <section className="grid gap-3">
        <label
          className="card flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed py-14 text-center hover:border-accent hover:bg-accent-soft"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
        >
          <span className="mb-1 flex size-[2.6em] items-center justify-center rounded-2xl bg-accent-soft text-accent-ink"><FileUp aria-hidden className="size-[1.3em]" /></span>
          <span className="font-medium">{im.dropTitle}</span>
          <span className="text-sm text-ink-3">{im.dropHint}</span>
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </label>
        {error && <p className="text-sm text-neg">{error}</p>}
        <p className="text-xs text-ink-3">{im.privacy}</p>
      </section>
    );
  }

  // ------------------------------------------------------------------ Zuordnung + Prüfung
  const columnOptions = header.map((h, i) => ({
    value: String(i),
    label: `${h || tf(im.column, { n: i + 1 })}${file.raw[headerIndex + 1]?.[i] ? ` – ${tf(im.example, { value: file.raw[headerIndex + 1][i].slice(0, 24) })}` : ""}`,
  }));

  const counts = analysis
    ? {
        all: analysis.length,
        new: analysis.filter((a) => a.status === "new").length,
        "possible-duplicate": analysis.filter((a) => a.status === "possible-duplicate").length,
        imported: analysis.filter((a) => a.status === "imported").length,
      }
    : null;
  const selectedCount = analysis ? choices.filter((c, i) => c.include && analysis[i].status !== "imported").length : 0;
  const visible = analysis ? analysis.filter((a) => filter === "all" || a.status === filter) : [];
  const selectable = visible.filter((a) => a.status !== "imported");
  const allVisibleSelected = selectable.length > 0 && selectable.every((a) => choices[a.index].include);

  return (
    <div className="grid gap-6">
      <section className="card">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold">{file.name}</h2>
            <p className="text-sm text-ink-3">
              {file.bank ? `${tf(im.bankDetected, { bank: file.bank })} · ` : ""}
              {file.encoding} · {(im.delimiters as Record<string, string>)[file.delimiter] ?? file.delimiter} · {tf(im.bookings, { count: extracted.rows.length })}
              {extracted.skipped > 0 && ` · ${tf(im.skippedRows, { count: extracted.skipped })}`}
            </p>
          </div>
          <button type="button" className="btn-ghost" onClick={reset}>{im.otherFile}</button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MappingSelect label={im.headerRow} value={String(headerIndex)} onChange={(v) => changeHeader(Number(v))}
            options={file.raw.slice(0, 40).map((r, i) => ({ value: String(i), label: tf(im.rowLabel, { n: i + 1, preview: r.slice(0, 3).join(" · ").slice(0, 50) }) }))}
            required />
          <MappingSelect label={t.common.date} value={mapping.date} onChange={(v) => changeMapping("date", v)} options={columnOptions} required />
          {mapping.amount !== null || mapping.debit === null ? (
            <MappingSelect label={im.amountSigned} value={mapping.amount} onChange={(v) => changeMapping("amount", v)} options={columnOptions} required={mapping.debit === null} />
          ) : null}
          {mapping.amount === null && (
            <>
              <MappingSelect label={im.debit} value={mapping.debit} onChange={(v) => changeMapping("debit", v)} options={columnOptions} />
              <MappingSelect label={im.credit} value={mapping.credit} onChange={(v) => changeMapping("credit", v)} options={columnOptions} />
            </>
          )}
          <MappingSelect label={im.party} value={mapping.counterparty} onChange={(v) => changeMapping("counterparty", v)} options={columnOptions} />
          {mapping.counterpartyIncome !== null && (
            <MappingSelect label={im.partyIncome} value={mapping.counterpartyIncome} onChange={(v) => changeMapping("counterpartyIncome", v)} options={columnOptions} />
          )}
          <MappingSelect label={im.purpose} value={mapping.purpose} onChange={(v) => changeMapping("purpose", v)} options={columnOptions} />
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={invertSign} onChange={(e) => { setInvertSign(e.target.checked); setAnalysis(null); }} className="size-4" />
          {im.invertSign}
        </label>

        {mappingComplete && extracted.rows.length > 0 && !analysis && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">{im.preview}</p>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line-soft">
                {extracted.rows.slice(0, 5).map((r, i) => (
                  <tr key={i}>
                    <td className="py-1.5 pr-3 whitespace-nowrap text-ink-2 tabular-nums">{shortDate(r.date)}</td>
                    <td className="py-1.5 pr-3">{r.counterparty}<span className="text-ink-4"> {r.purpose}</span></td>
                    <td className={`py-1.5 text-right whitespace-nowrap tabular-nums ${r.amountCents > 0 ? "text-pos" : "text-neg"}`}>
                      {r.amountCents > 0 ? "+" : "−"}{fmt.cents(Math.abs(r.amountCents))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-neg">{error}</p>}

        {!analysis && (
          <button type="button" className="btn-primary mt-4" disabled={!mappingComplete || extracted.rows.length === 0 || pending} onClick={analyze}>
            {pending ? im.checking : tf(im.checkRows, { count: extracted.rows.length })}
          </button>
        )}
      </section>

      {analysis && counts && (
        <section className="card p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
            <div className="flex flex-wrap gap-1" role="group" aria-label={im.filterLabel}>
              {(["all", "new", "possible-duplicate", "imported"] as const).map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${filter === f ? "bg-ink text-canvas" : "text-ink-2 hover:bg-surface-2"}`}>
                  {f === "all" ? im.filterAll : statusLabel[f]} ({counts[f]})
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-ink-2">{tf(im.selected, { count: selectedCount })}</span>
              <button type="button" className="btn-primary" disabled={selectedCount === 0 || pending} onClick={runImport}>
                {pending ? im.importing : tf(im.importCount, { count: selectedCount })}
              </button>
            </div>
          </div>
          {error && <p className="px-4 pt-3 text-sm text-neg">{error}</p>}
          {counts["possible-duplicate"] > 0 && (
            <p className="mx-4 mt-3 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn-ink">{im.duplicateHint}</p>
          )}
          <div className="max-h-[65vh] overflow-auto p-2">
            <table className="w-full">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-line">
                  <th className="th-cell w-8">
                    <input type="checkbox" aria-label={im.selectAllVisible} checked={allVisibleSelected}
                      onChange={(e) => {
                        const ids = new Set(selectable.map((a) => a.index));
                        setChoices((cs) => cs.map((c, i) => (ids.has(i) ? { ...c, include: e.target.checked } : c)));
                      }}
                      className="size-4" />
                  </th>
                  <th className="th-cell">{t.common.date}</th>
                  <th className="th-cell">{im.colPartyPurpose}</th>
                  <th className="th-cell text-right">{t.common.amount}</th>
                  <th className="th-cell">{t.common.category}</th>
                  <th className="th-cell">{t.common.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {visible.map((a) => {
                  const r = extracted.rows[a.index];
                  const c = choices[a.index];
                  const disabled = a.status === "imported";
                  return (
                    <tr key={a.index} className={disabled ? "text-ink-4" : c.include ? "" : "text-ink-3"}>
                      <td className="td-cell">
                        <input type="checkbox" checked={c.include && !disabled} disabled={disabled} aria-label={im.includeRow}
                          onChange={(e) => setChoices((cs) => cs.map((x, i) => (i === a.index ? { ...x, include: e.target.checked } : x)))}
                          className="size-4" />
                      </td>
                      <td className="td-cell whitespace-nowrap tabular-nums">{shortDate(r.date)}</td>
                      <td className="td-cell max-w-md">
                        <div className="truncate font-medium">{r.counterparty || "–"}</div>
                        <div className="truncate text-xs text-ink-3" title={r.purpose}>{r.purpose}</div>
                      </td>
                      <td className={`td-cell text-right font-medium whitespace-nowrap tabular-nums ${r.amountCents > 0 ? "text-pos" : "text-neg"}`}>
                        {r.amountCents > 0 ? "+" : "−"}{fmt.cents(Math.abs(r.amountCents))}
                      </td>
                      <td className="td-cell">
                        <select value={c.category} disabled={disabled} onChange={(e) => setCategory(a.index, e.target.value)}
                          className="field w-auto py-1 text-xs" aria-label={t.common.category}>
                          {categoriesFor(r.amountCents > 0 ? "INCOME" : "EXPENSE").map((cat) => (
                            <option key={cat} value={cat}>{categoryLabel(t, cat)}</option>
                          ))}
                        </select>
                        {!c.touched && !disabled && a.suggestionSource === "history" && (
                          <div className="mt-0.5 text-[0.625rem] text-accent-ink">{im.learned}</div>
                        )}
                      </td>
                      <td className="td-cell">
                        <span className={`rounded px-1.5 py-0.5 text-[0.6875rem] font-medium whitespace-nowrap ${STATUS_CLASS[a.status]}`}>
                          {statusLabel[a.status]}
                        </span>
                        {a.match && (() => {
                          const m = a.match;
                          const label = [shortDate(m.date), categoryLabel(t, m.category), m.note, fmt.cents(m.amountCents)].filter(Boolean).join(" · ");
                          return (
                            <div className="mt-0.5 max-w-48 truncate text-[0.625rem] text-ink-3" title={label}>
                              {tf(im.existing, { match: label })}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {visible.length === 0 && <p className="p-6 text-center text-sm text-ink-3">{im.emptyFilter}</p>}
          </div>
        </section>
      )}
    </div>
  );
}

function MappingSelect({
  label, value, onChange, options, required,
}: {
  label: string;
  value: number | string | null;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  const { t } = useI18n();
  return (
    <label className="block">
      <span className="field-label">{label}{required && <span className="text-neg"> *</span>}</span>
      <select className="field" value={value === null ? "" : String(value)} onChange={(e) => onChange(e.target.value)}>
        {!required && <option value="">{t.common.none}</option>}
        {required && value === null && <option value="">{t.common.pleaseChoose}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
