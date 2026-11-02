# Projektwissen – Finanzen (Personal Finance & Portfolio)

@AGENTS.md

Lokale Web-App (eine Person, keine Anmeldung) für Cashflow, Abos, Depot, Dividenden und Nettovermögen in EUR.
Version 1.0.0 · © Ralf Völker · öffentlich auf GitHub: https://github.com/howard-web/finanz_app (Branch `main`, Tag `v1.0.0`).
Nutzer-Doku steht in `README.md`; diese Datei hält fest, was man beim Weiterentwickeln wissen muss.

## Zusammenarbeit

- Kommunikation mit dem Nutzer auf **Deutsch**.
- **Commits und Pushes nur auf ausdrücklichen Wunsch.** Vorher fragen, ob getrennte Commits oder einer. Git-Autor in diesem Repo: `Ralf Völker <45321181+howard-web@users.noreply.github.com>` (anonyme GitHub-Adresse, bewusst gewählt – nie die private E-Mail verwenden).
- Änderungen immer selbst verifizieren: `npx tsc --noEmit`, `npm run lint`, `npm run build`, dann im Browser ansehen (hell **und** dunkel, ggf. DE **und** EN).
- **Die echte Datenbank `prisma/dev.db` enthält Nutzerdaten – nie zurücksetzen, nie `db:seed` darauf ausführen.** Zum Testen/für Screenshots eine Wegwerf-DB nutzen (siehe unten).
- Der Dev-Server läuft normalerweise auf Port 3000 mit der echten DB. Nach Tests mit der Test-DB wieder normal starten (`npm run dev`).

## Befehle

```bash
npm run dev            # Port 3000
npm run build && npm start
npm run lint
npx tsc --noEmit
npm run db:seed        # LÖSCHT alle Daten, nur für Test-DBs
npx next typegen       # Route-Typen (PageProps<"/[lang]/…">) nach neuen Routen
```

**Test-DB (für Tests und Screenshots):**
```bash
S=<scratch-ordner>; DATABASE_URL="file:$S/preview.db" npx prisma migrate deploy
DATABASE_URL="file:$S/preview.db" npm run db:seed
pkill -f "next dev"; DATABASE_URL="file:$S/preview.db" npm run dev   # danach wieder normal starten
```
Screenshots der README liegen in `docs/screenshots/` und zeigen nur Seed-Daten (Dashboard mit `?month=` eines Monats mit vielen Kategorien).

## Stack & Versionen (wichtig: neuer als das Trainingswissen)

Next.js 16.4 (App Router, **Cache Components + Partial Prefetching aktiv**, Turbopack) · React 19.3 · TypeScript · Tailwind CSS 4 · Prisma 7.10 + SQLite über `@prisma/adapter-better-sqlite3` · yahoo-finance2 v4 · Recharts 3 · Zod 4 · lucide-react. Node ≥ 22.12.

Vor Arbeit an Next.js-APIs die Doku in `node_modules/next/dist/docs/` lesen (siehe AGENTS.md).

### Next.js 16 – Fallstricke
- **Cache Components:** Jeder Zugriff auf DB, `searchParams`, `cookies()`, „heute“ usw. muss in einer `<Suspense>`-Grenze stehen und mit `await connection()` beginnen; sonst Build-Fehler. Muster: Seite rendert statischen Kopf, Daten in async Unterkomponenten in `<Suspense>`.
- `usePathname`/`useSearchParams` in Client-Komponenten im Layout ebenfalls in `<Suspense>` (siehe `Nav`, `LanguageToggle`).
- `middleware` heißt jetzt **`proxy`** (`src/proxy.ts`).
- `"use cache"` + `cacheLife()` für zeitabhängige Werte im statischen Teil (z. B. Jahreszahl im Footer, Yahoo-Kursverlauf).
- Mutationen: `revalidateApp()` aus `src/lib/revalidate.ts` (= `revalidatePath("/[lang]", "layout")`), nicht `revalidatePath("/")`.
- Server-Action-Body-Limit auf 5 MB erhöht (`next.config.ts`, für CSV-Importe).

