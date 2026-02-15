import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getMonthlySimulatedTotals,
  importAssistedAssessment,
  justifyDivergence
} from "@/lib/assisted-assessment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const importSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  source: z.string().max(60).optional(),
  ibsTotal: z.number().nonnegative(),
  cbsTotal: z.number().nonnegative(),
  isTotal: z.number().nonnegative(),
  effectiveRate: z.number().nonnegative().max(1).optional(),
  notes: z.string().max(2000).optional()
});

const justifySchema = z.object({
  divergenceId: z.string().min(1),
  justification: z.string().min(5),
  status: z.enum(["JUSTIFIED", "RESOLVED"]).default("JUSTIFIED")
});

function toCurrency(value: number) {
  return `R$ ${value.toFixed(2)}`;
}

function defaultMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

interface Props {
  searchParams?: { month?: string };
}

export default async function AssistedAssessmentPage({ searchParams }: Props) {
  const user = await requireUser();
  const month = searchParams?.month ?? defaultMonth();

  const [simulated, openCount, snapshots, divergences] = await Promise.all([
    getMonthlySimulatedTotals({
      tenantId: user.tenantId,
      month
    }),
    prisma.assessmentDivergence.count({
      where: { tenantId: user.tenantId, status: "OPEN" }
    }),
    prisma.assistedAssessmentSnapshot.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.assessmentDivergence.findMany({
      where: { tenantId: user.tenantId },
      include: { snapshot: true },
      orderBy: { createdAt: "desc" },
      take: 100
    })
  ]);

  async function importAction(formData: FormData) {
    "use server";
    const currentUser = await requireUser();

    const parsed = importSchema.parse({
      month: String(formData.get("month") ?? ""),
      source: String(formData.get("source") ?? "").trim() || undefined,
      ibsTotal: Number(formData.get("ibsTotal") ?? 0),
      cbsTotal: Number(formData.get("cbsTotal") ?? 0),
      isTotal: Number(formData.get("isTotal") ?? 0),
      effectiveRate: formData.get("effectiveRate") ? Number(formData.get("effectiveRate")) : undefined,
      notes: String(formData.get("notes") ?? "").trim() || undefined
    });

    await importAssistedAssessment({
      tenantId: currentUser.tenantId,
      userId: currentUser.id,
      payload: parsed
    });

    revalidatePath("/assisted-assessment");
    revalidatePath("/dashboard");
  }

  async function justifyAction(formData: FormData) {
    "use server";
    const currentUser = await requireUser();
    const parsed = justifySchema.parse({
      divergenceId: String(formData.get("divergenceId") ?? ""),
      justification: String(formData.get("justification") ?? ""),
      status: String(formData.get("status") ?? "JUSTIFIED")
    });

    await justifyDivergence({
      tenantId: currentUser.tenantId,
      userId: currentUser.id,
      divergenceId: parsed.divergenceId,
      justification: parsed.justification,
      status: parsed.status
    });

    revalidatePath("/assisted-assessment");
    revalidatePath("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Apuracao assistida e divergencias</h1>
        <p className="text-sm text-muted-foreground">
          Importe a previa mensal, reconcilie com o simulado e registre justificativas com evidencia.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader>
            <CardDescription>Mes de referencia</CardDescription>
            <CardTitle>{month}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Simulado IBS</CardDescription>
            <CardTitle>{toCurrency(simulated.ibsTotal)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Simulado CBS</CardDescription>
            <CardTitle>{toCurrency(simulated.cbsTotal)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Simulado IS</CardDescription>
            <CardTitle>{toCurrency(simulated.isTotal)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Divergencias abertas</CardDescription>
            <CardTitle>{openCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Importar previa assistida</CardTitle>
          <CardDescription>
            Informe os totais da previa para comparar com a simulacao e gerar divergencias por metrica.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={importAction} className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="month">Mes (YYYY-MM)</Label>
              <Input id="month" name="month" defaultValue={month} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Fonte</Label>
              <Input id="source" name="source" placeholder="PORTAL_OFICIAL / ERP / MANUAL" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="effectiveRate">Effective rate (opcional)</Label>
              <Input id="effectiveRate" name="effectiveRate" type="number" step="0.000001" placeholder="0.260000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ibsTotal">IBS total assistido</Label>
              <Input id="ibsTotal" name="ibsTotal" type="number" step="0.01" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cbsTotal">CBS total assistido</Label>
              <Input id="cbsTotal" name="cbsTotal" type="number" step="0.01" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="isTotal">IS total assistido</Label>
              <Input id="isTotal" name="isTotal" type="number" step="0.01" required />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="notes">Observacoes</Label>
              <Textarea id="notes" name="notes" placeholder="Contexto da previa, premissas e fonte de evidencia." />
            </div>
            <div className="md:col-span-3">
              <Button type="submit">Importar previa e gerar divergencias</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Divergencias recentes</CardTitle>
          <CardDescription>Classifique e justifique para manter trilha de governanca e auditoria.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Mes</TableHead>
                <TableHead>Metrica</TableHead>
                <TableHead>Simulado</TableHead>
                <TableHead>Assistido</TableHead>
                <TableHead>Delta</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Justificar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {divergences.map((divergence) => (
                <TableRow key={divergence.id}>
                  <TableCell>{new Date(divergence.createdAt).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>
                    {new Intl.DateTimeFormat("pt-BR", { month: "2-digit", year: "numeric" }).format(divergence.monthRef)}
                  </TableCell>
                  <TableCell>{divergence.metric}</TableCell>
                  <TableCell>{Number(divergence.simulatedValue).toFixed(4)}</TableCell>
                  <TableCell>{Number(divergence.assistedValue).toFixed(4)}</TableCell>
                  <TableCell>{Number(divergence.deltaValue).toFixed(4)}</TableCell>
                  <TableCell>{divergence.status}</TableCell>
                  <TableCell>
                    <form action={justifyAction} className="flex flex-wrap gap-2">
                      <input type="hidden" name="divergenceId" value={divergence.id} />
                      <input type="hidden" name="status" value="JUSTIFIED" />
                      <Input
                        name="justification"
                        defaultValue={divergence.justification ?? ""}
                        placeholder="Justificativa objetiva"
                        className="h-8 min-w-[220px]"
                      />
                      <Button type="submit" size="sm" variant="outline">
                        Salvar
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Snapshots importados</CardTitle>
          <CardDescription>{snapshots.length} importacao(oes) recentes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {snapshots.map((snapshot) => (
            <p key={snapshot.id}>
              {new Date(snapshot.createdAt).toLocaleString("pt-BR")} | {snapshot.source} |{" "}
              {new Intl.DateTimeFormat("pt-BR", { month: "2-digit", year: "numeric" }).format(snapshot.monthRef)}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
