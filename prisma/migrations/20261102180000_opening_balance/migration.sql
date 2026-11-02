-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "openingBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "openingBalanceDate" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

