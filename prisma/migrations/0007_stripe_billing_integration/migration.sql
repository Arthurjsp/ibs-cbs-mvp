-- AlterTable
ALTER TABLE "Tenant"
ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "stripeSubscriptionId" TEXT,
ADD COLUMN "stripePriceId" TEXT,
ADD COLUMN "stripeSubscriptionStatus" TEXT,
ADD COLUMN "stripeCurrentPeriodEnd" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_stripeCustomerId_key" ON "Tenant"("stripeCustomerId");

CREATE UNIQUE INDEX "Tenant_stripeSubscriptionId_key" ON "Tenant"("stripeSubscriptionId");
