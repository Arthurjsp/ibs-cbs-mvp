export interface DashboardMonthlyRow {
  month: string;
  ibsTotal: number;
  cbsTotal: number;
  isTotal: number;
  finalTaxTotal: number;
  taxBaseTotal: number;
  effectiveRate: number;
  simulations: number;
}

interface RunLike {
  runAt: Date;
  document: {
    totalValue: number | { toNumber(): number };
  };
  summary: {
    ibsTotal: number | { toNumber(): number };
    cbsTotal: number | { toNumber(): number };
    isTotal: number | { toNumber(): number };
    effectiveRate: number | { toNumber(): number };
    componentsJson?: unknown;
  } | null;
}

export interface MetricVariation {
  delta: number;
  deltaPct: number | null;
}

function toNumber(value: number | { toNumber(): number }): number {
  return typeof value === "number" ? value : value.toNumber();
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "object" && value !== null && "toNumber" in value && typeof (value as { toNumber: () => number }).toNumber === "function") {
    const converted = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(converted) ? converted : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readTransitionFinalTax(componentsJson: unknown): number | null {
  const transition = asRecord(asRecord(componentsJson)?.transition);
  return toFiniteNumber(transition?.totalTax);
}

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthKey(month: string): string {
  const [year, monthPart] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthPart - 1, 1));
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  })
    .format(date)
    .replace(".", "");
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
  const grouped = new Map<
    string,
    {
      ibs: number;
      cbs: number;
      is: number;
      finalTax: number;
      base: number;
      rateAcc: number;
      rateCount: number;
      simulations: number;
    }
  >();

  for (const run of runs) {
    if (!run.summary) continue;
    const month = monthKey(new Date(run.runAt));
    const prev = grouped.get(month) ?? { ibs: 0, cbs: 0, is: 0, finalTax: 0, base: 0, rateAcc: 0, rateCount: 0, simulations: 0 };

    const ibsTotal = toNumber(run.summary.ibsTotal);
    const cbsTotal = toNumber(run.summary.cbsTotal);
    const isTotal = toNumber(run.summary.isTotal);
    const fallbackFinalTax = ibsTotal + cbsTotal + isTotal;
    const finalTax = readTransitionFinalTax(run.summary.componentsJson) ?? fallbackFinalTax;
    const rate = toNumber(run.summary.effectiveRate);
    const baseFromDocument = toNumber(run.document.totalValue);
    const inferredBase = rate > 0 ? finalTax / rate : 0;
    const taxBase = baseFromDocument > 0 ? baseFromDocument : inferredBase;

    prev.ibs += ibsTotal;
    prev.cbs += cbsTotal;
    prev.is += isTotal;
    prev.finalTax += finalTax;
    prev.base += taxBase;
    prev.rateAcc += rate;
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
      isTotal: Number(row.is.toFixed(2)),
      finalTaxTotal: Number(row.finalTax.toFixed(2)),
      taxBaseTotal: Number(row.base.toFixed(2)),
      effectiveRate: row.base > 0 ? Number((row.finalTax / row.base).toFixed(6)) : row.rateCount ? Number((row.rateAcc / row.rateCount).toFixed(6)) : 0,
      simulations: row.simulations
    }));
}
