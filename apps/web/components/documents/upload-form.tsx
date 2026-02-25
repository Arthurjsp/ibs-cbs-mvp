"use client";

import Link from "next/link";
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

interface BatchFileResult {
  fileName: string;
  status: "success" | "error";
  documentId?: string;
  error?: string;
}

const MAX_BATCH_FILES = 20;

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

function validateFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xml")) return "precisa ter extensão .xml";
  if (file.size > MAX_NFE_XML_SIZE_BYTES) {
    return `excede o limite de ${formatSize(MAX_NFE_XML_SIZE_BYTES)}`;
  }
  if (file.size === 0) return "está vazio";
  return null;
}

export function UploadXmlForm({ companies }: { companies: CompanyOption[] }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [companyProfileId, setCompanyProfileId] = useState(companies[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [batchResults, setBatchResults] = useState<BatchFileResult[]>([]);

  const localValidationError = useMemo(() => {
    if (files.length === 0) return null;
    if (files.length > MAX_BATCH_FILES) return `Selecione no máximo ${MAX_BATCH_FILES} arquivos por lote.`;

    for (const file of files) {
      const fileError = validateFile(file);
      if (fileError) return `O arquivo ${file.name} ${fileError}.`;
    }
    return null;
  }, [files]);

  const steps = buildUploadFlowSteps({
    hasCompany: Boolean(companyProfileId),
    hasFile: files.length > 0,
    localValidationError,
    loading
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (files.length === 0) {
      setError("Selecione ao menos um XML NF-e.");
      setDetails(["Você pode enviar um arquivo único ou um lote com múltiplos XMLs."]);
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
    setBatchResults([]);
    setProgress({ current: 0, total: files.length });

    const results: BatchFileResult[] = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      setProgress({ current: index + 1, total: files.length });

      const formData = new FormData();
      formData.append("file", file);
      if (companyProfileId) formData.append("companyProfileId", companyProfileId);

      try {
        const response = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData
        });

        const payload = (await response.json()) as UploadResponsePayload;
        if (!response.ok || !payload.id) {
          results.push({
            fileName: file.name,
            status: "error",
            error: payload.error ?? "Falha ao importar XML."
          });
          continue;
        }

        results.push({
          fileName: file.name,
          status: "success",
          documentId: payload.id
        });
      } catch {
        results.push({
          fileName: file.name,
          status: "error",
          error: "Falha de conexão ao enviar o XML."
        });
      }
    }

    setLoading(false);
    setProgress(null);
    setBatchResults(results);

    const successResults = results.filter((result) => result.status === "success");
    const errorResults = results.filter((result) => result.status === "error");

    if (successResults.length === 1 && errorResults.length === 0 && files.length === 1) {
      router.push(`/documents/${successResults[0].documentId}`);
      router.refresh();
      return;
    }

    if (successResults.length > 0 && errorResults.length > 0) {
      setError(`Lote finalizado com parcial: ${successResults.length} sucesso(s) e ${errorResults.length} erro(s).`);
      setDetails(errorResults.slice(0, 5).map((result) => `${result.fileName}: ${result.error}`));
      router.refresh();
      return;
    }

    if (successResults.length > 0) {
      setError(null);
      setDetails([`${successResults.length} arquivo(s) importado(s) com sucesso.`]);
      router.refresh();
      return;
    }

    setError("Nenhum arquivo foi importado.");
    setDetails(errorResults.slice(0, 5).map((result) => `${result.fileName}: ${result.error}`));
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md border bg-muted/40 p-4">
        <p className="text-sm font-medium">Fluxo guiado de importação</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Acompanhe as etapas abaixo para concluir o upload e seguir para o cálculo em poucos minutos.
        </p>
        <ol className="mt-3 space-y-2" aria-label="Etapas de upload e validação">
          {steps.map((step, index) => (
            <UploadStepRow key={step.id} step={step} index={index} />
          ))}
        </ol>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor="company">Empresa</Label>
          <select
            id="company"
            className="h-10 w-full rounded-md border bg-card px-3 text-sm"
            value={companyProfileId}
            onChange={(e) => setCompanyProfileId(e.target.value)}
            aria-describedby="company-help"
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.legalName}
              </option>
            ))}
          </select>
          <p id="company-help" className="text-xs text-muted-foreground">
            O documento será vinculado a esta empresa dentro do tenant ativo.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="file">XML NF-e (um ou vários arquivos)</Label>
          <Input
            id="file"
            type="file"
            accept=".xml,text/xml,application/xml"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            aria-describedby="file-help"
            required
          />
          <p id="file-help" className="text-xs text-muted-foreground">
            Limite: {formatSize(MAX_NFE_XML_SIZE_BYTES)} por arquivo. Máximo de {MAX_BATCH_FILES} arquivos por lote.
          </p>
          {files.length > 0 ? (
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                {files.length} arquivo(s) selecionado(s) | tamanho total: {formatSize(files.reduce((acc, file) => acc + file.size, 0))}
              </p>
              <ul className="list-disc pl-5">
                {files.slice(0, 5).map((file) => (
                  <li key={`${file.name}-${file.size}`}>
                    {file.name} ({formatSize(file.size)})
                  </li>
                ))}
                {files.length > 5 ? <li>... e mais {files.length - 5} arquivo(s)</li> : null}
              </ul>
            </div>
          ) : null}
        </div>

        {progress ? (
          <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground" aria-live="polite">
            Importando lote: arquivo {progress.current} de {progress.total}.
          </div>
        ) : null}

        {localValidationError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm" role="alert" aria-live="assertive">
            <p className="font-medium text-destructive">Validação local: {localValidationError}</p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm" role="alert" aria-live="assertive">
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
          {loading ? "Importando lote..." : files.length > 1 ? "Importar lote XML" : "Importar XML e abrir documento"}
        </Button>
      </form>

      {batchResults.length > 0 ? (
        <div className="rounded-md border p-4">
          <p className="text-sm font-medium">Resumo do lote</p>
          <ul className="mt-2 space-y-1 text-sm">
            {batchResults.map((result) => (
              <li key={`${result.fileName}-${result.documentId ?? result.error}`} className="flex flex-wrap items-center gap-2">
                <span className={result.status === "success" ? "text-emerald-700" : "text-destructive"}>
                  {result.status === "success" ? "OK" : "ERRO"}
                </span>
                <span>{result.fileName}</span>
                {result.documentId ? (
                  <Link href={`/documents/${result.documentId}`} className="text-primary underline underline-offset-2">
                    abrir documento
                  </Link>
                ) : null}
                {result.error ? <span className="text-muted-foreground">- {result.error}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
