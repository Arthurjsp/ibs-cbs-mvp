import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { EstimationBanner } from "@/components/trust/estimation-banner";
import { buildEffectiveRateMessage } from "@/lib/trust/effective-rate";

function defaultMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

interface Props {
  searchParams?: {
    month?: string;
    scenarioId?: string;
  };
}

export default async function ReportsPage({ searchParams }: Props) {
  const user = await requireUser();
  const month = searchParams?.month ?? defaultMonth();
  const scenarioId = searchParams?.scenarioId || "";
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

  const csvHref = `/api/reports/csv?month=${encodeURIComponent(month)}${
    scenarioId ? `&scenarioId=${encodeURIComponent(scenarioId)}` : ""
  }`;
  const xlsxHref = `/api/reports/xlsx?month=${encodeURIComponent(month)}${
    scenarioId ? `&scenarioId=${encodeURIComponent(scenarioId)}` : ""
  }`;

  const avgEffectiveRate =
    runs.length > 0 ? runs.reduce((sum, run) => sum + Number(run.summary?.effectiveRate ?? 0), 0) / runs.length : 0;
  const legend = buildEffectiveRateMessage(avgEffectiveRate, 100000);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Exportação por período e cenário com dados de simulação estimada.</p>
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
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecione mês e cenário para consolidar o resultado.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" method="GET">
            <div className="space-y-1">
              <label htmlFor="month" className="text-sm font-medium">
                Mês (YYYY-MM)
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
                Cenário
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

      <Card>
        <CardHeader>
          <CardTitle>Prévia do período</CardTitle>
          <CardDescription>{runs.length} execução(ões) no filtro atual.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Cenário</TableHead>
                <TableHead>IBS</TableHead>
                <TableHead>CBS</TableHead>
                <TableHead>Effective Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="font-mono text-xs">{run.id}</TableCell>
                  <TableCell>{run.document.key}</TableCell>
                  <TableCell>{run.scenario?.name ?? "Baseline"}</TableCell>
                  <TableCell>R$ {Number(run.summary?.ibsTotal ?? 0).toFixed(2)}</TableCell>
                  <TableCell>R$ {Number(run.summary?.cbsTotal ?? 0).toFixed(2)}</TableCell>
                  <TableCell>{Number(run.summary?.effectiveRate ?? 0).toFixed(6)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}