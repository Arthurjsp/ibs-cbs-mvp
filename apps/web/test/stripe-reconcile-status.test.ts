import { describe, expect, it } from "vitest";
import { isBillableSubscriptionStatus } from "@/lib/stripe-billing";

describe("stripe reconcile status", () => {
  it("marks billable statuses as true", () => {
    expect(isBillableSubscriptionStatus("active")).toBe(true);
    expect(isBillableSubscriptionStatus("trialing")).toBe(true);
    expect(isBillableSubscriptionStatus("past_due")).toBe(true);
    expect(isBillableSubscriptionStatus("incomplete")).toBe(true);
    expect(isBillableSubscriptionStatus("unpaid")).toBe(true);
  });

  it("marks non billable statuses as false", () => {
    expect(isBillableSubscriptionStatus("canceled")).toBe(false);
    expect(isBillableSubscriptionStatus("incomplete_expired")).toBe(false);
    expect(isBillableSubscriptionStatus(null)).toBe(false);
    expect(isBillableSubscriptionStatus(undefined)).toBe(false);
  });
});

