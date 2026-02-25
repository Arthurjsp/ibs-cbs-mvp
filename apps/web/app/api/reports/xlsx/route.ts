import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildReportDataset, parseReportTemplate } from "@/lib/reports/template";
import { buildRateLimitKey, enforceRateLimit } from "@/lib/security/rate-limit";
import { trackTelemetryEvent } from "@/lib/telemetry/track";
import { monthRange } from "@/lib/utils";

export const runtime = "nodejs";

function numFmtByType(type: "text" | "datetime" | "number" | "currency" | "percent") {
  if (type === "datetime") return "yyyy-mm-dd hh:mm:ss";
  if (type === "currency") return '"R$" #,##0.00';
  if (type === "percent") return "0.00%";
  if (type === "number") return "#,##0.00";
  return null;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const rateLimit = enforceRateLimit({
    key: buildRateLimitKey({
      request,
      tenantId: session.user.tenantId,
      userId: session.user.id,
      route: "api:reports:xlsx"
    }),
    max: 20,
    windowMs: 60_000
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Limite de exportacoes XLSX excedido." },
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
    return NextResponse.json({ error: "Parametro month e obrigatorio (YYYY-MM)." }, { status: 400 });
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

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Motor IBS/CBS";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(template === "TECHNICAL" ? "Tecnico" : "Executivo");

  sheet.columns = dataset.columns.map((column) => ({
    header: column.label,
    key: column.key,
    width: column.width ?? 16
  }));

  for (const row of dataset.rows) {
    sheet.addRow(
      Object.fromEntries(dataset.columns.map((column) => [column.key, row[column.key] ?? null]))
    );
  }

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.alignment = { horizontal: "center", vertical: "middle" };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFB6471E" }
  };

  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: dataset.columns.length }
  };

  dataset.columns.forEach((column, index) => {
    const fmt = numFmtByType(column.type);
    if (!fmt) return;
    sheet.getColumn(index + 1).numFmt = fmt;
  });

  sheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: "middle" };
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } }
      };
      if (rowNumber > 1 && rowNumber % 2 === 0) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF9FAFB" }
        };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const bytes = new Uint8Array(buffer as ArrayBuffer);

  await trackTelemetryEvent({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    type: "EXPORT_XLSX",
    payload: {
      month,
      scenarioId: scenarioId ?? null,
      template,
      rowCount: dataset.rows.length
    }
  });

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="calc-summary-${template.toLowerCase()}-${month}.xlsx"`
    }
  });
}
