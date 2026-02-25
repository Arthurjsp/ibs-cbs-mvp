type NumberLike = number | { toNumber(): number };

function toNumber(value: NumberLike | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : value.toNumber();
}

function round(value: number, scale = 2): number {
  const factor = 10 ** scale;
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface ScenarioParamsSnapshot {
  transitionFactor: number;
  pricePassThroughPercent: number;
  overrideRates: {
    ibsRate: number | null;
    cbsRate: number | null;
    isRate: number | null;
  };
}

export interface ScenarioLabScenarioInput {
  id: string;
  name: string;
  createdAt: Date | string;
  parametersJson: unknown;
}

export interface ScenarioLabRunInput {
  id: string;
  runAt: Date | string;
  scenarioId: string | null;
  documentKey: string;
  totalValue: NumberLike;
  summary: {
    ibsTotal: NumberLike;
    cbsTotal: NumberLike;
    isTotal: NumberLike;
    effectiveRate: NumberLike;
    componentsJson: unknown;
  } | null;
}

export interface ScenarioRunSnapshot {
  runId: string;
  runAt: string;
  documentKey: string;
  totalValue: number;
  taxTotal: number;
  effectiveRate: number;
}

export interface ScenarioImpactSnapshot {
  baselineRunId: string | null;
  baselineDocumentKey: string | null;
  taxDelta: number | null;
  priceImpact: number | null;
  estimatedNetResult: number | null;
  marginPct: number | null;
  marginDeltaPp: number | null;
}

export interface ScenarioLabRowSnapshot {
  scenarioId: string;
  scenarioName: string;
  createdAt: string;
  params: ScenarioParamsSnapshot;
  latestRun: ScenarioRunSnapshot | null;
  impact: ScenarioImpactSnapshot | null;
}

export interface ScenarioLabData {
  baseline: ScenarioRunSnapshot | null;
  rows: ScenarioLabRowSnapshot[];
}

function readTransitionTaxFromComponents(componentsJson: unknown): number | null {
  const components = asRecord(componentsJson);
  if (!components) return null;
  const transition = asRecord(components.transition);
  if (!transition) return null;
  const totalTax = readNumber(transition.totalTax);
  return totalTax == null ? null : round(totalTax, 2);
}

export function normalizeScenarioParams(parametersJson: unknown): ScenarioParamsSnapshot {
  const json = asRecord(parametersJson);
  const overrideRates = asRecord(json?.overrideRates);

  return {
    transitionFactor: clamp(readNumber(json?.transitionFactor) ?? 1, 0, 1),
    pricePassThroughPercent: clamp(readNumber(json?.pricePassThroughPercent) ?? 0, 0, 100),
    overrideRates: {
      ibsRate: readNumber(overrideRates?.ibsRate),
      cbsRate: readNumber(overrideRates?.cbsRate),
      isRate: readNumber(overrideRates?.isRate)
    }
  };
}

function toRunSnapshot(run: ScenarioLabRunInput): ScenarioRunSnapshot | null {
  if (!run.summary) return null;
  const summary = run.summary;
  const fallbackTax = toNumber(summary.ibsTotal) + toNumber(summary.cbsTotal) + toNumber(summary.isTotal);
  const taxTotal = readTransitionTaxFromComponents(summary.componentsJson) ?? round(fallbackTax, 2);

  return {
    runId: run.id,
    runAt: new Date(run.runAt).toISOString(),
    documentKey: run.documentKey,
    totalValue: round(toNumber(run.totalValue), 2),
    taxTotal,
    effectiveRate: round(toNumber(summary.effectiveRate), 6)
  };
}

function buildImpact(params: {
  scenarioRun: ScenarioRunSnapshot;
  baselineRun: ScenarioRunSnapshot | null;
  passThroughPercent: number;
}): ScenarioImpactSnapshot {
  if (!params.baselineRun) {
    return {
      baselineRunId: null,
      baselineDocumentKey: null,
      taxDelta: null,
      priceImpact: null,
      estimatedNetResult: null,
      marginPct: null,
      marginDeltaPp: null
    };
  }

  const baseline = params.baselineRun;
  const taxDelta = round(params.scenarioRun.taxTotal - baseline.taxTotal, 2);
  const priceImpact = round(taxDelta * (params.passThroughPercent / 100), 2);
  const adjustedRevenue = params.scenarioRun.totalValue + priceImpact;
  const estimatedNetResult = round(adjustedRevenue - params.scenarioRun.taxTotal, 2);
  const scenarioMargin = adjustedRevenue > 0 ? estimatedNetResult / adjustedRevenue : null;

  const baselineNet = baseline.totalValue - baseline.taxTotal;
  const baselineMargin = baseline.totalValue > 0 ? baselineNet / baseline.totalValue : null;

  const marginPct = scenarioMargin == null ? null : round(scenarioMargin * 100, 2);
  const marginDeltaPp =
    scenarioMargin == null || baselineMargin == null ? null : round((scenarioMargin - baselineMargin) * 100, 2);

  return {
    baselineRunId: baseline.runId,
    baselineDocumentKey: baseline.documentKey,
    taxDelta,
    priceImpact,
    estimatedNetResult,
    marginPct,
    marginDeltaPp
  };
}

export function buildScenarioLabData(params: {
  scenarios: ScenarioLabScenarioInput[];
  runs: ScenarioLabRunInput[];
}): ScenarioLabData {
  const latestScenarioRunById = new Map<string, ScenarioRunSnapshot>();
  const latestBaselineByDocument = new Map<string, ScenarioRunSnapshot>();
  let latestGlobalBaseline: ScenarioRunSnapshot | null = null;

  for (const run of params.runs) {
    const snapshot = toRunSnapshot(run);
    if (!snapshot) continue;

    if (!run.scenarioId) {
      if (!latestBaselineByDocument.has(snapshot.documentKey)) {
        latestBaselineByDocument.set(snapshot.documentKey, snapshot);
      }
      if (!latestGlobalBaseline) {
        latestGlobalBaseline = snapshot;
      }
      continue;
    }

    if (!latestScenarioRunById.has(run.scenarioId)) {
      latestScenarioRunById.set(run.scenarioId, snapshot);
    }
  }

  const rows: ScenarioLabRowSnapshot[] = params.scenarios.map((scenario) => {
    const normalized = normalizeScenarioParams(scenario.parametersJson);
    const latestRun = latestScenarioRunById.get(scenario.id) ?? null;
    const baselineForScenario = latestRun
      ? latestBaselineByDocument.get(latestRun.documentKey) ?? latestGlobalBaseline
      : null;

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      createdAt: new Date(scenario.createdAt).toISOString(),
      params: normalized,
      latestRun,
      impact: latestRun
        ? buildImpact({
            scenarioRun: latestRun,
            baselineRun: baselineForScenario,
            passThroughPercent: normalized.pricePassThroughPercent
          })
        : null
    };
  });

  return {
    baseline: latestGlobalBaseline,
    rows
  };
}
