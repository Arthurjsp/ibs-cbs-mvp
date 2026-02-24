import { describe, expect, it } from "vitest";
import { CalcInput } from "@mvp/shared";
import { getTransitionWeights, orchestrateTransitionCalculation } from "../lib/transition/orchestrator";

function makeInput(issueDate: string): CalcInput {
  return {
    tenantId: "tenant-dev",
    company: {
      id: "company-1",
      tenantId: "tenant-dev",
      uf: "SP",
      segment: "INDUSTRIA"
    },
    document: {
      id: "doc-1",
      key: "NFE-1",
      issueDate,
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
    ruleSet: {
      id: "ruleset-1",
      name: "Default",
      validFrom: "2026-01-01",
      validTo: null,
      rules: [
        {
          id: "r-default",
          priority: 100,
          description: "Regra padrão",
          whenJson: { op: "and", conditions: [] },
          thenJson: { ibsRate: 0.17, cbsRate: 0.09, creditEligible: true }
        }
      ]
    }
  };
}

describe("transition orchestrator", () => {
  it("retorna pesos corretos para 2028, 2029 e 2033", () => {
    expect(getTransitionWeights("2028-12-31T00:00:00.000Z")).toEqual({ year: 2028, legacy: 1, ibs: 0 });
    expect(getTransitionWeights("2029-01-01T00:00:00.000Z")).toEqual({ year: 2029, legacy: 0.9, ibs: 0.1 });
    expect(getTransitionWeights("2033-01-01T00:00:00.000Z")).toEqual({ year: 2033, legacy: 0, ibs: 1 });
  });

  it("pondera resultado final corretamente em 2028", () => {
    const result = orchestrateTransitionCalculation({
      ibsInput: makeInput("2028-06-10T00:00:00.000Z"),
      legacyRates: [
        {
          id: "legacy-pr",
          uf: "PR",
          rate: 0.1,
          validFrom: "2026-01-01T00:00:00.000Z",
          validTo: null
        }
      ],
      legacyUfConfigs: [
        {
          id: "ufcfg-sp-pr",
          emitterUf: "SP",
          recipientUf: "PR",
          internalRate: 0.1,
          interstateRate: 0.1,
          stRate: 0.18,
          stMva: 0.4,
          difalEnabled: false,
          stEnabled: false,
          validFrom: "2026-01-01T00:00:00.000Z",
          validTo: null
        }
      ]
    });

    expect(result.summary.transition.totalTax).toBe(100);
    expect(result.summary.transition.effectiveRate).toBe(0.1);
  });

  it("pondera resultado final corretamente em 2029", () => {
    const result = orchestrateTransitionCalculation({
      ibsInput: makeInput("2029-06-10T00:00:00.000Z"),
      legacyRates: [
        {
          id: "legacy-pr",
          uf: "PR",
          rate: 0.1,
          validFrom: "2026-01-01T00:00:00.000Z",
          validTo: null
        }
      ],
      legacyUfConfigs: [
        {
          id: "ufcfg-sp-pr",
          emitterUf: "SP",
          recipientUf: "PR",
          internalRate: 0.1,
          interstateRate: 0.1,
          stRate: 0.18,
          stMva: 0.4,
          difalEnabled: false,
          stEnabled: false,
          validFrom: "2026-01-01T00:00:00.000Z",
          validTo: null
        }
      ]
    });

    expect(result.summary.transition.totalTax).toBe(116);
    expect(result.summary.transition.effectiveRate).toBe(0.116);
  });

  it("pondera resultado final corretamente em 2033", () => {
    const result = orchestrateTransitionCalculation({
      ibsInput: makeInput("2033-06-10T00:00:00.000Z"),
      legacyRates: [
        {
          id: "legacy-pr",
          uf: "PR",
          rate: 0.1,
          validFrom: "2026-01-01T00:00:00.000Z",
          validTo: null
        }
      ],
      legacyUfConfigs: [
        {
          id: "ufcfg-sp-pr",
          emitterUf: "SP",
          recipientUf: "PR",
          internalRate: 0.1,
          interstateRate: 0.1,
          stRate: 0.18,
          stMva: 0.4,
          difalEnabled: false,
          stEnabled: false,
          validFrom: "2026-01-01T00:00:00.000Z",
          validTo: null
        }
      ]
    });

    expect(result.summary.transition.totalTax).toBe(260);
    expect(result.summary.transition.effectiveRate).toBe(0.26);
  });
});
