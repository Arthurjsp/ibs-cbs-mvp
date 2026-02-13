import { calcInputSchema, CalcInput, CalcOutput, CalcItemResult, RuleEffect, RuleSetDTO, roundTo } from "@mvp/shared";
import { evaluateCondition } from "./rule-evaluator";

interface ItemContext {
  emitterUf: string;
  recipientUf: string;
  ncm: string;
  category: string;
  operationType: "SALE" | "PURCHASE";
  issueDate: string;
  itemValue: number;
}

function sortRules(ruleSet: RuleSetDTO) {
  return [...ruleSet.rules].sort((a, b) => b.priority - a.priority);
}

function applyEffect(current: Required<Pick<RuleEffect, "ibsRate" | "cbsRate" | "creditEligible">>, effect: RuleEffect) {
  return {
    ibsRate: effect.ibsRate ?? current.ibsRate,
    cbsRate: effect.cbsRate ?? current.cbsRate,
    creditEligible: effect.creditEligible ?? current.creditEligible
  };
}

function baseDecision() {
  return {
    ibsRate: 0,
    cbsRate: 0,
    creditEligible: false
  };
}

export function calculateDocument(input: CalcInput): CalcOutput {
  const parsed = calcInputSchema.parse(input) as CalcInput;
  const sortedRules = sortRules(parsed.ruleSet);
  const scenario = parsed.scenario;
  const transitionFactor = scenario?.transitionFactor ?? 1;
  const passThroughMultiplier = (scenario?.pricePassThroughPercent ?? 0) / 100;

  const itemResults: CalcItemResult[] = parsed.document.items.map((item) => {
    const ctx: ItemContext = {
      emitterUf: parsed.document.emitterUf,
      recipientUf: parsed.document.recipientUf,
      ncm: item.ncm,
      category: item.category ?? "NAO_CLASSIFICADA",
      operationType: parsed.document.operationType,
      issueDate: parsed.document.issueDate,
      itemValue: item.totalValue
    };

    let decision = baseDecision();
    const audit = sortedRules.map((rule) => {
      const evaluation = evaluateCondition(rule.whenJson, ctx);
      if (evaluation.matched) {
        decision = applyEffect(decision, rule.thenJson);
      }
      return {
        ruleId: rule.id,
        description: rule.description,
        matched: evaluation.matched,
        reason: evaluation.reason,
        priority: rule.priority,
        effectApplied: evaluation.matched ? rule.thenJson : undefined
      };
    });

    let ibsRate = decision.ibsRate * transitionFactor;
    let cbsRate = decision.cbsRate * transitionFactor;

    if (scenario?.overrideRates?.ibsRate !== undefined) {
      ibsRate = scenario.overrideRates.ibsRate;
    }
    if (scenario?.overrideRates?.cbsRate !== undefined) {
      cbsRate = scenario.overrideRates.cbsRate;
    }

    const taxBase = item.totalValue;
    const ibsValue = roundTo(taxBase * ibsRate, 2);
    const cbsValue = roundTo(taxBase * cbsRate, 2);
    const totalTax = ibsValue + cbsValue;
    const simulatedPrice = roundTo(taxBase + totalTax * passThroughMultiplier, 2);

    return {
      documentItemId: item.id,
      ibsRate: roundTo(ibsRate, 6),
      cbsRate: roundTo(cbsRate, 6),
      ibsValue,
      cbsValue,
      taxBase: roundTo(taxBase, 2),
      creditEligible: decision.creditEligible,
      simulatedPrice,
      audit
    };
  });

  const ibsTotal = roundTo(itemResults.reduce((sum, item) => sum + item.ibsValue, 0), 2);
  const cbsTotal = roundTo(itemResults.reduce((sum, item) => sum + item.cbsValue, 0), 2);
  const creditTotal = roundTo(
    itemResults.reduce((sum, item) => sum + (item.creditEligible ? item.ibsValue + item.cbsValue : 0), 0),
    2
  );
  const documentTotal = parsed.document.totalValue || itemResults.reduce((sum, item) => sum + item.taxBase, 0);
  const effectiveRate = documentTotal > 0 ? roundTo((ibsTotal + cbsTotal) / documentTotal, 6) : 0;

  return {
    itemResults,
    summary: {
      ibsTotal,
      cbsTotal,
      creditTotal,
      effectiveRate,
      itemCount: itemResults.length,
      audit: {
        scenarioApplied: scenario,
        notes: [
          "Resultado estimado para simulação estratégica, sem validade de apuração oficial.",
          `Ruleset aplicado: ${parsed.ruleSet.name} (${parsed.ruleSet.id}).`,
          transitionFactor !== 1 ? `Transition factor aplicado: ${transitionFactor}.` : "Transition factor padrão: 1."
        ]
      }
    }
  };
}
