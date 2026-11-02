// Beispieldaten: npm run db:seed  (löscht vorher alle vorhandenen Daten!)
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }),
});

const now = new Date();
const d = (monthsAgo: number, day: number) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, day));

async function main() {
  await db.transaction.deleteMany();
  await db.recurringRule.deleteMany();
  await db.asset.deleteMany();

  // Startguthaben: Kontostand am Tag vor der ersten Beispielbuchung
  const opening = { openingBalanceCents: 245000, openingBalanceDate: d(3, 0) };
  await db.appSettings.upsert({ where: { id: 1 }, create: { id: 1, ...opening }, update: opening });

  // Wiederkehrend: werden beim ersten Seitenaufruf automatisch gebucht.
  await db.recurringRule.createMany({
    data: [
      { amountCents: 320000, type: "INCOME", category: "Gehalt", note: "Arbeitgeber", interval: "MONTHLY", startDate: d(3, 1), nextDue: d(3, 1) },
      { amountCents: 95000, type: "EXPENSE", category: "Miete", note: "Warmmiete", interval: "MONTHLY", startDate: d(3, 3), nextDue: d(3, 3) },
      { amountCents: 1399, type: "EXPENSE", category: "Abo", note: "Netflix", interval: "MONTHLY", startDate: d(3, 15), nextDue: d(3, 15) },
      { amountCents: 1099, type: "EXPENSE", category: "Abo", note: "Spotify", interval: "MONTHLY", startDate: d(3, 20), nextDue: d(3, 20) },
      { amountCents: 8990, type: "EXPENSE", category: "Abo", note: "Amazon Prime", interval: "YEARLY", startDate: d(2, 10), nextDue: d(2, 10) },
    ],
  });

  const oneOff: [number, number, string, number, string][] = [
    [0, 2, "Lebensmittel", 8743, "Wocheneinkauf"],
    [0, 1, "Essen gehen", 4250, "Pizza"],
    [1, 5, "Lebensmittel", 11220, "Wocheneinkauf"],
    [1, 12, "Mobilität", 5800, "Deutschlandticket"],
    [1, 18, "Shopping", 12999, "Schuhe"],
    [1, 22, "Freizeit", 3600, "Kino"],
    [2, 8, "Lebensmittel", 9870, "Wocheneinkauf"],
    [2, 14, "Versicherung", 4590, "Haftpflicht"],
    [2, 25, "Gesundheit", 2500, "Apotheke"],
  ];
  await db.transaction.createMany({
    data: oneOff.map(([m, day, category, amountCents, note]) => ({
      type: "EXPENSE", category, amountCents, note, date: d(m, day),
    })),
  });

  await db.asset.createMany({
    data: [
      { symbol: "AAPL", name: "Apple Inc.", shares: 10, buyPriceCents: 21000, currency: "USD", buyDate: d(10, 15) },
      { symbol: "SAP.DE", name: "SAP SE", shares: 15, buyPriceCents: 18500, currency: "EUR", buyDate: d(8, 3) },
      { symbol: "VWCE.DE", name: "Vanguard FTSE All-World", shares: 40, buyPriceCents: 11500, currency: "EUR", buyDate: d(6, 1) },
      { symbol: "VWCE.DE", name: "Vanguard FTSE All-World", shares: 20, buyPriceCents: 12800, currency: "EUR", buyDate: d(2, 1) },
    ],
  });

  console.log("Seed fertig.");
}

main().finally(() => db.$disconnect());
