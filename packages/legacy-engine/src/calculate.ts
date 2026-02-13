import { DocumentItemDTO, LegacyCalcInput, LegacyCalcOutput, LegacyICMSRateDTO, LegacyItemResult, roundTo } from "@mvp/shared";

const ST_CFOP_PREFIXES = ["540", "640"];

function asDate(value: string) {
  return new Date(value);
}

function isRateActive(rate: LegacyICMSRateDTO, issueDate: Date) {
  const validFrom = asDate(rate.validFrom);
  const validTo = rate.validTo ? asDate(rate.validTo) : null;
  if (issueDate < validFrom) return false;
  if (validTo && issueDate > validTo) return false;
  return true;
}

function getRateSpecificity(rate: LegacyICMSRateDTO) {
  let score = 0;
  if (rate.ncm) score += 2;
  if (rate.category) score += 1;
  return score;
}

function inferRateSource(rate: LegacyICMSRateDTO): "NCM_CATEGORY" | "NCM" | "CATEGORY" | "UF_DEFAULT" {
  if (rate.ncm && rate.category) return "NCM_CATEGORY";
  if (rate.ncm) return "NCM";
  if (rate.category) return "CATEGORY";
  return "UF_DEFAULT";
}

function pickRateForItem(params: {
  issueDate: Date;
  recipientUf: string;
  item: DocumentItemDTO;
  rates: LegacyICMSRateDTO[];
}) {
  const candidates = params.rates
    .filter((rate) => rate.uf.toUpperCase() === params.recipientUf.toUpperCase())
    .filter((rate) => isRateActive(rate, params.issueDate))
    .filter((rate) => {
      if (rate.ncm && rate.ncm !== params.item.ncm) return false;
      if (rate.category && rate.category !== (params.item.category ?? null)) return false;
      return true;
    })
    .sort((a, b) => {
      const specificity = getRateSpecificity(b) - getRateSpecificity(a);
      if (specificity !== 0) return specificity;
      return asDate(b.validFrom).getTime() - asDate(a.validFrom).getTime();
    });

  const selected = candidates[0];
  if (!selected) {
    return {
      rate: 0,
      rateId: undefined,
      source: "NO_RATE" as const
    };
  }

  return {
    rate: selected.rate,
    rateId: selected.id,
    source: inferRateSource(selected)
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function detectUnsupportedReasons(params: { emitterUf: string; recipientUf: string; item: DocumentItemDTO }) {
  const reasons: string[] = [];
  const interstate = params.emitterUf !== params.recipientUf;

  if (interstate) {
    reasons.push("DIFAL_POTENCIAL_NAO_IMPLEMENTADO");
  }

  if (params.item.cfop && ST_CFOP_PREFIXES.some((prefix) => params.item.cfop?.startsWith(prefix))) {
    reasons.push("ICMS_ST_MVA_NAO_IMPLEMENTADO");
  }

  return unique(reasons);
}

function buildItemResult(params: {
  issueDate: Date;
  emitterUf: string;
  recipientUf: string;
  item: DocumentItemDTO;
  rates: LegacyICMSRateDTO[];
}): LegacyItemResult {
  const rateSelection = pickRateForItem({
    issueDate: params.issueDate,
    recipientUf: params.recipientUf,
    item: params.item,
    rates: params.rates
  });

  const taxBase = roundTo(params.item.totalValue, 2);
  const icmsRate = roundTo(rateSelection.rate, 6);
  const icmsValue = roundTo(taxBase * icmsRate, 2);

  // ISS fica explícito como placeholder nesta versão.
  const issRate = 0;
  const issValue = 0;
  const totalTax = roundTo(icmsValue + issValue, 2);

  const unsupportedReasons = detectUnsupportedReasons({
    emitterUf: params.emitterUf,
    recipientUf: params.recipientUf,
    item: params.item
  });

  return {
    documentItemId: params.item.id,
    taxBase,
    icmsRate,
    icmsValue,
    issRate,
    issValue,
    totalTax,
    unsupported: unsupportedReasons.length > 0,
    unsupportedReasons,
    audit: {
      rateSelection: {
        rateId: rateSelection.rateId,
        source: rateSelection.source,
        uf: params.recipientUf,
        rate: icmsRate
      },
      unsupportedReasons,
      notes: [
        "ISS calculado como placeholder (0) no MVP.",
        rateSelection.source === "NO_RATE"
          ? "Nenhuma alíquota ICMS encontrada para a UF/perfil do item; aplicado 0."
          : `Alíquota ICMS obtida por ${rateSelection.source}.`
      ]
    }
  };
}

export function calculateLegacyDocument(input: LegacyCalcInput): LegacyCalcOutput {
  const issueDate = asDate(input.document.issueDate);
  const itemResults = input.document.items.map((item) =>
    buildItemResult({
      issueDate,
      emitterUf: input.document.emitterUf,
      recipientUf: input.document.recipientUf,
      item,
      rates: input.rates
    })
  );

  const icmsTotal = roundTo(itemResults.reduce((sum, item) => sum + item.icmsValue, 0), 2);
  const issTotal = roundTo(itemResults.reduce((sum, item) => sum + item.issValue, 0), 2);
  const totalTax = roundTo(icmsTotal + issTotal, 2);
  const unsupportedItemCount = itemResults.filter((item) => item.unsupported).length;

  return {
    itemResults,
    summary: {
      icmsTotal,
      issTotal,
      totalTax,
      unsupportedItemCount,
      itemCount: itemResults.length,
      audit: {
        notes: [
          "Motor legado v1: ICMS simplificado por UF/NCM/categoria.",
          "ISS é placeholder neste MVP (valor 0).",
          "ST, MVA e DIFAL não são calculados; quando detectados, o item é marcado como unsupported."
        ]
      }
    }
  };
}
