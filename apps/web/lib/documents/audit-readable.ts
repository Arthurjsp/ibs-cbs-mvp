type AuditPerspective = "legacy" | "ibs" | "transition";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asBoolean(value: unknown) {
  return value === true;
}

function toPercent(value: number | null, fractionDigits = 2) {
  if (value == null) return "-";
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

function toMoney(value: number | null) {
  if (value == null) return "-";
  return `R$ ${value.toFixed(2)}`;
}

function getLegacyEntries(audit: unknown): string[] {
  const engines = asRecord(asRecord(audit)?.engines);
  const legacy = asRecord(engines?.legacy);
  const legacyAudit = asRecord(legacy?.audit);
  const rateSelection = asRecord(legacyAudit?.rateSelection);
  const unsupportedReasons = asArray(legacy?.unsupportedReasons).map(String);
  const notes = asArray(legacyAudit?.notes).map(String);

  const lines: string[] = [];
  const rateSource = String(rateSelection?.source ?? "");
  if (rateSource) {
    lines.push(
      `Origem da alíquota legado: ${rateSource}${
        asNumber(rateSelection?.rate) != null ? ` (${toPercent(asNumber(rateSelection?.rate), 4)})` : ""
      }.`
    );
  }
  if (unsupportedReasons.length > 0) {
    lines.push(`Limitações detectadas: ${unsupportedReasons.join(", ")}.`);
  }
  if (notes.length > 0) {
    lines.push(...notes.slice(0, 2));
  }
  if (lines.length === 0) {
    lines.push("Sem eventos legados detalhados para este item.");
  }
  return lines;
}

function getIbsEntries(audit: unknown): string[] {
  const engines = asRecord(asRecord(audit)?.engines);
  const ibs = asRecord(engines?.ibs);
  const ruleAudit = asArray(ibs?.audit).map(asRecord).filter(Boolean) as Record<string, unknown>[];

  const matchedRules = ruleAudit
    .filter((entry) => asBoolean(entry.matched))
    .map((entry) => String(entry.description ?? entry.ruleId ?? "regra sem descrição"));

  const lines: string[] = [];
  if (matchedRules.length > 0) {
    lines.push(`Regras IBS/CBS aplicadas: ${matchedRules.slice(0, 3).join(" | ")}.`);
  } else {
    lines.push("Nenhuma regra IBS/CBS marcada como aplicada para o item.");
  }

  if (asBoolean(ibs?.creditEligible)) {
    lines.push("Item elegivel a crédito na simulação.");
  } else {
    lines.push("Item sem elegibilidade de crédito na simulação.");
  }

  const totalTax = asNumber(ibs?.totalTax);
  if (totalTax != null) {
    lines.push(`Carga IBS/CBS/IS do item: ${toMoney(totalTax)}.`);
  }

  return lines;
}

function getTransitionEntries(audit: unknown): string[] {
  const weights = asRecord(asRecord(audit)?.weights);
  const transition = asRecord(asRecord(audit)?.transition);

  const year = asNumber(weights?.year);
  const legacyWeight = asNumber(weights?.legacy);
  const ibsWeight = asNumber(weights?.ibs);
  const weightedLegacy = asNumber(transition?.weightedLegacyTax);
  const weightedIbs = asNumber(transition?.weightedIbsTax);
  const total = asNumber(transition?.totalTax);
  const effectiveRate = asNumber(transition?.effectiveRate);

  const lines: string[] = [];
  if (year != null && legacyWeight != null && ibsWeight != null) {
    lines.push(`Ano de transição ${year}: legado ${toPercent(legacyWeight)} | IBS/CBS ${toPercent(ibsWeight)}.`);
  }
  if (weightedLegacy != null || weightedIbs != null) {
    lines.push(`Ponderação: legado ${toMoney(weightedLegacy)} + IBS ${toMoney(weightedIbs)}.`);
  }
  if (total != null) {
    lines.push(`Tributo final do item: ${toMoney(total)}.`);
  }
  if (effectiveRate != null) {
    lines.push(`Effective rate do item: ${(effectiveRate * 100).toFixed(2)}%.`);
  }
  if (lines.length === 0) {
    lines.push("Sem eventos de transição detalhados para este item.");
  }
  return lines;
}

export function buildReadableAuditEntries(audit: unknown, perspective: AuditPerspective): string[] {
  if (perspective === "legacy") return getLegacyEntries(audit);
  if (perspective === "ibs") return getIbsEntries(audit);
  return getTransitionEntries(audit);
}
