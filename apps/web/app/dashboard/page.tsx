import Link from "next/link";
import { TelemetryEventType } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { MonthlyChart } from "@/components/dashboard/monthly-chart";
import { ExecutiveKpiCard } from "@/components/dashboard/executive-kpi-card";
import { EstimationBanner } from "@/components/trust/estimation-banner";
import {
  buildMonthlyRows,
  calculateVariation,
  monthKey,
  shiftMonthKey,
  shiftYearKey
} from "@/lib/dashboard/metrics";
import { buildEffectiveRateMessage } from "@/lib/trust/effective-rate";

function toCurrency(value: number) {
  return `R$ ${value.toFixed(2)}`;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const telemetryFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [company, runs, telemetryCounts] = await Promise.all([
    prisma.companyProfile.findFirst({ where: { tenantId: user.tenantId } }),
    prisma.calcRun.findMany({
      where: { tenantId: user.tenantId },
      include: { summary: true },
      orderBy: { runAt: "asc" }
    }),
    prisma.telemetryEvent.groupBy({
      by: ["type"],
      where: {
        tenantId: user.tenantId,
        timestamp: { gte: telemetryFrom }
      },
      _count: {
        _all: true
      }
    })
  ]);

  if (!company) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Onboarding pendente</CardTitle>
          <CardDescription>Cadastre a empresa antes de usar o motor.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/onboarding" className={buttonVariants()}>
            Ir para onboarding
          </Link>
        </CardContent>
      </Card>
    );
  }

  const monthlyRows = buildMonthlyRows(runs);
  const monthlyData = monthlyRows.map((row) => ({
    month: row.month,
    ibsTotal: row.ibsTotal,
    cbsTotal: row.cbsTotal,
    effectiveRate: row.effectiveRate
  }));
  const rowByMonth = new Map(monthlyRows.map((row) => [row.month, row]));
  const currentMonth = monthKey(now);
  const prevMonth = shiftMonthKey(currentMonth, -1);
  const sameMonthLastYear = shiftYearKey(currentMonth, -1);

  const emptyRow = { month: currentMonth, ibsTotal: 0, cbsTotal: 0, effectiveRate: 0, simulations: 0 };
  const current = rowByMonth.get(currentMonth) ?? emptyRow;
  const previous = rowByMonth.get(prevMonth) ?? emptyRow;
  const previousYear = rowByMonth.get(sameMonthLastYear) ?? emptyRow;

  const currentTax = current.ibsTotal + current.cbsTotal;
  const previousTax = previous.ibsTotal + previous.cbsTotal;
  const previousYearTax = previousYear.ibsTotal + previousYear.cbsTotal;

  const taxMom = calculateVariation(currentTax, previousTax);
  const taxYoy = calculateVariation(currentTax, previousYearTax);
  const rateMom = calculateVariation(current.effectiveRate * 100, previous.effectiveRate * 100);
  const rateYoy = calculateVariation(current.effectiveRate * 100, previousYear.effectiveRate * 100);
  const simMom = calculateVariation(current.simulations, previous.simulations);
  const simYoy = calculateVariation(current.simulations, previousYear.simulations);

  const totals = monthlyRows.reduce(
    (acc, row) => {
      acc.ibs += row.ibsTotal;
      acc.cbs += row.cbsTotal;
      acc.simulations += row.simulations;
      return acc;
    },
    { ibs: 0, cbs: 0, simulations: 0 }
  );

  const effectiveRateLegend = buildEffectiveRateMessage(current.effectiveRate, Math.max(currentTax, 100000));

  const telemetryByType = new Map<TelemetryEventType, number>(
    telemetryCounts.map((row) => [row.type, row._count._all])
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Dashboard Executivo</h1>
        <p className="text-sm text-muted-foreground">
          Painel para CFO/Controller com variação mensal e anual das simulações IBS/CBS.
        </p>
      </div>

      <EstimationBanner />

      <Card>
        <CardHeader>
          <CardTitle>Como interpretar este painel</CardTitle>
          <CardDescription>
            Todas as métricas são estimativas para decisão gerencial. Não substituem apuração oficial.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>- MoM compara o mês atual com o mês anterior.</p>
          <p>- YoY compara o mês atual com o mesmo mês do ano anterior.</p>
          <p>- Effective rate = (IBS + CBS) / base total simulada.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <ExecutiveKpiCard
          title="Carga tributária estimada (mês)"
          value={toCurrency(currentTax)}
          meaning="Soma de IBS + CBS do mês corrente em simulações executadas."
          tooltipExample="Exemplo: aumento de 8% no MoM pode pressionar margem se preço não for ajustado."
          mom={{ label: "MoM", value: taxMom.deltaPct ?? 0, asPercent: true }}
          yoy={{ label: "YoY", value: taxYoy.deltaPct ?? 0, asPercent: true }}
        />
        <ExecutiveKpiCard
          title="Effective rate médio (mês)"
          value={`${(current.effectiveRate * 100).toFixed(2)}%`}
          meaning="Carga média efetiva sobre a base tributável dos documentos simulados."
          tooltipExample="Exemplo: effective rate de 26% em venda de R$ 1M implica R$ 260k de carga estimada."
          mom={{ label: "MoM (p.p.)", value: rateMom.delta, asPercent: false }}
          yoy={{ label: "YoY (p.p.)", value: rateYoy.delta, asPercent: false }}
        />
        <ExecutiveKpiCard
          title="Simulações executadas (mês)"
          value={String(current.simulations)}
          meaning="Quantidade de cálculos realizados no mês corrente."
          tooltipExample="Exemplo: volume alto de simulações costuma indicar fase de revisão de preços e mix."
          mom={{ label: "MoM", value: simMom.deltaPct ?? 0, asPercent: true }}
          yoy={{ label: "YoY", value: simYoy.deltaPct ?? 0, asPercent: true }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Legenda: effective rate</CardTitle>
          <CardDescription>{effectiveRateLegend.message}</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total IBS acumulado</CardDescription>
            <CardTitle>{toCurrency(totals.ibs)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total CBS acumulado</CardDescription>
            <CardTitle>{toCurrency(totals.cbs)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Simulações totais</CardDescription>
            <CardTitle>{totals.simulations}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <MonthlyChart data={monthlyData} />

      <Card>
        <CardHeader>
          <CardTitle>Métricas de uso (últimos 30 dias)</CardTitle>
          <CardDescription>Telemetria operacional por tenant para acompanhar adoção do produto.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-5">
          <p>uploads: {telemetryByType.get("DOCUMENT_UPLOADED") ?? 0}</p>
          <p>cálculos: {telemetryByType.get("CALCULATION_EXECUTED") ?? 0}</p>
          <p>cenário aplicado: {telemetryByType.get("SCENARIO_APPLIED") ?? 0}</p>
          <p>exports CSV: {telemetryByType.get("EXPORT_CSV") ?? 0}</p>
          <p>exports XLSX: {telemetryByType.get("EXPORT_XLSX") ?? 0}</p>
        </CardContent>
      </Card>
    </div>
  );
}

