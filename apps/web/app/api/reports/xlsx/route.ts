import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { trackTelemetryEvent } from "@/lib/telemetry/track";
import { monthRange } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const scenarioId = searchParams.get("scenarioId") || undefined;
  if (!month) {
    return NextResponse.json({ error: "Parâmetro month é obrigatório (YYYY-MM)." }, { status: 400 });
  }

  const { start, end } = monthRange(month);
  const runs = await prisma.calcRun.findMany({
    where: {
      tenantId: session.user.tenantId,
      runAt: { gte: start, lt: end },
      scenarioId
    },
    include: {
      summary: true,
      document: { select: { key: true, issueDate: true } },
      scenario: { select: { name: true } }
    },
    orderBy: { runAt: "asc" }
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Motor IBS/CBS";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Calc Summary");

  sheet.columns = [
    { header: "month", key: "month", width: 12 },
    { header: "runAt", key: "runAt", width: 24 },
    { header: "documentKey", key: "documentKey", width: 50 },
    { header: "documentIssueDate", key: "documentIssueDate", width: 24 },
    { header: "scenario", key: "scenario", width: 24 },
    { header: "ibsTotal", key: "ibsTotal", width: 16 },
    { header: "cbsTotal", key: "cbsTotal", width: 16 },
    { header: "isTotal", key: "isTotal", width: 16 },
    { header: "creditTotal", key: "creditTotal", width: 16 },
    { header: "effectiveRate", key: "effectiveRate", width: 14 }
  ];

  for (const run of runs) {
    sheet.addRow({
      month,
      runAt: run.runAt,
      documentKey: run.document.key,
      documentIssueDate: run.document.issueDate,
      scenario: run.scenario?.name ?? "BASELINE",
      ibsTotal: Number(run.summary?.ibsTotal ?? 0),
      cbsTotal: Number(run.summary?.cbsTotal ?? 0),
      isTotal: Number(run.summary?.isTotal ?? 0),
      creditTotal: Number(run.summary?.creditTotal ?? 0),
      effectiveRate: Number(run.summary?.effectiveRate ?? 0)
    });
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
    to: { row: 1, column: 10 }
  };

  sheet.getColumn("runAt").numFmt = "yyyy-mm-dd hh:mm:ss";
  sheet.getColumn("documentIssueDate").numFmt = "yyyy-mm-dd hh:mm:ss";
  sheet.getColumn("ibsTotal").numFmt = '"R$" #,##0.00';
  sheet.getColumn("cbsTotal").numFmt = '"R$" #,##0.00';
  sheet.getColumn("isTotal").numFmt = '"R$" #,##0.00';
  sheet.getColumn("creditTotal").numFmt = '"R$" #,##0.00';
  sheet.getColumn("effectiveRate").numFmt = "0.00%";

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
      rowCount: runs.length
    }
  });

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="calc-summary-${month}.xlsx"`
    }
  });
}
