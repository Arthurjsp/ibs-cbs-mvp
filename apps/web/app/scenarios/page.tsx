import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildScenarioLabData, normalizeScenarioParams } from "@/lib/scenarios/lab";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScenarioFormFields } from "@/components/scenarios/scenario-form-fields";
import { ScenarioLabPanel } from "@/components/scenarios/scenario-lab-panel";

const scenarioSchema = z.object({
  name: z.string().min(2),
  transitionFactor: z.number().min(0).max(1),
  pricePassThroughPercent: z.number().min(0).max(100),
  overrideIbsRate: z.number().min(0).max(1).optional(),
  overrideCbsRate: z.number().min(0).max(1).optional()
});

function formatOptionalRate(value: number | null) {
  if (value == null) return "padrão da regra";
  return `${(value * 100).toFixed(2)}%`;
}

export default async function ScenariosPage() {
  const user = await requireUser();

  const [scenarios, runs] = await Promise.all([
    prisma.scenario.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.calcRun.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { runAt: "desc" },
      include: {
        summary: true,
        document: {
          select: {
            key: true,
            totalValue: true
          }
        }
      }
    })
  ]);

  const labData = buildScenarioLabData({
    scenarios: scenarios.map((scenario) => ({
      id: scenario.id,
      name: scenario.name,
      createdAt: scenario.createdAt,
      parametersJson: scenario.parametersJson
    })),
    runs: runs.map((run) => ({
      id: run.id,
      runAt: run.runAt,
      scenarioId: run.scenarioId,
      documentKey: run.document.key,
      totalValue: run.document.totalValue,
      summary: run.summary
        ? {
            ibsTotal: run.summary.ibsTotal,
            cbsTotal: run.summary.cbsTotal,
            isTotal: run.summary.isTotal,
            effectiveRate: run.summary.effectiveRate,
            componentsJson: run.summary.componentsJson
          }
        : null
    }))
  });

  const rowById = new Map(labData.rows.map((row) => [row.scenarioId, row]));

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

  async function duplicateScenario(formData: FormData) {
    "use server";
    const currentUser = await requireUser();
    const id = String(formData.get("id") ?? "");

    const scenario = await prisma.scenario.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId
      }
    });

    if (!scenario) return;

    await prisma.scenario.create({
      data: {
        tenantId: currentUser.tenantId,
        name: `${scenario.name} (copia)`,
        parametersJson:
          scenario.parametersJson === null
            ? Prisma.JsonNull
            : (scenario.parametersJson as Prisma.InputJsonValue)
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
        <h1 className="text-2xl font-semibold">Simulador estratégico</h1>
        <p className="text-sm text-muted-foreground">
          Nesta tela você decide qual combinação de transição e repasse protege melhor sua margem.
        </p>
      </div>

      <ScenarioLabPanel data={labData} />

      <Card>
        <CardHeader>
          <CardTitle>Novo cenário</CardTitle>
          <CardDescription>Preencha os campos abaixo para criar uma variação comparável com baseline.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createScenario} className="grid gap-4 md:grid-cols-3" noValidate>
            <ScenarioFormFields />
            <div className="flex items-end md:col-span-3">
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
            <caption className="sr-only">Tabela de cenários com parâmetros, último run e ações</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Parâmetros</TableHead>
                <TableHead>Status de comparação</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenarios.map((scenario) => {
                const row = rowById.get(scenario.id);
                const normalized = normalizeScenarioParams(scenario.parametersJson);

                return (
                  <TableRow key={scenario.id}>
                    <TableCell>{scenario.name}</TableCell>
                    <TableCell>{new Date(scenario.createdAt).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="max-w-[380px] text-xs text-muted-foreground">
                      <p>Transição: {(normalized.transitionFactor * 100).toFixed(0)}% IBS/CBS</p>
                      <p>Repasse: {normalized.pricePassThroughPercent.toFixed(0)}%</p>
                      <p>Override IBS: {formatOptionalRate(normalized.overrideRates.ibsRate)}</p>
                      <p>Override CBS: {formatOptionalRate(normalized.overrideRates.cbsRate)}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row?.latestRun ? (
                        <>
                          <p>Run: {new Date(row.latestRun.runAt).toLocaleString("pt-BR")}</p>
                          <p>Doc: {row.latestRun.documentKey}</p>
                        </>
                      ) : (
                        <p>Sem run. Execute cálculo em um documento.</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <form action={duplicateScenario}>
                          <input type="hidden" name="id" value={scenario.id} />
                          <Button type="submit" variant="outline" size="sm">
                            Duplicar
                          </Button>
                        </form>
                        <form action={deleteScenario}>
                          <input type="hidden" name="id" value={scenario.id} />
                          <Button type="submit" variant="destructive" size="sm">
                            Excluir
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
