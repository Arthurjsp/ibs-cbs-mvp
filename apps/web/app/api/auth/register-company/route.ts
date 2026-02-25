import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { buildRateLimitKey, enforceRateLimit } from "@/lib/security/rate-limit";
import { provisionCompanyAccount, registerCompanySchema } from "@/lib/account-provisioning";

function formatZodErrors(error: ZodError) {
  return error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

export async function POST(request: Request) {
  const rateLimit = enforceRateLimit({
    key: buildRateLimitKey({
      request,
      tenantId: "public-register",
      userId: "anonymous",
      route: "api:auth:register-company"
    }),
    max: 10,
    windowMs: 60_000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas de cadastro. Aguarde alguns segundos." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  try {
    const body = await request.json();
    const parsed = registerCompanySchema.parse(body);
    await provisionCompanyAccount(parsed);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Dados de cadastro invalidos.", details: formatZodErrors(error) }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Falha ao criar conta corporativa.";
    const status = message.includes("ja esta vinculado") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

