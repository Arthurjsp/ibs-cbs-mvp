"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildReadableAuditEntries } from "@/lib/documents/audit-readable";

type TabKey = "legacy" | "ibs" | "transition";

export interface RunResultRowView {
  lineNumber: number;
  description: string;
  ncm: string;
  legacy: {
    taxBase: number;
    stBase: number;
    icmsRate: number;
    icmsValue: number;
    stRate: number;
    stMva: number;
    stValue: number;
    difalRate: number;
    difalValue: number;
    issValue: number;
    totalTax: number;
    unsupported: boolean;
    unsupportedReasons: string[];
  } | null;
  ibs: {
    taxBase: number;
    ibsRate: number;
    cbsRate: number;
    isRate: number;
    ibsValue: number;
    cbsValue: number;
    isValue: number;
    creditEligible: boolean;
  } | null;
  transition: {
    taxBase: number;
    legacyTax: number;
    ibsTax: number;
    weightedLegacyTax: number;
    weightedIbsTax: number;
    totalTax: number;
    effectiveRate: number;
  } | null;
  weights: {
    year: number;
    legacy: number;
    ibs: number;
  } | null;
  audit: unknown;
}

export interface RunSummaryView {
  legacyTaxTotal?: number;
  ibsTaxTotal?: number;
  weightedLegacyTaxTotal?: number;
  weightedIbsTaxTotal?: number;
  transitionTaxTotal?: number;
  transitionEffectiveRate?: number;
  weights?: {
    year: number;
    legacy: number;
    ibs: number;
  } | null;
}

interface Props {
  rows: RunResultRowView[];
  summary: RunSummaryView;
}

function toMoney(value: number | undefined) {
  if (value === undefined) return "-";
  return `R$ ${value.toFixed(2)}`;
}

function toRate(value: number | undefined, places = 4) {
  if (value === undefined) return "-";
  return value.toFixed(places);
}

