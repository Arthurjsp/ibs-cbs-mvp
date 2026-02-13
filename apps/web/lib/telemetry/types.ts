import { TelemetryEventType } from "@prisma/client";
import { z } from "zod";

export const telemetryEventTypeValues = [
  TelemetryEventType.DOCUMENT_UPLOADED,
  TelemetryEventType.CALCULATION_EXECUTED,
  TelemetryEventType.SCENARIO_APPLIED,
  TelemetryEventType.EXPORT_CSV,
  TelemetryEventType.EXPORT_XLSX
] as const;

export const telemetryEventSchema = z.object({
  type: z.enum(telemetryEventTypeValues),
  timestamp: z.string().datetime().optional(),
  payload: z.record(z.string(), z.unknown()).optional()
});

export type TelemetryEventInput = z.infer<typeof telemetryEventSchema>;

