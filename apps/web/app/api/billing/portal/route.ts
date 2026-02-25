import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { createPortalSession, isStripePortalConfigured } from "@/lib/stripe-billing";
import { buildRateLimitKey, enforceRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || !session.user.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (!(new Set(["ADMIN", "CFO"]).has(session.user.role))) {
    return NextResponse.json({ error: "Sem permissão para billing." }, { status: 403 });
  }

  if (!isStripePortalConfigured()) {
    return NextResponse.json({ error: "Stripe não configurado no ambiente." }, { status: 500 });
  }

  const rateLimit = enforceRateLimit({
    key: buildRateLimitKey({
      request,
      tenantId: session.user.tenantId,
      userId: session.user.id,
      route: "api:billing:portal"
    }),
    max: 20,
    windowMs: 60_000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas de acesso ao portal. Aguarde alguns segundos." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  try {
    const portalUrl = await createPortalSession({
      tenantId: session.user.tenantId,
      requestUrl: request.url
    });
    return NextResponse.redirect(portalUrl, { status: 303 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao abrir portal de cobrança.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


