import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { DocumentType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getXmlStorageAdapter } from "@/lib/storage";
import { trackTelemetryEvent } from "@/lib/telemetry/track";
import { MAX_NFE_XML_SIZE_BYTES } from "@/lib/xml/constants";
import { NfeValidationError, parseNfeXml } from "@/lib/xml/nfe-parser";

const ACCEPTED_XML_MIME_TYPES = new Set(["text/xml", "application/xml", ""]);

function toUploadErrorResponse(message: string, details: string[] = [], status = 400) {
  return NextResponse.json(
    {
      error: message,
      details
    },
    { status }
  );
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return toUploadErrorResponse("Não autenticado.", [], 401);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const companyProfileIdRaw = formData.get("companyProfileId");

    if (!(file instanceof File)) {
      return toUploadErrorResponse("Arquivo XML obrigatório.", ["Selecione um arquivo XML NF-e antes de enviar."]);
    }

    const fileName = file.name?.toLowerCase() ?? "";
    if (!fileName.endsWith(".xml")) {
      return toUploadErrorResponse("Formato de arquivo inválido.", ["Envie um arquivo com extensão .xml."]);
    }

    if (!ACCEPTED_XML_MIME_TYPES.has(file.type)) {
      return toUploadErrorResponse("Tipo de arquivo não suportado.", [
        "O arquivo deve ser XML (text/xml ou application/xml)."
      ]);
    }

    if (file.size === 0) {
      return toUploadErrorResponse("Arquivo vazio.", ["O XML enviado não possui conteúdo."]);
    }

    if (file.size > MAX_NFE_XML_SIZE_BYTES) {
      return toUploadErrorResponse(
        "Arquivo acima do limite permitido.",
        [`Tamanho máximo: ${Math.round(MAX_NFE_XML_SIZE_BYTES / 1024 / 1024)}MB.`],
        413
      );
    }

    const companyProfileId = typeof companyProfileIdRaw === "string" ? companyProfileIdRaw : "";
    const companyProfile = companyProfileId
      ? await prisma.companyProfile.findFirst({
          where: { id: companyProfileId, tenantId: session.user.tenantId }
        })
      : await prisma.companyProfile.findFirst({
          where: { tenantId: session.user.tenantId },
          orderBy: { createdAt: "asc" }
        });

    if (!companyProfile) {
      return toUploadErrorResponse("Empresa não encontrada para este tenant.", ["Finalize o onboarding antes do upload."]);
    }

    const xmlContent = await file.text();
    const parsed = await parseNfeXml(xmlContent);
    const storage = getXmlStorageAdapter();
    const stored = await storage.saveXml({
      tenantId: session.user.tenantId,
      docKey: parsed.key,
      xmlContent
    });

    const existing = await prisma.document.findFirst({
      where: { tenantId: session.user.tenantId, key: parsed.key }
    });
    if (existing) {
      return toUploadErrorResponse("Documento já importado para este tenant.", ["Use a lista de documentos para consultar a nota existente."], 409);
    }

    const productCatalog = await prisma.productCatalog.findMany({
      where: { tenantId: session.user.tenantId, ncm: { in: parsed.items.map((item) => item.ncm) } }
    });
    const categoryByNcm = new Map(productCatalog.map((entry) => [entry.ncm, entry.category]));

    const document = await prisma.document.create({
      data: {
        tenantId: session.user.tenantId,
        companyProfileId: companyProfile.id,
        type: DocumentType.NFE,
        key: parsed.key,
        issueDate: new Date(parsed.issueDate),
        emitterUf: parsed.emitterUf,
        recipientUf: parsed.recipientUf,
        totalValue: parsed.totalValue,
        rawXmlPath: stored.path,
        items: {
          create: parsed.items.map((item) => ({
            lineNumber: item.lineNumber,
            description: item.description,
            ncm: item.ncm,
            cfop: item.cfop,
            category: categoryByNcm.get(item.ncm) ?? null,
            quantity: item.quantity,
            unitValue: item.unitValue,
            totalValue: item.totalValue
          }))
        }
      }
    });

    await trackTelemetryEvent({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      type: "DOCUMENT_UPLOADED",
      payload: {
        documentId: document.id,
        documentKey: document.key,
        itemCount: parsed.items.length,
        totalValue: parsed.totalValue
      }
    });

    return NextResponse.json({ id: document.id });
  } catch (error) {
    if (error instanceof NfeValidationError) {
      console.warn(
        JSON.stringify({
          component: "upload",
          reason: "nfe_validation",
          message: error.userMessage,
          details: error.details
        })
      );
      return toUploadErrorResponse(error.userMessage, error.details, 400);
    }

    const message = error instanceof Error ? error.message : "Erro inesperado no upload.";
    return toUploadErrorResponse("Falha no processamento do XML.", [message], 500);
  }
}
