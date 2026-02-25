import { describe, expect, it } from "vitest";
import { buildRunConfidence } from "../lib/documents/confidence";

describe("document run confidence", () => {
  it("returns low confidence when there are no rows", () => {
    const result = buildRunConfidence([]);
    expect(result.score).toBe(0);
    expect(result.level).toBe("BAIXA");
  });

  it("scores high confidence on fully covered rows", () => {
    const result = buildRunConfidence([
      {
        audit: {
          weights: { year: 2029, legacy: 0.9, ibs: 0.1 },
          engines: {
            legacy: {
              unsupported: false,
              audit: {
                rateSelection: { source: "UF_CONFIG_INTERNAL", rate: 0.18 }
              }
            },
            ibs: {
              creditEligible: true,
              audit: [{ matched: true, description: "Regra padrao" }]
            }
          }
        }
      }
    ]);

    expect(result.score).toBeGreaterThanOrEqual(95);
    expect(result.level).toBe("ALTA");
  });

  it("penalizes unsupported rows and missing rule matches", () => {
    const result = buildRunConfidence([
      {
        audit: {
          engines: {
            legacy: {
              unsupported: true,
              unsupportedReasons: ["ICMS_ST_CONFIG_NAO_ENCONTRADA"],
              audit: {
                rateSelection: { source: "NO_RATE" }
              }
            },
            ibs: {
              audit: [{ matched: false, description: "Regra padrao" }]
            }
          }
        }
      }
    ]);

    expect(result.score).toBeLessThan(60);
    expect(result.level).toBe("BAIXA");
    expect(result.highlights.some((line) => line.includes("limitacao"))).toBe(true);
  });
});
