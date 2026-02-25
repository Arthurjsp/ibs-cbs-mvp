import { describe, expect, it } from "vitest";
import { __clearRateLimitState, buildRateLimitKey, enforceRateLimit } from "../lib/security/rate-limit";

describe("rate-limit", () => {
  it("bloqueia quando excede limite na janela", () => {
    __clearRateLimitState();
    const key = "test-key";

    const first = enforceRateLimit({ key, max: 2, windowMs: 1000, nowMs: 1000 });
    const second = enforceRateLimit({ key, max: 2, windowMs: 1000, nowMs: 1001 });
    const third = enforceRateLimit({ key, max: 2, windowMs: 1000, nowMs: 1002 });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("libera novamente apos janela expirar", () => {
    __clearRateLimitState();
    const key = "test-key-window";

    enforceRateLimit({ key, max: 1, windowMs: 1000, nowMs: 1000 });
    const blocked = enforceRateLimit({ key, max: 1, windowMs: 1000, nowMs: 1500 });
    const allowedAfterWindow = enforceRateLimit({ key, max: 1, windowMs: 1000, nowMs: 2001 });

    expect(blocked.allowed).toBe(false);
    expect(allowedAfterWindow.allowed).toBe(true);
  });

  it("constroi chave com tenant/usuário/ip/rota", () => {
    const request = new Request("http://localhost/api/telemetry", {
      headers: {
        "x-forwarded-for": "203.0.113.10, 203.0.113.11"
      }
    });

    const key = buildRateLimitKey({
      request,
      tenantId: "tenant-1",
      userId: "user-1",
      route: "api:telemetry"
    });

    expect(key).toContain("api:telemetry");
    expect(key).toContain("tenant-1");
    expect(key).toContain("user-1");
    expect(key).toContain("203.0.113.10");
  });
});
