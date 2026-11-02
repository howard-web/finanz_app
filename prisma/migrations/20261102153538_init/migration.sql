-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amountCents" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "note" TEXT,
    "recurringRuleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_recurringRuleId_fkey" FOREIGN KEY ("recurringRuleId") REFERENCES "RecurringRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurringRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amountCents" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "note" TEXT,
    "interval" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "nextDue" DATETIME NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "name" TEXT,
    "shares" REAL NOT NULL,
    "buyPriceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "buyDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PriceCache" (
    "symbol" TEXT NOT NULL PRIMARY KEY,
    "price" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "name" TEXT,
    "fetchedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_recurringRuleId_date_key" ON "Transaction"("recurringRuleId", "date");

-- CreateIndex
CREATE INDEX "Asset_symbol_idx" ON "Asset"("symbol");
