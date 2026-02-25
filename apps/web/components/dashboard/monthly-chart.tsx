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
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="h-72 rounded-xl border bg-card p-4">
        <p className="mb-1 text-sm font-medium">IBS/CBS/IS por mês</p>
        <p className="mb-2 text-xs text-muted-foreground">Visão mensal da carga simulada por tributo.</p>
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
      <div className="h-72 rounded-xl border bg-card p-4">
        <p className="mb-1 text-sm font-medium">Effective rate por mês</p>
        <p className="mb-2 text-xs text-muted-foreground">Relação entre carga total estimada e base tributável.</p>
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
    </div>
  );
}