### Prisma 7 – Fallstricke
- Client wird nach `src/generated/prisma` generiert (gitignored, `postinstall` erzeugt ihn). Import: `@/generated/prisma/client`.
- `prisma migrate dev` ist **interaktiv** und funktioniert in dieser Umgebung nicht. Neue Migration so erzeugen:
  ```bash
  D=prisma/migrations/<YYYYMMDDHHMMSS>_<name> && mkdir -p $D
  npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script > $D/migration.sql
  npx prisma migrate deploy && npx prisma generate
  ```
- `DATABASE_URL` kommt aus `.env` (Vorlage `.env.example`), Standard `file:./prisma/dev.db`.
- npm blockiert Install-Skripte; freigegeben in `package.json` → `allowScripts` (better-sqlite3, Prisma, esbuild, fsevents).

## Architektur

```
src/app/[lang]/        Seiten je Sprache (Wurzel-Layout liegt hier!), app/globals.css
src/actions/           Server Actions (transactions, recurring, assets, import, dividends, settings)
src/lib/               Fachlogik: cashflow, portfolio, dividends, recurring, validation, money, dates, format
src/lib/market/        yahoo.ts (Kurse mit DB-Cache 6 h, Verlauf, Dividenden), fx.ts (Umrechnung nach EUR)
src/lib/import/        CSV-Parser, Bank-Erkennung, Import-Schlüssel, Kategorie-Regeln
src/i18n/              Sprachen (siehe unten)
src/components/        UI; charts/ (Recharts), forms/, import/, dividends/
prisma/schema.prisma   Transaction, RecurringRule, Asset, PriceCache, AppSettings (Singleton id=1), DividendDismissal
```

### Datenregeln
- **Beträge als ganze Cent** (`amountCents`, immer positiv; Richtung über `type` INCOME/EXPENSE). **Datumswerte als UTC-Mitternacht.** Keine Datums-Bibliothek mit lokaler Zeit verwenden (date-fns hat die Termine über die Zeitumstellung verschoben → eigene UTC-Rechnung in `lib/recurring.ts`).
- **Kategorien werden immer mit ihrem deutschen Namen gespeichert** (`lib/categories.ts`), Anzeige übersetzt über `categoryLabel(t, …)`.
- **Wiederkehrende Buchungen:** `materializeRecurring()` bucht fällige Termine beim Seitenaufruf, idempotent über `@@unique([recurringRuleId, date])`. Termine immer vom Startdatum aus berechnen (Monatsende klemmen). Intervalle: WEEKLY, MONTHLY, QUARTERLY, YEARLY.
- **Kontostand** = Startguthaben (Kontostand am Ende des Stichtags, `AppSettings`) + Buchungen *nach* dem Stichtag. **Nettovermögen** = Kontostand + Depotwert.
- **FX:** aktueller Kurs (`EUR=X` für USD, sonst `XXXEUR=X`), GBp/Pence ÷ 100. Bewusste Vereinfachung: Einstand, Verlauf und Dividenden mit aktuellem Kurs.
- **CSV-Import:** Parsing im Browser; `importKey` (Datum|Betrag|Text|laufende Nr.) verhindert Doppelimporte; mögliches Duplikat = manuelle/Abo-Buchung gleicher Betrag ±3 Tage; `importBatch` für „Rückgängig“.
- **Dividenden:** Vorschläge aus Yahoo (Ex-Tag, Bestand *vor* dem Ex-Tag), Netto-Schätzung mit `AppSettings.dividendTaxRate` (Standard 0.26375), Buchen/Verknüpfen setzt `Transaction.dividendKey`; Ignorierte in `DividendDismissal`.
- Betragseingabe: `parseAmountToCents` versteht `1.234,56` und `1,234.56` (letztes Trennzeichen + 1–2 Ziffern = Dezimal).

## Mehrsprachigkeit (DE/EN)

