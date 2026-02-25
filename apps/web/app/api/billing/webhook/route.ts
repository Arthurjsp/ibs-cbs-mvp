import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { isStripeWebhookConfigured, syncTenantFromSubscription } from "@/lib/stripe-billing";

export const runtime = "nodejs";

function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET não configurada.");
  }
  return secret;
}

async function handleEvent(event: Stripe.Event) {
  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    await syncTenantFromSubscription(subscription);
  }
}

export async function POST(request: Request) {
  if (!isStripeWebhookConfigured()) {
    return NextResponse.json({ error: "Stripe webhook não configurado no ambiente." }, { status: 500 });
  }

  const stripe = getStripeClient();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Assinatura Stripe ausente." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const payload = await request.text();
    event = stripe.webhooks.constructEvent(payload, signature, getWebhookSecret());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao validar webhook Stripe.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    await handleEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao processar webhook Stripe.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
