import { TelemetryEventType, TenantPlan } from "@prisma/client";
import { requireRoles } from "@/lib/auth";
import { PLAN_LIMITS, checkSimulationLimit } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import {
  isBillableSubscriptionStatus,
  isStripeConfigured,
  isStripePortalConfigured,
  reconcileTenantStripeState
} from "@/lib/stripe-billing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const planOrder: TenantPlan[] = ["FREE", "PRO", "ENTERPRISE"];

function limitLabel(plan: TenantPlan) {
  const limit = PLAN_LIMITS[plan];
  return limit === null ? "Ilimitado" : `${limit} simulações/mês`;
}

function planDescription(plan: TenantPlan) {
  if (plan === "FREE") return "Ideal para validação inicial de cenários.";
  if (plan === "PRO") return "Operação recorrente com time fiscal e financeiro.";
  return "Escala multiárea com alto volume e governança.";
}

function usageTone(usagePercent: number) {
  if (usagePercent >= 100) return "bg-destructive";
  if (usagePercent >= 80) return "bg-amber-500";
  return "bg-emerald-600";
}

function usageStatusText(usagePercent: number) {
  if (usagePercent >= 100) return "Limite atingido";
  if (usagePercent >= 80) return "Próximo do limite";
  return "Dentro do limite";
}

function subscriptionStatusLabel(status: string | null | undefined) {
  if (!status) return "Sem assinatura ativa";
  const map: Record<string, string> = {
    active: "Ativa",
    trialing: "Em trial",
    past_due: "Pagamento pendente",
    canceled: "Cancelada",
    unpaid: "Não paga",
    incomplete: "Incompleta",
    incomplete_expired: "Expirada"
  };
  return map[status] ?? status;
}

function reconcileMessage(state: string | undefined, source: "manual" | "auto") {
  if (!state) return null;

  const prefix = source === "manual" ? "Sincronização concluída" : "Sincronização automática";
  const map: Record<string, string> = {
    synced_billable: `${prefix}: assinatura ativa localizada no Stripe.`,
    synced_non_billable: `${prefix}: assinatura localizada com status não faturável.`,
    reset_to_free: `${prefix}: não foi encontrada assinatura válida; plano ajustado para FREE.`,
    no_customer_no_change: `${prefix}: tenant sem customer Stripe e sem alterações.`,
    no_subscription_no_change: `${prefix}: nenhum ajuste necessário.`,
    stripe_not_configured: `${prefix}: Stripe não configurado no ambiente.`,
    tenant_not_found: `${prefix}: tenant não encontrado.`,
    no_subscription_reset: `${prefix}: sem assinatura no Stripe; plano ajustado para FREE.`
  };

  return map[state] ?? `${prefix}: ${state}.`;
}

type TenantBillingState = {
  name: string;
  plan: TenantPlan;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string | null;
  stripeCurrentPeriodEnd: Date | null;
};

function isTenantStripeInconsistent(tenant: TenantBillingState | null) {
  if (!tenant) return false;

  const isPaidPlan = tenant.plan !== "FREE";
  const hasBillableStatus = isBillableSubscriptionStatus(tenant.stripeSubscriptionStatus);
  const hasSubscriptionId = Boolean(tenant.stripeSubscriptionId);

  if (isPaidPlan && (!hasSubscriptionId || !hasBillableStatus)) return true;
  if (!isPaidPlan && hasSubscriptionId && hasBillableStatus) return true;

  return false;
}

interface Props {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function BillingPage({ searchParams }: Props) {
  const user = await requireRoles(["ADMIN", "CFO"]);
  const monthRef = new Date();
  const telemetryFrom = new Date(monthRef.getTime() - 30 * 24 * 60 * 60 * 1000);
  const stripeCheckoutReady = isStripeConfigured();
  const stripePortalReady = isStripePortalConfigured();

  const tenantSelect = {
    name: true,
    plan: true,
    stripeCustomerId: true,
    stripeSubscriptionId: true,
    stripeSubscriptionStatus: true,
    stripeCurrentPeriodEnd: true
  } as const;

