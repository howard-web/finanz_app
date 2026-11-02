# Finanzen – Personal Finance & Portfolio

Lokale App für Cashflow-Tracking, Abos und Depot (Kurse via Yahoo Finance), alles in EUR.

**Stack:** Next.js 16 (App Router, Cache Components) · Tailwind v4 · Prisma 7 + SQLite (better-sqlite3-Adapter) · yahoo-finance2 · Recharts · Zod

## Start

```bash
npm install            # generiert auch den Prisma Client
npx prisma migrate dev # legt prisma/dev.db an
npm run db:seed        # optional: Beispieldaten (löscht vorhandene Daten!)
npm run dev
```

`.env`: `DATABASE_URL="file:./prisma/dev.db"`

## Funktionsweise

- **Beträge** werden als Integer-Cent gespeichert, Datumswerte als UTC-Mitternacht.
- **Wiederkehrende Buchungen** (`RecurringRule`): Fällige Termine werden beim Seitenaufruf automatisch gebucht (`src/lib/recurring.ts`). Das ist idempotent über `@@unique([recurringRuleId, date])`.
- **Kurse** werden in `PriceCache` bis zu 6 h zwischengespeichert. Ist Yahoo nicht erreichbar, wird der letzte bekannte Kurs angezeigt und als veraltet markiert.
- **FX:** Fremdwährungen werden mit dem aktuellen Kurs nach EUR umgerechnet (`EUR=X`, `GBPEUR=X` usw.). GBp/Pence werden durch 100 geteilt.
- **Depotverlauf:** historische Schlusskurse × Bestand ab Kaufdatum.
- **Dividenden** (`/dividends`): Ex-Tage und Beträge pro Aktie kommen von Yahoo (`chart` mit `events: "div"`), gerechnet wird mit dem Bestand vor dem Ex-Tag.
  - Vorschläge zeigen brutto und ein geschätztes Netto (Steuersatz in `/settings`, Standard 26,375 %). Gebucht wird der tatsächlich erhaltene Betrag.
  - Eine bereits per CSV importierte Gutschrift lässt sich verknüpfen statt neu buchen (`Transaction.dividendKey`), ignorierte Vorschläge landen in `DividendDismissal`.
  - Im Portfolio erscheinen die Dividenden pro Position und in der Gesamtrendite.
- **Net Worth** = Kontostand + aktueller Depotwert.
- **Kontostand** = Startguthaben (Kontostand am Ende eines Stichtags, unter `/settings`) + alle Buchungen *nach* dem Stichtag. Ohne Startguthaben: Saldo aller Buchungen. Buchungen am/vor dem Stichtag zählen weiter in den Monatsauswertungen.
- **CSV-Import** (`/import`): Die Datei wird im Browser geparst (Zeichensatz, Trennzeichen und Kopfzeile werden automatisch erkannt; Spalten für Sparkasse, ING, DKB, comdirect, Volksbank und N26). Der Server prüft gegen die DB:
  - Bereits importierte Zeilen erkennt er über `importKey` (Datum + Betrag + Text + laufende Nummer).
  - Mögliche Dubletten sind manuelle oder Abo-Buchungen mit gleichem Betrag innerhalb von ±3 Tagen.
  - Kategorien werden aus früheren Buchungen derselben Gegenpartei gelernt, sonst per Schlüsselwort-Regeln (`src/lib/import/rules.ts`) vorgeschlagen.
  - Jeder Import lässt sich über `importBatch` rückgängig machen.

## Struktur

```
src/actions/      Server Actions (transactions, recurring, assets)
src/lib/          db, money, dates, validation, cashflow, portfolio, recurring
src/lib/market/   yahoo.ts (Quotes, History, Cache), fx.ts
src/components/   Formulare, Tabellen, Charts
src/app/          Dashboard, /transactions, /recurring, /portfolio (+ Edit-Seiten)
```
