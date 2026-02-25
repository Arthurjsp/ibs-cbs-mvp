import { TelemetryEventType, TenantPlan } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { PLAN_LIMITS, checkSimulationLimit } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const planOrder: TenantPlan[] = ["FREE", "PRO", "ENTERPRISE"];

function limitLabel(plan: TenantPlan) {
  const limit = PLAN_LIMITS[plan];
  return limit === null ? "Ilimitado" : `${limit} simulacoes/mes`;
}

function planDescription(plan: TenantPlan) {
  if (plan === "FREE") return "Ideal para validacao inicial de cenarios.";
  if (plan === "PRO") return "Operacao recorrente com time fiscal e financeiro.";
  return "Escala multi-area com alto volume e governanca.";
}

function usageTone(usagePercent: number) {
  if (usagePercent >= 100) return "bg-destructive";
  if (usagePercent >= 80) return "bg-amber-500";
  return "bg-emerald-600";
}

function usageStatusText(usagePercent: number) {
  if (usagePercent >= 100) return "Limite atingido";
  if (usagePercent >= 80) return "Proximo do limite";
  return "Dentro do limite";
}

export default async function BillingPage() {
  const user = await requireUser();
  const monthRef = new Date();
  const telemetryFrom = new Date(monthRef.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [tenant, usage, telemetryCounts] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true, plan: true }
    }),
    checkSimulationLimit(user.tenantId),
    prisma.telemetryEvent.groupBy({
      by: ["type"],
      where: {
        tenantId: user.tenantId,
        timestamp: { gte: telemetryFrom }
      },
      _count: { _all: true }
    })
  ]);

  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(monthRef);
  const usagePercent = usage.limit ? Math.min((usage.used / usage.limit) * 100, 100) : 0;
  const telemetryByType = new Map<TelemetryEventType, number>(telemetryCounts.map((row) => [row.type, row._count._all]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing e consumo</h1>
        <p className="text-sm text-muted-foreground">
          Nesta tela voce decide quando mudar de plano, com base no uso real do mes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Plano atual <Badge>{tenant?.plan ?? "FREE"}</Badge>
          </CardTitle>
          <CardDescription>{tenant?.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Uso em {monthLabel}: {usage.used} simulacao(oes) de {usage.limit === null ? "ilimitado" : usage.limit}.
          </p>

          {usage.limit !== null ? (
            <div className="space-y-1" aria-label="Barra de consumo mensal">
              <div className="h-2 rounded bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={usagePercent}>
                <div className={`h-2 rounded ${usageTone(usagePercent)}`} style={{ width: `${usagePercent}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">
                {usageStatusText(usagePercent)} | {usage.remaining} simulacao(oes) restantes no ciclo atual.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Plano sem limite de simulacoes mensais.</p>
          )}

          {!usage.allowed ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
              Limite mensal atingido. Faca upgrade para continuar calculando novos documentos.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Planos disponiveis</CardTitle>
          <CardDescription>Estrutura comercial do MVP com bloqueio de limite ativo.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {planOrder.map((plan) => {
            const isCurrent = (tenant?.plan ?? "FREE") === plan;
            return (
              <div key={plan} className={`rounded-md border p-4 ${isCurrent ? "border-primary" : ""}`}>
                <p className="text-sm font-medium">{plan}</p>
                <p className="mt-1 text-sm text-muted-foreground">{planDescription(plan)}</p>
                <p className="mt-2 text-sm">{limitLabel(plan)}</p>
                <div className="mt-3 flex items-center gap-2">
                  {isCurrent ? (
                    <Badge variant="secondary">Plano atual</Badge>
                  ) : (
                    <Button variant="outline" size="sm" disabled={plan === "FREE"}>
                      Solicitar upgrade
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uso operacional (ultimos 30 dias)</CardTitle>
          <CardDescription>Metricas de adocao que ajudam a estimar necessidade de upgrade.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-3">
            <li>Uploads: {telemetryByType.get("DOCUMENT_UPLOADED") ?? 0}</li>
            <li>Calculos: {telemetryByType.get("CALCULATION_EXECUTED") ?? 0}</li>
            <li>Cenarios aplicados: {telemetryByType.get("SCENARIO_APPLIED") ?? 0}</li>
            <li>Exports CSV: {telemetryByType.get("EXPORT_CSV") ?? 0}</li>
            <li>Exports XLSX: {telemetryByType.get("EXPORT_XLSX") ?? 0}</li>
            <li>Divergencias justificadas: {telemetryByType.get("DIVERGENCE_JUSTIFIED") ?? 0}</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stripe scaffold</CardTitle>
          <CardDescription>Estrutura pronta para cobranca, sem pagamento real no MVP atual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>- Criacao de Customer por tenant.</p>
          <p>- Checkout/session para upgrade FREE para PRO ou ENTERPRISE.</p>
          <p>- Webhook para sincronizar plano em `Tenant.plan`.</p>
          <p>- Bloqueio automatico de calculo ao exceder limite mensal.</p>
        </CardContent>
      </Card>
    </div>
  );
}
