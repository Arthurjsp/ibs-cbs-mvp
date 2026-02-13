import { describe, expect, it } from "vitest";
import { LegacyCalcInput } from "@mvp/shared";
import { calculateLegacyDocument } from "../src/calculate";

function makeInput(): LegacyCalcInput {
  return {
    tenantId: "tenant-dev",
    document: {
      id: "doc-1",
      key: "NFe351...",
      issueDate: "2029-05-20T00:00:00.000Z",
      emitterUf: "SP",
      recipientUf: "PR",
      operationType: "SALE",
      totalValue: 1000,
      items: [
        {
          id: "item-1",
          lineNumber: 1,
          description: "Produto teste",
          ncm: "10000000",
          cfop: "6102",
          quantity: 1,
          unitValue: 1000,
          totalValue: 1000,
          category: "GERAL"
        }
      ]
    },
    rates: [
      {
        id: "rate-uf",
        uf: "PR",
        rate: 0.18,
        validFrom: "2026-01-01T00:00:00.000Z",
        validTo: null
      }
    ]
  };
}

describe("calculateLegacyDocument", () => {
  it("calcula ICMS simples por UF destino", () => {
    const output = calculateLegacyDocument(makeInput());
    expect(output.itemResults[0].icmsRate).toBe(0.18);
    expect(output.itemResults[0].icmsValue).toBe(180);
    expect(output.summary.icmsTotal).toBe(180);
    expect(output.summary.totalTax).toBe(180);
  });

  it("prioriza alíquota mais específica por NCM", () => {
    const input = makeInput();
    input.rates = [
      {
        id: "rate-uf",
        uf: "PR",
        rate: 0.18,
        validFrom: "2026-01-01T00:00:00.000Z",
        validTo: null
      },
      {
        id: "rate-ncm",
        uf: "PR",
        ncm: "10000000",
        rate: 0.12,
        validFrom: "2026-01-01T00:00:00.000Z",
        validTo: null
      }
    ];

    const output = calculateLegacyDocument(input);
    expect(output.itemResults[0].icmsRate).toBe(0.12);
    expect(output.itemResults[0].audit.rateSelection.rateId).toBe("rate-ncm");
  });

  it("marca item unsupported quando identifica cenário potencial de DIFAL/ST", () => {
    const output = calculateLegacyDocument(makeInput());
    expect(output.itemResults[0].unsupported).toBe(true);
    expect(output.itemResults[0].unsupportedReasons).toContain("DIFAL_POTENCIAL_NAO_IMPLEMENTADO");
    expect(output.summary.unsupportedItemCount).toBe(1);
  });
});
