import { z } from "zod";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { createCheckoutSession, isStripeConfigured } from "@/lib/stripe-billing";
import { buildRateLimitKey, enforceRateLimit } from "@/lib/security/rate-limit";

const checkoutSchema = z.object({
  plan: z.enum(["PRO", "ENTERPRISE"])
});

function parsePlan(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return request.json();
  }

  return request.formData().then((formData) => ({
    plan: String(formData.get("plan") ?? "")
  }));
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || !session.user.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (!(new Set(["ADMIN", "CFO"]).has(session.user.role))) {
    return NextResponse.json({ error: "Sem permissão para billing." }, { status: 403 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe não configurado no ambiente." }, { status: 500 });
  }

  const rateLimit = enforceRateLimit({
    key: buildRateLimitKey({
      request,
      tenantId: session.user.tenantId,
      userId: session.user.id,
      route: "api:billing:checkout"
    }),
    max: 20,
    windowMs: 60_000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas de checkout. Aguarde alguns segundos." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const parsed = checkoutSchema.safeParse(await parsePlan(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
  }

  try {
    const checkoutUrl = await createCheckoutSession({
      tenantId: session.user.tenantId,
      plan: parsed.data.plan,
      requestUrl: request.url
    });
    return NextResponse.redirect(checkoutUrl, { status: 303 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao iniciar checkout Stripe.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

