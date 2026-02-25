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

function severityLabel(severity: "HIGH" | "MEDIUM" | "LOW") {
  if (severity === "HIGH") return "ALTO";
  if (severity === "MEDIUM") return "MÉDIO";
  return "BAIXO";
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
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true
      }
    }),
    prisma.calcRun.findMany({
      where: {
        tenantId: user.tenantId,
        runAt: { gte: start, lt: end },
        ...(scenarioId ? { scenarioId } : {})
      },
      orderBy: { runAt: "desc" },
      select: {
        id: true,
        runAt: true,
        summary: {
          select: {
            ibsTotal: true,
            cbsTotal: true,
            isTotal: true,
            creditTotal: true,
            effectiveRate: true,
            componentsJson: true
          }
        },
        document: {
          select: {
            key: true,
            issueDate: true
          }
        },
        scenario: {
          select: {
            name: true
          }
        }
      }
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
        <h1 className="text-2xl font-semibold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Nesta tela você decide o recorte de exportação e valida os dados antes do download.
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
          <CardDescription>Defina período, cenário e formato antes de exportar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" method="GET">
            <div className="grid gap-3 lg:grid-cols-12 lg:items-end">
              <div className="space-y-1 lg:col-span-3">
                <label htmlFor="month" className="text-sm font-medium">
                  Mês (YYYY-MM)
                </label>
                <input
                  id="month"
                  name="month"
                  defaultValue={month}
                  className="h-10 w-full rounded-md border bg-card px-3 text-sm"
                  placeholder="2026-01"
                  aria-describedby="month-help"
                />
                <p id="month-help" className="text-xs text-muted-foreground">
                  Exemplo: 2026-02.
                </p>
              </div>

              <div className="space-y-1 lg:col-span-4">
                <label htmlFor="scenarioId" className="text-sm font-medium">
                  Cenário
                </label>
                <select
                  id="scenarioId"
                  name="scenarioId"
                  defaultValue={scenarioId}
                  className="h-10 w-full rounded-md border bg-card px-3 text-sm"
                >
                  <option value="">Todos/Baseline</option>
                  {scenarios.map((scenario) => (
                    <option key={scenario.id} value={scenario.id}>
                      {scenario.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 lg:col-span-2">
                <label htmlFor="template" className="text-sm font-medium">
                  Template
                </label>
                <select
                  id="template"
                  name="template"
                  defaultValue={template}
                  className="h-10 w-full rounded-md border bg-card px-3 text-sm"
                >
                  <option value="EXECUTIVE">Executivo</option>
                  <option value="TECHNICAL">Técnico</option>
                </select>
              </div>

              <div className="lg:col-span-3 lg:pb-0.5">
                <Button type="submit" variant="outline" className="w-full lg:w-auto">
                  Aplicar
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <a href={csvHref} className={buttonVariants()}>
                Exportar CSV
              </a>
              <a href={xlsxHref} className={buttonVariants({ variant: "outline" })}>
                Exportar XLSX
              </a>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-4" aria-label="Indicadores do recorte selecionado">
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
            <CardDescription>Crédito total</CardDescription>
            <CardTitle>{currencyFormatter.format(summary.totalCredit)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Itens unsupported</CardDescription>
            <CardTitle>{summary.unsupportedItems}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Resumo para diretoria</CardTitle>
            <CardDescription>Cada alerta informa risco, contexto e ação recomendada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {insights.map((insight) => (
              <div key={`${insight.severity}-${insight.title}`} className={`rounded-md border p-3 ${insightTone(insight.severity)}`}>
                <p className="font-medium">
                  {severityLabel(insight.severity)} | {insight.title}
                </p>
                <p className="mt-1">{insight.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maior exposição no período</CardTitle>
            <CardDescription>Top documentos/cenários por tributo final estimado.</CardDescription>
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
                  <p className="text-muted-foreground">Ação: {row.actionHint}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">Sem dados para destaque no recorte atual.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pré-visualização ({template})</CardTitle>
          <CardDescription>
            Mostrando {previewRows.length} de {dataset.rows.length} linha(s). O export usa todas as linhas do filtro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <caption className="sr-only">Pré-visualização dos dados que serão exportados</caption>
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

