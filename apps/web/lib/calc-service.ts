import { Prisma, RuleSetStatus, TaxType } from "@prisma/client";
import { CalcInput, LegacyICMSRateDTO, LegacyUfConfigDTO, RuleCondition, RuleEffect, ScenarioParams } from "@mvp/shared";
import { checkSimulationLimit, consumeSimulation } from "@/lib/billing";
import { hasLegacyUfConfigForDocument } from "@/lib/legacy/uf-config";
import { prisma } from "@/lib/prisma";
import { trackTelemetryEvent } from "@/lib/telemetry/track";
import { getTransitionWeights, orchestrateTransitionCalculation } from "@/lib/transition/orchestrator";

function decimalToNumber(value: { toNumber(): number } | number): number {
  return typeof value === "number" ? value : value.toNumber();
}

function toIsoDateString(date: Date): string {
  return new Date(date).toISOString();
}

export async function runCalcForDocument(params: {
  tenantId: string;
  documentId: string;
  scenarioId?: string;
  userId?: string;
}) {
  const limit = await checkSimulationLimit(params.tenantId);
  if (!limit.allowed) {
    throw new Error(limit.message ?? "Limite de simulações atingido.");
  }

  const document = await prisma.document.findFirst({
    where: {
      id: params.documentId,
      tenantId: params.tenantId
    },
    include: {
      companyProfile: true,
      items: {
        orderBy: { lineNumber: "asc" }
      }
    }
  });

  if (!document) {
    throw new Error("Documento não encontrado para o tenant.");
  }

  const scenario = params.scenarioId
    ? await prisma.scenario.findFirst({
        where: { id: params.scenarioId, tenantId: params.tenantId }
      })
    : null;
  const scenarioParams = (scenario?.parametersJson ?? undefined) as ScenarioParams | undefined;

  const catalogRows = await prisma.productCatalog.findMany({
    where: {
      tenantId: params.tenantId,
      ncm: { in: document.items.map((item) => item.ncm) }
    }
  });
  const categoryByNcm = new Map(catalogRows.map((row) => [row.ncm, row.category]));

  const ruleSet = await prisma.taxRuleSet.findFirst({
    where: {
      tenantId: params.tenantId,
      status: RuleSetStatus.ACTIVE,
      validFrom: { lte: document.issueDate },
      OR: [{ validTo: null }, { validTo: { gte: document.issueDate } }]
    },
    orderBy: [{ validFrom: "desc" }],
    include: {
      rules: true
    }
  });

  if (!ruleSet) {
    throw new Error("Nenhum RuleSet ACTIVE vigente para a data do documento.");
  }

  const transitionWeights = getTransitionWeights(document.issueDate);
  const legacyRuleSet = await prisma.legacyRuleSet.findFirst({
    where: {
      tenantId: params.tenantId,
      status: RuleSetStatus.ACTIVE,
      validFrom: { lte: document.issueDate },
      OR: [{ validTo: null }, { validTo: { gte: document.issueDate } }]
    },
    orderBy: [{ validFrom: "desc" }],
    include: {
      icmsRates: {
        where: {
          validFrom: { lte: document.issueDate },
          OR: [{ validTo: null }, { validTo: { gte: document.issueDate } }]
        }
      },
      ufConfigs: {
        where: {
          validFrom: { lte: document.issueDate },
          OR: [{ validTo: null }, { validTo: { gte: document.issueDate } }]
        }
      }
    }
  });

  if (!legacyRuleSet && transitionWeights.legacy > 0) {
    throw new Error("Nenhum LegacyRuleSet ACTIVE vigente para a data do documento.");
  }
  if (legacyRuleSet && transitionWeights.legacy > 0) {
    const hasUfConfig = hasLegacyUfConfigForDocument({
      configs: legacyRuleSet.ufConfigs,
      emitterUf: document.emitterUf,
      recipientUf: document.recipientUf,
      issueDate: document.issueDate
    });
    if (!hasUfConfig) {
      throw new Error(
        `Sem configuração legado para UF ${document.emitterUf} -> ${document.recipientUf} na vigência do documento.`
      );
    }
  }

  const calcInput: CalcInput = {
    tenantId: params.tenantId,
    company: {
      id: document.companyProfile.id,
      tenantId: params.tenantId,
      uf: document.companyProfile.uf,
      segment: document.companyProfile.segment
    },
    document: {
      id: document.id,
      key: document.key,
      issueDate: toIsoDateString(document.issueDate),
      emitterUf: document.emitterUf,
      recipientUf: document.recipientUf,
      operationType: document.operationType,
      totalValue: decimalToNumber(document.totalValue),
      items: document.items.map((item) => ({
        id: item.id,
        lineNumber: item.lineNumber,
        description: item.description,
        ncm: item.ncm,
        cfop: item.cfop,
        quantity: decimalToNumber(item.quantity),
        unitValue: decimalToNumber(item.unitValue),
        totalValue: decimalToNumber(item.totalValue),
        category: item.category ?? categoryByNcm.get(item.ncm) ?? null
      }))
    },
    scenario: scenarioParams,
    ruleSet: {
      id: ruleSet.id,
      name: ruleSet.name,
      validFrom: toIsoDateString(ruleSet.validFrom),
      validTo: ruleSet.validTo ? toIsoDateString(ruleSet.validTo) : null,
      rules: ruleSet.rules.map((rule) => ({
        id: rule.id,
        priority: rule.priority,
        description: rule.description,
        whenJson: rule.whenJson as unknown as RuleCondition,
        thenJson: rule.thenJson as unknown as RuleEffect
      }))
    }
  };

  const legacyRates: LegacyICMSRateDTO[] =
    legacyRuleSet?.icmsRates.map((rate) => ({
      id: rate.id,
      uf: rate.uf,
      ncm: rate.ncm,
      category: rate.category,
      rate: decimalToNumber(rate.rate),
      validFrom: toIsoDateString(rate.validFrom),
      validTo: rate.validTo ? toIsoDateString(rate.validTo) : null
    })) ?? [];
  const legacyUfConfigs: LegacyUfConfigDTO[] =
    legacyRuleSet?.ufConfigs.map((config) => ({
      id: config.id,
      emitterUf: config.emitterUf,
      recipientUf: config.recipientUf,
      internalRate: decimalToNumber(config.internalRate),
      interstateRate: decimalToNumber(config.interstateRate),
      stRate: decimalToNumber(config.stRate),
      stMva: decimalToNumber(config.stMva),
      difalEnabled: config.difalEnabled,
      stEnabled: config.stEnabled,
      validFrom: toIsoDateString(config.validFrom),
      validTo: config.validTo ? toIsoDateString(config.validTo) : null
    })) ?? [];

  const output = orchestrateTransitionCalculation({
    ibsInput: calcInput,
    legacyRates,
    legacyUfConfigs
  });
  const now = new Date();
  const creditByTax = output.ibs.itemResults.reduce(
    (acc, item) => {
      if (!item.creditEligible) return acc;
      acc.ibs += item.ibsValue;
      acc.cbs += item.cbsValue;
      acc.is += item.isValue;
      return acc;
    },
    { ibs: 0, cbs: 0, is: 0 }
  );

  const calcRun = await prisma.$transaction(async (tx) => {
    const run = await tx.calcRun.create({
      data: {
        tenantId: params.tenantId,
        documentId: document.id,
        ruleSetId: ruleSet.id,
        scenarioId: scenario?.id,
        runAt: now,
        parametersJson: {
          scenario: scenario?.parametersJson ?? null,
          ruleSetName: ruleSet.name,
          legacyRuleSetName: legacyRuleSet?.name ?? null,
          transitionWeights: output.weights
        } as unknown as Prisma.InputJsonValue
      }
    });

    if (output.items.length > 0) {
      await tx.calcItemResult.createMany({
        data: output.items.map((itemResult) => ({
          calcRunId: run.id,
          documentItemId: itemResult.ibs.documentItemId,
          ibsRate: itemResult.ibs.ibsRate,
          cbsRate: itemResult.ibs.cbsRate,
          isRate: itemResult.ibs.isRate,
          ibsValue: itemResult.ibs.ibsValue,
          cbsValue: itemResult.ibs.cbsValue,
          isValue: itemResult.ibs.isValue,
          taxBase: itemResult.ibs.taxBase,
          creditEligible: itemResult.ibs.creditEligible,
          auditJson: {
            weights: itemResult.weights,
            engines: {
              legacy: {
                icmsValue: itemResult.legacy.icmsValue,
                stValue: itemResult.legacy.stValue,
                difalValue: itemResult.legacy.difalValue,
                totalTax: itemResult.legacy.totalTax,
                unsupported: itemResult.legacy.unsupported,
                unsupportedReasons: itemResult.legacy.unsupportedReasons,
                audit: itemResult.legacy.audit
              },
              ibs: {
                totalTax: itemResult.ibs.ibsValue + itemResult.ibs.cbsValue + itemResult.ibs.isValue,
                creditEligible: itemResult.ibs.creditEligible,
                audit: itemResult.ibs.audit
              }
            },
            transition: itemResult.transition
          } as unknown as Prisma.InputJsonValue,
          componentsJson: itemResult as unknown as Prisma.InputJsonValue
        }))
      });
    }

    await tx.calcSummary.create({
      data: {
        calcRunId: run.id,
        ibsTotal: output.ibs.summary.ibsTotal,
        cbsTotal: output.ibs.summary.cbsTotal,
        isTotal: output.ibs.summary.isTotal,
        creditTotal: output.ibs.summary.creditTotal,
        effectiveRate: output.summary.transition.effectiveRate,
        auditJson: {
          weights: output.weights,
          engines: {
            legacy: output.legacy.summary,
            ibs: output.ibs.summary
          },
          transition: output.summary.transition
        } as unknown as Prisma.InputJsonValue,
        componentsJson: output.summary as unknown as Prisma.InputJsonValue
      }
    });

    const ledgerRows = [
      { taxType: TaxType.IBS, amount: creditByTax.ibs },
      { taxType: TaxType.CBS, amount: creditByTax.cbs },
      { taxType: TaxType.IS, amount: creditByTax.is }
    ].filter((row) => row.amount > 0);

    for (const row of ledgerRows) {
      const ledger = await tx.taxCreditLedger.create({
        data: {
          tenantId: params.tenantId,
          calcRunId: run.id,
          taxType: row.taxType,
          amount: row.amount,
          status: "PENDING_EXTINCTION",
          extDebtRequired: true,
          evidenceJson: {
            source: "calc_run",
            runAt: now.toISOString(),
            calcRunId: run.id,
            documentId: document.id
          } as unknown as Prisma.InputJsonValue
        }
      });

      await tx.taxCreditLedgerEvent.create({
        data: {
          ledgerId: ledger.id,
          eventType: "ACCRUED",
          amount: row.amount,
          metadataJson: {
            reason: "Credito gerado por simulacao elegivel",
            calcRunId: run.id,
            taxType: row.taxType
          } as unknown as Prisma.InputJsonValue
        }
      });
    }

    return run;
  });

  await consumeSimulation(params.tenantId);
  await trackTelemetryEvent({
    tenantId: params.tenantId,
    userId: params.userId ?? null,
    type: "CALCULATION_EXECUTED",
    payload: {
      calcRunId: calcRun.id,
      documentId: document.id,
      scenarioId: scenario?.id ?? null,
      ibsTotal: output.ibs.summary.ibsTotal,
      cbsTotal: output.ibs.summary.cbsTotal,
      isTotal: output.ibs.summary.isTotal,
      finalTaxTotal: output.summary.transition.totalTax,
      legacyIcmsTotal: output.legacy.summary.icmsTotal,
      legacyStTotal: output.legacy.summary.stTotal,
      legacyDifalTotal: output.legacy.summary.difalTotal,
      legacyUnsupportedItemCount: output.legacy.summary.unsupportedItemCount,
      creditByTax,
      effectiveRate: output.summary.transition.effectiveRate,
      transitionWeights: output.weights
    } as unknown as Prisma.InputJsonValue
  });

  if (scenario?.id) {
    await trackTelemetryEvent({
      tenantId: params.tenantId,
      userId: params.userId ?? null,
      type: "SCENARIO_APPLIED",
      payload: {
        calcRunId: calcRun.id,
        scenarioId: scenario.id,
        scenarioName: scenario.name
      }
    });
  }

  return { calcRunId: calcRun.id, output };
}
