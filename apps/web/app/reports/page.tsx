import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildExecutiveInsights,
  buildExecutiveSpotlight,
  buildReportDataset,
  parseReportTemplate,
  summarizeReportDataset
} from "@/lib/reports/template";
import { monthRange } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { EstimationBanner } from "@/components/trust/estimation-banner";
import { buildEffectiveRateMessage } from "@/lib/trust/effective-rate";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function defaultMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

interface Props {
  searchParams?: {
    month?: string;
    scenarioId?: string;
    template?: string;
  };
}

function formatCell(value: string | number | Date | null, type: "text" | "datetime" | "number" | "currency" | "percent") {
  if (value == null) return "-";
  if (type === "datetime") return new Date(value).toLocaleString("pt-BR");
  if (type === "currency") return currencyFormatter.format(Number(value));
  if (type === "percent") return `${(Number(value) * 100).toFixed(2)}%`;
  if (type === "number") return Number(value).toLocaleString("pt-BR");
  return String(value);
}

function insightTone(severity: "HIGH" | "MEDIUM" | "LOW") {
  if (severity === "HIGH") return "border-destructive/30 bg-destructive/5 text-destructive";
  if (severity === "MEDIUM") return "border-amber-300 bg-amber-50 text-amber-800";
  return "border-emerald-300 bg-emerald-50 text-emerald-800";
}

export default async function ReportsPage({ searchParams }: Props) {
  const user = await requireUser();
  const month = searchParams?.month ?? defaultMonth();
  const scenarioId = searchParams?.scenarioId || "";
  const template = parseReportTemplate(searchParams?.template);
  const { start, end } = monthRange(month);

  const [scenarios, runs] = await Promise.all([
    prisma.scenario.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.calcRun.findMany({
      where: {
        tenantId: user.tenantId,
        runAt: { gte: start, lt: end },
        ...(scenarioId ? { scenarioId } : {})
      },
      include: {
        summary: true,
        document: true,
        scenario: true
      },
      orderBy: { runAt: "desc" }
    })
  ]);

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
  const spotlight = buildExecutiveSpotlight(dataset, 3);

  const csvHref = `/api/reports/csv?month=${encodeURIComponent(month)}${
    scenarioId ? `&scenarioId=${encodeURIComponent(scenarioId)}` : ""
  }&template=${encodeURIComponent(template)}`;
  const xlsxHref = `/api/reports/xlsx?month=${encodeURIComponent(month)}${
    scenarioId ? `&scenarioId=${encodeURIComponent(scenarioId)}` : ""
  }&template=${encodeURIComponent(template)}`;

  const legend = buildEffectiveRateMessage(summary.avgEffectiveRate, 100000);
  const previewRows = dataset.rows.slice(0, 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Relatorios</h1>
        <p className="text-sm text-muted-foreground">
          Exportacao gerencial e tecnica por periodo/cenario com pre-visualizacao antes do download.
        </p>
      </div>

      <EstimationBanner />

      <Card>
        <CardHeader>
          <CardTitle>Legenda: effective rate</CardTitle>
          <CardDescription>{legend.message}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filtros e template</CardTitle>
          <CardDescription>Defina o recorte e o layout do relatorio antes de exportar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" method="GET">
            <div className="space-y-1">
              <label htmlFor="month" className="text-sm font-medium">
                Mes (YYYY-MM)
              </label>
              <input
                id="month"
                name="month"
                defaultValue={month}
                className="h-10 rounded-md border bg-card px-3 text-sm"
                placeholder="2026-01"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="scenarioId" className="text-sm font-medium">
                Cenario
              </label>
              <select
                id="scenarioId"
                name="scenarioId"
                defaultValue={scenarioId}
                className="h-10 min-w-[260px] rounded-md border bg-card px-3 text-sm"
              >
                <option value="">Todos/Baseline</option>
                {scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="template" className="text-sm font-medium">
                Template
              </label>
              <select id="template" name="template" defaultValue={template} className="h-10 rounded-md border bg-card px-3 text-sm">
                <option value="EXECUTIVE">Executivo</option>
                <option value="TECHNICAL">Tecnico</option>
              </select>
            </div>
            <Button type="submit" variant="outline">
              Aplicar
            </Button>
            <a href={csvHref} className={buttonVariants()}>
              Exportar CSV
            </a>
            <a href={xlsxHref} className={buttonVariants({ variant: "outline" })}>
              Exportar XLSX
            </a>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Runs no filtro</CardDescription>
            <CardTitle>{summary.rowCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Tributo final total</CardDescription>
            <CardTitle>{currencyFormatter.format(summary.totalFinalTax)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Credito total</CardDescription>
            <CardTitle>{currencyFormatter.format(summary.totalCredit)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Itens unsupported</CardDescription>
            <CardTitle>{summary.unsupportedItems}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Resumo para diretoria</CardTitle>
            <CardDescription>Leitura executiva do periodo com foco em risco e acao.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {insights.map((insight) => (
              <div key={`${insight.severity}-${insight.title}`} className={`rounded-md border p-3 ${insightTone(insight.severity)}`}>
                <p className="font-medium">
                  {insight.severity} | {insight.title}
                </p>
                <p className="mt-1">{insight.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maior exposicao no periodo</CardTitle>
            <CardDescription>Top documentos/cenarios por tributo final estimado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {spotlight.length > 0 ? (
              spotlight.map((row) => (
                <div key={`${row.documentKey}-${row.scenario}`} className="rounded-md border p-3">
                  <p className="font-medium">
                    {row.scenario} | {row.documentKey}
                  </p>
                  <p className="text-muted-foreground">
                    Tributo: {currencyFormatter.format(row.finalTax)} | Effective rate: {(row.effectiveRate * 100).toFixed(2)}% |
                    Unsupported: {row.unsupportedItems}
                  </p>
                  <p className="text-muted-foreground">Acao: {row.actionHint}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">Sem dados para destacar exposicao no recorte atual.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pre-visualizacao ({template})</CardTitle>
          <CardDescription>
            Mostrando {previewRows.length} de {dataset.rows.length} linha(s). O export usa todas as linhas do filtro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {dataset.columns.map((column) => (
                  <TableHead key={column.key}>{column.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, index) => (
                <TableRow key={`${String(row.runId ?? row.documentKey ?? index)}-${index}`}>
                  {dataset.columns.map((column) => (
                    <TableCell key={column.key}>{formatCell(row[column.key] ?? null, column.type)}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
