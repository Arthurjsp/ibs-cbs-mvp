import { describe, expect, it } from "vitest";
import { LegacyCalcInput } from "@mvp/shared";
import { calculateLegacyDocument } from "../src/calculate";

function makeInput(overrides?: Partial<LegacyCalcInput>): LegacyCalcInput {
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
    rates: [],
    ufConfigs: [
      {
        id: "cfg-sp-pr",
        emitterUf: "SP",
        recipientUf: "PR",
        internalRate: 0.18,
        interstateRate: 0.12,
        stRate: 0.18,
        stMva: 0.4,
        difalEnabled: true,
        stEnabled: false,
        validFrom: "2026-01-01T00:00:00.000Z",
        validTo: null
      }
    ],
    ...overrides
  };
}

describe("calculateLegacyDocument", () => {
  it("calcula DIFAL simplificado em operacao interestadual", () => {
    const output = calculateLegacyDocument(makeInput());
    expect(output.itemResults[0].icmsRate).toBe(0.12);
    expect(output.itemResults[0].icmsValue).toBe(120);
    expect(output.itemResults[0].difalRate).toBe(0.06);
    expect(output.itemResults[0].difalValue).toBe(60);
    expect(output.summary.totalTax).toBe(180);
    expect(output.summary.difalTotal).toBe(60);
    expect(output.summary.unsupportedItemCount).toBe(0);
  });

  it("calcula ST basica com MVA quando CFOP sinaliza ST", () => {
    const input = makeInput();
    input.document.items[0].cfop = "6403";

    const output = calculateLegacyDocument(input);
    expect(output.itemResults[0].stBase).toBe(1400);
    expect(output.itemResults[0].stValue).toBe(132);
    expect(output.summary.stTotal).toBe(132);
    expect(output.summary.totalTax).toBe(312);
  });

  it("respeita parametrizacao interna por UF", () => {
    const output = calculateLegacyDocument(
      makeInput({
        document: {
          ...makeInput().document,
          emitterUf: "PR",
          recipientUf: "PR"
        },
        ufConfigs: [
          {
            id: "cfg-pr-pr",
            emitterUf: "PR",
            recipientUf: "PR",
            internalRate: 0.18,
            interstateRate: 0.12,
            stRate: 0.18,
            stMva: 0.4,
            difalEnabled: true,
            stEnabled: false,
            validFrom: "2026-01-01T00:00:00.000Z",
            validTo: null
          }
        ]
      })
    );

    expect(output.itemResults[0].icmsRate).toBe(0.18);
    expect(output.itemResults[0].difalValue).toBe(0);
    expect(output.summary.totalTax).toBe(180);
  });

  it("usa ufConfig interestadual como baseline quando existe apenas rate default por UF", () => {
    const output = calculateLegacyDocument(
      makeInput({
        rates: [
          {
            id: "rate-uf-pr",
            uf: "PR",
            rate: 0.18,
            validFrom: "2026-01-01T00:00:00.000Z",
            validTo: null
          }
        ]
      })
    );

    expect(output.itemResults[0].icmsRate).toBe(0.12);
    expect(output.itemResults[0].difalValue).toBe(60);
  });
});
