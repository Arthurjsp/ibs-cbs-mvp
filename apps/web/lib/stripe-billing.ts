import type Stripe from "stripe";
import { TenantPlan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAppOrigin, getStripeClient, hasStripeSecretKey } from "@/lib/stripe";

type StripeManagedPlan = Exclude<TenantPlan, "FREE">;

interface StripePriceMap {
  PRO: string | null;
  ENTERPRISE: string | null;
}

const BILLABLE_STATUSES = new Set<Stripe.Subscription.Status>(["active", "trialing", "past_due", "incomplete", "unpaid"]);

export function isBillableSubscriptionStatus(status: string | null | undefined) {
  if (!status) return false;
  return BILLABLE_STATUSES.has(status as Stripe.Subscription.Status);
}

function getStripePriceMap(): StripePriceMap {
  return {
    PRO: process.env.STRIPE_PRICE_PRO?.trim() || null,
    ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE?.trim() || null
  };
}

export function isStripeConfigured() {
  const prices = getStripePriceMap();
  return hasStripeSecretKey() && Boolean(prices.PRO) && Boolean(prices.ENTERPRISE);
}

export function isStripePortalConfigured() {
  return hasStripeSecretKey();
}

export function isStripeWebhookConfigured() {
  return hasStripeSecretKey() && Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
}

export function resolvePlanFromPrice(priceId: string | null | undefined, map: StripePriceMap = getStripePriceMap()): TenantPlan | null {
  if (!priceId) return null;
  if (map.PRO && priceId === map.PRO) return TenantPlan.PRO;
  if (map.ENTERPRISE && priceId === map.ENTERPRISE) return TenantPlan.ENTERPRISE;
  return null;
}

function resolvePriceFromPlan(plan: StripeManagedPlan, map: StripePriceMap = getStripePriceMap()) {
  const price = map[plan];
  if (!price) {
    throw new Error(`Preço Stripe não configurado para o plano ${plan}.`);
  }
  return price;
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const seconds = subscription.current_period_end;
  if (!seconds) return null;
  return new Date(seconds * 1000);
}

async function getTenantForBilling(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      plan: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeSubscriptionStatus: true
    }
  });
  if (!tenant) throw new Error("Tenant não encontrado.");
  return tenant;
}

export async function ensureStripeCustomer(tenantId: string) {
  const tenant = await getTenantForBilling(tenantId);
  if (tenant.stripeCustomerId) return tenant.stripeCustomerId;

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    name: tenant.name,
    metadata: { tenantId }
  });

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { stripeCustomerId: customer.id }
  });

  return customer.id;
}

export async function createCheckoutSession(params: { tenantId: string; plan: StripeManagedPlan; requestUrl?: string }) {
  const stripe = getStripeClient();
  const origin = getAppOrigin(params.requestUrl);
  const customerId = await ensureStripeCustomer(params.tenantId);
  const priceId = resolvePriceFromPlan(params.plan);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${origin}/billing?checkout=success`,
    cancel_url: `${origin}/billing?checkout=cancel`,
    client_reference_id: params.tenantId,
    metadata: {
      tenantId: params.tenantId,
      targetPlan: params.plan
    },
    subscription_data: {
      metadata: {
        tenantId: params.tenantId,
        targetPlan: params.plan
      }
    }
  });

  if (!session.url) throw new Error("Stripe não retornou URL de checkout.");
  return session.url;
}

export async function createPortalSession(params: { tenantId: string; requestUrl?: string }) {
  const stripe = getStripeClient();
  const origin = getAppOrigin(params.requestUrl);
  const customerId = await ensureStripeCustomer(params.tenantId);
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/billing`
  });
  return portal.url;
}

async function findTenantForSubscription(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  const metadataTenantId = subscription.metadata?.tenantId || null;

  if (metadataTenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: metadataTenantId },
      select: { id: true }
    });
    if (tenant) return tenant.id;
  }

  if (customerId) {
    const tenant = await prisma.tenant.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true }
    });
    if (tenant) return tenant.id;
  }

  return null;
}

