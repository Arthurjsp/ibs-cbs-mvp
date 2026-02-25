import Stripe from "stripe";

declare global {
  // eslint-disable-next-line no-var
  var stripeGlobal: Stripe | undefined;
}

export function hasStripeSecretKey() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

function getSecretKey() {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY não configurada.");
  }
  return secret;
}

export function getStripeClient() {
  if (globalThis.stripeGlobal) return globalThis.stripeGlobal;

  const client = new Stripe(getSecretKey());
  if (process.env.NODE_ENV !== "production") {
    globalThis.stripeGlobal = client;
  }
  return client;
}

export function getAppOrigin(requestUrl?: string) {
  const configured = process.env.NEXTAUTH_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }
  if (requestUrl) {
    return new URL(requestUrl).origin;
  }
  return "http://localhost:3000";
}
