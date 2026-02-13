import { parseStringPromise } from "xml2js";
import { z } from "zod";
import { MAX_NFE_XML_SIZE_BYTES } from "@/lib/xml/constants";

export class NfeValidationError extends Error {
  constructor(
    public readonly userMessage: string,
    public readonly details: string[] = []
  ) {
    super(userMessage);
    this.name = "NfeValidationError";
  }
}

export const parsedNfeItemSchema = z.object({
  lineNumber: z.number().int().positive(),
  description: z.string().min(1),
  ncm: z.string().min(2),
  cfop: z.string().nullable().optional(),
  quantity: z.number().positive(),
  unitValue: z.number().nonnegative(),
  totalValue: z.number().nonnegative()
});

export const parsedNfeSchema = z.object({
  key: z.string().min(10),
  issueDate: z.string().datetime(),
  emitterUf: z.string().regex(/^[A-Z]{2}$/),
  recipientUf: z.string().regex(/^[A-Z]{2}$/),
  totalValue: z.number().nonnegative(),
  items: z.array(parsedNfeItemSchema).min(1)
});

export type ParsedNfe = z.infer<typeof parsedNfeSchema>;

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function asNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeKey(infNFe: any, parsed: any): string {
  const id = infNFe?.$?.Id as string | undefined;
  if (id?.startsWith("NFe")) return id.slice(3);
  const key = parsed?.nfeProc?.protNFe?.infProt?.chNFe;
  return String(key ?? `NFE-${Date.now()}`);
}

function normalizeUf(value: unknown, fallback: string): string {
  const uf = String(value ?? fallback).toUpperCase().trim();
  return uf || fallback;
}

function parseIssueDate(value: unknown): string {
  const raw = String(value ?? "");
  const parsed = new Date(raw);
  if (!raw || Number.isNaN(parsed.getTime())) {
    throw new NfeValidationError("Não foi possível identificar a data de emissão da NF-e.", [
      "Verifique os campos ide.dhEmi ou ide.dEmi no XML."
    ]);
  }
  return parsed.toISOString();
}

function buildFriendlySchemaErrors(issues: z.ZodIssue[]) {
  return issues.slice(0, 5).map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

export async function parseNfeXml(xmlContent: string): Promise<ParsedNfe> {
  const trimmed = xmlContent.trim();
  if (!trimmed) {
    throw new NfeValidationError("Arquivo XML vazio.", ["Selecione um XML NF-e válido para continuar."]);
  }

  let parsed: any;
  try {
    parsed = await parseStringPromise(trimmed, {
      explicitArray: false,
      mergeAttrs: false
    });
  } catch {
    throw new NfeValidationError("Não foi possível ler o XML enviado.", [
      "Confirme se o arquivo está em formato XML NF-e."
    ]);
  }

  const infNFe = parsed?.nfeProc?.NFe?.infNFe ?? parsed?.NFe?.infNFe;
  if (!infNFe) {
    throw new NfeValidationError("XML NF-e inválido: bloco infNFe não encontrado.", [
      "Use um XML NF-e modelo 55 (layout 4.00)."
    ]);
  }

  const ide = infNFe.ide ?? {};
  const emit = infNFe.emit ?? {};
  const dest = infNFe.dest ?? {};
  const detItems = ensureArray(infNFe.det);

  if (detItems.length === 0) {
    throw new NfeValidationError("Nenhum item encontrado na NF-e.", [
      "A NF-e deve conter ao menos um bloco det/prod."
    ]);
  }

  const items = detItems.map((det: any, index: number) => {
    const prod = det?.prod ?? {};
    return {
      lineNumber: Number(det?.$?.nItem ?? index + 1),
      description: String(prod?.xProd ?? `Item ${index + 1}`).trim(),
      ncm: String(prod?.NCM ?? "00000000").trim(),
      cfop: prod?.CFOP ? String(prod.CFOP).trim() : null,
      quantity: asNumber(prod?.qCom),
      unitValue: asNumber(prod?.vUnCom),
      totalValue: asNumber(prod?.vProd)
    };
  });

  const issueDate = parseIssueDate(ide?.dhEmi ?? ide?.dEmi);
  const emitterUf = normalizeUf(emit?.enderEmit?.UF, "SP");
  const recipientUf = normalizeUf(dest?.enderDest?.UF, emitterUf);
  const totalValue = asNumber(infNFe?.total?.ICMSTot?.vNF) || items.reduce((sum, item) => sum + item.totalValue, 0);
  const key = normalizeKey(infNFe, parsed);

  const result = parsedNfeSchema.safeParse({
    key,
    issueDate,
    emitterUf,
    recipientUf,
    totalValue,
    items
  });

  if (!result.success) {
    throw new NfeValidationError("Não foi possível validar os dados principais da NF-e.", buildFriendlySchemaErrors(result.error.issues));
  }

  return result.data;
}
