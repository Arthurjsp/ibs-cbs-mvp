import { RuleSetStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function ensureDefaultRuleSet(tenantId: string) {
  const active = await prisma.taxRuleSet.findFirst({
    where: { tenantId, status: RuleSetStatus.ACTIVE },
    include: { rules: true }
  });

  if (active) return active;

  const ruleSet = await prisma.taxRuleSet.create({
    data: {
      tenantId,
      name: "RuleSet Default IBS/CBS",
      validFrom: new Date("2026-01-01"),
      status: RuleSetStatus.ACTIVE
    }
  });

  await prisma.taxRule.createMany({
    data: [
      {
        ruleSetId: ruleSet.id,
        priority: 100,
        description: "Regra padrão",
        whenJson: { op: "and", conditions: [] },
        thenJson: { ibsRate: 0.17, cbsRate: 0.09, creditEligible: true }
      },
      {
        ruleSetId: ruleSet.id,
        priority: 10,
        description: "Categoria reduzida",
        whenJson: { op: "in", field: "category", value: ["REDUZIDA"] },
        thenJson: { ibsRate: 0.1, cbsRate: 0.05, creditEligible: true }
      },
      {
        ruleSetId: ruleSet.id,
        priority: 1,
        description: "Categoria isenta",
        whenJson: { op: "in", field: "category", value: ["ISENTA"] },
        thenJson: { ibsRate: 0, cbsRate: 0, creditEligible: false }
      }
    ]
  });

  return prisma.taxRuleSet.findUnique({
    where: { id: ruleSet.id },
    include: { rules: true }
  });
}

export async function ensureDefaultLegacyRuleSet(tenantId: string) {
  const active = await prisma.legacyRuleSet.findFirst({
    where: { tenantId, status: RuleSetStatus.ACTIVE },
    include: { icmsRates: true, ufConfigs: true }
  });

  if (active) return active;

  const legacyRuleSet = await prisma.legacyRuleSet.create({
    data: {
      tenantId,
      name: "RuleSet Legado ICMS/ISS v2",
      validFrom: new Date("2026-01-01"),
      status: RuleSetStatus.ACTIVE
    }
  });

  await prisma.iCMSRate.createMany({
    data: [
      {
        tenantId,
        legacyRuleSetId: legacyRuleSet.id,
        uf: "SP",
        rate: 0.18,
        validFrom: new Date("2026-01-01")
      },
      {
        tenantId,
        legacyRuleSetId: legacyRuleSet.id,
        uf: "PR",
        rate: 0.18,
        validFrom: new Date("2026-01-01")
      }
    ]
  });

  await prisma.legacyUFConfig.createMany({
    data: [
      {
        tenantId,
        legacyRuleSetId: legacyRuleSet.id,
        emitterUf: "SP",
        recipientUf: "SP",
        internalRate: 0.18,
        interstateRate: 0.12,
        stRate: 0.18,
        stMva: 0.4,
        difalEnabled: false,
        stEnabled: false,
        validFrom: new Date("2026-01-01")
      },
      {
        tenantId,
        legacyRuleSetId: legacyRuleSet.id,
        emitterUf: "PR",
        recipientUf: "PR",
        internalRate: 0.18,
        interstateRate: 0.12,
        stRate: 0.18,
        stMva: 0.4,
        difalEnabled: false,
        stEnabled: false,
        validFrom: new Date("2026-01-01")
      },
      {
        tenantId,
        legacyRuleSetId: legacyRuleSet.id,
        emitterUf: "SP",
        recipientUf: "PR",
        internalRate: 0.18,
        interstateRate: 0.12,
        stRate: 0.18,
        stMva: 0.4,
        difalEnabled: true,
        stEnabled: false,
        validFrom: new Date("2026-01-01")
      },
      {
        tenantId,
        legacyRuleSetId: legacyRuleSet.id,
        emitterUf: "PR",
        recipientUf: "SP",
        internalRate: 0.18,
        interstateRate: 0.12,
        stRate: 0.18,
        stMva: 0.4,
        difalEnabled: true,
        stEnabled: false,
        validFrom: new Date("2026-01-01")
      }
    ]
  });

  return prisma.legacyRuleSet.findUnique({
    where: { id: legacyRuleSet.id },
    include: { icmsRates: true, ufConfigs: true }
  });
}

export async function ensureBaselineScenario(tenantId: string) {
  const existing = await prisma.scenario.findFirst({
    where: { tenantId, name: "Cenario Base" }
  });

  if (existing) return existing;

  return prisma.scenario.create({
    data: {
      tenantId,
      name: "Cenario Base",
      parametersJson: { transitionFactor: 1, pricePassThroughPercent: 0 }
    }
  });
}
