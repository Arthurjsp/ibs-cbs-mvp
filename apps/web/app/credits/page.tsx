import { CreditLedgerStatus, TaxType } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function toMoney(value: number) {
  return `R$ ${value.toFixed(2)}`;
}

function formatStatus(status: CreditLedgerStatus) {
  if (status === "PENDING_EXTINCTION") return "Pendente de extincao do debito";
  if (status === "AVAILABLE") return "Disponivel";
  if (status === "CONSUMED") return "Consumido";
  return "Bloqueado";
}

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === "number" ? value : value.toNumber();
}

export default async function CreditsPage() {
  const user = await requireUser();

  const [rows, totalsByTax, totalsByStatus] = await Promise.all([
    prisma.taxCreditLedger.findMany({
      where: { tenantId: user.tenantId },
      include: {
        calcRun: {
          include: {
            document: {
              select: { key: true }
            }
          }
        },
        events: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.taxCreditLedger.groupBy({
      by: ["taxType"],
      where: { tenantId: user.tenantId },
      _sum: { amount: true }
    }),
    prisma.taxCreditLedger.groupBy({
      by: ["status"],
      where: { tenantId: user.tenantId },
      _sum: { amount: true }
    })
  ]);

  const sumByTax = new Map<TaxType, number>(totalsByTax.map((row) => [row.taxType, toNumber(row._sum.amount ?? 0)]));
  const sumByStatus = new Map<CreditLedgerStatus, number>(totalsByStatus.map((row) => [row.status, toNumber(row._sum.amount ?? 0)]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Gestao de creditos IBS/CBS/IS</h1>
        <p className="text-sm text-muted-foreground">
          Nesta tela voce acompanha quanto credito foi gerado, liberado, consumido ou bloqueado.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Totais por tipo de tributo">
        <Card>
          <CardHeader>
            <CardDescription>Total IBS</CardDescription>
            <CardTitle>{toMoney(sumByTax.get("IBS") ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total CBS</CardDescription>
            <CardTitle>{toMoney(sumByTax.get("CBS") ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total IS</CardDescription>
            <CardTitle>{toMoney(sumByTax.get("IS") ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-4" aria-label="Totais por status de credito">
        <Card>
          <CardHeader>
            <CardDescription>Pendente</CardDescription>
            <CardTitle>{toMoney(sumByStatus.get("PENDING_EXTINCTION") ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Disponivel</CardDescription>
            <CardTitle>{toMoney(sumByStatus.get("AVAILABLE") ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Consumido</CardDescription>
            <CardTitle>{toMoney(sumByStatus.get("CONSUMED") ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Bloqueado</CardDescription>
            <CardTitle>{toMoney(sumByStatus.get("BLOCKED") ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Entradas recentes</CardTitle>
          <CardDescription>Ultimas 100 entradas geradas pelos calculos do simulador.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <caption className="sr-only">Tabela de creditos por documento com evento mais recente</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Tributo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Evento recente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{new Date(row.createdAt).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{row.calcRun.document.key}</TableCell>
                  <TableCell>{row.taxType}</TableCell>
                  <TableCell>{toMoney(toNumber(row.amount))}</TableCell>
                  <TableCell>{formatStatus(row.status)}</TableCell>
                  <TableCell>{row.events[0]?.eventType ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
