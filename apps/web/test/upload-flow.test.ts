import { describe, expect, it } from "vitest";
import { buildUploadFlowSteps } from "../lib/upload/flow";

describe("upload flow helper", () => {
  it("marks validation as error when local validation fails", () => {
    const steps = buildUploadFlowSteps({
      hasCompany: true,
      hasFile: true,
      localValidationError: "Arquivo inválido",
      loading: false
    });

    expect(steps.find((step) => step.id === "validate")?.status).toBe("error");
    expect(steps.find((step) => step.id === "import")?.status).toBe("pending");
  });

  it("marks import as current while request is in progress", () => {
    const steps = buildUploadFlowSteps({
      hasCompany: true,
      hasFile: true,
      localValidationError: null,
      loading: true
    });

    expect(steps.find((step) => step.id === "import")?.status).toBe("current");
  });
});
