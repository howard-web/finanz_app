"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { analyzeImport, importTransactions, undoImport, type ImportResult } from "@/actions/import";
import { categoriesFor } from "@/lib/categories";
import { formatCents } from "@/lib/money";
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

const DELIMITER_LABEL: Record<string, string> = { ";": "Semikolon", ",": "Komma", "\t": "Tab" };

const STATUS_LABEL: Record<RowStatus, { label: string; className: string }> = {
  new: { label: "Neu", className: "bg-emerald-50 text-emerald-800" },
  "possible-duplicate": { label: "Mögliches Duplikat", className: "bg-amber-50 text-amber-900" },
  imported: { label: "Bereits importiert", className: "bg-stone-100 text-stone-500" },
};

const shortDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;

export function ImportWizard() {
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
      setError("Die Datei ist größer als 10 MB.");
      return;
    }
    const { text, encoding } = decodeFile(await f.arrayBuffer());
    const { delimiter, rows } = parseCsv(text);
    if (rows.length < 2) {
      setError("Die Datei enthält keine lesbaren Zeilen. Ist es eine CSV-Datei?");
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
    if (!layout) setError("Spalten konnten nicht automatisch erkannt werden. Bitte unten zuordnen.");
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
        setError("Prüfung fehlgeschlagen. Sind Datum- und Betragsspalte richtig zugeordnet?");
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
      else setError(res.message);
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
            <h2 className="text-lg font-semibold">✓ {result.created} Buchungen importiert</h2>
            {result.skipped > 0 && (
              <p className="mt-1 text-sm text-stone-500">{result.skipped} waren bereits vorhanden und wurden übersprungen.</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {result.months.length > 0 && (
                <Link href={`/transactions?month=${result.months[result.months.length - 1]}`} className="btn-primary">
                  Zum Cashflow
                </Link>
              )}
              <button type="button" className="btn-secondary" onClick={reset}>Weitere Datei importieren</button>
              <button type="button" className="btn-secondary" onClick={undo} disabled={pending || result.created === 0}>
                {pending ? "…" : "Import rückgängig machen"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">Import rückgängig gemacht</h2>
            <p className="mt-1 text-sm text-stone-500">{undone} Buchungen wurden entfernt.</p>
            <button type="button" className="btn-secondary mt-4" onClick={reset}>Neue Datei importieren</button>
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
          className="card flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed py-14 text-center hover:border-blue-400 hover:bg-blue-50/30"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
        >
          <span className="text-3xl" aria-hidden>📄</span>
          <span className="font-medium">CSV-Kontoauszug hierher ziehen oder auswählen</span>
          <span className="text-sm text-stone-500">
            Automatisch erkannt: Sparkasse, ING, DKB, comdirect, Volksbank, N26. Andere Banken lassen sich manuell zuordnen.
          </span>
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
        {error && <p className="text-sm text-red-700">{error}</p>}
        <p className="text-xs text-stone-500">Die Datei wird im Browser gelesen. An den Server gehen nur Datum, Betrag, Gegenpartei und Verwendungszweck.</p>
      </section>
    );
  }

  // ------------------------------------------------------------------ Zuordnung + Prüfung
  const columnOptions = header.map((h, i) => ({
    value: String(i),
    label: `${h || `Spalte ${i + 1}`}${file.raw[headerIndex + 1]?.[i] ? ` – z.B. „${file.raw[headerIndex + 1][i].slice(0, 24)}“` : ""}`,
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
            <p className="text-sm text-stone-500">
              {file.bank ? `${file.bank} erkannt · ` : ""}
              {file.encoding} · {DELIMITER_LABEL[file.delimiter] ?? file.delimiter} · {extracted.rows.length} Buchungen
              {extracted.skipped > 0 && ` · ${extracted.skipped} Zeilen ohne Datum/Betrag ignoriert`}
            </p>
          </div>
          <button type="button" className="btn-ghost" onClick={reset}>Andere Datei</button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MappingSelect label="Kopfzeile" value={String(headerIndex)} onChange={(v) => changeHeader(Number(v))}
            options={file.raw.slice(0, 40).map((r, i) => ({ value: String(i), label: `Zeile ${i + 1}: ${r.slice(0, 3).join(" · ").slice(0, 50)}` }))}
            required />
          <MappingSelect label="Datum" value={mapping.date} onChange={(v) => changeMapping("date", v)} options={columnOptions} required />
          {mapping.amount !== null || mapping.debit === null ? (
            <MappingSelect label="Betrag (mit Vorzeichen)" value={mapping.amount} onChange={(v) => changeMapping("amount", v)} options={columnOptions} required={mapping.debit === null} />
          ) : null}
          {mapping.amount === null && (
            <>
              <MappingSelect label="Soll / Ausgang" value={mapping.debit} onChange={(v) => changeMapping("debit", v)} options={columnOptions} />
              <MappingSelect label="Haben / Eingang" value={mapping.credit} onChange={(v) => changeMapping("credit", v)} options={columnOptions} />
            </>
          )}
          <MappingSelect label="Gegenpartei" value={mapping.counterparty} onChange={(v) => changeMapping("counterparty", v)} options={columnOptions} />
          {mapping.counterpartyIncome !== null && (
            <MappingSelect label="Gegenpartei bei Einnahmen" value={mapping.counterpartyIncome} onChange={(v) => changeMapping("counterpartyIncome", v)} options={columnOptions} />
          )}
          <MappingSelect label="Verwendungszweck" value={mapping.purpose} onChange={(v) => changeMapping("purpose", v)} options={columnOptions} />
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={invertSign} onChange={(e) => { setInvertSign(e.target.checked); setAnalysis(null); }} className="size-4 accent-blue-600" />
          Vorzeichen umkehren (z.B. Kreditkarten-Abrechnungen, bei denen Ausgaben positiv sind)
        </label>

        {mappingComplete && extracted.rows.length > 0 && !analysis && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">Vorschau</p>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-stone-100">
                {extracted.rows.slice(0, 5).map((r, i) => (
                  <tr key={i}>
                    <td className="py-1.5 pr-3 whitespace-nowrap text-stone-600 tabular-nums">{shortDate(r.date)}</td>
                    <td className="py-1.5 pr-3">{r.counterparty}<span className="text-stone-400"> {r.purpose}</span></td>
                    <td className={`py-1.5 text-right whitespace-nowrap tabular-nums ${r.amountCents > 0 ? "text-emerald-700" : ""}`}>
                      {r.amountCents > 0 ? "+" : "−"}{formatCents(Math.abs(r.amountCents))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

        {!analysis && (
          <button type="button" className="btn-primary mt-4" disabled={!mappingComplete || extracted.rows.length === 0 || pending} onClick={analyze}>
            {pending ? "Prüfe …" : `${extracted.rows.length} Buchungen prüfen`}
          </button>
        )}
      </section>

      {analysis && counts && (
        <section className="card p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 p-4">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Filter">
              {(["all", "new", "possible-duplicate", "imported"] as const).map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${filter === f ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>
                  {f === "all" ? "Alle" : STATUS_LABEL[f].label} ({counts[f]})
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-stone-600">{selectedCount} ausgewählt</span>
              <button type="button" className="btn-primary" disabled={selectedCount === 0 || pending} onClick={runImport}>
                {pending ? "Importiere …" : `${selectedCount} importieren`}
              </button>
            </div>
          </div>
          {error && <p className="px-4 pt-3 text-sm text-red-700">{error}</p>}
          {counts["possible-duplicate"] > 0 && (
            <p className="mx-4 mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              „Mögliches Duplikat“ heißt: Es gibt schon eine manuelle oder Abo-Buchung mit gleichem Betrag innerhalb von ±3 Tagen. Diese Zeilen sind standardmäßig abgewählt.
            </p>
          )}
          <div className="max-h-[65vh] overflow-auto p-2">
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-stone-200">
                  <th className="th-cell w-8">
                    <input type="checkbox" aria-label="Alle sichtbaren auswählen" checked={allVisibleSelected}
                      onChange={(e) => {
                        const ids = new Set(selectable.map((a) => a.index));
                        setChoices((cs) => cs.map((c, i) => (ids.has(i) ? { ...c, include: e.target.checked } : c)));
                      }}
                      className="size-4 accent-blue-600" />
                  </th>
                  <th className="th-cell">Datum</th>
                  <th className="th-cell">Gegenpartei / Zweck</th>
                  <th className="th-cell text-right">Betrag</th>
                  <th className="th-cell">Kategorie</th>
                  <th className="th-cell">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visible.map((a) => {
                  const r = extracted.rows[a.index];
                  const c = choices[a.index];
                  const disabled = a.status === "imported";
                  return (
                    <tr key={a.index} className={disabled ? "text-stone-400" : c.include ? "" : "text-stone-500"}>
                      <td className="td-cell">
                        <input type="checkbox" checked={c.include && !disabled} disabled={disabled} aria-label="Importieren"
                          onChange={(e) => setChoices((cs) => cs.map((x, i) => (i === a.index ? { ...x, include: e.target.checked } : x)))}
                          className="size-4 accent-blue-600" />
                      </td>
                      <td className="td-cell whitespace-nowrap tabular-nums">{shortDate(r.date)}</td>
                      <td className="td-cell max-w-md">
                        <div className="truncate font-medium">{r.counterparty || "–"}</div>
                        <div className="truncate text-xs text-stone-500" title={r.purpose}>{r.purpose}</div>
                      </td>
                      <td className={`td-cell text-right font-medium whitespace-nowrap tabular-nums ${r.amountCents > 0 ? "text-emerald-700" : ""}`}>
                        {r.amountCents > 0 ? "+" : "−"}{formatCents(Math.abs(r.amountCents))}
                      </td>
                      <td className="td-cell">
                        <select value={c.category} disabled={disabled} onChange={(e) => setCategory(a.index, e.target.value)}
                          className="field w-auto py-1 text-xs" aria-label="Kategorie">
                          {categoriesFor(r.amountCents > 0 ? "INCOME" : "EXPENSE").map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        {!c.touched && !disabled && a.suggestionSource === "history" && (
                          <div className="mt-0.5 text-[10px] text-blue-700">gelernt</div>
                        )}
                      </td>
                      <td className="td-cell">
                        <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${STATUS_LABEL[a.status].className}`}>
                          {STATUS_LABEL[a.status].label}
                        </span>
                        {a.match && <div className="mt-0.5 max-w-48 truncate text-[10px] text-stone-500" title={a.match}>vorhanden: {a.match}</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {visible.length === 0 && <p className="p-6 text-center text-sm text-stone-500">Keine Zeilen in diesem Filter.</p>}
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
  return (
    <label className="block">
      <span className="field-label">{label}{required && <span className="text-red-600"> *</span>}</span>
      <select className="field" value={value === null ? "" : String(value)} onChange={(e) => onChange(e.target.value)}>
        {!required && <option value="">– keine –</option>}
        {required && value === null && <option value="">Bitte wählen</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
