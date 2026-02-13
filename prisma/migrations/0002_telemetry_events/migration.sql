-- CreateEnum
CREATE TYPE "TelemetryEventType" AS ENUM (
  'DOCUMENT_UPLOADED',
  'CALCULATION_EXECUTED',
  'SCENARIO_APPLIED',
  'EXPORT_CSV',
  'EXPORT_XLSX'
);

-- CreateTable
CREATE TABLE "TelemetryEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT,
  "type" "TelemetryEventType" NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TelemetryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelemetryEvent_tenantId_timestamp_idx" ON "TelemetryEvent"("tenantId", "timestamp");
CREATE INDEX "TelemetryEvent_tenantId_type_timestamp_idx" ON "TelemetryEvent"("tenantId", "type", "timestamp");

-- AddForeignKey
ALTER TABLE "TelemetryEvent"
ADD CONSTRAINT "TelemetryEvent_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
