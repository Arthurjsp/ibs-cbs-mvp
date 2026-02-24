import { calculateDocument } from "@mvp/engine";
import { calculateLegacyDocument } from "@mvp/legacy-engine";
import {
  CalcInput,
  LegacyICMSRateDTO,
  LegacyUfConfigDTO,
  PersistedItemComponents,
  PersistedSummaryComponents,
  TransitionCalcOutput,
  TransitionWeights,
  roundTo
} from "@mvp/shared";

function getYear(issueDate: string | Date) {
  const parsed = issueDate instanceof Date ? issueDate : new Date(issueDate);
  return parsed.getUTCFullYear();
}

export function getTransitionWeights(issueDate: string | Date): TransitionWeights {
  const year = getYear(issueDate);
  if (year <= 2028) return { year, legacy: 1, ibs: 0 };
  if (year === 2029) return { year, legacy: 0.9, ibs: 0.1 };
  if (year === 2030) return { year, legacy: 0.8, ibs: 0.2 };
  if (year === 2031) return { year, legacy: 0.7, ibs: 0.3 };
  if (year === 2032) return { year, legacy: 0.6, ibs: 0.4 };
  return { year, legacy: 0, ibs: 1 };
}

function composeItems(params: {
  ibsInput: CalcInput;
  legacyRates: LegacyICMSRateDTO[];
  legacyUfConfigs: LegacyUfConfigDTO[];
  weights: TransitionWeights;
}) {
  const legacy = calculateLegacyDocument({
    tenantId: params.ibsInput.tenantId,
    document: params.ibsInput.document,
    rates: params.legacyRates,
    ufConfigs: params.legacyUfConfigs
  });
  const ibs = calculateDocument(params.ibsInput);

  const legacyByItem = new Map(legacy.itemResults.map((item) => [item.documentItemId, item]));
  const ibsByItem = new Map(ibs.itemResults.map((item) => [item.documentItemId, item]));

  const items: PersistedItemComponents[] = params.ibsInput.document.items.map((item) => {
    const legacyItem = legacyByItem.get(item.id);
    const ibsItem = ibsByItem.get(item.id);

    if (!legacyItem || !ibsItem) {
      throw new Error(`Falha ao compor transição para o item ${item.id}.`);
    }

    const legacyTax = roundTo(legacyItem.totalTax, 2);
    const ibsTax = roundTo(ibsItem.ibsValue + ibsItem.cbsValue + ibsItem.isValue, 2);
    const weightedLegacyTax = roundTo(legacyTax * params.weights.legacy, 2);
    const weightedIbsTax = roundTo(ibsTax * params.weights.ibs, 2);
    const totalTax = roundTo(weightedLegacyTax + weightedIbsTax, 2);
    const effectiveRate = item.totalValue > 0 ? roundTo(totalTax / item.totalValue, 6) : 0;

    return {
      weights: params.weights,
      legacy: legacyItem,
      ibs: ibsItem,
      transition: {
        taxBase: roundTo(item.totalValue, 2),
        legacyTax,
        ibsTax,
        weightedLegacyTax,
        weightedIbsTax,
        totalTax,
        effectiveRate
      }
    };
  });

  return { items, legacy, ibs };
}

function composeSummary(params: {
  weights: TransitionWeights;
  ibsInput: CalcInput;
  items: PersistedItemComponents[];
  legacy: ReturnType<typeof calculateLegacyDocument>;
  ibs: ReturnType<typeof calculateDocument>;
}): PersistedSummaryComponents {
  const legacyTaxTotal = roundTo(params.legacy.summary.totalTax, 2);
  const ibsTaxTotal = roundTo(params.ibs.summary.ibsTotal + params.ibs.summary.cbsTotal + params.ibs.summary.isTotal, 2);
  const weightedLegacyTaxTotal = roundTo(legacyTaxTotal * params.weights.legacy, 2);
  const weightedIbsTaxTotal = roundTo(ibsTaxTotal * params.weights.ibs, 2);
  const totalTax = roundTo(weightedLegacyTaxTotal + weightedIbsTaxTotal, 2);
  const totalBase = params.ibsInput.document.totalValue || params.items.reduce((sum, item) => sum + item.transition.taxBase, 0);
  const effectiveRate = totalBase > 0 ? roundTo(totalTax / totalBase, 6) : 0;

  return {
    weights: params.weights,
    legacy: params.legacy.summary,
    ibs: params.ibs.summary,
    transition: {
      legacyTaxTotal,
      ibsTaxTotal,
      weightedLegacyTaxTotal,
      weightedIbsTaxTotal,
      totalTax,
      effectiveRate
    }
  };
}

export function orchestrateTransitionCalculation(params: {
  ibsInput: CalcInput;
  legacyRates: LegacyICMSRateDTO[];
  legacyUfConfigs: LegacyUfConfigDTO[];
}): TransitionCalcOutput {
  const weights = getTransitionWeights(params.ibsInput.document.issueDate);
  const { items, legacy, ibs } = composeItems({
    ibsInput: params.ibsInput,
    legacyRates: params.legacyRates,
    legacyUfConfigs: params.legacyUfConfigs,
    weights
  });
  const summary = composeSummary({
    weights,
    ibsInput: params.ibsInput,
    items,
    legacy,
    ibs
  });

  return {
    weights,
    legacy,
    ibs,
    items,
    summary
  };
}
