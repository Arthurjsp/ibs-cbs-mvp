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

