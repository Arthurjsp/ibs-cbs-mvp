import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureBaselineScenario, ensureDefaultLegacyRuleSet, ensureDefaultRuleSet } from "@/lib/ruleset";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const onboardingSchema = z.object({
  tenantName: z.string().min(2),
  legalName: z.string().min(2),
  cnpj: z.string().optional(),
  uf: z.string().length(2),
  segment: z.string().optional()
});

export default async function OnboardingPage() {
  const user = await requireUser();

  const [tenant, company] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: user.tenantId } }),
    prisma.companyProfile.findFirst({ where: { tenantId: user.tenantId }, orderBy: { createdAt: "asc" } })
  ]);

  async function submit(formData: FormData) {
    "use server";

    const currentUser = await requireUser();
    const parsed = onboardingSchema.parse({
      tenantName: formData.get("tenantName"),
      legalName: formData.get("legalName"),
      cnpj: formData.get("cnpj"),
      uf: String(formData.get("uf") ?? "").toUpperCase(),
      segment: formData.get("segment")
    });

    await prisma.tenant.update({
      where: { id: currentUser.tenantId },
      data: { name: parsed.tenantName }
    });

    const existingCompany = await prisma.companyProfile.findFirst({
      where: { tenantId: currentUser.tenantId }
    });

    if (!existingCompany) {
      await prisma.companyProfile.create({
        data: {
          tenantId: currentUser.tenantId,
          legalName: parsed.legalName,
          cnpj: parsed.cnpj || null,
          uf: parsed.uf,
          segment: parsed.segment || null
        }
      });
    } else {
      await prisma.companyProfile.update({
        where: { id: existingCompany.id },
        data: {
          legalName: parsed.legalName,
          cnpj: parsed.cnpj || null,
          uf: parsed.uf,
          segment: parsed.segment || null
        }
      });
    }

    await ensureDefaultRuleSet(currentUser.tenantId);
    await ensureDefaultLegacyRuleSet(currentUser.tenantId);
    await ensureBaselineScenario(currentUser.tenantId);
    revalidatePath("/dashboard");
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Onboarding da empresa</CardTitle>
          <CardDescription>
            Preencha os dados básicos para ativar o tenant e criar o RuleSet inicial de simulação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={submit} className="grid gap-4 md:grid-cols-2" noValidate>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="tenantName">Nome do tenant</Label>
              <Input id="tenantName" name="tenantName" defaultValue={tenant?.name ?? ""} aria-describedby="tenant-name-help" required />
              <p id="tenant-name-help" className="text-xs text-muted-foreground">
                Nome interno da sua operação no sistema.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="legalName">Razao social</Label>
              <Input id="legalName" name="legalName" defaultValue={company?.legalName ?? ""} aria-describedby="legal-name-help" required />
              <p id="legal-name-help" className="text-xs text-muted-foreground">
                Nome juridico principal da empresa para vincular documentos.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ (opcional)</Label>
              <Input id="cnpj" name="cnpj" defaultValue={company?.cnpj ?? ""} aria-describedby="cnpj-help" />
              <p id="cnpj-help" className="text-xs text-muted-foreground">
                Pode ficar vazio no MVP.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="uf">UF</Label>
              <Input id="uf" name="uf" defaultValue={company?.uf ?? "SP"} maxLength={2} aria-describedby="uf-help" required />
              <p id="uf-help" className="text-xs text-muted-foreground">
                Informe a UF principal da operação (2 letras).
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="segment">Segmento</Label>
              <Input id="segment" name="segment" defaultValue={company?.segment ?? ""} aria-describedby="segment-help" />
              <p id="segment-help" className="text-xs text-muted-foreground">
                Exemplo: industria, varejo, servicos B2B.
              </p>
            </div>

            <div className="md:col-span-2">
              <Button type="submit">Salvar e continuar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Aviso: este produto entrega estimativas para simulação estratégica e não substitui apuração oficial.
      </p>
    </div>
  );
}
