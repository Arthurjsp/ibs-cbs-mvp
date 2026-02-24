import { describe, expect, it } from "vitest";
import { hasLegacyUfConfigForDocument, isLegacyUfConfigApplicable } from "../lib/legacy/uf-config";

describe("legacy uf config guard", () => {
  it("detecta config aplicavel por UF origem/destino e vigencia", () => {
    const applicable = isLegacyUfConfigApplicable({
      config: {
        emitterUf: "SP",
        recipientUf: "PR",
        validFrom: "2026-01-01T00:00:00.000Z",
        validTo: null
      },
      emitterUf: "sp",
      recipientUf: "pr",
      issueDate: "2026-02-15T00:00:00.000Z"
    });

    expect(applicable).toBe(true);
  });

  it("retorna false quando nao existe config para o par de UFs", () => {
    const hasConfig = hasLegacyUfConfigForDocument({
      configs: [
        {
          emitterUf: "SP",
          recipientUf: "SP",
          validFrom: "2026-01-01T00:00:00.000Z",
          validTo: null
        }
      ],
      emitterUf: "SP",
      recipientUf: "PR",
      issueDate: "2026-02-15T00:00:00.000Z"
    });

    expect(hasConfig).toBe(false);
  });
});