function resolveReconcileState(subscription: Stripe.Subscription) {
  return isBillableSubscriptionStatus(subscription.status) ? "synced_billable" : "synced_non_billable";
}

export async function reconcileTenantStripeState(tenantId: string) {
  if (!isStripePortalConfigured()) {
    return { updated: false as const, state: "stripe_not_configured" as const };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      plan: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeSubscriptionStatus: true
    }
  });

  if (!tenant) {
    return { updated: false as const, state: "tenant_not_found" as const };
  }

  const stripe = getStripeClient();

  const applyFreeFallback = async (clearCustomerId = false) => {
    const data: {
      plan: TenantPlan;
      stripeSubscriptionId: string | null;
      stripePriceId: string | null;
      stripeSubscriptionStatus: string | null;
      stripeCurrentPeriodEnd: Date | null;
      stripeCustomerId?: string | null;
    } = {
      plan: TenantPlan.FREE,
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeSubscriptionStatus: null,
      stripeCurrentPeriodEnd: null
    };
    if (clearCustomerId) data.stripeCustomerId = null;

    await prisma.tenant.update({
      where: { id: tenantId },
      data
    });

    return { updated: true as const, state: "reset_to_free" as const };
  };

  // First, trust an explicit subscription id if present.
  if (tenant.stripeSubscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(tenant.stripeSubscriptionId);
      await syncTenantFromSubscription(subscription);
      return { updated: true as const, state: resolveReconcileState(subscription) };
    } catch (error) {
      const type = (error as { type?: string }).type;
      const code = (error as { code?: string }).code;
      const missingSubscription = type === "StripeInvalidRequestError" && code === "resource_missing";
      if (!missingSubscription) throw error;
    }
  }

  if (!tenant.stripeCustomerId) {
    if (tenant.plan !== TenantPlan.FREE) {
      return applyFreeFallback(false);
    }
    return { updated: false as const, state: "no_customer_no_change" as const };
  }

  // If subscription id is missing/stale, discover current state from Stripe by customer.
  let subscriptions: Stripe.ApiList<Stripe.Subscription>;
  try {
    subscriptions = await stripe.subscriptions.list({
      customer: tenant.stripeCustomerId,
      status: "all",
      limit: 20
    });
  } catch (error) {
    const type = (error as { type?: string }).type;
    const code = (error as { code?: string }).code;
    const missingCustomer = type === "StripeInvalidRequestError" && code === "resource_missing";
    if (missingCustomer) {
      return applyFreeFallback(true);
    }
    throw error;
  }

  const ordered = [...subscriptions.data].sort((a, b) => b.created - a.created);
  const billable = ordered.find((subscription) => isBillableSubscriptionStatus(subscription.status));
  const selected = billable ?? ordered[0];

  if (!selected) {
    if (tenant.plan !== TenantPlan.FREE || tenant.stripeSubscriptionStatus || tenant.stripeSubscriptionId) {
      return applyFreeFallback(false);
    }
    return { updated: false as const, state: "no_subscription_no_change" as const };
  }

  await syncTenantFromSubscription(selected);
  return { updated: true as const, state: resolveReconcileState(selected) };
}

export async function syncTenantFromSubscription(subscription: Stripe.Subscription) {
  const tenantId = await findTenantForSubscription(subscription);
  if (!tenantId) return { updated: false as const, reason: "tenant_not_found" as const };

  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null;
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const mappedPlan = resolvePlanFromPrice(priceId);
  const canceled = ["canceled", "incomplete_expired", "unpaid"].includes(subscription.status);

  const data: {
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    stripePriceId?: string | null;
    stripeSubscriptionStatus?: string | null;
    stripeCurrentPeriodEnd?: Date | null;
    plan?: TenantPlan;
  } = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: canceled ? null : subscription.id,
    stripePriceId: canceled ? null : priceId,
    stripeSubscriptionStatus: subscription.status,
    stripeCurrentPeriodEnd: canceled ? null : subscriptionPeriodEnd(subscription)
  };

  if (canceled) {
    data.plan = TenantPlan.FREE;
  } else if (mappedPlan) {
    data.plan = mappedPlan;
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data
  });

  return { updated: true as const };
}
