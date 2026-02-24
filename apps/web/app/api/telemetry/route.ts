import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { buildRateLimitKey, enforceRateLimit } from "@/lib/security/rate-limit";
import { trackTelemetryEvent } from "@/lib/telemetry/track";
import { telemetryEventSchema } from "@/lib/telemetry/types";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const rateLimit = enforceRateLimit({
      key: buildRateLimitKey({
        request,
        tenantId: session.user.tenantId,
        userId: session.user.id,
        route: "api:telemetry"
      }),
      max: 120,
      windowMs: 60_000
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Limite de eventos de telemetria excedido." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds)
          }
        }
      );
    }

    const body = await request.json();
    const parsed = telemetryEventSchema.parse(body);

    await trackTelemetryEvent({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      type: parsed.type,
      timestamp: parsed.timestamp ? new Date(parsed.timestamp) : undefined,
      payload: (parsed.payload ?? {}) as Prisma.InputJsonValue
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao registrar telemetria.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
