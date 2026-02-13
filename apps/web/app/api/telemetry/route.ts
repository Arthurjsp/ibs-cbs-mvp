import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { trackTelemetryEvent } from "@/lib/telemetry/track";
import { telemetryEventSchema } from "@/lib/telemetry/types";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
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

