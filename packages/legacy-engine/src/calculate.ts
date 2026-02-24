import {
  DocumentItemDTO,
  LegacyCalcInput,
  LegacyCalcOutput,
  LegacyICMSRateDTO,
  LegacyItemResult,
  LegacyUfConfigDTO,
  roundTo
} from "@mvp/shared";

const ST_CFOP_PREFIXES = ["540", "640"];

function asDate(value: string) {
  return new Date(value);
}

function normalizeUf(value: string) {
  return value.trim().toUpperCase();
}

function isConfigActive(validFrom: string, validTo: string | null | undefined, issueDate: Date) {
  const from = asDate(validFrom);
  const to = validTo ? asDate(validTo) : null;
  if (issueDate < from) return false;
  if (to && issueDate > to) return false;
  return true;
}

function isRateActive(rate: LegacyICMSRateDTO, issueDate: Date) {
  return isConfigActive(rate.validFrom, rate.validTo, issueDate);
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

function pickUfConfig(params: {
  issueDate: Date;
  emitterUf: string;
  recipientUf: string;
  ufConfigs: LegacyUfConfigDTO[];
}) {
  const emitterUf = normalizeUf(params.emitterUf);
  const recipientUf = normalizeUf(params.recipientUf);
  const candidates = params.ufConfigs
    .filter((config) => normalizeUf(config.emitterUf) === emitterUf)
    .filter((config) => normalizeUf(config.recipientUf) === recipientUf)
    .filter((config) => isConfigActive(config.validFrom, config.validTo, params.issueDate))
    .sort((a, b) => asDate(b.validFrom).getTime() - asDate(a.validFrom).getTime());

  return candidates[0] ?? null;
}

function pickRateForItem(params: {
  issueDate: Date;
  recipientUf: string;
  item: DocumentItemDTO;
  rates: LegacyICMSRateDTO[];
  fallbackRate: number;
  fallbackSource: "UF_CONFIG_INTERNAL" | "UF_CONFIG_INTERSTATE" | "NO_RATE";
}): {
  rate: number;
  rateId: string | undefined;
  source: "NCM_CATEGORY" | "NCM" | "CATEGORY" | "UF_DEFAULT" | "UF_CONFIG_INTERNAL" | "UF_CONFIG_INTERSTATE" | "NO_RATE";
} {
  const candidates = params.rates
    .filter((rate) => normalizeUf(rate.uf) === normalizeUf(params.recipientUf))
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

  const selectedSpecific = candidates.find((rate) => getRateSpecificity(rate) > 0);
  if (selectedSpecific) {
    return {
      rate: selectedSpecific.rate,
      rateId: selectedSpecific.id,
      source: inferRateSource(selectedSpecific)
    };
  }

  // If UF config exists, it drives the baseline rate.
  if (params.fallbackSource !== "NO_RATE") {
    return {
      rate: params.fallbackRate,
      rateId: undefined,
      source: params.fallbackSource
    };
  }

  const selected = candidates[0];
  if (!selected) {
    return {
      rate: 0,
      rateId: undefined,
      source: "NO_RATE"
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

function buildItemResult(params: {
  issueDate: Date;
  emitterUf: string;
  recipientUf: string;
  item: DocumentItemDTO;
  rates: LegacyICMSRateDTO[];
  ufConfigs: LegacyUfConfigDTO[];
}): LegacyItemResult {
  const emitterUf = normalizeUf(params.emitterUf);
  const recipientUf = normalizeUf(params.recipientUf);
  const interstate = emitterUf !== recipientUf;
  const ufConfig = pickUfConfig({
    issueDate: params.issueDate,
    emitterUf,
    recipientUf,
    ufConfigs: params.ufConfigs
  });

  const fallbackRate = ufConfig ? (interstate ? ufConfig.interstateRate : ufConfig.internalRate) : 0;
  const fallbackSource: "UF_CONFIG_INTERNAL" | "UF_CONFIG_INTERSTATE" | "NO_RATE" = ufConfig
    ? interstate
      ? "UF_CONFIG_INTERSTATE"
      : "UF_CONFIG_INTERNAL"
    : "NO_RATE";

  const rateSelection = pickRateForItem({
    issueDate: params.issueDate,
    recipientUf,
    item: params.item,
    rates: params.rates,
    fallbackRate,
    fallbackSource
  });

  const taxBase = roundTo(params.item.totalValue, 2);
  const icmsRate = roundTo(rateSelection.rate, 6);
  const icmsValue = roundTo(taxBase * icmsRate, 2);

  let difalRate = 0;
  let difalValue = 0;
  if (interstate && ufConfig?.difalEnabled) {
    difalRate = roundTo(Math.max(ufConfig.internalRate - icmsRate, 0), 6);
    difalValue = roundTo(taxBase * difalRate, 2);
  }

  const triggeredByCfop = Boolean(params.item.cfop && ST_CFOP_PREFIXES.some((prefix) => params.item.cfop?.startsWith(prefix)));
  const shouldApplySt = triggeredByCfop || Boolean(ufConfig?.stEnabled);
  let stMva = 0;
  let stRate = 0;
  let stBase = 0;
  let stValue = 0;

  if (shouldApplySt && ufConfig) {
    stMva = roundTo(ufConfig.stMva, 6);
    stRate = roundTo(ufConfig.stRate, 6);
    stBase = roundTo(taxBase * (1 + stMva), 2);
    const stExpectedTax = roundTo(stBase * stRate, 2);
    stValue = roundTo(Math.max(stExpectedTax - icmsValue, 0), 2);
  }

  // ISS remains explicit placeholder in this MVP scope.
  const issRate = 0;
  const issValue = 0;
  const totalTax = roundTo(icmsValue + stValue + difalValue + issValue, 2);

  const unsupportedReasons: string[] = [];
  if (!ufConfig) {
    unsupportedReasons.push("UF_CONFIG_NAO_ENCONTRADA");
  }
  if (shouldApplySt && !ufConfig) {
    unsupportedReasons.push("ICMS_ST_CONFIG_NAO_ENCONTRADA");
  }
  if (shouldApplySt && ufConfig && ufConfig.stRate <= 0) {
    unsupportedReasons.push("ICMS_ST_ALIQUOTA_INVALIDA");
  }

  const notes = [
    "ISS calculado como placeholder (0) no MVP.",
    rateSelection.source === "NO_RATE"
      ? "Nenhuma aliquota encontrada para ICMS proprio; aplicado 0."
      : `Aliquota de ICMS proprio obtida por ${rateSelection.source}.`,
    interstate
      ? ufConfig?.difalEnabled
        ? `DIFAL simplificado aplicado pela diferenca entre aliquota interna destino (${roundTo(
            ufConfig.internalRate,
            6
          )}) e aliquota interestadual (${icmsRate}).`
        : "DIFAL nao aplicado para esta operacao interestadual."
      : "Operacao interna: DIFAL nao aplicavel.",
    shouldApplySt
      ? ufConfig
        ? `ST basica aplicada com MVA ${stMva} e aliquota ${stRate}.`
        : "ST basica sinalizada, mas sem configuracao de UF."
      : "ST basica nao aplicada para o item."
  ];

  return {
    documentItemId: params.item.id,
    taxBase,
    stBase,
    icmsRate,
    icmsValue,
    stRate,
    stMva,
    stValue,
    difalRate,
    difalValue,
    issRate,
    issValue,
    totalTax,
    unsupported: unsupportedReasons.length > 0,
    unsupportedReasons: unique(unsupportedReasons),
    audit: {
      ufConfigId: ufConfig?.id,
      rateSelection: {
        rateId: rateSelection.rateId,
        source: rateSelection.source,
        uf: recipientUf,
        rate: icmsRate
      },
      unsupportedReasons: unique(unsupportedReasons),
      notes
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
      rates: input.rates,
      ufConfigs: input.ufConfigs
    })
  );

  const icmsTotal = roundTo(itemResults.reduce((sum, item) => sum + item.icmsValue, 0), 2);
  const stTotal = roundTo(itemResults.reduce((sum, item) => sum + item.stValue, 0), 2);
  const difalTotal = roundTo(itemResults.reduce((sum, item) => sum + item.difalValue, 0), 2);
  const issTotal = roundTo(itemResults.reduce((sum, item) => sum + item.issValue, 0), 2);
  const totalTax = roundTo(icmsTotal + stTotal + difalTotal + issTotal, 2);
  const unsupportedItemCount = itemResults.filter((item) => item.unsupported).length;
  const stAppliedItemCount = itemResults.filter((item) => item.stValue > 0).length;
  const difalAppliedItemCount = itemResults.filter((item) => item.difalValue > 0).length;

  return {
    itemResults,
    summary: {
      icmsTotal,
      stTotal,
      difalTotal,
      issTotal,
      totalTax,
      unsupportedItemCount,
      stAppliedItemCount,
      difalAppliedItemCount,
      itemCount: itemResults.length,
      audit: {
        notes: [
          "Motor legado v2: ICMS proprio + ST basica + DIFAL simplificado, parametrizado por UF.",
          "ISS e placeholder (0) no MVP.",
          "ST usa base majorada por MVA e ajuste contra ICMS proprio.",
          "DIFAL simplificado usa diferenca entre aliquota interna destino e aliquota interestadual aplicada."
        ]
      }
    }
  };
}
