-- CreateEnum
CREATE TYPE "TaxType" AS ENUM ('IBS', 'CBS', 'IS');

-- CreateEnum
CREATE TYPE "CreditLedgerStatus" AS ENUM ('PENDING_EXTINCTION', 'AVAILABLE', 'CONSUMED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "CreditLedgerEventType" AS ENUM ('ACCRUED', 'STATUS_CHANGED', 'CONSUMED', 'ADJUSTED');

-- AlterTable
ALTER TABLE "CalcItemResult"
ADD COLUMN "isRate" DECIMAL(8,6) NOT NULL DEFAULT 0,
ADD COLUMN "isValue" DECIMAL(16,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CalcSummary"
ADD COLUMN "isTotal" DECIMAL(16,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TaxCreditLedger" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "calcRunId" TEXT NOT NULL,
  "taxType" "TaxType" NOT NULL,
  "amount" DECIMAL(16,2) NOT NULL,
  "status" "CreditLedgerStatus" NOT NULL DEFAULT 'PENDING_EXTINCTION',
  "extDebtRequired" BOOLEAN NOT NULL DEFAULT true,
  "evidenceJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaxCreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxCreditLedgerEvent" (
  "id" TEXT NOT NULL,
  "ledgerId" TEXT NOT NULL,
  "eventType" "CreditLedgerEventType" NOT NULL,
  "amount" DECIMAL(16,2),
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaxCreditLedgerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaxCreditLedger_tenantId_taxType_status_createdAt_idx" ON "TaxCreditLedger"("tenantId", "taxType", "status", "createdAt");
CREATE UNIQUE INDEX "TaxCreditLedger_calcRunId_taxType_key" ON "TaxCreditLedger"("calcRunId", "taxType");
CREATE INDEX "TaxCreditLedgerEvent_ledgerId_createdAt_idx" ON "TaxCreditLedgerEvent"("ledgerId", "createdAt");

-- AddForeignKey
ALTER TABLE "TaxCreditLedger" ADD CONSTRAINT "TaxCreditLedger_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaxCreditLedger" ADD CONSTRAINT "TaxCreditLedger_calcRunId_fkey" FOREIGN KEY ("calcRunId") REFERENCES "CalcRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaxCreditLedgerEvent" ADD CONSTRAINT "TaxCreditLedgerEvent_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "TaxCreditLedger"("id") ON DELETE CASCADE ON UPDATE CASCADE;
