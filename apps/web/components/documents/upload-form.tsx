"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_NFE_XML_SIZE_BYTES } from "@/lib/xml/constants";
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Selecione um XML NF-e.");
      setDetails(["Use um arquivo NF-e modelo 55 em formato XML."]);
      return;
    }
    if (localValidationError) {
      setError(localValidationError);
      return;
    }

    setError(null);
    setDetails([]);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    if (companyProfileId) formData.append("companyProfileId", companyProfileId);

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
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md border bg-muted/40 p-4 text-sm">
        <p className="font-medium">Passo a passo do upload</p>
        <p className="text-muted-foreground">1) Selecione a empresa 2) Envie o XML 3) Revise erros 4) Continue para cálculo</p>
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
            Limite: {formatSize(MAX_NFE_XML_SIZE_BYTES)}. Formato esperado: NF-e modelo 55 em XML.
          </p>
          {file ? (
            <p className="text-xs text-muted-foreground">
              Arquivo selecionado: {file.name} ({formatSize(file.size)})
            </p>
          ) : null}
        </div>

        {localValidationError ? <p className="text-sm text-destructive">{localValidationError}</p> : null}

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
          {loading ? "Importando..." : "Importar XML"}
        </Button>
      </form>
    </div>
  );
}
