import { RuleCondition } from "@mvp/shared";

function normalizeComparable(value: unknown): unknown {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime()) && value.includes("-")) return date.getTime();
    return value;
  }
  return value;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function compare(left: unknown, right: unknown, op: RuleCondition["op"]): boolean {
  const l = normalizeComparable(left) as string | number | boolean;
  const r = normalizeComparable(right) as string | number | boolean;

  switch (op) {
    case "eq":
      return l === r;
    case "ne":
      return l !== r;
    case "gt":
      return (l as number) > (r as number);
    case "gte":
      return (l as number) >= (r as number);
    case "lt":
      return (l as number) < (r as number);
    case "lte":
      return (l as number) <= (r as number);
    case "in":
      return toArray(right).includes(l);
    case "notIn":
      return !toArray(right).includes(l);
    default:
      return false;
  }
}

export interface EvalResult {
  matched: boolean;
  reason: string;
}

export function evaluateCondition(condition: RuleCondition, context: object): EvalResult {
  const contextRecord = context as Record<string, unknown>;
  if (condition.op === "and") {
    const conditions = condition.conditions ?? [];
    const evaluated = conditions.map((sub) => evaluateCondition(sub, contextRecord));
    const matched = evaluated.every((result) => result.matched);
    return {
      matched,
      reason: matched
        ? "all conditions matched"
        : `and failed: ${evaluated.filter((r) => !r.matched).map((r) => r.reason).join("; ")}`
    };
  }

  if (condition.op === "or") {
    const conditions = condition.conditions ?? [];
    const evaluated = conditions.map((sub) => evaluateCondition(sub, contextRecord));
    const matched = evaluated.some((result) => result.matched);
    return {
      matched,
      reason: matched ? "at least one condition matched" : "or failed: no condition matched"
    };
  }

  if (!condition.field) {
    return { matched: false, reason: "missing condition field" };
  }

  const left = contextRecord[condition.field];
  const right = condition.value;
  const matched = compare(left, right, condition.op);
  return {
    matched,
    reason: matched
      ? `${condition.field} ${condition.op} condition matched`
      : `${condition.field} ${condition.op} condition failed`
  };
}
