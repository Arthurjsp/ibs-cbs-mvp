type NumberLike = number | { toNumber(): number };

function toNumber(value: NumberLike | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : value.toNumber();
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export type ReportTemplate = "EXECUTIVE" | "TECHNICAL";
export type ReportValueType = "text" | "datetime" | "number" | "currency" | "percent";

export interface ReportColumn {
  key: string;
  label: string;
  type: ReportValueType;
  width?: number;
}

export interface ReportRow {
  [key: string]: string | number | Date | null;
}

export interface ReportRunInput {
  runId: string;
  month: string;
  runAt: Date;
  documentKey: string;
  documentIssueDate: Date;
  scenarioName: string;
  ibsTotal: NumberLike;
  cbsTotal: NumberLike;
  isTotal: NumberLike;
  creditTotal: NumberLike;
  effectiveRate: NumberLike;
  componentsJson: unknown;
}

export interface ReportDataset {
  template: ReportTemplate;
  columns: ReportColumn[];
  rows: ReportRow[];
}

export function parseReportTemplate(value: string | null | undefined): ReportTemplate {
  if (value === "TECHNICAL") return "TECHNICAL";
  return "EXECUTIVE";
}

function readFinalTax(componentsJson: unknown, fallback: number) {
  const transition = asRecord(asRecord(componentsJson)?.transition);
  const totalTax = readNumber(transition?.totalTax);
  return round(totalTax ?? fallback, 2);
}

function readUnsupportedCount(componentsJson: unknown) {
  const legacy = asRecord(asRecord(componentsJson)?.legacy);
  return Math.max(round(readNumber(legacy?.unsupportedItemCount) ?? 0, 0), 0);
}

function readTransitionWeights(componentsJson: unknown) {
  const weights = asRecord(asRecord(componentsJson)?.weights);
  return {
    year: readNumber(weights?.year),
    legacy: readNumber(weights?.legacy),
    ibs: readNumber(weights?.ibs)
  };
}

function toBaseRow(run: ReportRunInput) {
  const ibsTotal = toNumber(run.ibsTotal);
  const cbsTotal = toNumber(run.cbsTotal);
  const isTotal = toNumber(run.isTotal);
  const fallbackTax = ibsTotal + cbsTotal + isTotal;
  const finalTax = readFinalTax(run.componentsJson, fallbackTax);
  const unsupportedItems = readUnsupportedCount(run.componentsJson);
  const weights = readTransitionWeights(run.componentsJson);

  return {
    runId: run.runId,
    month: run.month,
    runAt: run.runAt,
    documentKey: run.documentKey,
    documentIssueDate: run.documentIssueDate,
    scenario: run.scenarioName,
    ibsTotal: round(ibsTotal, 2),
    cbsTotal: round(cbsTotal, 2),
    isTotal: round(isTotal, 2),
    finalTax: round(finalTax, 2),
    creditTotal: round(toNumber(run.creditTotal), 2),
    effectiveRate: round(toNumber(run.effectiveRate), 6),
    unsupportedItems,
    transitionYear: weights.year,
    weightLegacy: weights.legacy,
    weightIbs: weights.ibs,
    actionHint:
      unsupportedItems > 0
        ? "Revisar itens unsupported"
        : toNumber(run.effectiveRate) > 0.25
          ? "Revisar repasse e preco"
          : "Monitorar com periodicidade mensal"
  };
}

function executiveColumns(): ReportColumn[] {
  return [
    { key: "month", label: "month", type: "text", width: 12 },
    { key: "runAt", label: "runAt", type: "datetime", width: 22 },
    { key: "scenario", label: "scenario", type: "text", width: 28 },
    { key: "documentKey", label: "documentKey", type: "text", width: 46 },
    { key: "finalTax", label: "finalTax", type: "currency", width: 16 },
    { key: "effectiveRate", label: "effectiveRate", type: "percent", width: 14 },
    { key: "creditTotal", label: "creditTotal", type: "currency", width: 16 },
    { key: "unsupportedItems", label: "unsupportedItems", type: "number", width: 16 },
    { key: "actionHint", label: "actionHint", type: "text", width: 34 }
  ];
}

function technicalColumns(): ReportColumn[] {
  return [
    { key: "runId", label: "runId", type: "text", width: 32 },
    { key: "month", label: "month", type: "text", width: 12 },
    { key: "runAt", label: "runAt", type: "datetime", width: 22 },
    { key: "documentKey", label: "documentKey", type: "text", width: 46 },
    { key: "documentIssueDate", label: "documentIssueDate", type: "datetime", width: 22 },
    { key: "scenario", label: "scenario", type: "text", width: 28 },
    { key: "ibsTotal", label: "ibsTotal", type: "currency", width: 14 },
    { key: "cbsTotal", label: "cbsTotal", type: "currency", width: 14 },
    { key: "isTotal", label: "isTotal", type: "currency", width: 14 },
    { key: "finalTax", label: "finalTax", type: "currency", width: 14 },
    { key: "creditTotal", label: "creditTotal", type: "currency", width: 14 },
    { key: "effectiveRate", label: "effectiveRate", type: "percent", width: 14 },
    { key: "unsupportedItems", label: "unsupportedItems", type: "number", width: 16 },
    { key: "transitionYear", label: "transitionYear", type: "number", width: 14 },
    { key: "weightLegacy", label: "weightLegacy", type: "percent", width: 14 },
    { key: "weightIbs", label: "weightIbs", type: "percent", width: 14 }
  ];
}

export function buildReportDataset(params: {
  template: ReportTemplate;
  runs: ReportRunInput[];
}): ReportDataset {
  const baseRows = params.runs.map(toBaseRow);
  const columns = params.template === "TECHNICAL" ? technicalColumns() : executiveColumns();
  return {
    template: params.template,
    columns,
    rows: baseRows
  };
}

export function summarizeReportDataset(dataset: ReportDataset) {
  const rowCount = dataset.rows.length;
  const totalFinalTax = round(dataset.rows.reduce((sum, row) => sum + Number(row.finalTax ?? 0), 0), 2);
  const totalCredit = round(dataset.rows.reduce((sum, row) => sum + Number(row.creditTotal ?? 0), 0), 2);
  const unsupportedItems = round(dataset.rows.reduce((sum, row) => sum + Number(row.unsupportedItems ?? 0), 0), 0);
  const avgEffectiveRate =
    rowCount > 0 ? round(dataset.rows.reduce((sum, row) => sum + Number(row.effectiveRate ?? 0), 0) / rowCount, 6) : 0;

  return {
    rowCount,
    totalFinalTax,
    totalCredit,
    unsupportedItems,
    avgEffectiveRate
  };
}
