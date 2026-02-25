import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { UploadXmlForm } from "@/components/documents/upload-form";

export default async function UploadDocumentPage() {
  const user = await requireUser();
  const companies = await prisma.companyProfile.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "asc" },
    select: { id: true, legalName: true }
  });

  if (companies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>CompanyProfile nao encontrado</CardTitle>
          <CardDescription>Finalize o onboarding para cadastrar a empresa antes do upload.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/onboarding" className={buttonVariants()}>
            Ir para onboarding
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Upload XML NF-e</CardTitle>
          <CardDescription>
            Nesta tela voce decide qual NF-e importar para iniciar o calculo com trilha de auditoria.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadXmlForm companies={companies} />
        </CardContent>
      </Card>

      <div className="grid max-w-4xl gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>O que acontece apos o upload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>1) O documento e os itens sao salvos no tenant.</p>
            <p>2) O XML bruto fica armazenado para rastreabilidade.</p>
            <p>3) Voce segue para a tela de calculo do documento.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checklist de validacao</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>- Arquivo XML NF-e modelo 55 (layout 4.00).</p>
            <p>- Bloco `infNFe` e ao menos um item `det/prod`.</p>
            <p>- UF emitente/destinatario e data de emissao preenchidas.</p>
            <p>- Chave ainda nao importada no mesmo tenant.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