- Routen unter `/de/…` und `/en/…`; `generateStaticParams` im Wurzel-Layout. `src/proxy.ts` leitet Adressen ohne Präfix um (Cookie `lang` > `Accept-Language` > Deutsch).
- Texte nur in `src/i18n/dictionaries/de.ts` (Referenz) und `en.ts` (Typ `Dictionary` erzwingt Vollständigkeit – fehlt ein Schlüssel, schlägt `tsc` fehl). Platzhalter `{name}`, ersetzen mit `tf()`.
- **Server-Komponenten:** `const { lang, t, fmt, href } = await getI18n()` (liest `next/root-params`). **Client-Komponenten:** `useI18n()`.
- **Server Actions haben keinen Zugriff auf die Sprache** (`next/root-params` geht dort nicht). Sie liefern Meldungs-Schlüssel (`Msg` = `{ key, params }`, Schlüssel aus `t.msg`), übersetzt im Browser via `translateMsg`. Wo eine Action umleitet oder Text speichert, wird `lang` per `.bind(null, lang, …)` übergeben.
- Formatierung immer über `fmt` (`lib/format.ts`): `cents`, `eur`, `money`, `percent`, `share`, `rate`, `date`, `month`, `centsInput` … (de-DE bzw. en-GB). Keine eigenen `Intl`/`toLocaleString`-Aufrufe in Komponenten.
- Links immer mit `href("/pfad")` lokalisieren. Der Sprachwechsel ist bewusst ein **voller Seitenaufruf** (`window.location.assign`), damit React das Wurzel-Layout mit dem Theme-Skript nicht im Browser neu rendert (sonst Warnung bzw. Aufblitzen).

## Design-System

- **Farben nur über semantische Tokens** (`globals.css`, je ein Satz für `:root` und `.dark`): `bg-canvas/surface/surface-2/3`, `border-line(-soft/-strong)`, `text-ink(-2/-3/-4)`, `accent(-hover/-ink/-soft/-line)`, `pos(-soft)`, `neg(-soft)`, `warn-*`. Keine festen Tailwind-Farben wie `stone-500` verwenden.
- **Grün (`text-pos`) = Guthaben/Einnahmen/Gewinn, Rot (`text-neg`) = Ausgaben/Verlust/negativ**, 0 bleibt neutral. Grün/Rot nicht für andere Zwecke (z. B. Kategorien) verwenden.
- Eigene Klassen als Tailwind-`@utility`: `card`, `field`, `field-label`, `field-error`, `btn`, `btn-primary`, `btn-secondary`, `btn-ghost`, `th-cell`, `td-cell` (nicht `table-cell` – kollidiert mit Tailwind).
- **Schriftgröße 150 %** (`html { font-size: 150% }`); daher sind die **Breakpoints ×1,5** umdefiniert (`--breakpoint-*` in `globals.css`) und Recharts-Pixelwerte werden mit `useRemScale()` skaliert. Keine `text-[NNpx]` verwenden, sondern rem.
- `.grid > * { min-width: 0 }` (in `@layer base`) – sonst verbreitern breite Tabellen die Seite.
- **Dark Mode:** Klasse `.dark` auf `<html>`, gesetzt vom Inline-Skript `themeScript` im `<head>` des Wurzel-Layouts (vor dem ersten Rendern); Umschalter System/Hell/Dunkel speichert in `localStorage["theme"]`. Inline-Skript nicht durch `next/script` ersetzen (läuft zu spät → Aufblitzen).
- **Charts:** Kategorien-Torte mit fester Farbe je Kategorie und fester Reihenfolge (`EXPENSE_CHART_SLOTS`, CSS-Variablen `--cat-1…6`, `--cat-other`). Reihenfolge ist mit dem dataviz-Validator geprüft (alle Nachbarpaare, hell und dunkel) – nicht ohne erneute Prüfung ändern. Max. 6 Farben + Grau „Weitere“.
- Löschen ohne Browser-Dialog: zweistufiger `DeleteButton` („Löschen“ → „Wirklich?“).

## Bekannte Einschränkungen / offene Ideen

- Keine Verkäufe von Wertpapieren; Bestand = Summe der Käufe.
- Nur EUR als Basiswährung. Yahoo Finance hat keine offizielle API.
- Keine Lizenzdatei (= alle Rechte vorbehalten); MIT-Lizenz wurde angesprochen, aber noch nicht entschieden.
