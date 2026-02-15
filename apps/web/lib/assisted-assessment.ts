import { DivergenceStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { trackTelemetryEvent } from "@/lib/telemetry/track";
import { monthRange } from "@/lib/utils";
import {
  AssistedAssessmentPayload,
  MonthlySimulatedTotals,
  buildDivergenceRows,
  roundMoney
} from "@/lib/assisted-assessment-math";

export async function getMonthlySimulatedTotals(params: {
  tenantId: string;
  month: string;
}): Promise<MonthlySimulatedTotals> {
  const { start, end } = monthRange(params.month);
  const runs = await prisma.calcRun.findMany({
    where: {
      tenantId: params.tenantId,
      runAt: { gte: start, lt: end }
    },
    include: { summary: true }
  });

  const runCount = runs.length;
  const totals = runs.reduce(
    (acc, run) => {
      acc.ibs += Number(run.summary?.ibsTotal ?? 0);
      acc.cbs += Number(run.summary?.cbsTotal ?? 0);
      acc.is += Number(run.summary?.isTotal ?? 0);
      acc.rate += Number(run.summary?.effectiveRate ?? 0);
      return acc;
    },
    { ibs: 0, cbs: 0, is: 0, rate: 0 }
  );

  return {
    month: params.month,
    runCount,
    ibsTotal: roundMoney(totals.ibs),
    cbsTotal: roundMoney(totals.cbs),
    isTotal: roundMoney(totals.is),
    effectiveRate: runCount > 0 ? Number((totals.rate / runCount).toFixed(6)) : 0
  };
}

export async function importAssistedAssessment(params: {
  tenantId: string;
  userId: string;
  payload: AssistedAssessmentPayload;
}) {
  const simulated = await getMonthlySimulatedTotals({
    tenantId: params.tenantId,
    month: params.payload.month
  });
  const divergences = buildDivergenceRows({
    simulated,
    assisted: params.payload
  });
  const { start } = monthRange(params.payload.month);

  const snapshot = await prisma.$transaction(async (tx) => {
    const created = await tx.assistedAssessmentSnapshot.create({
      data: {
        tenantId: params.tenantId,
        monthRef: start,
        source: params.payload.source?.trim() || "MANUAL",
        payloadJson: params.payload as unknown as Prisma.InputJsonValue,
        summaryJson: {
          simulated,
          divergenceCount: divergences.length
        } as unknown as Prisma.InputJsonValue
      }
    });

    if (divergences.length > 0) {
      await tx.assessmentDivergence.createMany({
        data: divergences.map((row) => ({
          tenantId: params.tenantId,
          snapshotId: created.id,
          monthRef: start,
          metric: row.metric,
          simulatedValue: row.simulatedValue,
          assistedValue: row.assistedValue,
          deltaValue: row.deltaValue,
          deltaPct: row.deltaPct,
          status: "OPEN"
        }))
      });
    }

    return created;
  });

  await trackTelemetryEvent({
    tenantId: params.tenantId,
    userId: params.userId,
    type: "ASSISTED_ASSESSMENT_IMPORTED",
    payload: {
      snapshotId: snapshot.id,
      month: params.payload.month,
      source: params.payload.source ?? "MANUAL",
      divergenceCount: divergences.length
    }
  });

  return { snapshotId: snapshot.id, simulated, divergences };
}

export async function justifyDivergence(params: {
  tenantId: string;
  userId: string;
  divergenceId: string;
  justification: string;
  status?: DivergenceStatus;
}) {
  const status = params.status ?? "JUSTIFIED";
  const updated = await prisma.assessmentDivergence.updateMany({
    where: {
      id: params.divergenceId,
      tenantId: params.tenantId
    },
    data: {
      status,
      justification: params.justification
    }
  });

  if (updated.count > 0) {
    await trackTelemetryEvent({
      tenantId: params.tenantId,
      userId: params.userId,
      type: "DIVERGENCE_JUSTIFIED",
      payload: {
        divergenceId: params.divergenceId,
        status
      }
    });
  }

  return updated.count > 0;
}
