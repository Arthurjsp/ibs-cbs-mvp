"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface MonthlyData {
  month: string;
  ibsTotal: number;
  cbsTotal: number;
  effectiveRate: number;
}

export function MonthlyChart({ data }: { data: MonthlyData[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="h-72 rounded-xl border bg-card p-4">
        <p className="mb-2 text-sm font-medium">IBS/CBS por mês</p>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="ibsTotal" fill="#b6471e" name="IBS" />
            <Bar dataKey="cbsTotal" fill="#2f7369" name="CBS" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="h-72 rounded-xl border bg-card p-4">
        <p className="mb-2 text-sm font-medium">Effective rate por mês</p>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="effectiveRate" stroke="#a53c15" strokeWidth={2} name="Effective rate" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

