export interface AssistedAssessmentPayload {
  month: string;
  source?: string;
  ibsTotal: number;
  cbsTotal: number;
  isTotal: number;
  effectiveRate?: number;
  notes?: string;
}

export interface MonthlySimulatedTotals {
  month: string;
  runCount: number;
  ibsTotal: number;
  cbsTotal: number;
  isTotal: number;
  effectiveRate: number;
}

export interface DivergenceRow {
  metric: string;
  simulatedValue: number;
  assistedValue: number;
  deltaValue: number;
  deltaPct: number | null;
}

function round(value: number, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function calcDeltaPct(simulatedValue: number, deltaValue: number) {
  if (simulatedValue === 0) return null;
  return round((deltaValue / simulatedValue) * 100, 6);
}

export function buildDivergenceRows(params: {
  simulated: MonthlySimulatedTotals;
  assisted: AssistedAssessmentPayload;
}): DivergenceRow[] {
  const rows: DivergenceRow[] = [];
  const metrics = [
    { metric: "IBS_TOTAL", simulatedValue: params.simulated.ibsTotal, assistedValue: params.assisted.ibsTotal },
    { metric: "CBS_TOTAL", simulatedValue: params.simulated.cbsTotal, assistedValue: params.assisted.cbsTotal },
    { metric: "IS_TOTAL", simulatedValue: params.simulated.isTotal, assistedValue: params.assisted.isTotal }
  ];

  for (const metric of metrics) {
    const deltaValue = round(metric.assistedValue - metric.simulatedValue, 4);
    rows.push({
      metric: metric.metric,
      simulatedValue: round(metric.simulatedValue, 4),
      assistedValue: round(metric.assistedValue, 4),
      deltaValue,
      deltaPct: calcDeltaPct(metric.simulatedValue, deltaValue)
    });
  }

  if (typeof params.assisted.effectiveRate === "number") {
    const deltaValue = round(params.assisted.effectiveRate - params.simulated.effectiveRate, 6);
    rows.push({
      metric: "EFFECTIVE_RATE",
      simulatedValue: round(params.simulated.effectiveRate, 6),
      assistedValue: round(params.assisted.effectiveRate, 6),
      deltaValue,
      deltaPct: calcDeltaPct(params.simulated.effectiveRate, deltaValue)
    });
  }

  return rows;
}

export function roundMoney(value: number) {
  return round(value, 2);
}
