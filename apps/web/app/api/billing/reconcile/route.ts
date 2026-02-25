import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { buildRateLimitKey, enforceRateLimit } from "@/lib/security/rate-limit";
import { reconcileTenantStripeState } from "@/lib/stripe-billing";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || !session.user.id) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  if (!(new Set(["ADMIN", "CFO"]).has(session.user.role))) {
    return NextResponse.json({ error: "Sem permissao para billing." }, { status: 403 });
  }

  const rateLimit = enforceRateLimit({
    key: buildRateLimitKey({
      request,
      tenantId: session.user.tenantId,
      userId: session.user.id,
      route: "api:billing:reconcile"
    }),
    max: 20,
    windowMs: 60_000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns segundos." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  try {
    const result = await reconcileTenantStripeState(session.user.tenantId);
    const url = new URL("/billing", request.url);
    url.searchParams.set("reconcile", result.state);
    return NextResponse.redirect(url, { status: 303 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao sincronizar assinatura.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

