"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMonthKey } from "@/lib/dashboard/metrics";

interface MonthlyData {
  month: string;
  ibsTotal: number;
  cbsTotal: number;
  isTotal: number;
  effectiveRate: number;
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatCurrencyTick(value: number) {
  if (Math.abs(value) >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return `R$ ${value.toFixed(0)}`;
}

function taxLegendName(name: string) {
  if (name === "ibsTotal") return "IBS";
  if (name === "cbsTotal") return "CBS";
  if (name === "isTotal") return "IS";
  return name;
}

export function MonthlyChart({ data }: { data: MonthlyData[] }) {
  return (
    <section className="grid gap-6 lg:grid-cols-2" aria-label="Graficos mensais de tributos e effective rate">
      <div className="h-72 rounded-xl border bg-card p-4">
        <p id="tax-monthly-title" className="mb-1 text-sm font-medium">
          IBS/CBS/IS por mês
        </p>
        <p className="mb-2 text-xs text-muted-foreground">Visao mensal da carga simulada por tributo.</p>
        <p className="mb-2 text-xs text-muted-foreground">Legenda: IBS (barra laranja), CBS (barra verde), IS (barra azul).</p>

        <div aria-hidden="true" className="h-[calc(100%-3.5rem)]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tickFormatter={formatMonthKey} />
              <YAxis tickFormatter={formatCurrencyTick} />
              <Tooltip
                labelFormatter={(value) => formatMonthKey(String(value))}
                formatter={(value, name) => [formatCurrency(Number(value)), taxLegendName(String(name))]}
              />
              <Legend />
              <Bar dataKey="ibsTotal" fill="#b6471e" name="IBS" />
              <Bar dataKey="cbsTotal" fill="#2f7369" name="CBS" />
              <Bar dataKey="isTotal" fill="#3f3a92" name="IS" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <table className="sr-only" aria-labelledby="tax-monthly-title">
          <caption>Resumo textual de IBS, CBS e IS por mês</caption>
          <thead>
            <tr>
              <th scope="col">Mês</th>
              <th scope="col">IBS</th>
              <th scope="col">CBS</th>
              <th scope="col">IS</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.month}>
                <th scope="row">{formatMonthKey(row.month)}</th>
                <td>{formatCurrency(row.ibsTotal)}</td>
                <td>{formatCurrency(row.cbsTotal)}</td>
                <td>{formatCurrency(row.isTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="h-72 rounded-xl border bg-card p-4">
        <p id="rate-monthly-title" className="mb-1 text-sm font-medium">
          Effective rate por mês
        </p>
        <p className="mb-2 text-xs text-muted-foreground">Relação entre carga total estimada e base tributável.</p>
        <p className="mb-2 text-xs text-muted-foreground">Linha continua: quanto maior, maior impacto potencial na margem.</p>

        <div aria-hidden="true" className="h-[calc(100%-3.5rem)]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tickFormatter={formatMonthKey} />
              <YAxis tickFormatter={(value) => formatPercent(Number(value))} />
              <Tooltip
                labelFormatter={(value) => formatMonthKey(String(value))}
                formatter={(value, name) => [formatPercent(Number(value)), name === "effectiveRate" ? "Effective rate" : String(name)]}
              />
              <Line type="monotone" dataKey="effectiveRate" stroke="#a53c15" strokeWidth={2} name="Effective rate" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <table className="sr-only" aria-labelledby="rate-monthly-title">
          <caption>Resumo textual de effective rate por mês</caption>
          <thead>
            <tr>
              <th scope="col">Mês</th>
              <th scope="col">Effective rate</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={`${row.month}-rate`}>
                <th scope="row">{formatMonthKey(row.month)}</th>
                <td>{formatPercent(row.effectiveRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
