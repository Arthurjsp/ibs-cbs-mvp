"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Circle, CircleDashed } from "lucide-react";
import { MAX_NFE_XML_SIZE_BYTES } from "@/lib/xml/constants";
import { buildUploadFlowSteps, UploadFlowStep, UploadStepStatus } from "@/lib/upload/flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CompanyOption {
  id: string;
  legalName: string;
}

interface UploadResponsePayload {
  id?: string;
  error?: string;
  details?: string[];
}

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function stepTone(status: UploadStepStatus) {
  if (status === "completed") return "text-emerald-700";
  if (status === "error") return "text-destructive";
  if (status === "current") return "text-foreground";
  return "text-muted-foreground";
}

function StepIcon({ status }: { status: UploadStepStatus }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />;
  if (status === "error") return <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />;
  if (status === "current") return <CircleDashed className="h-4 w-4 text-primary" aria-hidden="true" />;
  return <Circle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
}

function UploadStepRow({ step, index }: { step: UploadFlowStep; index: number }) {
  return (
    <li className="flex items-start gap-3 rounded-md bg-card px-3 py-2">
      <div className="mt-0.5 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{index + 1}</span>
        <StepIcon status={step.status} />
      </div>
      <div className="space-y-0.5">
        <p className={`text-sm font-medium ${stepTone(step.status)}`}>{step.title}</p>
        <p className="text-xs text-muted-foreground">{step.description}</p>
      </div>
    </li>
  );
}

export function UploadXmlForm({ companies }: { companies: CompanyOption[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [companyProfileId, setCompanyProfileId] = useState(companies[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const localValidationError = useMemo(() => {
    if (!file) return null;
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xml")) return "O arquivo precisa ter extensão .xml.";
    if (file.size > MAX_NFE_XML_SIZE_BYTES) {
      return `O arquivo excede o limite de ${formatSize(MAX_NFE_XML_SIZE_BYTES)}.`;
    }
    if (file.size === 0) return "O arquivo está vazio.";
    return null;
  }, [file]);

  const steps = buildUploadFlowSteps({
    hasCompany: Boolean(companyProfileId),
    hasFile: Boolean(file),
    localValidationError,
    loading
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Selecione um XML NF-e.");
      setDetails(["Use um arquivo NF-e modelo 55 em formato XML."]);
      return;
    }
    if (localValidationError) {
      setError(localValidationError);
      setDetails([]);
      return;
    }

    setError(null);
    setDetails([]);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    if (companyProfileId) formData.append("companyProfileId", companyProfileId);

    try {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as UploadResponsePayload;
      setLoading(false);

      if (!response.ok || !payload.id) {
        setError(payload.error ?? "Falha ao importar XML.");
        setDetails(payload.details ?? []);
        return;
      }

      router.push(`/documents/${payload.id}`);
      router.refresh();
    } catch {
      setLoading(false);
      setError("Falha de conexão ao enviar o XML.");
      setDetails(["Verifique sua conexão e tente novamente."]);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md border bg-muted/40 p-4">
        <p className="text-sm font-medium">Fluxo guiado de importação</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Acompanhe as etapas abaixo para concluir o upload e seguir para o cálculo em poucos minutos.
        </p>
        <ol className="mt-3 space-y-2">
          {steps.map((step, index) => (
            <UploadStepRow key={step.id} step={step} index={index} />
          ))}
        </ol>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="company">Empresa</Label>
          <select
            id="company"
            className="h-10 w-full rounded-md border bg-card px-3 text-sm"
            value={companyProfileId}
            onChange={(e) => setCompanyProfileId(e.target.value)}
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.legalName}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">O documento será vinculado a esta empresa dentro do tenant ativo.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="file">XML NF-e</Label>
          <Input
            id="file"
            type="file"
            accept=".xml,text/xml,application/xml"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Limite: {formatSize(MAX_NFE_XML_SIZE_BYTES)}. Formato esperado: NF-e modelo 55 em XML (layout 4.00).
          </p>
          {file ? (
            <p className="text-xs text-muted-foreground">
              Arquivo selecionado: {file.name} ({formatSize(file.size)})
            </p>
          ) : null}
        </div>

        {localValidationError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="font-medium text-destructive">Validação local: {localValidationError}</p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="font-medium text-destructive">{error}</p>
            {details.length > 0 ? (
              <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                {details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <Button type="submit" disabled={loading || Boolean(localValidationError)}>
          {loading ? "Importando XML..." : "Importar XML e abrir documento"}
        </Button>
      </form>
    </div>
  );
}
