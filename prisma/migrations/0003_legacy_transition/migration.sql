-- CreateTable
CREATE TABLE "LegacyRuleSet" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validTo" TIMESTAMP(3),
  "status" "RuleSetStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegacyRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ICMSRate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "legacyRuleSetId" TEXT NOT NULL,
  "uf" TEXT NOT NULL,
  "ncm" TEXT,
  "category" TEXT,
  "rate" DECIMAL(8,6) NOT NULL,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ICMSRate_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "CalcItemResult" ADD COLUMN "componentsJson" JSONB;

-- AlterTable
ALTER TABLE "CalcSummary" ADD COLUMN "componentsJson" JSONB;

-- CreateIndex
CREATE INDEX "LegacyRuleSet_tenantId_status_validFrom_validTo_idx" ON "LegacyRuleSet"("tenantId", "status", "validFrom", "validTo");
CREATE INDEX "ICMSRate_tenantId_uf_validFrom_validTo_idx" ON "ICMSRate"("tenantId", "uf", "validFrom", "validTo");
CREATE INDEX "ICMSRate_legacyRuleSetId_idx" ON "ICMSRate"("legacyRuleSetId");
CREATE INDEX "ICMSRate_tenantId_ncm_idx" ON "ICMSRate"("tenantId", "ncm");
CREATE INDEX "ICMSRate_tenantId_category_idx" ON "ICMSRate"("tenantId", "category");

-- AddForeignKey
ALTER TABLE "LegacyRuleSet" ADD CONSTRAINT "LegacyRuleSet_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ICMSRate" ADD CONSTRAINT "ICMSRate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ICMSRate" ADD CONSTRAINT "ICMSRate_legacyRuleSetId_fkey" FOREIGN KEY ("legacyRuleSetId") REFERENCES "LegacyRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
