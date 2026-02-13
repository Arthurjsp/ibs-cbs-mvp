import * as Sentry from "@sentry/nextjs";
import { Prisma, TelemetryEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

interface TrackEventParams {
  tenantId: string;
  userId?: string | null;
  type: TelemetryEventType;
  timestamp?: Date;
  payload?: Prisma.InputJsonValue;
}

export async function trackTelemetryEvent(params: TrackEventParams) {
  const timestamp = params.timestamp ?? new Date();
  const event = await prisma.telemetryEvent.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId ?? null,
      type: params.type,
      timestamp,
      payload: params.payload ?? Prisma.JsonNull
    }
  });

  const logPayload = {
    component: "telemetry",
    tenantId: params.tenantId,
    userId: params.userId ?? null,
    type: params.type,
    timestamp: timestamp.toISOString(),
    payload: params.payload ?? null
  };

  console.info(JSON.stringify(logPayload));
  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage(`telemetry:${params.type}`, {
      level: "info",
      extra: logPayload
    });
  }

  return event;
}

