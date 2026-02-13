import { Queue } from "bullmq";

export interface CalcJobPayload {
  tenantId: string;
  documentId: string;
  scenarioId?: string;
}

let queueSingleton: Queue<CalcJobPayload> | null = null;

function getQueue() {
  if (queueSingleton) return queueSingleton;
  const redisConnection = process.env.REDIS_URL;
  if (!redisConnection) return null;
  queueSingleton = new Queue<CalcJobPayload>("calc-runs", { connection: { url: redisConnection } });
  return queueSingleton;
}

export async function enqueueCalcRun(payload: CalcJobPayload) {
  const runSync = process.env.JOBS_SYNC === "true" || !process.env.REDIS_URL;
  if (runSync) {
    return {
      mode: "sync" as const,
      payload
    };
  }
  const queue = getQueue();
  if (!queue) {
    return {
      mode: "sync" as const,
      payload
    };
  }
  const job = await queue.add("calculate-document", payload);
  return {
    mode: "queue" as const,
    jobId: job.id
  };
}

