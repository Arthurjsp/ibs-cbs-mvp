import { describe, expect, it } from "vitest";
import { calculateDocument } from "../src/calculate";
import { CalcInput } from "@mvp/shared";

function makeInput(category: string): CalcInput {
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
      key: "NFE123",
      issueDate: "2026-01-15",
      emitterUf: "SP",
      recipientUf: "RJ",
      operationType: "SALE",
      totalValue: 1000,
      items: [
        {
          id: "item-1",
          lineNumber: 1,
          description: "Produto Teste",
          ncm: "10000000",
          quantity: 1,
          unitValue: 1000,
          totalValue: 1000,
          category
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
          description: "Regra padrao",
          whenJson: { op: "and", conditions: [] },
          thenJson: { ibsRate: 0.17, cbsRate: 0.09, isRate: 0.02, creditEligible: true }
        },
        {
          id: "r-reduzida",
          priority: 10,
          description: "Categoria reduzida",
          whenJson: { op: "in", field: "category", value: ["REDUZIDA"] },
          thenJson: { ibsRate: 0.1, cbsRate: 0.05 }
        },
        {
          id: "r-isenta",
          priority: 1,
          description: "Categoria isenta",
          whenJson: { op: "in", field: "category", value: ["ISENTA"] },
          thenJson: { ibsRate: 0, cbsRate: 0, creditEligible: false }
        }
      ]
    }
  };
}

describe("calculateDocument", () => {
  it("aplica regra reduzida e calcula IBS/CBS/IS", () => {
    const input = makeInput("REDUZIDA");
    const result = calculateDocument(input);
    expect(result.itemResults[0].ibsRate).toBe(0.1);
    expect(result.itemResults[0].cbsRate).toBe(0.05);
    expect(result.itemResults[0].isRate).toBe(0.02);
    expect(result.summary.ibsTotal).toBe(100);
    expect(result.summary.cbsTotal).toBe(50);
    expect(result.summary.isTotal).toBe(20);
    expect(result.itemResults[0].audit.some((a) => a.ruleId === "r-reduzida" && a.matched)).toBe(true);
  });

  it("aplica isencao e impede credito", () => {
    const input = makeInput("ISENTA");
    const result = calculateDocument(input);
    expect(result.itemResults[0].ibsValue).toBe(0);
    expect(result.itemResults[0].cbsValue).toBe(0);
    expect(result.itemResults[0].isValue).toBe(20);
    expect(result.itemResults[0].creditEligible).toBe(false);
  });

  it("aplica parametros de cenario", () => {
    const input = makeInput("NAO_CLASSIFICADA");
    input.scenario = {
      transitionFactor: 0.5,
      pricePassThroughPercent: 50
    };
    const result = calculateDocument(input);
    expect(result.itemResults[0].ibsRate).toBe(0.085);
    expect(result.itemResults[0].cbsRate).toBe(0.045);
    expect(result.itemResults[0].isRate).toBe(0.01);
    expect(result.itemResults[0].simulatedPrice).toBe(1070);
  });

  it("aplica regras de base tributavel parametrizavel", () => {
    const input = makeInput("NAO_CLASSIFICADA");
    input.ruleSet.rules.unshift({
      id: "r-base-ajustada",
      priority: 150,
      description: "Ajusta base em 80% com reducao fixa",
      whenJson: { op: "and", conditions: [] },
      thenJson: { taxBaseMultiplier: 0.8, taxBaseReduction: 100 }
    });

    const result = calculateDocument(input);
    expect(result.itemResults[0].taxBase).toBe(720);
    expect(result.itemResults[0].ibsValue).toBe(122.4);
    expect(result.itemResults[0].cbsValue).toBe(64.8);
    expect(result.itemResults[0].isValue).toBe(14.4);
  });
});
