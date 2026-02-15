import { describe, expect, it } from "vitest";
import { telemetryEventSchema } from "../lib/telemetry/types";

describe("telemetryEventSchema", () => {
  it("accepts valid event payload", () => {
    const parsed = telemetryEventSchema.parse({
      type: "CALCULATION_EXECUTED",
      timestamp: "2026-02-12T12:00:00.000Z",
      payload: { calcRunId: "run-1" }
    });

    expect(parsed.type).toBe("CALCULATION_EXECUTED");
  });

  it("rejects unknown event type", () => {
    const result = telemetryEventSchema.safeParse({
      type: "SOMETHING_ELSE"
    });

    expect(result.success).toBe(false);
  });

  it("accepts assisted assessment events", () => {
    const parsed = telemetryEventSchema.parse({
      type: "ASSISTED_ASSESSMENT_IMPORTED",
      payload: { month: "2026-02", divergenceCount: 3 }
    });

    expect(parsed.type).toBe("ASSISTED_ASSESSMENT_IMPORTED");
  });
});
