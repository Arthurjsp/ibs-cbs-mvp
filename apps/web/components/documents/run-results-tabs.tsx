"use client";

import { useId, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function hasUnsupported(audit: unknown) {
  const legacy = asRecord(asRecord(audit)?.engines)?.legacy;
  const unsupported = asRecord(legacy)?.unsupported;
  const reasons = asArray(asRecord(legacy)?.unsupportedReasons);
  return unsupported === true || reasons.length > 0;
}

function hasMatchedIbsRule(audit: unknown) {
  const ibsAudit = asArray(asRecord(asRecord(asRecord(audit)?.engines)?.ibs)?.audit).map(asRecord).filter(Boolean);
  if (ibsAudit.length === 0) return false;
  return ibsAudit.some((entry) => entry?.matched === true);
}

function auditSeverity(audit: unknown, perspective: "legacy" | "ibs" | "transition"): "ALTA" | "MEDIA" | "BAIXA" {
  if (hasUnsupported(audit)) return "ALTA";
  if (perspective === "ibs" && !hasMatchedIbsRule(audit)) return "MEDIA";
  return "BAIXA";
}

function severityClass(severity: "ALTA" | "MEDIA" | "BAIXA") {
  if (severity === "ALTA") return "bg-destructive/10 text-destructive border-destructive/30";
  if (severity === "MEDIA") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}

function AuditTrailCell({ audit, perspective }: { audit: unknown; perspective: "legacy" | "ibs" | "transition" }) {
  const entries = buildReadableAuditEntries(audit, perspective);
  const severity = auditSeverity(audit, perspective);

  return (
    <div className="max-w-[380px] space-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-2">
        <Badge variant="outline" className={severityClass(severity)}>
          Prioridade {severity}
        </Badge>
        <p className="text-muted-foreground">{entries[0] ?? "Sem resumo de auditoria para este item."}</p>
      </div>
      <details className="rounded-md border bg-card p-2">
        <summary className="cursor-pointer text-primary">Ver trilha explicada</summary>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
          {entries.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      </details>
      <details className="rounded-md border bg-card p-2">
        <summary className="cursor-pointer text-muted-foreground">JSON bruto</summary>
        <pre className="mt-1 overflow-auto whitespace-pre-wrap rounded bg-muted p-2">{JSON.stringify(audit, null, 2)}</pre>
      </details>
    </div>
  );
}

export function RunResultsTabs({ rows, summary }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("transition");
  const tabsBaseId = useId();

  const tabTitle = useMemo(() => {
    if (activeTab === "legacy") return "Legado (ICMS/ISS)";
    if (activeTab === "ibs") return "IBS/CBS/IS";
    return "Transição (Final)";
  }, [activeTab]);

  const tabPanelId = (key: TabKey) => `${tabsBaseId}-panel-${key}`;
  const tabButtonId = (key: TabKey) => `${tabsBaseId}-tab-${key}`;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle>Resultado por item e auditoria</CardTitle>

        <div role="tablist" aria-label="Abas de resultado" className="flex flex-wrap gap-2">
          <button
            id={tabButtonId("legacy")}
            role="tab"
            type="button"
            aria-controls={tabPanelId("legacy")}
            aria-selected={activeTab === "legacy"}
            className={`rounded-md border px-3 py-1 text-sm ${activeTab === "legacy" ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setActiveTab("legacy")}
          >
            Legado (ICMS/ISS)
          </button>
          <button
            id={tabButtonId("ibs")}
            role="tab"
            type="button"
            aria-controls={tabPanelId("ibs")}
            aria-selected={activeTab === "ibs"}
            className={`rounded-md border px-3 py-1 text-sm ${activeTab === "ibs" ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setActiveTab("ibs")}
          >
            IBS/CBS/IS
          </button>
          <button
            id={tabButtonId("transition")}
            role="tab"
            type="button"
            aria-controls={tabPanelId("transition")}
            aria-selected={activeTab === "transition"}
            className={`rounded-md border px-3 py-1 text-sm ${activeTab === "transition" ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setActiveTab("transition")}
          >
            Transição (Final)
          </button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p className="font-medium">{tabTitle}</p>
          <p>
            Pesos do ano {summary.weights?.year ?? "-"}: legado {(summary.weights?.legacy ?? 0) * 100}% | IBS/CBS/IS{" "}
            {(summary.weights?.ibs ?? 0) * 100}%
          </p>
          <p>
            Totais transição: legado ponderado {toMoney(summary.weightedLegacyTaxTotal)} | IBS ponderado{" "}
            {toMoney(summary.weightedIbsTaxTotal)} | final {toMoney(summary.transitionTaxTotal)}
          </p>
        </div>
      </CardHeader>

      <CardContent>
        <section
          id={tabPanelId("legacy")}
          role="tabpanel"
          aria-labelledby={tabButtonId("legacy")}
          hidden={activeTab !== "legacy"}
        >
          <Table>
            <caption className="sr-only">Tabela de cálculo legado por item</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Linha</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>NCM</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>ICMS proprio</TableHead>
                <TableHead>DIFAL</TableHead>
                <TableHead>ST básica</TableHead>
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
                  <TableCell>{row.legacy ? `${toRate(row.legacy.icmsRate)} (${toMoney(row.legacy.icmsValue)})` : "-"}</TableCell>
                  <TableCell>{row.legacy ? `${toRate(row.legacy.difalRate)} (${toMoney(row.legacy.difalValue)})` : "-"}</TableCell>
                  <TableCell>
                    {row.legacy
                      ? `${toRate(row.legacy.stRate)} MVA ${toRate(row.legacy.stMva)} (${toMoney(row.legacy.stValue)})`
                      : "-"}
                  </TableCell>
                  <TableCell>{toMoney(row.legacy?.issValue)}</TableCell>
                  <TableCell>{toMoney(row.legacy?.totalTax)}</TableCell>
                  <TableCell>{row.legacy?.unsupported ? `Sim (${row.legacy.unsupportedReasons.join(", ") || "sem detalhe"})` : "Não"}</TableCell>
                  <TableCell>
                    <AuditTrailCell audit={row.audit} perspective="legacy" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section id={tabPanelId("ibs")} role="tabpanel" aria-labelledby={tabButtonId("ibs")} hidden={activeTab !== "ibs"}>
          <Table>
            <caption className="sr-only">Tabela IBS/CBS/IS por item</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Linha</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>NCM</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>IBS</TableHead>
                <TableHead>CBS</TableHead>
                <TableHead>IS</TableHead>
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
                  <TableCell>{row.ibs ? `${toRate(row.ibs.isRate)} (${toMoney(row.ibs.isValue)})` : "-"}</TableCell>
                  <TableCell>{row.ibs?.creditEligible ? "Sim" : "Não"}</TableCell>
                  <TableCell>
                    <AuditTrailCell audit={row.audit} perspective="ibs" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section
          id={tabPanelId("transition")}
          role="tabpanel"
          aria-labelledby={tabButtonId("transition")}
          hidden={activeTab !== "transition"}
        >
          <Table>
            <caption className="sr-only">Tabela de transição final por item</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Linha</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>NCM</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>Legado</TableHead>
                <TableHead>IBS/CBS/IS</TableHead>
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
                  <TableCell>
                    <AuditTrailCell audit={row.audit} perspective="transition" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </CardContent>
    </Card>
  );
}
