-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "assetSymbol" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "dividendKey" TEXT;

-- CreateTable
CREATE TABLE "DividendDismissal" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "openingBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "openingBalanceDate" DATETIME,
    "dividendTaxRate" REAL NOT NULL DEFAULT 0.26375,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AppSettings" ("id", "openingBalanceCents", "openingBalanceDate", "updatedAt") SELECT "id", "openingBalanceCents", "openingBalanceDate", "updatedAt" FROM "AppSettings";
DROP TABLE "AppSettings";
ALTER TABLE "new_AppSettings" RENAME TO "AppSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_dividendKey_key" ON "Transaction"("dividendKey");

-- CreateIndex
CREATE INDEX "Transaction_assetSymbol_idx" ON "Transaction"("assetSymbol");

