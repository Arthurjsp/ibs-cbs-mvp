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
  if (tone === "opportunity") return "border-l-emerald-700 bg-emerald-50";
  return "border-l-muted-foreground/50 bg-muted/40";
}

function actionToneLabel(tone: ActionTone) {
  if (tone === "attention") return "Atenção";
  if (tone === "opportunity") return "Oportunidade";
  return "Estável";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const telemetryFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dashboardLookbackStart = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1));

  const [company, runs, totalsAggregate, totalSimulations, telemetryCounts, creditByStatus, divergenceByStatus] = await Promise.all([
    prisma.companyProfile.findFirst({ where: { tenantId: user.tenantId } }),
    prisma.calcRun.findMany({
      where: {
        tenantId: user.tenantId,
        runAt: { gte: dashboardLookbackStart }
      },
      orderBy: { runAt: "asc" },
      select: {
        runAt: true,
        document: {
          select: {
            totalValue: true
          }
        },
        summary: {
          select: {
            ibsTotal: true,
            cbsTotal: true,
            isTotal: true,
            effectiveRate: true,
            componentsJson: true
          }
        }
      }
    }),
    prisma.calcSummary.aggregate({
      where: {
        calcRun: {
          is: {
            tenantId: user.tenantId
          }
        }
      },
      _sum: {
        ibsTotal: true,
        cbsTotal: true,
        isTotal: true
      }
    }),
    prisma.calcRun.count({
      where: {
        tenantId: user.tenantId
      }
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

  const emptyRow = {
    month: currentMonth,
    ibsTotal: 0,
    cbsTotal: 0,
    isTotal: 0,
    finalTaxTotal: 0,
    taxBaseTotal: 0,
    effectiveRate: 0,
    simulations: 0
  };
  const current = rowByMonth.get(currentMonth) ?? emptyRow;
  const previous = rowByMonth.get(prevMonth) ?? emptyRow;
  const previousYear = rowByMonth.get(sameMonthLastYear) ?? emptyRow;

  const currentTax = current.finalTaxTotal;
  const previousTax = previous.finalTaxTotal;
  const previousYearTax = previousYear.finalTaxTotal;

  const taxMom = calculateVariation(currentTax, previousTax);
  const taxYoy = calculateVariation(currentTax, previousYearTax);
  const rateMom = calculateVariation(current.effectiveRate * 100, previous.effectiveRate * 100);
  const rateYoy = calculateVariation(current.effectiveRate * 100, previousYear.effectiveRate * 100);
  const rateMomPp = previous.simulations > 0 ? rateMom.delta : null;
  const rateYoyPp = previousYear.simulations > 0 ? rateYoy.delta : null;
  const simMom = calculateVariation(current.simulations, previous.simulations);
  const simYoy = calculateVariation(current.simulations, previousYear.simulations);

  const totals = {
    ibs: Number(totalsAggregate._sum.ibsTotal ?? 0),
    cbs: Number(totalsAggregate._sum.cbsTotal ?? 0),
    is: Number(totalsAggregate._sum.isTotal ?? 0),
    simulations: totalSimulations
  };

  const effectiveRateLegend = buildEffectiveRateMessage(current.effectiveRate, Math.max(current.taxBaseTotal, 100000));

  const telemetryByType = new Map<TelemetryEventType, number>(telemetryCounts.map((row) => [row.type, row._count._all]));
  const creditStatusMap = new Map(creditByStatus.map((row) => [row.status, Number(row._sum.amount ?? 0)]));
  const divergenceStatusMap = new Map(divergenceByStatus.map((row) => [row.status, row._count._all]));

  const actionPoints: ActionPoint[] = [];

  if ((taxMom.deltaPct ?? 0) > 5) {
    actionPoints.push({
      tone: "attention",
      title: "Carga tributária em alta no mês",
      detail: "A variação MoM passou de 5%. Revise repasse de preço e mix por categoria/NCM."
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
      detail: "Execute repasse 0%, 50% e 100% para reduzir incerteza de preço."
    });
  }

  if (actionPoints.length === 0) {
    actionPoints.push({
      tone: "stable",
      title: "Indicadores estaveis no mês corrente",
      detail: "Mantenha monitoramento por UF e categoria para antecipar mudanças."
    });
  }

  const currentMonthLabel = formatMonthKey(currentMonth);

  return (
    <div className="space-y-6">
      <section className="space-y-2" aria-labelledby="dashboard-title">
        <h1 id="dashboard-title" className="text-2xl font-semibold">
          Dashboard Executivo
        </h1>
        <p className="text-sm text-muted-foreground">
          Nesta tela você decide preço, margem e risco tributário com base nas simulações do período.
        </p>
      </section>

      <EstimationBanner />

      <Card className="border-primary/25 bg-primary/5">
        <CardHeader>
          <CardTitle>Resumo do mês ({currentMonthLabel})</CardTitle>
          <CardDescription>
            Todas as métricas são estimativas para decisão gerencial. Não substituem apuração oficial.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <p>
            <span className="font-medium text-foreground">Carga estimada:</span> tributo final da transição
            (legado + IBS/CBS/IS ponderados) no mês.
          </p>
          <p>
            <span className="font-medium text-foreground">MoM:</span> compara o mês atual com o mês anterior.
          </p>
          <p>
            <span className="font-medium text-foreground">YoY:</span> compara com o mesmo mês do ano anterior.
          </p>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Indicadores principais">
        <ExecutiveKpiCard
          title="Carga tributária estimada (mês)"
          value={toCurrency(currentTax)}
          whatIsIt="Total mensal do tributo final (transição) nas simulações do mês corrente."
          whyItMatters="Mostra o tamanho do impacto tributário no caixa e na margem."
          action="Se subir, revise repasse e mix antes de fechar preço."
          tooltipExample="Se subir 8% no MoM, a margem pode cair se o repasse não for ajustado."
          mom={{ label: "MoM", value: taxMom.deltaPct, asPercent: true }}
          yoy={{ label: "YoY", value: taxYoy.deltaPct, asPercent: true }}
        />
        <ExecutiveKpiCard
          title="Effective rate medio (mês)"
          value={toShortPercent(current.effectiveRate * 100)}
          whatIsIt="Carga efetiva média sobre a base tributável simulada."
          whyItMatters="Ajuda a comparar cenários com bases diferentes de faturamento."
          action="Se ficar alto, rode cenário com transição e revise categorias mais sensíveis."
          tooltipExample="26% sobre R$ 1.000.000 implica cerca de R$ 260.000 de carga estimada."
          mom={{ label: "MoM (p.p.)", value: rateMomPp, asPercent: false }}
          yoy={{ label: "YoY (p.p.)", value: rateYoyPp, asPercent: false }}
        />
        <ExecutiveKpiCard
          title="Simulações executadas (mês)"
          value={String(current.simulations)}
          whatIsIt="Quantidade de simulações finalizadas no mês."
          whyItMatters="Mais simulações aumentam previsibilidade antes da decisão comercial."
          action="Objetivo mínimo: 3 cenários por documento (0%, 50% e 100% de repasse)."
          tooltipExample="Comparar 3 variações de repasse reduz o risco de decidir preço sem cobertura."
          mom={{ label: "MoM", value: simMom.deltaPct, asPercent: true, positiveIsGood: true }}
          yoy={{ label: "YoY", value: simYoy.deltaPct, asPercent: true, positiveIsGood: true }}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]" aria-label="Plano de ação e atalhos">
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
                  <span className="uppercase tracking-wide">{actionToneLabel(point.tone)}:</span>
                  <span>{point.title}</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{point.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximas ações no sistema</CardTitle>
            <CardDescription>Atalhos para sair da análise e executar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/documents/upload"
              className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-muted"
              aria-label="Ir para upload de NF-e"
            >
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                Importar nova NF-e
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/scenarios"
              className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-muted"
              aria-label="Ir para criação de cenário estratégico"
            >
              <span className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4" aria-hidden="true" />
                Criar cenário estratégico
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/reports"
              className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-muted"
              aria-label="Ir para exportação de relatório gerencial"
            >
              <span className="flex items-center gap-2">
                <Calculator className="h-4 w-4" aria-hidden="true" />
                Exportar relatório gerencial
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Legenda: effective rate</CardTitle>
          <CardDescription>{effectiveRateLegend.message}</CardDescription>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" aria-label="Totais acumulados">
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
      </section>

      <MonthlyChart data={monthlyData} />

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Operação e governança">
        <Card>
          <CardHeader>
            <CardTitle>Métricas de uso (últimos 30 dias)</CardTitle>
            <CardDescription>Telemetria operacional para acompanhar adoção do tenant.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 text-sm md:grid-cols-2">
              <li>Uploads XML: {telemetryByType.get("DOCUMENT_UPLOADED") ?? 0}</li>
              <li>Cálculos executados: {telemetryByType.get("CALCULATION_EXECUTED") ?? 0}</li>
              <li>Cenários aplicados: {telemetryByType.get("SCENARIO_APPLIED") ?? 0}</li>
              <li>Exports CSV: {telemetryByType.get("EXPORT_CSV") ?? 0}</li>
              <li>Exports XLSX: {telemetryByType.get("EXPORT_XLSX") ?? 0}</li>
              <li>Prévias importadas: {telemetryByType.get("ASSISTED_ASSESSMENT_IMPORTED") ?? 0}</li>
              <li>Divergências justificadas: {telemetryByType.get("DIVERGENCE_JUSTIFIED") ?? 0}</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Créditos simulados e apuração assistida</CardTitle>
            <CardDescription>Controle de evidência para disponibilidade de crédito e divergências.</CardDescription>
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
      </section>
    </div>
  );
}
