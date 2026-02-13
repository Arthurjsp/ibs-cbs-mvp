import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function DocumentsPage() {
  const user = await requireUser();
  const documents = await prisma.document.findMany({
    where: { tenantId: user.tenantId },
    include: {
      _count: { select: { items: true, calcRuns: true } }
    },
    orderBy: { issueDate: "desc" }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Documentos</h1>
          <p className="text-sm text-muted-foreground">Notas importadas para cálculo IBS/CBS estimado.</p>
        </div>
        <Link href="/documents/upload" className={buttonVariants()}>
          Upload XML
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de documentos</CardTitle>
          <CardDescription>{documents.length} documento(s) no tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chave</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Runs</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((document) => (
                <TableRow key={document.id}>
                  <TableCell className="font-mono text-xs">{document.key}</TableCell>
                  <TableCell>{new Date(document.issueDate).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>R$ {Number(document.totalValue).toFixed(2)}</TableCell>
                  <TableCell>{document._count.items}</TableCell>
                  <TableCell>{document._count.calcRuns}</TableCell>
                  <TableCell>
                    <Link href={`/documents/${document.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                      Ver detalhe
                    </Link>
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
