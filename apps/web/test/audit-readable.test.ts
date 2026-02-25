import { describe, expect, it } from "vitest";
import { buildReadableAuditEntries } from "../lib/documents/audit-readable";

describe("readable audit entries", () => {
  it("maps legacy audit into readable lines", () => {
    const lines = buildReadableAuditEntries(
      {
        engines: {
          legacy: {
            unsupportedReasons: ["UF_CONFIG_NAO_ENCONTRADA"],
            audit: {
              rateSelection: { source: "UF_CONFIG_INTERSTATE", rate: 0.12 },
              notes: ["ST básica não aplicada para o item."]
            }
          }
        }
      },
      "legacy"
    );

    expect(lines[0]).toContain("Origem da alíquota legado");
    expect(lines.join(" ")).toContain("UF_CONFIG_NAO_ENCONTRADA");
  });

  it("maps ibs and transition perspectives", () => {
    const ibsLines = buildReadableAuditEntries(
      {
        engines: {
          ibs: {
            creditEligible: true,
            totalTax: 170,
            audit: [{ matched: true, description: "Regra reduzida" }]
          }
        }
      },
      "ibs"
    );
    expect(ibsLines.join(" ")).toContain("Regra reduzida");

    const transitionLines = buildReadableAuditEntries(
      {
        weights: { year: 2030, legacy: 0.8, ibs: 0.2 },
        transition: { totalTax: 150, effectiveRate: 0.15 }
      },
      "transition"
    );
    expect(transitionLines.join(" ")).toContain("Ano de transição 2030");
    expect(transitionLines.join(" ")).toContain("150.00");
  });
});
