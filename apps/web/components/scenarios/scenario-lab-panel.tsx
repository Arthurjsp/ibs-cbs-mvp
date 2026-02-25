"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ScenarioLabData, ScenarioLabRowSnapshot } from "@/lib/scenarios/lab";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatCurrency(value: number | null) {
  if (value == null) return "--";
  return currencyFormatter.format(value);
}

function formatPercent(value: number | null) {
  if (value == null) return "--";
  return `${value.toFixed(2)}%`;
}

function deltaTone(value: number | null) {
  if (value == null) return "text-muted-foreground";
  if (value > 0) return "text-destructive";
  if (value < 0) return "text-emerald-700";
  return "text-muted-foreground";
}

function deltaLabel(value: number | null, higherIsRisk: boolean) {
  if (value == null) return "Sem base";
  if (value === 0) return "Sem variação";

  if (value > 0) {
    return higherIsRisk ? "Acima da baseline (piora)" : "Acima da baseline (melhora)";
  }

  return higherIsRisk ? "Abaixo da baseline (melhora)" : "Abaixo da baseline (piora)";
}

function shortLabel(name: string) {
  return name.length > 18 ? `${name.slice(0, 17)}...` : name;
}

function compareableRows(rows: ScenarioLabRowSnapshot[]) {
  return rows.filter((row) => row.latestRun && row.impact);
}

function ScenarioImpactCard({ row }: { row: ScenarioLabRowSnapshot }) {
  if (!row.latestRun || !row.impact) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">{row.scenarioName}</CardTitle>
          <CardDescription>Sem run associado ainda.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Execute um cálculo com este cenário em um documento para habilitar comparação.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{row.scenarioName}</CardTitle>
          <Badge variant="secondary">Run: {new Date(row.latestRun.runAt).toLocaleDateString("pt-BR")}</Badge>
        </div>
        <CardDescription>Documento {row.latestRun.documentKey}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-1 text-sm">
        <p>Tributo final: {formatCurrency(row.latestRun.taxTotal)}</p>
        <p className={deltaTone(row.impact.taxDelta)}>
          Delta de tributo: {formatCurrency(row.impact.taxDelta)} ({deltaLabel(row.impact.taxDelta, true)})
        </p>
        <p className={deltaTone(row.impact.priceImpact)}>
          Impacto no preço: {formatCurrency(row.impact.priceImpact)} ({deltaLabel(row.impact.priceImpact, true)})
        </p>
        <p>Resultado líquido estimado: {formatCurrency(row.impact.estimatedNetResult)}</p>
        <p>Margem estimada: {formatPercent(row.impact.marginPct)}</p>
        <p className={deltaTone(row.impact.marginDeltaPp)}>
          Delta margem (p.p.): {formatPercent(row.impact.marginDeltaPp)} ({deltaLabel(row.impact.marginDeltaPp, false)})
        </p>
        <p className="pt-1 text-xs text-muted-foreground">
          Parâmetros: transição {(row.params.transitionFactor * 100).toFixed(0)}% | repasse{" "}
          {row.params.pricePassThroughPercent.toFixed(0)}%
        </p>
      </CardContent>
    </Card>
  );
}

export function ScenarioLabPanel({ data }: { data: ScenarioLabData }) {
  const rowsWithRuns = useMemo(() => compareableRows(data.rows), [data.rows]);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => rowsWithRuns.slice(0, 3).map((row) => row.scenarioId));

  const selectedRows = useMemo(
    () => rowsWithRuns.filter((row) => selectedIds.includes(row.scenarioId)),
    [rowsWithRuns, selectedIds]
  );

  const chartData = useMemo(
    () =>
      selectedRows.map((row) => ({
        name: shortLabel(row.scenarioName),
        tributo: row.latestRun?.taxTotal ?? 0,
        impactoPreco: row.impact?.priceImpact ?? 0,
        resultadoLiquido: row.impact?.estimatedNetResult ?? 0
      })),
    [selectedRows]
  );

  function toggleScenario(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((value) => value !== id);
      }
      if (current.length >= 3) {
        return [...current.slice(1), id];
      }
      return [...current, id];
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scenario Lab: comparação lado a lado</CardTitle>
        <CardDescription>
          Compare até 3 cenários com baseline para entender impacto em tributo, preço e resultado líquido estimado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <p className="font-medium">Baseline de referência</p>
          {data.baseline ? (
            <p className="text-muted-foreground">
              Documento {data.baseline.documentKey} | tributo final {formatCurrency(data.baseline.taxTotal)} | effective rate{" "}
              {(data.baseline.effectiveRate * 100).toFixed(2)}%
            </p>
          ) : (
            <p className="text-muted-foreground">Sem baseline disponível. Execute um cálculo sem cenário para habilitar comparação.</p>
          )}
        </div>

        {rowsWithRuns.length > 0 ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Seleção de cenários para comparação">
            {rowsWithRuns.map((row) => {
              const active = selectedIds.includes(row.scenarioId);
              return (
                <button
                  type="button"
                  key={row.scenarioId}
                  onClick={() => toggleScenario(row.scenarioId)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
                  )}
                >
                  {row.scenarioName}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Nenhum cenário com run encontrado. Execute cálculos nos documentos para gerar comparação.
          </div>
        )}

        {selectedRows.length > 0 ? (
          <>
            <div className="grid gap-3 lg:grid-cols-3">
              {selectedRows.map((row) => (
                <ScenarioImpactCard key={row.scenarioId} row={row} />
              ))}
            </div>

            <div className="h-80 rounded-md border bg-card p-3">
              <p id="scenario-lab-chart-title" className="mb-2 text-sm font-medium">
                Impacto tributário, repasse e resultado por cenário
              </p>
              <p className="mb-2 text-xs text-muted-foreground">
                Cada barra tem legenda textual. Use os cards acima para interpretar melhora/piora sem depender de cor.
              </p>

              <div aria-hidden="true" className="h-[calc(100%-3.8rem)]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => currencyFormatter.format(Number(value))} />
                    <Tooltip formatter={(value) => currencyFormatter.format(Number(value))} />
                    <Legend />
                    <Bar dataKey="tributo" fill="#b6471e" name="Tributo final" />
                    <Bar dataKey="impactoPreco" fill="#2f7369" name="Impacto no preço" />
                    <Bar dataKey="resultadoLiquido" fill="#3f3a92" name="Resultado líquido" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <table className="sr-only" aria-labelledby="scenario-lab-chart-title">
                <caption>Comparativo textual dos cenários selecionados</caption>
                <thead>
                  <tr>
                    <th scope="col">Cenário</th>
                    <th scope="col">Tributo final</th>
                    <th scope="col">Impacto no preço</th>
                    <th scope="col">Resultado líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row) => (
                    <tr key={`table-${row.name}`}>
                      <th scope="row">{row.name}</th>
                      <td>{currencyFormatter.format(row.tributo)}</td>
                      <td>{currencyFormatter.format(row.impactoPreco)}</td>
                      <td>{currencyFormatter.format(row.resultadoLiquido)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