function AuditTrailCell({ audit, perspective }: { audit: unknown; perspective: "legacy" | "ibs" | "transition" }) {
  const entries = buildReadableAuditEntries(audit, perspective);

  return (
    <div className="max-w-[360px] text-xs">
      <details>
        <summary className="cursor-pointer text-primary">Ver trilha explicada</summary>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
          {entries.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      </details>
      <details className="mt-2">
        <summary className="cursor-pointer text-muted-foreground">JSON bruto</summary>
        <pre className="mt-1 overflow-auto whitespace-pre-wrap rounded bg-muted p-2">{JSON.stringify(audit, null, 2)}</pre>
      </details>
    </div>
  );
}

export function RunResultsTabs({ rows, summary }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("transition");

  const tabTitle = useMemo(() => {
    if (activeTab === "legacy") return "Legado (ICMS/ISS)";
    if (activeTab === "ibs") return "IBS/CBS/IS";
    return "Transicao (Final)";
  }, [activeTab]);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle>Resultado por item + auditoria</CardTitle>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-md border px-3 py-1 text-sm ${activeTab === "legacy" ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setActiveTab("legacy")}
          >
            Legado (ICMS/ISS)
          </button>
          <button
            type="button"
            className={`rounded-md border px-3 py-1 text-sm ${activeTab === "ibs" ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setActiveTab("ibs")}
          >
            IBS/CBS/IS
          </button>
          <button
            type="button"
            className={`rounded-md border px-3 py-1 text-sm ${activeTab === "transition" ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setActiveTab("transition")}
          >
            Transicao (Final)
          </button>
        </div>
        <div className="text-sm text-muted-foreground">
          <p className="font-medium">{tabTitle}</p>
          <p>
            Pesos do ano {summary.weights?.year ?? "-"}: legado {(summary.weights?.legacy ?? 0) * 100}% | IBS/CBS/IS{" "}
            {(summary.weights?.ibs ?? 0) * 100}%
          </p>
          <p>
            Totais transicao: legado ponderado {toMoney(summary.weightedLegacyTaxTotal)} | IBS ponderado{" "}
            {toMoney(summary.weightedIbsTaxTotal)} | final {toMoney(summary.transitionTaxTotal)}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {activeTab === "legacy" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Linha</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead>NCM</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>ICMS proprio</TableHead>
                <TableHead>DIFAL</TableHead>
                <TableHead>ST basica</TableHead>
                <TableHead>ISS</TableHead>
                <TableHead>Total legado</TableHead>
                <TableHead>Unsupported</TableHead>
                <TableHead>Auditoria</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.lineNumber}-${row.ncm}`}>
                  <TableCell>{row.lineNumber}</TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell>{row.ncm}</TableCell>
                  <TableCell>{toMoney(row.legacy?.taxBase)}</TableCell>
                  <TableCell>
                    {row.legacy ? `${toRate(row.legacy.icmsRate)} (${toMoney(row.legacy.icmsValue)})` : "-"}
                  </TableCell>
                  <TableCell>
                    {row.legacy ? `${toRate(row.legacy.difalRate)} (${toMoney(row.legacy.difalValue)})` : "-"}
                  </TableCell>
                  <TableCell>
                    {row.legacy
                      ? `${toRate(row.legacy.stRate)} MVA ${toRate(row.legacy.stMva)} (${toMoney(row.legacy.stValue)})`
                      : "-"}
                  </TableCell>
                  <TableCell>{toMoney(row.legacy?.issValue)}</TableCell>
                  <TableCell>{toMoney(row.legacy?.totalTax)}</TableCell>
                  <TableCell>
                    {row.legacy?.unsupported ? `Sim (${row.legacy.unsupportedReasons.join(", ") || "sem detalhe"})` : "Nao"}
                  </TableCell>
                  <TableCell>
                    <AuditTrailCell audit={row.audit} perspective="legacy" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}

        {activeTab === "ibs" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Linha</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead>NCM</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>IBS</TableHead>
                <TableHead>CBS</TableHead>
                <TableHead>IS</TableHead>
                <TableHead>Credito</TableHead>
                <TableHead>Auditoria</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.lineNumber}-${row.ncm}`}>
                  <TableCell>{row.lineNumber}</TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell>{row.ncm}</TableCell>
                  <TableCell>{toMoney(row.ibs?.taxBase)}</TableCell>
                  <TableCell>{row.ibs ? `${toRate(row.ibs.ibsRate)} (${toMoney(row.ibs.ibsValue)})` : "-"}</TableCell>
                  <TableCell>{row.ibs ? `${toRate(row.ibs.cbsRate)} (${toMoney(row.ibs.cbsValue)})` : "-"}</TableCell>
                  <TableCell>{row.ibs ? `${toRate(row.ibs.isRate)} (${toMoney(row.ibs.isValue)})` : "-"}</TableCell>
                  <TableCell>{row.ibs?.creditEligible ? "Sim" : "Nao"}</TableCell>
                  <TableCell>
                    <AuditTrailCell audit={row.audit} perspective="ibs" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}

        {activeTab === "transition" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Linha</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead>NCM</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>Legado</TableHead>
                <TableHead>IBS/CBS/IS</TableHead>
                <TableHead>Ponderacao</TableHead>
                <TableHead>Total final</TableHead>
                <TableHead>Effective rate</TableHead>
                <TableHead>Auditoria</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.lineNumber}-${row.ncm}`}>
                  <TableCell>{row.lineNumber}</TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell>{row.ncm}</TableCell>
                  <TableCell>{toMoney(row.transition?.taxBase)}</TableCell>
                  <TableCell>{toMoney(row.transition?.legacyTax)}</TableCell>
                  <TableCell>{toMoney(row.transition?.ibsTax)}</TableCell>
                  <TableCell>
                    {row.transition && row.weights
                      ? `${toMoney(row.transition.weightedLegacyTax)} + ${toMoney(row.transition.weightedIbsTax)}`
                      : "-"}
                  </TableCell>
                  <TableCell>{toMoney(row.transition?.totalTax)}</TableCell>
                  <TableCell>{row.transition ? `${(row.transition.effectiveRate * 100).toFixed(2)}%` : "-"}</TableCell>
                  <TableCell>
                    <AuditTrailCell audit={row.audit} perspective="transition" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}
