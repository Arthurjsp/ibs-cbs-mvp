import { requireUser } from "@/lib/auth";
import { PLAN_LIMITS, checkSimulationLimit } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BillingPage() {
  const user = await requireUser();
  const [tenant, usage] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true, plan: true }
    }),
    checkSimulationLimit(user.tenantId)
  ]);

  const monthRef = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-muted-foreground">Scaffold de cobrança com limite por plano e placeholder Stripe.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Plano atual <Badge>{tenant?.plan ?? "FREE"}</Badge>
          </CardTitle>
          <CardDescription>{tenant?.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Uso em {monthRef}: {usage.used} simulações.
          </p>
          <p>
            Limite do plano: {usage.limit === null ? "Ilimitado" : `${usage.limit} simulações/mês`} | Restante:{" "}
            {usage.remaining === null ? "Ilimitado" : usage.remaining}
          </p>
          <p className="text-muted-foreground">
            Limites configurados: FREE {String(PLAN_LIMITS.FREE)}, PRO {String(PLAN_LIMITS.PRO)}, ENTERPRISE ilimitado.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stripe placeholder</CardTitle>
          <CardDescription>Integração real de cobrança não incluída neste MVP.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Estrutura prevista:</p>
          <p>- Criação de `Customer` por tenant.</p>
          <p>- Checkout/session para upgrade FREE → PRO/ENTERPRISE.</p>
          <p>- Webhook para sincronizar plano no campo `Tenant.plan`.</p>
        </CardContent>
      </Card>
    </div>
  );
}

