"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RegisterFormState {
  tenantName: string;
  legalName: string;
  cnpj: string;
  uf: string;
  segment: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  adminPasswordConfirm: string;
}

const INITIAL_STATE: RegisterFormState = {
  tenantName: "",
  legalName: "",
  cnpj: "",
  uf: "SP",
  segment: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
  adminPasswordConfirm: ""
};

export default function RegisterCompanyPage() {
  const [form, setForm] = useState<RegisterFormState>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof RegisterFormState>(field: K, value: RegisterFormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/register-company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        uf: form.uf.toUpperCase().trim(),
        adminEmail: form.adminEmail.toLowerCase().trim()
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string; details?: string[] } | null;
      const details = payload?.details?.[0];
      setError(details ?? payload?.error ?? "Nao foi possivel criar a conta corporativa.");
      setLoading(false);
      return;
    }

    const loginResult = await signIn("credentials", {
      email: form.adminEmail.toLowerCase().trim(),
      password: form.adminPassword,
      callbackUrl: "/dashboard",
      redirect: false
    });

    setLoading(false);
    if (loginResult?.error) {
      window.location.href = "/auth/signin?registered=1";
      return;
    }

    window.location.href = loginResult?.url ?? "/dashboard";
  }

  return (
    <div className="mx-auto max-w-3xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Criar conta corporativa</CardTitle>
          <CardDescription>Crie sua empresa no sistema e o usuario administrador inicial.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit} noValidate>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="tenantName">Nome da conta corporativa</Label>
              <Input id="tenantName" required value={form.tenantName} onChange={(e) => setField("tenantName", e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="legalName">Razao social</Label>
              <Input id="legalName" required value={form.legalName} onChange={(e) => setField("legalName", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ (opcional)</Label>
              <Input id="cnpj" value={form.cnpj} onChange={(e) => setField("cnpj", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="uf">UF principal</Label>
              <Input id="uf" maxLength={2} required value={form.uf} onChange={(e) => setField("uf", e.target.value.toUpperCase())} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="segment">Segmento (opcional)</Label>
              <Input id="segment" value={form.segment} onChange={(e) => setField("segment", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminName">Nome do administrador</Label>
              <Input id="adminName" required value={form.adminName} onChange={(e) => setField("adminName", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminEmail">Email do administrador</Label>
              <Input
                id="adminEmail"
                type="email"
                required
                value={form.adminEmail}
                onChange={(e) => setField("adminEmail", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminPassword">Senha</Label>
              <Input
                id="adminPassword"
                type="password"
                minLength={8}
                required
                value={form.adminPassword}
                onChange={(e) => setField("adminPassword", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminPasswordConfirm">Confirmar senha</Label>
              <Input
                id="adminPasswordConfirm"
                type="password"
                minLength={8}
                required
                value={form.adminPasswordConfirm}
                onChange={(e) => setField("adminPasswordConfirm", e.target.value)}
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive md:col-span-2" role="alert">
                {error}
              </p>
            ) : null}

            <div className="md:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Criando conta..." : "Criar conta corporativa"}
              </Button>
              <Link href="/auth/signin" className="text-sm text-muted-foreground underline">
                Ja tenho conta
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