  let tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: tenantSelect
  });

  let autoReconcileState: string | null = null;
  if (stripePortalReady && isTenantStripeInconsistent(tenant)) {
    const reconcileResult = await reconcileTenantStripeState(user.tenantId);
    autoReconcileState = reconcileResult.state;
    tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: tenantSelect
    });
  }

  const [usage, telemetryCounts] = await Promise.all([
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
  const checkoutStatus = typeof searchParams?.checkout === "string" ? searchParams.checkout : undefined;
  const manualReconcileStatus = typeof searchParams?.reconcile === "string" ? searchParams.reconcile : undefined;
  const stillInconsistent = isTenantStripeInconsistent(tenant);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing e consumo</h1>
        <p className="text-sm text-muted-foreground">Nesta tela você decide quando mudar de plano com base no uso real do mês.</p>
      </div>

      {checkoutStatus === "success" ? (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
          Checkout concluído. Aguarde alguns segundos para sincronização via webhook.
        </div>
      ) : null}

      {checkoutStatus === "cancel" ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="status">
          Checkout cancelado. Nenhuma alteração de plano foi aplicada.
        </div>
      ) : null}

      {manualReconcileStatus ? (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
          {reconcileMessage(manualReconcileStatus, "manual")}
        </div>
      ) : null}

      {autoReconcileState ? (
        <div className="rounded-md border border-sky-300 bg-sky-50 p-3 text-sm text-sky-900" role="status">
          {reconcileMessage(autoReconcileState, "auto")}
        </div>
      ) : null}

      {!stripePortalReady ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
          Stripe não configurado neste ambiente. Defina `STRIPE_SECRET_KEY` para habilitar portal e checkout.
        </div>
      ) : null}

      {stripePortalReady && !stripeCheckoutReady ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
          Checkout incompleto. Defina `STRIPE_PRICE_PRO` e `STRIPE_PRICE_ENTERPRISE` para habilitar upgrade de plano.
        </div>
      ) : null}

      {stillInconsistent ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm" role="alert">
          Estado inconsistente entre plano local e assinatura Stripe. Sincronize agora para regularizar o tenant.
          <div className="mt-2">
            <form action="/api/billing/reconcile" method="POST">
              <Button type="submit" variant="outline" size="sm" disabled={!stripePortalReady}>
                Sincronizar assinatura agora
              </Button>
            </form>
          </div>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Plano atual <Badge>{tenant?.plan ?? "FREE"}</Badge>
          </CardTitle>
          <CardDescription>{tenant?.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Uso em {monthLabel}: {usage.used} simulações de {usage.limit === null ? "ilimitado" : usage.limit}.
          </p>

          {usage.limit !== null ? (
            <div className="space-y-1" aria-label="Barra de consumo mensal">
              <div className="h-2 rounded bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={usagePercent}>
                <div className={`h-2 rounded ${usageTone(usagePercent)}`} style={{ width: `${usagePercent}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">
                {usageStatusText(usagePercent)} | {usage.remaining} simulações restantes no ciclo atual.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Plano sem limite de simulações mensais.</p>
          )}

          {!usage.allowed ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
              Limite mensal atingido. Faça upgrade para continuar calculando novos documentos.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assinatura Stripe</CardTitle>
          <CardDescription>Status da cobrança e sincronização do plano.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Status: <span className="font-medium">{subscriptionStatusLabel(tenant?.stripeSubscriptionStatus)}</span>
          </p>
          <p>
            Customer: <span className="font-mono text-xs">{tenant?.stripeCustomerId ?? "não criado"}</span>
          </p>
          <p>
            Subscription: <span className="font-mono text-xs">{tenant?.stripeSubscriptionId ?? "sem assinatura"}</span>
          </p>
          <p>
            Próximo ciclo:{" "}
            <span className="font-medium">
              {tenant?.stripeCurrentPeriodEnd ? new Date(tenant.stripeCurrentPeriodEnd).toLocaleDateString("pt-BR") : "-"}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <form action="/api/billing/portal" method="POST">
              <Button type="submit" variant="outline" disabled={!stripePortalReady}>
                Gerenciar assinatura no Stripe
              </Button>
            </form>
            <form action="/api/billing/reconcile" method="POST">
              <Button type="submit" variant="outline" disabled={!stripePortalReady}>
                Sincronizar agora
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Planos disponíveis</CardTitle>
          <CardDescription>Upgrade por checkout Stripe e sincronização automática via webhook.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {planOrder.map((plan) => {
            const isCurrent = (tenant?.plan ?? "FREE") === plan;
            const isPaid = plan !== "FREE";
            return (
              <div key={plan} className={`rounded-md border p-4 ${isCurrent ? "border-primary" : ""}`}>
                <p className="text-sm font-medium">{plan}</p>
                <p className="mt-1 text-sm text-muted-foreground">{planDescription(plan)}</p>
                <p className="mt-2 text-sm">{limitLabel(plan)}</p>
                <div className="mt-3 flex items-center gap-2">
                  {isCurrent ? (
                    <Badge variant="secondary">Plano atual</Badge>
                  ) : isPaid ? (
                    <form action="/api/billing/checkout" method="POST">
                      <input type="hidden" name="plan" value={plan} />
                      <Button type="submit" variant="outline" size="sm" disabled={!stripeCheckoutReady}>
                        Assinar {plan}
                      </Button>
                    </form>
                  ) : (
                    <Badge variant="outline">Sem cobrança</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uso operacional (últimos 30 dias)</CardTitle>
          <CardDescription>Métricas de adoção que ajudam a estimar necessidade de upgrade.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-3">
            <li>Uploads: {telemetryByType.get("DOCUMENT_UPLOADED") ?? 0}</li>
            <li>Cálculos: {telemetryByType.get("CALCULATION_EXECUTED") ?? 0}</li>
            <li>Cenários aplicados: {telemetryByType.get("SCENARIO_APPLIED") ?? 0}</li>
            <li>Exports CSV: {telemetryByType.get("EXPORT_CSV") ?? 0}</li>
            <li>Exports XLSX: {telemetryByType.get("EXPORT_XLSX") ?? 0}</li>
            <li>Divergências justificadas: {telemetryByType.get("DIVERGENCE_JUSTIFIED") ?? 0}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
