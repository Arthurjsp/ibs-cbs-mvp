import Link from "next/link";
import { TelemetryEventType } from "@prisma/client";
import { AlertTriangle, ArrowRight, Calculator, FileSpreadsheet, FlaskConical } from "lucide-react";
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
  formatMonthKey,
  monthKey,
  shiftMonthKey,
  shiftYearKey
} from "@/lib/dashboard/metrics";
import { buildEffectiveRateMessage } from "@/lib/trust/effective-rate";

const brlFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function toCurrency(value: number) {
  return brlFormatter.format(value);
}

function toShortPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

type ActionTone = "attention" | "opportunity" | "stable";

interface ActionPoint {
  title: string;
  detail: string;
  tone: ActionTone;
}

function actionToneClass(tone: ActionTone) {
  if (tone === "attention") return "border-l-destructive bg-destructive/5";
  if (tone === "opportunity") return "border-l-emerald-600 bg-emerald-50";
  return "border-l-muted-foreground/50 bg-muted/40";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const telemetryFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [company, runs, telemetryCounts, creditByStatus, divergenceByStatus] = await Promise.all([
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
    }),
    prisma.taxCreditLedger.groupBy({
      by: ["status"],
      where: { tenantId: user.tenantId },
      _sum: { amount: true }
    }),
    prisma.assessmentDivergence.groupBy({
      by: ["status"],
      where: { tenantId: user.tenantId },
      _count: { _all: true }
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
    isTotal: row.isTotal,
    effectiveRate: row.effectiveRate
  }));
  const rowByMonth = new Map(monthlyRows.map((row) => [row.month, row]));
  const currentMonth = monthKey(now);
  const prevMonth = shiftMonthKey(currentMonth, -1);
  const sameMonthLastYear = shiftYearKey(currentMonth, -1);

  const emptyRow = { month: currentMonth, ibsTotal: 0, cbsTotal: 0, isTotal: 0, effectiveRate: 0, simulations: 0 };
  const current = rowByMonth.get(currentMonth) ?? emptyRow;
  const previous = rowByMonth.get(prevMonth) ?? emptyRow;
  const previousYear = rowByMonth.get(sameMonthLastYear) ?? emptyRow;

  const currentTax = current.ibsTotal + current.cbsTotal + current.isTotal;
  const previousTax = previous.ibsTotal + previous.cbsTotal + previous.isTotal;
  const previousYearTax = previousYear.ibsTotal + previousYear.cbsTotal + previousYear.isTotal;

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
      acc.is += row.isTotal;
      acc.simulations += row.simulations;
      return acc;
    },
    { ibs: 0, cbs: 0, is: 0, simulations: 0 }
  );

  const effectiveRateLegend = buildEffectiveRateMessage(current.effectiveRate, Math.max(currentTax, 100000));

  const telemetryByType = new Map<TelemetryEventType, number>(
    telemetryCounts.map((row) => [row.type, row._count._all])
  );
  const creditStatusMap = new Map(creditByStatus.map((row) => [row.status, Number(row._sum.amount ?? 0)]));
  const divergenceStatusMap = new Map(divergenceByStatus.map((row) => [row.status, row._count._all]));

  const actionPoints: ActionPoint[] = [];

  if ((taxMom.deltaPct ?? 0) > 5) {
    actionPoints.push({
      tone: "attention",
      title: "Carga tributária em alta no mês",
      detail: "A variação MoM está acima de 5%. Revise política de repasse e mix por categoria/NCM."
    });
  }

  if (current.effectiveRate > 0.25) {
    actionPoints.push({
      tone: "attention",
      title: "Effective rate acima de 25%",
      detail: "Priorize cenários com transição e repasse para proteger margem operacional."
    });
  }

  if (current.simulations < 3) {
    actionPoints.push({
      tone: "opportunity",
      title: "Baixa intensidade de simulação",
      detail: "Execute cenários de repasse 0%, 50% e 100% para reduzir incerteza de preço."
    });
  }

  if (actionPoints.length === 0) {
    actionPoints.push({
      tone: "stable",
      title: "Indicadores estáveis no mês corrente",
      detail: "Mantenha monitoramento por UF e categoria para antecipar mudanças de carga."
    });
  }

  const currentMonthLabel = formatMonthKey(currentMonth);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Dashboard Executivo</h1>
        <p className="text-sm text-muted-foreground">
          Visão consolidada para decisão de preço, margem e risco tributário durante a transição IBS/CBS.
        </p>
      </div>

      <EstimationBanner />

      <Card className="border-primary/25 bg-primary/5">
        <CardHeader>
          <CardTitle>Resumo executivo do mês ({currentMonthLabel})</CardTitle>
          <CardDescription>
            Todas as métricas são estimativas para decisão gerencial. Não substituem apuração oficial.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <p>
            <span className="font-medium text-foreground">Carga estimada:</span> soma de IBS + CBS + IS dos cálculos executados no
            período.
          </p>
          <p>
            <span className="font-medium text-foreground">MoM:</span> compara mês atual com mês anterior para medir aceleração de
            risco.
          </p>
          <p>
            <span className="font-medium text-foreground">YoY:</span> compara com o mesmo mês do ano anterior para avaliar tendência
            estrutural.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <ExecutiveKpiCard
          title="Carga tributária estimada (mês)"
          value={toCurrency(currentTax)}
          meaning="Total mensal de IBS/CBS/IS nas simulações do mês corrente."
          tooltipExample="Exemplo: se subir 8% no MoM, a margem pode cair caso o repasse não seja ajustado."
          mom={{ label: "MoM", value: taxMom.deltaPct, asPercent: true }}
          yoy={{ label: "YoY", value: taxYoy.deltaPct, asPercent: true }}
        />
        <ExecutiveKpiCard
          title="Effective rate médio (mês)"
          value={toShortPercent(current.effectiveRate * 100)}
          meaning="Carga efetiva média sobre a base tributável dos documentos simulados."
          tooltipExample="Exemplo: 26% sobre R$ 1.000.000 implica aproximadamente R$ 260.000 de carga estimada."
          mom={{ label: "MoM (p.p.)", value: rateMom.delta, asPercent: false }}
          yoy={{ label: "YoY (p.p.)", value: rateYoy.delta, asPercent: false }}
        />
        <ExecutiveKpiCard
          title="Simulações executadas (mês)"
          value={String(current.simulations)}
          meaning="Quantidade de simulações finalizadas no mês corrente."
          tooltipExample="Exemplo: simular 3 variações de repasse permite comparar proteção de margem antes de decidir."
          mom={{ label: "MoM", value: simMom.deltaPct, asPercent: true, positiveIsGood: true }}
          yoy={{ label: "YoY", value: simYoy.deltaPct, asPercent: true, positiveIsGood: true }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Plano de ação recomendado</CardTitle>
            <CardDescription>Leitura prática para reduzir risco financeiro nas próximas decisões.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {actionPoints.map((point) => (
              <div key={point.title} className={`rounded-md border-l-4 p-3 ${actionToneClass(point.tone)}`}>
                <p className="flex items-center gap-2 text-sm font-medium">
                  {point.tone === "attention" ? <AlertTriangle className="h-4 w-4" aria-hidden="true" /> : null}
                  {point.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{point.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximas ações no sistema</CardTitle>
            <CardDescription>Atalhos para avançar da análise para execução.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/documents/upload" className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-muted">
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                Importar nova NF-e
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/scenarios" className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-muted">
              <span className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4" aria-hidden="true" />
                Criar cenário estratégico
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/reports" className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-muted">
              <span className="flex items-center gap-2">
                <Calculator className="h-4 w-4" aria-hidden="true" />
                Exportar relatório gerencial
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Legenda: effective rate</CardTitle>
          <CardDescription>{effectiveRateLegend.message}</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <CardDescription>Total IS acumulado</CardDescription>
            <CardTitle>{toCurrency(totals.is)}</CardTitle>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Métricas de uso (últimos 30 dias)</CardTitle>
            <CardDescription>Telemetria operacional para acompanhar adoção do tenant.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm md:grid-cols-2">
            <p>Uploads XML: {telemetryByType.get("DOCUMENT_UPLOADED") ?? 0}</p>
            <p>Cálculos executados: {telemetryByType.get("CALCULATION_EXECUTED") ?? 0}</p>
            <p>Cenários aplicados: {telemetryByType.get("SCENARIO_APPLIED") ?? 0}</p>
            <p>Exports CSV: {telemetryByType.get("EXPORT_CSV") ?? 0}</p>
            <p>Exports XLSX: {telemetryByType.get("EXPORT_XLSX") ?? 0}</p>
            <p>Prévias importadas: {telemetryByType.get("ASSISTED_ASSESSMENT_IMPORTED") ?? 0}</p>
            <p>Divergências justificadas: {telemetryByType.get("DIVERGENCE_JUSTIFIED") ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Créditos simulados e apuração assistida</CardTitle>
            <CardDescription>
              Controle de evidência para disponibilidade de crédito e justificativa de divergências.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-2 md:grid-cols-2">
              <p>Pendente de extinção: {toCurrency(creditStatusMap.get("PENDING_EXTINCTION") ?? 0)}</p>
              <p>Disponível: {toCurrency(creditStatusMap.get("AVAILABLE") ?? 0)}</p>
              <p>Consumido: {toCurrency(creditStatusMap.get("CONSUMED") ?? 0)}</p>
              <p>Bloqueado: {toCurrency(creditStatusMap.get("BLOCKED") ?? 0)}</p>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <p>Abertas: {divergenceStatusMap.get("OPEN") ?? 0}</p>
              <p>Justificadas: {divergenceStatusMap.get("JUSTIFIED") ?? 0}</p>
              <p>Resolvidas: {divergenceStatusMap.get("RESOLVED") ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
