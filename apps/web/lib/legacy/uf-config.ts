export interface LegacyUfConfigLike {
  emitterUf: string;
  recipientUf: string;
  validFrom: Date | string;
  validTo?: Date | string | null;
}

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function normalizeUf(value: string) {
  return value.trim().toUpperCase();
}

export function isLegacyUfConfigApplicable(params: {
  config: LegacyUfConfigLike;
  emitterUf: string;
  recipientUf: string;
  issueDate: Date | string;
}) {
  const issueDate = asDate(params.issueDate);
  const validFrom = asDate(params.config.validFrom);
  const validTo = params.config.validTo ? asDate(params.config.validTo) : null;

  if (normalizeUf(params.config.emitterUf) !== normalizeUf(params.emitterUf)) {
    return false;
  }
  if (normalizeUf(params.config.recipientUf) !== normalizeUf(params.recipientUf)) {
    return false;
  }
  if (issueDate < validFrom) {
    return false;
  }
  if (validTo && issueDate > validTo) {
    return false;
  }
  return true;
}

export function hasLegacyUfConfigForDocument(params: {
  configs: LegacyUfConfigLike[];
  emitterUf: string;
  recipientUf: string;
  issueDate: Date | string;
}) {
  return params.configs.some((config) =>
    isLegacyUfConfigApplicable({
      config,
      emitterUf: params.emitterUf,
      recipientUf: params.recipientUf,
      issueDate: params.issueDate
    })
  );
}
