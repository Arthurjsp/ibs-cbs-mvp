"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const registered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const helperText = useMemo(() => {
    if (registered) return "Conta corporativa criada. Entre com email e senha.";
    return "Use as credenciais da sua conta corporativa.";
  }, [registered]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false
    });

    setLoading(false);

    if (result?.error) {
      setError("Credenciais invalidas.");
      return;
    }

    window.location.href = result?.url ?? callbackUrl;
  }

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Simulador IBS/CBS para decisao gerencial.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email corporativo</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu-email@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-describedby="signin-email-help"
              />
              <p id="signin-email-help" className="text-xs text-muted-foreground">
                {helperText}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert" aria-live="assertive">
                {error}
              </p>
            ) : null}

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Empresa nova? <Link href="/auth/register-company" className="underline">Criar conta corporativa</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
