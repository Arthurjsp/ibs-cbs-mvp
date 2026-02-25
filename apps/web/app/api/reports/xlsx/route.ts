import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildExecutiveInsights,
  buildExecutiveSpotlight,
  buildReportDataset,
  parseReportTemplate,
  summarizeReportDataset
} from "@/lib/reports/template";
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

function rowFillBySeverity(severity: "HIGH" | "MEDIUM" | "LOW") {
  if (severity === "HIGH") return "FFFFF1F2";
  if (severity === "MEDIUM") return "FFFFFAE6";
  return "FFEFFAF2";
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
      route: "api:reports:xlsx"
    }),
    max: 20,
    windowMs: 60_000
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Limite de exportações XLSX excedido." },
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

  const summary = summarizeReportDataset(dataset);
  const insights = buildExecutiveInsights(dataset);
  const spotlight = buildExecutiveSpotlight(dataset, 5);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Motor IBS/CBS";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Resumo Diretoria");
  summarySheet.columns = [
    { key: "a", width: 28 },
    { key: "b", width: 36 },
    { key: "c", width: 24 },
    { key: "d", width: 24 },
    { key: "e", width: 24 }
  ];

  summarySheet.mergeCells("A1:E1");
  summarySheet.getCell("A1").value = "Resumo Executivo de Simulações IBS/CBS";
  summarySheet.getCell("A1").font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  summarySheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB6471E" } };
  summarySheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

  summarySheet.mergeCells("A2:E2");
  summarySheet.getCell("A2").value = `Período: ${month} | Template: ${template} | Cenário: ${scenarioId ?? "Todos/Baseline"}`;
  summarySheet.getCell("A2").font = { size: 11, color: { argb: "FF374151" } };

  summarySheet.getCell("A4").value = "Indicadores principais";
  summarySheet.getCell("A4").font = { bold: true, color: { argb: "FF111827" } };

  const metricRows = [
    ["Runs no filtro", summary.rowCount],
    ["Tributo final total", summary.totalFinalTax],
    ["Crédito total", summary.totalCredit],
    ["Média effective rate", summary.avgEffectiveRate],
    ["Itens unsupported", summary.unsupportedItems]
  ] as const;

  metricRows.forEach((metric, index) => {
    const row = summarySheet.getRow(5 + index);
    row.getCell(1).value = metric[0];
    row.getCell(1).font = { bold: true };
    row.getCell(2).value = metric[1];
  });
  summarySheet.getCell("B6").numFmt = '"R$" #,##0.00';
  summarySheet.getCell("B7").numFmt = '"R$" #,##0.00';
  summarySheet.getCell("B8").numFmt = "0.00%";

  summarySheet.getCell("A11").value = "Alertas e recomendações";
  summarySheet.getCell("A11").font = { bold: true, color: { argb: "FF111827" } };
  summarySheet.getRow(12).values = ["Severidade", "Título", "Detalhe"];
  summarySheet.getRow(12).font = { bold: true, color: { argb: "FFFFFFFF" } };
  summarySheet.getRow(12).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF374151" } };

  insights.forEach((insight, index) => {
    const rowNumber = 13 + index;
    const row = summarySheet.getRow(rowNumber);
    row.getCell(1).value = insight.severity;
    row.getCell(2).value = insight.title;
    row.getCell(3).value = insight.detail;
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowFillBySeverity(insight.severity) } };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } }
      };
    });
  });

  const spotlightStart = Math.max(16, 13 + insights.length + 2);
  summarySheet.getCell(`A${spotlightStart}`).value = "Top exposição tributária";
  summarySheet.getCell(`A${spotlightStart}`).font = { bold: true, color: { argb: "FF111827" } };
  summarySheet.getRow(spotlightStart + 1).values = [
    "Cenário",
    "Documento",
    "Tributo final",
    "Effective rate",
    "Unsupported",
    "Ação"
  ];
  summarySheet.getRow(spotlightStart + 1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  summarySheet.getRow(spotlightStart + 1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2F7369" }
  };

  spotlight.forEach((item, index) => {
    const rowNumber = spotlightStart + 2 + index;
    const row = summarySheet.getRow(rowNumber);
    row.values = [item.scenario, item.documentKey, item.finalTax, item.effectiveRate, item.unsupportedItems, item.actionHint];
    row.getCell(3).numFmt = '"R$" #,##0.00';
    row.getCell(4).numFmt = "0.00%";
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } }
      };
      if (index % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
      }
    });
  });

  const detailSheet = workbook.addWorksheet(template === "TECHNICAL" ? "Dados Técnicos" : "Dados Executivos");
  detailSheet.columns = dataset.columns.map((column) => ({
    header: column.label,
    key: column.key,
    width: column.width ?? 16
  }));

  for (const row of dataset.rows) {
    detailSheet.addRow(Object.fromEntries(dataset.columns.map((column) => [column.key, row[column.key] ?? null])));
  }

  const header = detailSheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.alignment = { horizontal: "center", vertical: "middle" };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFB6471E" }
  };

  detailSheet.views = [{ state: "frozen", ySplit: 1 }];
  detailSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: dataset.columns.length }
  };

  dataset.columns.forEach((column, index) => {
    const fmt = numFmtByType(column.type);
    if (!fmt) return;
    detailSheet.getColumn(index + 1).numFmt = fmt;
  });

  detailSheet.eachRow((row, rowNumber) => {
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
