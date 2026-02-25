export type UploadStepStatus = "pending" | "current" | "completed" | "error";

export interface UploadFlowStep {
  id: string;
  title: string;
  description: string;
  status: UploadStepStatus;
}

export interface UploadFlowInput {
  hasCompany: boolean;
  hasFile: boolean;
  localValidationError: string | null;
  loading: boolean;
}

export function buildUploadFlowSteps(input: UploadFlowInput): UploadFlowStep[] {
  const isValidFile = input.hasFile && !input.localValidationError;

  return [
    {
      id: "company",
      title: "Selecionar empresa",
      description: "Escolha a empresa para vincular o documento no tenant atual.",
      status: input.hasCompany ? "completed" : "current"
    },
    {
      id: "file",
      title: "Anexar XML NF-e",
      description: "Envie um arquivo XML modelo 55 (layout 4.00).",
      status: input.hasFile ? "completed" : input.hasCompany ? "current" : "pending"
    },
    {
      id: "validate",
      title: "Validar conteudo",
      description: "Checa extensao, tamanho e estrutura minima da NF-e.",
      status: input.hasFile ? (input.localValidationError ? "error" : "completed") : "pending"
    },
    {
      id: "import",
      title: "Importar e revisar",
      description: "Persistir documento, normalizar itens e seguir para calculo.",
      status: input.loading ? "current" : isValidFile ? "completed" : "pending"
    }
  ];
}
