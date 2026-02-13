import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldHelp } from "@/components/ui/field-help";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const scenarioSchema = z.object({
  name: z.string().min(2),
  transitionFactor: z.number().min(0).max(1),
  pricePassThroughPercent: z.number().min(0).max(100),
  overrideIbsRate: z.number().min(0).max(1).optional(),
  overrideCbsRate: z.number().min(0).max(1).optional()
});

export default async function ScenariosPage() {
  const user = await requireUser();
  const scenarios = await prisma.scenario.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "desc" }
  });

  async function createScenario(formData: FormData) {
    "use server";
    const currentUser = await requireUser();

    const parsed = scenarioSchema.parse({
      name: formData.get("name"),
      transitionFactor: Number(formData.get("transitionFactor") ?? 1),
      pricePassThroughPercent: Number(formData.get("pricePassThroughPercent") ?? 0),
      overrideIbsRate: formData.get("overrideIbsRate") ? Number(formData.get("overrideIbsRate")) : undefined,
      overrideCbsRate: formData.get("overrideCbsRate") ? Number(formData.get("overrideCbsRate")) : undefined
    });

    await prisma.scenario.create({
      data: {
        tenantId: currentUser.tenantId,
        name: parsed.name,
        parametersJson: {
          transitionFactor: parsed.transitionFactor,
          pricePassThroughPercent: parsed.pricePassThroughPercent,
          overrideRates: {
            ibsRate: parsed.overrideIbsRate,
            cbsRate: parsed.overrideCbsRate
          }
        }
      }
    });

    revalidatePath("/scenarios");
  }

  async function deleteScenario(formData: FormData) {
    "use server";
    const currentUser = await requireUser();
    const id = String(formData.get("id"));
    await prisma.scenario.deleteMany({
      where: {
        id,
        tenantId: currentUser.tenantId
      }
    });
    revalidatePath("/scenarios");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Simulador Estratégico</h1>
        <p className="text-sm text-muted-foreground">Crie cenários para comparar impacto de taxa, transição e repasse.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo cenário</CardTitle>
          <CardDescription>Exemplo: transição 50% com repasse de preço em 50%.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createScenario} className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-3">
              <FieldHelp
                htmlFor="name"
                label="Nome"
                tooltip="Nome interno do cenário para você identificar simulações (ex.: 'Transição 30% + repasse 50%')."
                microcopy="Dica: use um padrão como 'Ano/Transição + Repasse'."
                microcopyId="name-help"
                iconAriaLabel="Ajuda sobre o campo Nome"
              />
              <Input id="name" name="name" aria-describedby="name-help" required />
            </div>
            <div className="space-y-2">
              <FieldHelp
                htmlFor="transitionFactor"
                label="Transition factor (0-1)"
                tooltip="Percentual da transição para o novo regime (IBS/CBS). 0 = 100% regime atual (ICMS/ISS). 1 = 100% IBS/CBS. Valores intermediários simulam a fase de transição."
                microcopy="Ex.: 0.3 = 30% IBS/CBS e 70% ICMS/ISS."
                microcopyId="transition-factor-help"
                iconAriaLabel="Ajuda sobre o campo Transition factor"
              />
              <Input
                id="transitionFactor"
                name="transitionFactor"
                type="number"
                step="0.01"
                defaultValue="1"
                aria-describedby="transition-factor-help"
                required
              />
            </div>
            <div className="space-y-2">
              <FieldHelp
                htmlFor="pricePassThroughPercent"
                label="Repasse (%)"
                tooltip="Percentual do impacto tributário que será repassado ao preço. 0% = empresa absorve tudo. 100% = repasse total ao cliente."
                microcopy="Ex.: 50% = metade do impacto vai para o preço."
                microcopyId="repasse-help"
                iconAriaLabel="Ajuda sobre o campo Repasse"
              />
              <Input
                id="pricePassThroughPercent"
                name="pricePassThroughPercent"
                type="number"
                step="1"
                defaultValue="0"
                aria-describedby="repasse-help"
                required
              />
            </div>
            <div className="space-y-2">
              <FieldHelp
                htmlFor="overrideIbsRate"
                label="Override IBS (opcional)"
                tooltip="Força uma alíquota de IBS diferente da regra padrão, apenas para simulação."
                microcopy="Use número decimal (ex.: 0.17 para 17%). Deixe vazio para usar a regra."
                microcopyId="override-ibs-help"
                iconAriaLabel="Ajuda sobre o campo Override IBS"
              />
              <Input id="overrideIbsRate" name="overrideIbsRate" type="number" step="0.0001" aria-describedby="override-ibs-help" />
            </div>
            <div className="space-y-2">
              <FieldHelp
                htmlFor="overrideCbsRate"
                label="Override CBS (opcional)"
                tooltip="Força uma alíquota de CBS diferente da regra padrão, apenas para simulação."
                microcopy="Use número decimal (ex.: 0.09 para 9%). Deixe vazio para usar a regra."
                microcopyId="override-cbs-help"
                iconAriaLabel="Ajuda sobre o campo Override CBS"
              />
              <Input id="overrideCbsRate" name="overrideCbsRate" type="number" step="0.0001" aria-describedby="override-cbs-help" />
            </div>
            <div className="flex items-end">
              <Button type="submit">Criar cenário</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cenários cadastrados</CardTitle>
          <CardDescription>{scenarios.length} cenário(s) no tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Parâmetros</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenarios.map((scenario) => (
                <TableRow key={scenario.id}>
                  <TableCell>{scenario.name}</TableCell>
                  <TableCell>{new Date(scenario.createdAt).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="max-w-[520px] text-xs">
                    <pre className="overflow-auto whitespace-pre-wrap rounded bg-muted p-2">
                      {JSON.stringify(scenario.parametersJson, null, 2)}
                    </pre>
                  </TableCell>
                  <TableCell>
                    <form action={deleteScenario}>
                      <input type="hidden" name="id" value={scenario.id} />
                      <Button type="submit" variant="destructive" size="sm">
                        Excluir
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
