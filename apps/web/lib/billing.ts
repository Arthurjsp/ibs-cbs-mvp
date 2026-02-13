import { TenantPlan } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const PLAN_LIMITS: Record<TenantPlan, number | null> = {
  FREE: 5,
  PRO: 50,
  ENTERPRISE: null
};

function monthStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export async function checkSimulationLimit(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true }
  });
  const plan = tenant?.plan ?? TenantPlan.FREE;
  const limit = PLAN_LIMITS[plan];
  const monthRef = monthStart();

  const usage = await prisma.billingUsage.findUnique({
    where: {
      tenantId_monthRef: {
        tenantId,
        monthRef
      }
    }
  });

  const used = usage?.simulationCount ?? 0;
  const allowed = limit === null || used < limit;
  const remaining = limit === null ? null : Math.max(limit - used, 0);

  return {
    plan,
    limit,
    used,
    remaining,
    allowed,
    message: allowed
      ? null
      : `Limite mensal atingido para o plano ${plan}. Faça upgrade em /billing para continuar.`
  };
}

export async function consumeSimulation(tenantId: string) {
  const monthRef = monthStart();
  await prisma.billingUsage.upsert({
    where: {
      tenantId_monthRef: {
        tenantId,
        monthRef
      }
    },
    update: {
      simulationCount: {
        increment: 1
      }
    },
    create: {
      tenantId,
      monthRef,
      simulationCount: 1
    }
  });
}

export { PLAN_LIMITS };

