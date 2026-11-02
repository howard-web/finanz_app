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
- **Net Worth** = Saldo aller Buchungen + aktueller Depotwert.

## Struktur

```
src/actions/      Server Actions (transactions, recurring, assets)
src/lib/          db, money, dates, validation, cashflow, portfolio, recurring
src/lib/market/   yahoo.ts (Quotes, History, Cache), fx.ts
src/components/   Formulare, Tabellen, Charts
src/app/          Dashboard, /transactions, /recurring, /portfolio (+ Edit-Seiten)
```
