import { PrismaClient, RuleSetStatus, TenantPlan, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function upsertCompany(tenantId: string) {
  const existing = await prisma.companyProfile.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "asc" }
  });

  if (existing) {
    return prisma.companyProfile.update({
      where: { id: existing.id },
      data: {
        legalName: "Empresa Demo LTDA",
        cnpj: "00000000000191",
        uf: "SP",
        segment: "VAREJO"
      }
    });
  }

  return prisma.companyProfile.create({
    data: {
      tenantId,
      legalName: "Empresa Demo LTDA",
      cnpj: "00000000000191",
      uf: "SP",
      segment: "VAREJO"
    }
  });
}

async function seedIbsRuleSet(tenantId: string) {
  const existingRuleSet = await prisma.taxRuleSet.findFirst({
    where: {
      tenantId,
      name: "RuleSet Default IBS/CBS"
    }
  });

  if (existingRuleSet) {
    await prisma.taxRule.deleteMany({ where: { ruleSetId: existingRuleSet.id } });
    await prisma.taxRuleSet.delete({ where: { id: existingRuleSet.id } });
  }

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
        thenJson: { ibsRate: 0.17, cbsRate: 0.09, creditEligible: true, notes: "Alíquota padrão estimada" }
      },
      {
        ruleSetId: ruleSet.id,
        priority: 10,
        description: "Categoria reduzida",
        whenJson: { op: "in", field: "category", value: ["REDUZIDA"] },
        thenJson: { ibsRate: 0.1, cbsRate: 0.05, creditEligible: true, notes: "Regra de benefício reduzido" }
      },
      {
        ruleSetId: ruleSet.id,
        priority: 1,
        description: "Categoria isenta",
        whenJson: { op: "in", field: "category", value: ["ISENTA"] },
        thenJson: { ibsRate: 0, cbsRate: 0, creditEligible: false, notes: "Item sem incidência no cenário" }
      }
    ]
  });

  return ruleSet;
}

async function seedLegacyRuleSet(tenantId: string) {
  const existing = await prisma.legacyRuleSet.findFirst({
    where: {
      tenantId,
      name: "RuleSet Legado ICMS/ISS v1"
    }
  });

  if (existing) {
    await prisma.iCMSRate.deleteMany({ where: { legacyRuleSetId: existing.id } });
    await prisma.legacyRuleSet.delete({ where: { id: existing.id } });
  }

  const legacyRuleSet = await prisma.legacyRuleSet.create({
    data: {
      tenantId,
      name: "RuleSet Legado ICMS/ISS v1",
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

  return legacyRuleSet;
}

async function seedScenario(tenantId: string) {
  const existing = await prisma.scenario.findFirst({
    where: { tenantId, name: "Cenário Base" }
  });

  if (existing) {
    return prisma.scenario.update({
      where: { id: existing.id },
      data: {
        parametersJson: { transitionFactor: 1, pricePassThroughPercent: 0 }
      }
    });
  }

  return prisma.scenario.create({
    data: {
      tenantId,
      name: "Cenário Base",
      parametersJson: { transitionFactor: 1, pricePassThroughPercent: 0 }
    }
  });
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: "tenant-dev-seed" },
    update: {
      name: "Tenant Demo",
      plan: TenantPlan.PRO
    },
    create: {
      id: "tenant-dev-seed",
      name: "Tenant Demo",
      plan: TenantPlan.PRO
    }
  });

  await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "admin@demo.local"
      }
    },
    update: {
      name: "Admin Demo",
      role: UserRole.ADMIN
    },
    create: {
      tenantId: tenant.id,
      email: "admin@demo.local",
      name: "Admin Demo",
      role: UserRole.ADMIN
    }
  });

  const company = await upsertCompany(tenant.id);
  const ibsRuleSet = await seedIbsRuleSet(tenant.id);
  const legacyRuleSet = await seedLegacyRuleSet(tenant.id);
  await seedScenario(tenant.id);

  console.log(
    `Seed concluído para tenant ${tenant.id}, company ${company.id}, ruleSet IBS ${ibsRuleSet.id} e ruleSet legado ${legacyRuleSet.id}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
