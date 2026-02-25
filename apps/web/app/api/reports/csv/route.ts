import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildReportDataset, parseReportTemplate, ReportValueType } from "@/lib/reports/template";
import { buildRateLimitKey, enforceRateLimit } from "@/lib/security/rate-limit";
import { trackTelemetryEvent } from "@/lib/telemetry/track";
import { monthRange } from "@/lib/utils";

function csvEscape(value: string | number) {
  const str = String(value).replace(/"/g, "\"\"");
  return `"${str}"`;
}

function toPtBrNumber(value: number, fractionDigits: number) {
  return value.toFixed(fractionDigits).replace(".", ",");
}

function formatCsvValue(value: string | number | Date | null, type: ReportValueType) {
  if (value == null) return "";
  if (type === "datetime") return new Date(value).toISOString();
  if (type === "currency") return toPtBrNumber(Number(value), 2);
  if (type === "percent") return `${toPtBrNumber(Number(value) * 100, 2)}%`;
  if (type === "number") return toPtBrNumber(Number(value), 2);
  return String(value);
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const rateLimit = enforceRateLimit({
    key: buildRateLimitKey({
      request,
      tenantId: session.user.tenantId,
      userId: session.user.id,
      route: "api:reports:csv"
    }),
    max: 30,
    windowMs: 60_000
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Limite de exportações CSV excedido." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const scenarioId = searchParams.get("scenarioId") || undefined;
  const template = parseReportTemplate(searchParams.get("template"));
  if (!month) {
    return NextResponse.json({ error: "Parâmetro month é obrigatório (YYYY-MM)." }, { status: 400 });
  }

  const { start, end } = monthRange(month);
  const runs = await prisma.calcRun.findMany({
    where: {
      tenantId: session.user.tenantId,
      runAt: { gte: start, lt: end },
      ...(scenarioId ? { scenarioId } : {})
    },
    include: {
      summary: true,
      document: { select: { key: true, issueDate: true } },
      scenario: { select: { name: true } }
    },
    orderBy: { runAt: "asc" }
  });

  const dataset = buildReportDataset({
    template,
    runs: runs.map((run) => ({
      runId: run.id,
      month,
      runAt: run.runAt,
      documentKey: run.document.key,
      documentIssueDate: run.document.issueDate,
      scenarioName: run.scenario?.name ?? "BASELINE",
      ibsTotal: run.summary?.ibsTotal ?? 0,
      cbsTotal: run.summary?.cbsTotal ?? 0,
      isTotal: run.summary?.isTotal ?? 0,
      creditTotal: run.summary?.creditTotal ?? 0,
      effectiveRate: run.summary?.effectiveRate ?? 0,
      componentsJson: run.summary?.componentsJson ?? null
    }))
  });

  const rows: string[][] = [dataset.columns.map((column) => column.label)];
  for (const row of dataset.rows) {
    rows.push(dataset.columns.map((column) => formatCsvValue(row[column.key] ?? null, column.type)));
  }

  const csv = rows.map((row) => row.map(csvEscape).join(";")).join("\r\n");
  const body = `\uFEFF${csv}`;

  await trackTelemetryEvent({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    type: "EXPORT_CSV",
    payload: {
      month,
      scenarioId: scenarioId ?? null,
      template,
      rowCount: dataset.rows.length
    }
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="calc-summary-${template.toLowerCase()}-${month}.csv"`
    }
  });
}
