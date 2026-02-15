export type UserRole = "ADMIN" | "FISCAL" | "CFO";
export type RuleSetStatus = "DRAFT" | "ACTIVE";
export type DocumentType = "NFE";
export type OperationType = "SALE" | "PURCHASE";

export type RuleOperator =
  | "eq"
  | "ne"
  | "in"
  | "notIn"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "and"
  | "or";

export type RuleContextField =
  | "emitterUf"
  | "recipientUf"
  | "ncm"
  | "category"
  | "operationType"
  | "issueDate"
  | "itemValue";

export interface RuleCondition {
  op: RuleOperator;
  field?: RuleContextField;
  value?: string | number | boolean | Array<string | number | boolean>;
  conditions?: RuleCondition[];
}

export interface RuleEffect {
  ibsRate?: number;
  cbsRate?: number;
  isRate?: number;
  taxBaseMultiplier?: number;
  taxBaseReduction?: number;
  creditEligible?: boolean;
  notes?: string;
}

export interface TaxRuleDTO {
  id: string;
  priority: number;
  description: string;
  whenJson: RuleCondition;
  thenJson: RuleEffect;
}

export interface RuleSetDTO {
  id: string;
  name: string;
  validFrom: string;
  validTo?: string | null;
  rules: TaxRuleDTO[];
}

export interface ScenarioParams {
  overrideRates?: {
    ibsRate?: number;
    cbsRate?: number;
    isRate?: number;
  };
  pricePassThroughPercent?: number;
  transitionFactor?: number;
  notes?: string;
}

export interface CompanyDTO {
  id: string;
  tenantId: string;
  uf: string;
  segment?: string | null;
}

export interface DocumentItemDTO {
  id: string;
  lineNumber: number;
  description: string;
  ncm: string;
  cfop?: string | null;
  quantity: number;
  unitValue: number;
  totalValue: number;
  category?: string | null;
}

export interface DocumentDTO {
  id: string;
  key: string;
  issueDate: string;
  emitterUf: string;
  recipientUf: string;
  operationType: OperationType;
  totalValue: number;
  items: DocumentItemDTO[];
}

export interface CalcInput {
  tenantId: string;
  company: CompanyDTO;
  document: DocumentDTO;
  scenario?: ScenarioParams;
  ruleSet: RuleSetDTO;
}

export interface RuleAuditEntry {
  ruleId: string;
  description: string;
  matched: boolean;
  reason: string;
  priority: number;
  effectApplied?: RuleEffect;
}

export interface CalcItemResult {
  documentItemId: string;
  ibsRate: number;
  cbsRate: number;
  isRate: number;
  ibsValue: number;
  cbsValue: number;
  isValue: number;
  taxBase: number;
  creditEligible: boolean;
  audit: RuleAuditEntry[];
  simulatedPrice?: number;
}

export interface CalcSummary {
  ibsTotal: number;
  cbsTotal: number;
  isTotal: number;
  creditTotal: number;
  effectiveRate: number;
  itemCount: number;
  audit: {
    scenarioApplied?: ScenarioParams;
    notes: string[];
  };
}

export interface CalcOutput {
  itemResults: CalcItemResult[];
  summary: CalcSummary;
}

export interface LegacyICMSRateDTO {
  id: string;
  uf: string;
  ncm?: string | null;
  category?: string | null;
  rate: number;
  validFrom: string;
  validTo?: string | null;
}

export interface LegacyCalcInput {
  tenantId: string;
  document: DocumentDTO;
  rates: LegacyICMSRateDTO[];
}

export interface LegacyRateSelectionAudit {
  rateId?: string;
  source: "NCM_CATEGORY" | "NCM" | "CATEGORY" | "UF_DEFAULT" | "NO_RATE";
  uf: string;
  rate: number;
}

export interface LegacyItemAudit {
  rateSelection: LegacyRateSelectionAudit;
  unsupportedReasons: string[];
  notes: string[];
}

export interface LegacyItemResult {
  documentItemId: string;
  taxBase: number;
  icmsRate: number;
  icmsValue: number;
  issRate: number;
  issValue: number;
  totalTax: number;
  unsupported: boolean;
  unsupportedReasons: string[];
  audit: LegacyItemAudit;
}

export interface LegacySummary {
  icmsTotal: number;
  issTotal: number;
  totalTax: number;
  unsupportedItemCount: number;
  itemCount: number;
  audit: {
    notes: string[];
  };
}

export interface LegacyCalcOutput {
  itemResults: LegacyItemResult[];
  summary: LegacySummary;
}

export interface TransitionWeights {
  year: number;
  legacy: number;
  ibs: number;
}

export interface TransitionItemComponents {
  taxBase: number;
  legacyTax: number;
  ibsTax: number;
  weightedLegacyTax: number;
  weightedIbsTax: number;
  totalTax: number;
  effectiveRate: number;
}

export interface TransitionSummaryComponents {
  legacyTaxTotal: number;
  ibsTaxTotal: number;
  weightedLegacyTaxTotal: number;
  weightedIbsTaxTotal: number;
  totalTax: number;
  effectiveRate: number;
}

export interface PersistedItemComponents {
  weights: TransitionWeights;
  legacy: LegacyItemResult;
  ibs: CalcItemResult;
  transition: TransitionItemComponents;
}

export interface PersistedSummaryComponents {
  weights: TransitionWeights;
  legacy: LegacySummary;
  ibs: CalcSummary;
  transition: TransitionSummaryComponents;
}

export interface TransitionCalcOutput {
  weights: TransitionWeights;
  legacy: LegacyCalcOutput;
  ibs: CalcOutput;
  items: PersistedItemComponents[];
  summary: PersistedSummaryComponents;
}
