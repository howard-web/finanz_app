-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "counterparty" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "importBatch" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "importKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_importKey_key" ON "Transaction"("importKey");

-- CreateIndex
CREATE INDEX "Transaction_importBatch_idx" ON "Transaction"("importBatch");

-- CreateIndex
CREATE INDEX "Transaction_counterparty_idx" ON "Transaction"("counterparty");

