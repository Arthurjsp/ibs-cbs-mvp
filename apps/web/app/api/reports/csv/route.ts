import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { trackTelemetryEvent } from "@/lib/telemetry/track";
import { monthRange } from "@/lib/utils";

function csvEscape(value: string | number) {
  const str = String(value).replace(/"/g, "\"\"");
  return `"${str}"`;
}

function toPtBrNumber(value: number, fractionDigits: number) {
  return value.toFixed(fractionDigits).replace(".", ",");
}

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

  const rows: string[][] = [
    [
      "month",
      "runAt",
      "documentKey",
      "documentIssueDate",
      "scenario",
      "ibsTotal",
      "cbsTotal",
      "isTotal",
      "creditTotal",
      "effectiveRate"
    ]
  ];

  for (const run of runs) {
    rows.push([
      month,
      run.runAt.toISOString(),
      run.document.key,
      run.document.issueDate.toISOString(),
      run.scenario?.name ?? "BASELINE",
      toPtBrNumber(Number(run.summary?.ibsTotal ?? 0), 2),
      toPtBrNumber(Number(run.summary?.cbsTotal ?? 0), 2),
      toPtBrNumber(Number(run.summary?.isTotal ?? 0), 2),
      toPtBrNumber(Number(run.summary?.creditTotal ?? 0), 2),
      toPtBrNumber(Number(run.summary?.effectiveRate ?? 0), 6)
    ]);
  }

  const csv = rows.map((row) => row.map(csvEscape).join(";")).join("\r\n");

  // BOM helps Excel detect UTF-8 correctly.
  const body = `\uFEFF${csv}`;

  await trackTelemetryEvent({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    type: "EXPORT_CSV",
    payload: {
      month,
      scenarioId: scenarioId ?? null,
      rowCount: rows.length - 1
    }
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="calc-summary-${month}.csv"`
    }
  });
}
