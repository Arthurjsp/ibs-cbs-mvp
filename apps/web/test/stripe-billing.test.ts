import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TenantPlan } from "@prisma/client";
import { isStripeConfigured, resolvePlanFromPrice } from "@/lib/stripe-billing";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("stripe billing config", () => {
  it("resolve plan from configured price id", () => {
    process.env.STRIPE_PRICE_PRO = "price_pro";
    process.env.STRIPE_PRICE_ENTERPRISE = "price_ent";

    expect(resolvePlanFromPrice("price_pro")).toBe(TenantPlan.PRO);
    expect(resolvePlanFromPrice("price_ent")).toBe(TenantPlan.ENTERPRISE);
    expect(resolvePlanFromPrice("price_unknown")).toBeNull();
  });

  it("requires secret and prices to enable checkout", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_PRICE_PRO = "price_pro";
    process.env.STRIPE_PRICE_ENTERPRISE = "price_ent";
    expect(isStripeConfigured()).toBe(true);

    process.env.STRIPE_PRICE_ENTERPRISE = "";
    expect(isStripeConfigured()).toBe(false);
  });
});
