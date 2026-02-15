-- CreateEnum
CREATE TYPE "DivergenceStatus" AS ENUM ('OPEN', 'JUSTIFIED', 'RESOLVED');

-- AlterEnum
ALTER TYPE "TelemetryEventType" ADD VALUE IF NOT EXISTS 'ASSISTED_ASSESSMENT_IMPORTED';
ALTER TYPE "TelemetryEventType" ADD VALUE IF NOT EXISTS 'DIVERGENCE_JUSTIFIED';

-- CreateTable
CREATE TABLE "AssistedAssessmentSnapshot" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "monthRef" TIMESTAMP(3) NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payloadJson" JSONB NOT NULL,
  "summaryJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssistedAssessmentSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentDivergence" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "snapshotId" TEXT NOT NULL,
  "monthRef" TIMESTAMP(3) NOT NULL,
  "metric" TEXT NOT NULL,
  "simulatedValue" DECIMAL(16,4) NOT NULL,
  "assistedValue" DECIMAL(16,4) NOT NULL,
  "deltaValue" DECIMAL(16,4) NOT NULL,
  "deltaPct" DECIMAL(16,6),
  "status" "DivergenceStatus" NOT NULL DEFAULT 'OPEN',
  "justification" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssessmentDivergence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssistedAssessmentSnapshot_tenantId_monthRef_createdAt_idx" ON "AssistedAssessmentSnapshot"("tenantId", "monthRef", "createdAt");
CREATE INDEX "AssessmentDivergence_tenantId_monthRef_status_createdAt_idx" ON "AssessmentDivergence"("tenantId", "monthRef", "status", "createdAt");
CREATE UNIQUE INDEX "AssessmentDivergence_snapshotId_metric_key" ON "AssessmentDivergence"("snapshotId", "metric");

-- AddForeignKey
ALTER TABLE "AssistedAssessmentSnapshot" ADD CONSTRAINT "AssistedAssessmentSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentDivergence" ADD CONSTRAINT "AssessmentDivergence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentDivergence" ADD CONSTRAINT "AssessmentDivergence_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "AssistedAssessmentSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
