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
          <CardTitle>CompanyProfile não encontrado</CardTitle>
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
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Upload XML NF-e</CardTitle>
          <CardDescription>Importe o XML para normalizar itens, NCM e valores no tenant atual.</CardDescription>
        </CardHeader>
        <CardContent>
          <UploadXmlForm companies={companies} />
        </CardContent>
      </Card>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Dicas para evitar erro de importação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>- Verifique se o arquivo é XML NF-e modelo 55.</p>
          <p>- Confirme se existe bloco infNFe e pelo menos um item det/prod.</p>
          <p>- Revise UF do emitente/destinatário e data de emissão.</p>
          <p>- Se o documento já existir, consulte em /documents.</p>
        </CardContent>
      </Card>
    </div>
  );
}

