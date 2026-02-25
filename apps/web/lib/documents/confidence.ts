function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function ratio(part: number, total: number) {
  if (total <= 0) return 0;
  return part / total;
}

function getIbsAuditEntries(audit: unknown) {
  const engines = asRecord(asRecord(audit)?.engines);
  return asArray(asRecord(engines?.ibs)?.audit).map(asRecord).filter(Boolean) as Record<string, unknown>[];
}

function hasMatchedRule(audit: unknown) {
  return getIbsAuditEntries(audit).some((entry) => asBoolean(entry.matched));
}

function hasIbsAudit(audit: unknown) {
  return getIbsAuditEntries(audit).length > 0;
}

function hasLegacyRateConfig(audit: unknown) {
  const engines = asRecord(asRecord(audit)?.engines);
  const rateSelection = asRecord(asRecord(asRecord(engines?.legacy)?.audit)?.rateSelection);
  const source = String(rateSelection?.source ?? "");
  return source.length > 0 && source !== "NO_RATE";
}

function hasWeights(audit: unknown) {
  return asRecord(audit)?.weights != null;
}

function hasUnsupported(audit: unknown) {
  const engines = asRecord(asRecord(audit)?.engines);
  const legacy = asRecord(engines?.legacy);
  if (asBoolean(legacy?.unsupported)) return true;
  const reasons = asArray(legacy?.unsupportedReasons);
  return reasons.length > 0;
}

export interface ConfidenceInputRow {
  audit: unknown;
}

export interface RunConfidence {
  score: number;
  level: "ALTA" | "MEDIA" | "BAIXA";
  metrics: {
    totalItems: number;
    unsupportedItems: number;
    itemsWithIbsAudit: number;
    itemsWithMatchedRule: number;
    itemsWithLegacyRateConfig: number;
    itemsWithWeights: number;
  };
  highlights: string[];
}

export function buildRunConfidence(rows: ConfidenceInputRow[]): RunConfidence {
  const totalItems = rows.length;

  if (totalItems === 0) {
    return {
      score: 0,
      level: "BAIXA",
      metrics: {
        totalItems: 0,
        unsupportedItems: 0,
        itemsWithIbsAudit: 0,
        itemsWithMatchedRule: 0,
        itemsWithLegacyRateConfig: 0,
        itemsWithWeights: 0
      },
      highlights: ["Sem itens calculados no run selecionado."]
    };
  }

  const unsupportedItems = rows.filter((row) => hasUnsupported(row.audit)).length;
  const itemsWithIbsAudit = rows.filter((row) => hasIbsAudit(row.audit)).length;
  const itemsWithMatchedRule = rows.filter((row) => hasMatchedRule(row.audit)).length;
  const itemsWithLegacyRateConfig = rows.filter((row) => hasLegacyRateConfig(row.audit)).length;
  const itemsWithWeights = rows.filter((row) => hasWeights(row.audit)).length;

  let score = 100;
  score -= ratio(unsupportedItems, totalItems) * 40;
  score -= (1 - ratio(itemsWithIbsAudit, totalItems)) * 20;
  score -= (1 - ratio(itemsWithMatchedRule, totalItems)) * 20;
  score -= (1 - ratio(itemsWithLegacyRateConfig, totalItems)) * 10;
  score -= (1 - ratio(itemsWithWeights, totalItems)) * 10;
  score = round(clamp(score, 0, 100));

  const highlights: string[] = [];
  if (unsupportedItems > 0) {
    highlights.push(`${unsupportedItems} item(ns) com limitação de cobertura no motor legado.`);
  }
  if (itemsWithMatchedRule < totalItems) {
    highlights.push(`${totalItems - itemsWithMatchedRule} item(ns) sem regra IBS/CBS claramente aplicada.`);
  }
  if (itemsWithIbsAudit < totalItems) {
    highlights.push(`${totalItems - itemsWithIbsAudit} item(ns) sem trilha IBS detalhada.`);
  }
  if (itemsWithLegacyRateConfig < totalItems) {
    highlights.push(`${totalItems - itemsWithLegacyRateConfig} item(ns) sem origem de alíquota legado identificada.`);
  }
  if (highlights.length === 0) {
    highlights.push("Cobertura consistente de regras, trilha e pesos para os itens calculados.");
  }

  const level: RunConfidence["level"] = score >= 80 ? "ALTA" : score >= 60 ? "MEDIA" : "BAIXA";

  return {
    score,
    level,
    metrics: {
      totalItems,
      unsupportedItems,
      itemsWithIbsAudit,
      itemsWithMatchedRule,
      itemsWithLegacyRateConfig,
      itemsWithWeights
    },
    highlights
  };
}
