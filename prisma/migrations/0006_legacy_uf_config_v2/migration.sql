-- CreateTable
CREATE TABLE "LegacyUFConfig" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "legacyRuleSetId" TEXT NOT NULL,
  "emitterUf" TEXT NOT NULL,
  "recipientUf" TEXT NOT NULL,
  "internalRate" DECIMAL(8,6) NOT NULL,
  "interstateRate" DECIMAL(8,6) NOT NULL,
  "stRate" DECIMAL(8,6) NOT NULL DEFAULT 0,
  "stMva" DECIMAL(8,6) NOT NULL DEFAULT 0,
  "difalEnabled" BOOLEAN NOT NULL DEFAULT true,
  "stEnabled" BOOLEAN NOT NULL DEFAULT false,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegacyUFConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegacyUFConfig_tenantId_emitterUf_recipientUf_validFrom_val_idx"
ON "LegacyUFConfig"("tenantId", "emitterUf", "recipientUf", "validFrom", "validTo");

CREATE INDEX "LegacyUFConfig_legacyRuleSetId_idx" ON "LegacyUFConfig"("legacyRuleSetId");

CREATE UNIQUE INDEX "LegacyUFConfig_legacyRuleSetId_emitterUf_recipientUf_validF_key"
ON "LegacyUFConfig"("legacyRuleSetId", "emitterUf", "recipientUf", "validFrom");

-- AddForeignKey
ALTER TABLE "LegacyUFConfig"
ADD CONSTRAINT "LegacyUFConfig_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LegacyUFConfig"
ADD CONSTRAINT "LegacyUFConfig_legacyRuleSetId_fkey"
FOREIGN KEY ("legacyRuleSetId") REFERENCES "LegacyRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
