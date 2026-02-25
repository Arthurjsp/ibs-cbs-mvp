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
  if (requestUrl) {
    return new URL(requestUrl).origin;
  }
  const configured = process.env.NEXTAUTH_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }
  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProductionUrl) {
    return vercelProductionUrl.startsWith("http") ? vercelProductionUrl : `https://${vercelProductionUrl}`;
  }
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
  }
  return "http://localhost:3000";
}
