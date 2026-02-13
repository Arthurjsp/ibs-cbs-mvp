-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'FISCAL', 'CFO');

-- CreateEnum
CREATE TYPE "RuleSetStatus" AS ENUM ('DRAFT', 'ACTIVE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('NFE');

-- CreateEnum
CREATE TYPE "OperationType" AS ENUM ('SALE', 'PURCHASE');

-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateTable
CREATE TABLE "Tenant" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "plan" "TenantPlan" NOT NULL DEFAULT 'FREE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
  "passwordHash" TEXT,
  "emailVerified" TIMESTAMP(3),
  "image" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "legalName" TEXT NOT NULL,
  "cnpj" TEXT,
  "uf" TEXT NOT NULL,
  "segment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRuleSet" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validTo" TIMESTAMP(3),
  "status" "RuleSetStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaxRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRule" (
  "id" TEXT NOT NULL,
  "ruleSetId" TEXT NOT NULL,
  "priority" INTEGER NOT NULL,
  "whenJson" JSONB NOT NULL,
  "thenJson" JSONB NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaxRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCatalog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "ncm" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  CONSTRAINT "ProductCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyProfileId" TEXT NOT NULL,
  "type" "DocumentType" NOT NULL,
  "key" TEXT NOT NULL,
  "issueDate" TIMESTAMP(3) NOT NULL,
  "emitterUf" TEXT NOT NULL,
  "recipientUf" TEXT NOT NULL,
  "operationType" "OperationType" NOT NULL DEFAULT 'SALE',
  "totalValue" DECIMAL(16,2) NOT NULL,
  "rawXmlPath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentItem" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "lineNumber" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "ncm" TEXT NOT NULL,
  "cfop" TEXT,
  "category" TEXT,
  "quantity" DECIMAL(16,4) NOT NULL,
  "unitValue" DECIMAL(16,4) NOT NULL,
  "totalValue" DECIMAL(16,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalcRun" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "ruleSetId" TEXT NOT NULL,
  "scenarioId" TEXT,
  "runAt" TIMESTAMP(3) NOT NULL,
  "parametersJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalcRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalcItemResult" (
  "id" TEXT NOT NULL,
  "calcRunId" TEXT NOT NULL,
  "documentItemId" TEXT NOT NULL,
  "ibsRate" DECIMAL(8,6) NOT NULL,
  "cbsRate" DECIMAL(8,6) NOT NULL,
  "ibsValue" DECIMAL(16,2) NOT NULL,
  "cbsValue" DECIMAL(16,2) NOT NULL,
  "taxBase" DECIMAL(16,2) NOT NULL,
  "creditEligible" BOOLEAN NOT NULL,
  "auditJson" JSONB NOT NULL,
  CONSTRAINT "CalcItemResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalcSummary" (
  "id" TEXT NOT NULL,
  "calcRunId" TEXT NOT NULL,
  "ibsTotal" DECIMAL(16,2) NOT NULL,
  "cbsTotal" DECIMAL(16,2) NOT NULL,
  "creditTotal" DECIMAL(16,2) NOT NULL,
  "effectiveRate" DECIMAL(8,6) NOT NULL,
  "auditJson" JSONB NOT NULL,
  CONSTRAINT "CalcSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "parametersJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingUsage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "monthRef" TIMESTAMP(3) NOT NULL,
  "simulationCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");
CREATE INDEX "CompanyProfile_tenantId_idx" ON "CompanyProfile"("tenantId");
CREATE INDEX "TaxRuleSet_tenantId_status_validFrom_validTo_idx" ON "TaxRuleSet"("tenantId", "status", "validFrom", "validTo");
CREATE INDEX "TaxRule_ruleSetId_priority_idx" ON "TaxRule"("ruleSetId", "priority");
CREATE INDEX "ProductCatalog_tenantId_ncm_idx" ON "ProductCatalog"("tenantId", "ncm");
CREATE UNIQUE INDEX "Document_tenantId_key_key" ON "Document"("tenantId", "key");
CREATE INDEX "Document_tenantId_issueDate_idx" ON "Document"("tenantId", "issueDate");
CREATE INDEX "DocumentItem_documentId_lineNumber_idx" ON "DocumentItem"("documentId", "lineNumber");
CREATE INDEX "CalcRun_tenantId_runAt_idx" ON "CalcRun"("tenantId", "runAt");
CREATE INDEX "CalcRun_documentId_idx" ON "CalcRun"("documentId");
CREATE INDEX "CalcItemResult_calcRunId_idx" ON "CalcItemResult"("calcRunId");
CREATE UNIQUE INDEX "CalcSummary_calcRunId_key" ON "CalcSummary"("calcRunId");
CREATE INDEX "Scenario_tenantId_createdAt_idx" ON "Scenario"("tenantId", "createdAt");
CREATE UNIQUE INDEX "BillingUsage_tenantId_monthRef_key" ON "BillingUsage"("tenantId", "monthRef");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaxRuleSet" ADD CONSTRAINT "TaxRuleSet_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaxRule" ADD CONSTRAINT "TaxRule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "TaxRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductCatalog" ADD CONSTRAINT "ProductCatalog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_companyProfileId_fkey" FOREIGN KEY ("companyProfileId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentItem" ADD CONSTRAINT "DocumentItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalcRun" ADD CONSTRAINT "CalcRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalcRun" ADD CONSTRAINT "CalcRun_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalcRun" ADD CONSTRAINT "CalcRun_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "TaxRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalcRun" ADD CONSTRAINT "CalcRun_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CalcItemResult" ADD CONSTRAINT "CalcItemResult_calcRunId_fkey" FOREIGN KEY ("calcRunId") REFERENCES "CalcRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalcItemResult" ADD CONSTRAINT "CalcItemResult_documentItemId_fkey" FOREIGN KEY ("documentItemId") REFERENCES "DocumentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalcSummary" ADD CONSTRAINT "CalcSummary_calcRunId_fkey" FOREIGN KEY ("calcRunId") REFERENCES "CalcRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingUsage" ADD CONSTRAINT "BillingUsage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

