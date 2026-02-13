export interface DashboardMonthlyRow {
  month: string;
  ibsTotal: number;
  cbsTotal: number;
  effectiveRate: number;
  simulations: number;
}

interface RunLike {
  runAt: Date;
  summary: {
    ibsTotal: number | { toNumber(): number };
    cbsTotal: number | { toNumber(): number };
    effectiveRate: number | { toNumber(): number };
  } | null;
}

export interface MetricVariation {
  delta: number;
  deltaPct: number | null;
}

function toNumber(value: number | { toNumber(): number }): number {
  return typeof value === "number" ? value : value.toNumber();
}

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonthKey(month: string, deltaMonths: number): string {
  const [year, monthPart] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthPart - 1 + deltaMonths, 1));
  return monthKey(date);
}

export function shiftYearKey(month: string, deltaYears: number): string {
  const [year, monthPart] = month.split("-").map(Number);
  return `${year + deltaYears}-${String(monthPart).padStart(2, "0")}`;
}

export function calculateVariation(current: number, reference: number): MetricVariation {
  const delta = current - reference;
  if (reference === 0) {
    return { delta, deltaPct: null };
  }
  return { delta, deltaPct: (delta / reference) * 100 };
}

export function buildMonthlyRows(runs: RunLike[]): DashboardMonthlyRow[] {
  const grouped = new Map<string, { ibs: number; cbs: number; rateAcc: number; rateCount: number; simulations: number }>();

  for (const run of runs) {
    if (!run.summary) continue;
    const month = monthKey(new Date(run.runAt));
    const prev = grouped.get(month) ?? { ibs: 0, cbs: 0, rateAcc: 0, rateCount: 0, simulations: 0 };
    prev.ibs += toNumber(run.summary.ibsTotal);
    prev.cbs += toNumber(run.summary.cbsTotal);
    prev.rateAcc += toNumber(run.summary.effectiveRate);
    prev.rateCount += 1;
    prev.simulations += 1;
    grouped.set(month, prev);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, row]) => ({
      month,
      ibsTotal: Number(row.ibs.toFixed(2)),
      cbsTotal: Number(row.cbs.toFixed(2)),
      effectiveRate: row.rateCount ? Number((row.rateAcc / row.rateCount).toFixed(6)) : 0,
      simulations: row.simulations
    }));
}

