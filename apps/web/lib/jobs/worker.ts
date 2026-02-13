import { Worker } from "bullmq";
import { runCalcForDocument } from "@/lib/calc-service";

export function startCalcWorker() {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL não configurado.");
  }

  return new Worker(
    "calc-runs",
    async (job) => {
      const payload = job.data as { tenantId: string; documentId: string; scenarioId?: string };
      await runCalcForDocument(payload);
    },
    { connection: { url: process.env.REDIS_URL } }
  );
}

