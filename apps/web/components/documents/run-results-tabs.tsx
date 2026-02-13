"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type TabKey = "legacy" | "ibs" | "transition";

export interface RunResultRowView {
  lineNumber: number;
  description: string;
  ncm: string;
  legacy: {
    taxBase: number;
    icmsRate: number;
    icmsValue: number;
    issValue: number;
    totalTax: number;
    unsupported: boolean;
    unsupportedReasons: string[];
  } | null;
  ibs: {
    taxBase: number;
    ibsRate: number;
    cbsRate: number;
    ibsValue: number;
    cbsValue: number;
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

export function RunResultsTabs({ rows, summary }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("transition");

  const tabTitle = useMemo(() => {
    if (activeTab === "legacy") return "Legado (ICMS/ISS)";
    if (activeTab === "ibs") return "IBS/CBS";
    return "Transição (Final)";
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
            IBS/CBS
          </button>
          <button
            type="button"
            className={`rounded-md border px-3 py-1 text-sm ${activeTab === "transition" ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setActiveTab("transition")}
          >
            Transição (Final)
          </button>
        </div>
        <div className="text-sm text-muted-foreground">
          <p className="font-medium">{tabTitle}</p>
          <p>
            Pesos do ano {summary.weights?.year ?? "-"}: legado {(summary.weights?.legacy ?? 0) * 100}% | IBS{" "}
            {(summary.weights?.ibs ?? 0) * 100}%
          </p>
          <p>
            Totais transição: legado ponderado {toMoney(summary.weightedLegacyTaxTotal)} | IBS ponderado{" "}
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
                <TableHead>Descrição</TableHead>
                <TableHead>NCM</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>ICMS</TableHead>
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
                  <TableCell>{toMoney(row.legacy?.issValue)}</TableCell>
                  <TableCell>{toMoney(row.legacy?.totalTax)}</TableCell>
                  <TableCell>
                    {row.legacy?.unsupported
                      ? `Sim (${row.legacy.unsupportedReasons.join(", ") || "sem detalhe"})`
                      : "Não"}
                  </TableCell>
                  <TableCell className="max-w-[360px] text-xs">
                    <pre className="overflow-auto whitespace-pre-wrap rounded bg-muted p-2">
                      {JSON.stringify(row.audit, null, 2)}
                    </pre>
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
                <TableHead>Descrição</TableHead>
                <TableHead>NCM</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>IBS</TableHead>
                <TableHead>CBS</TableHead>
                <TableHead>Crédito</TableHead>
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
                  <TableCell>{row.ibs?.creditEligible ? "Sim" : "Não"}</TableCell>
                  <TableCell className="max-w-[360px] text-xs">
                    <pre className="overflow-auto whitespace-pre-wrap rounded bg-muted p-2">
                      {JSON.stringify(row.audit, null, 2)}
                    </pre>
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
                <TableHead>Descrição</TableHead>
                <TableHead>NCM</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>Legado</TableHead>
                <TableHead>IBS/CBS</TableHead>
                <TableHead>Ponderação</TableHead>
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
                  <TableCell className="max-w-[360px] text-xs">
                    <pre className="overflow-auto whitespace-pre-wrap rounded bg-muted p-2">
                      {JSON.stringify(row.audit, null, 2)}
                    </pre>
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
