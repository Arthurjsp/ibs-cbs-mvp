import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { runCalcForDocument } from "@/lib/calc-service";
import { enqueueCalcRun } from "@/lib/jobs/calc-queue";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalculateConfirmSubmit } from "@/components/documents/calculate-confirm-submit";
import { RunResultsTabs, RunResultRowView, RunSummaryView } from "@/components/documents/run-results-tabs";
import { EstimationBanner } from "@/components/trust/estimation-banner";
import { buildRunConfidence } from "@/lib/documents/confidence";
import { buildEffectiveRateMessage } from "@/lib/trust/effective-rate";

interface Props {
  params: { id: string };
  searchParams?: { runId?: string; queued?: string; error?: string };
}

function confidenceTone(level: "ALTA" | "MEDIA" | "BAIXA") {
  if (level === "ALTA") {
    return {
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
      bar: "bg-emerald-600",
      card: "border-emerald-200"
    };
  }
  if (level === "MEDIA") {
    return {
      badge: "bg-amber-100 text-amber-800 border-amber-200",
      bar: "bg-amber-600",
      card: "border-amber-200"
    };
  }
  return {
    badge: "bg-destructive/10 text-destructive border-destructive/30",
    bar: "bg-destructive",
    card: "border-destructive/30"
  };
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function asBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  return fallback;
}

function toResultRow(result: any): RunResultRowView {
  const components = (result.componentsJson ?? null) as any;
  const legacy = components?.legacy
    ? {
        taxBase: asNumber(components.legacy.taxBase),
        stBase: asNumber(components.legacy.stBase),
        icmsRate: asNumber(components.legacy.icmsRate),
        icmsValue: asNumber(components.legacy.icmsValue),
        stRate: asNumber(components.legacy.stRate),
        stMva: asNumber(components.legacy.stMva),
        stValue: asNumber(components.legacy.stValue),
        difalRate: asNumber(components.legacy.difalRate),
        difalValue: asNumber(components.legacy.difalValue),
        issValue: asNumber(components.legacy.issValue),
        totalTax: asNumber(components.legacy.totalTax),
        unsupported: asBoolean(components.legacy.unsupported),
        unsupportedReasons: Array.isArray(components.legacy.unsupportedReasons)
          ? components.legacy.unsupportedReasons.map(String)
          : []
      }
    : null;

  const ibs = components?.ibs
    ? {
        taxBase: asNumber(components.ibs.taxBase),
        ibsRate: asNumber(components.ibs.ibsRate),
        cbsRate: asNumber(components.ibs.cbsRate),
        isRate: asNumber(components.ibs.isRate),
        ibsValue: asNumber(components.ibs.ibsValue),
        cbsValue: asNumber(components.ibs.cbsValue),
        isValue: asNumber(components.ibs.isValue),
        creditEligible: asBoolean(components.ibs.creditEligible)
      }
    : {
        taxBase: asNumber(result.taxBase),
        ibsRate: asNumber(result.ibsRate),
        cbsRate: asNumber(result.cbsRate),
        isRate: asNumber(result.isRate),
        ibsValue: asNumber(result.ibsValue),
        cbsValue: asNumber(result.cbsValue),
        isValue: asNumber(result.isValue),
        creditEligible: asBoolean(result.creditEligible)
      };

  const transition = components?.transition
    ? {
        taxBase: asNumber(components.transition.taxBase),
        legacyTax: asNumber(components.transition.legacyTax),
        ibsTax: asNumber(components.transition.ibsTax),
        weightedLegacyTax: asNumber(components.transition.weightedLegacyTax),
        weightedIbsTax: asNumber(components.transition.weightedIbsTax),
        totalTax: asNumber(components.transition.totalTax),
        effectiveRate: asNumber(components.transition.effectiveRate)
      }
    : {
        taxBase: asNumber(result.taxBase),
        legacyTax: 0,
        ibsTax: asNumber(result.ibsValue) + asNumber(result.cbsValue) + asNumber(result.isValue),
        weightedLegacyTax: 0,
        weightedIbsTax: asNumber(result.ibsValue) + asNumber(result.cbsValue) + asNumber(result.isValue),
        totalTax: asNumber(result.ibsValue) + asNumber(result.cbsValue) + asNumber(result.isValue),
        effectiveRate:
          asNumber(result.taxBase) > 0
            ? (asNumber(result.ibsValue) + asNumber(result.cbsValue) + asNumber(result.isValue)) / asNumber(result.taxBase)
            : 0
      };

  const weights = components?.weights
    ? {
        year: Number(components.weights.year),
        legacy: asNumber(components.weights.legacy),
        ibs: asNumber(components.weights.ibs)
      }
    : null;

  return {
    lineNumber: result.documentItem.lineNumber,
    description: result.documentItem.description,
    ncm: result.documentItem.ncm,
    legacy,
    ibs,
    transition,
    weights,
    audit: result.auditJson
  };
}

function toSummaryView(summary: any): RunSummaryView {
  const components = (summary.componentsJson ?? null) as any;
  if (components?.transition) {
    return {
      legacyTaxTotal: asNumber(components.transition.legacyTaxTotal),
      ibsTaxTotal: asNumber(components.transition.ibsTaxTotal),
      weightedLegacyTaxTotal: asNumber(components.transition.weightedLegacyTaxTotal),
      weightedIbsTaxTotal: asNumber(components.transition.weightedIbsTaxTotal),
      transitionTaxTotal: asNumber(components.transition.totalTax),
      transitionEffectiveRate: asNumber(components.transition.effectiveRate),
      weights: components.weights
        ? {
            year: Number(components.weights.year),
            legacy: asNumber(components.weights.legacy),
            ibs: asNumber(components.weights.ibs)
          }
        : null
    };
  }

  const ibsTotal = asNumber(summary.ibsTotal);
  const cbsTotal = asNumber(summary.cbsTotal);
  const isTotal = asNumber(summary.isTotal);
  const total = ibsTotal + cbsTotal + isTotal;

  return {
    legacyTaxTotal: 0,
    ibsTaxTotal: total,
    weightedLegacyTaxTotal: 0,
    weightedIbsTaxTotal: total,
    transitionTaxTotal: total,
    transitionEffectiveRate: asNumber(summary.effectiveRate),
    weights: null
  };
}

export default async function DocumentDetailPage({ params, searchParams }: Props) {
  const user = await requireUser();

  const [document, scenarios, runs] = await Promise.all([
    prisma.document.findFirst({
      where: { id: params.id, tenantId: user.tenantId },
      include: {
        companyProfile: true,
        items: { orderBy: { lineNumber: "asc" } }
      }
    }),
    prisma.scenario.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.calcRun.findMany({
      where: { tenantId: user.tenantId, documentId: params.id },
      include: {
        summary: true,
        scenario: true
      },
      orderBy: { runAt: "desc" }
    })
  ]);

  if (!document) {
    notFound();
  }

  async function calculateAction(formData: FormData) {
    "use server";

    const currentUser = await requireUser();
    const scenarioId = String(formData.get("scenarioId") ?? "").trim() || undefined;
    const enqueued = await enqueueCalcRun({
      tenantId: currentUser.tenantId,
      documentId: params.id,
      scenarioId
    });

    if (enqueued.mode === "queue") {
      redirect(`/documents/${params.id}?queued=1`);
    }

    let targetUrl: string;
    try {
      const result = await runCalcForDocument({
        tenantId: currentUser.tenantId,
        documentId: params.id,
        scenarioId,
        userId: currentUser.id
      });
      revalidatePath(`/documents/${params.id}`);
      targetUrl = `/documents/${params.id}?runId=${result.calcRunId}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao executar calculo.";
      targetUrl = `/documents/${params.id}?error=${encodeURIComponent(message)}`;
    }
    redirect(targetUrl);
  }

  const selectedRunId = searchParams?.runId ?? runs[0]?.id;
  const selectedRun = selectedRunId
    ? await prisma.calcRun.findFirst({
        where: {
          id: selectedRunId,
          tenantId: user.tenantId,
          documentId: params.id
        },
        include: {
          summary: true,
          itemResults: {
            include: {
              documentItem: true
            },
            orderBy: {
              documentItem: { lineNumber: "asc" }
            }
          }
        }
      })
    : null;

  const effectiveRateLegend = selectedRun?.summary
    ? buildEffectiveRateMessage(Number(selectedRun.summary.effectiveRate), Number(document.totalValue))
    : null;

  const runRows = selectedRun ? selectedRun.itemResults.map((result) => toResultRow(result)) : [];
  const runSummary = selectedRun?.summary ? toSummaryView(selectedRun.summary) : null;
  const runConfidence = selectedRun ? buildRunConfidence(runRows.map((row) => ({ audit: row.audit }))) : null;
  const confidenceStyle = runConfidence ? confidenceTone(runConfidence.level) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Documento {document.key}</h1>
          <p className="text-sm text-muted-foreground">
            Emissao {new Date(document.issueDate).toLocaleDateString("pt-BR")} | UF {document.emitterUf} -&gt; {document.recipientUf}
          </p>
          <p className="text-sm text-muted-foreground">
            Nesta tela voce decide qual cenario aplicar e revisa a trilha de auditoria do calculo.
          </p>
        </div>
        <Badge variant="secondary">{document.type}</Badge>
      </div>

      <EstimationBanner />

      {searchParams?.queued ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground" role="status" aria-live="polite">
            Calculo enfileirado no BullMQ. Configure o worker para processamento assincrono.
          </CardContent>
        </Card>
      ) : null}

      {searchParams?.error ? (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive" role="alert" aria-live="assertive">
            {searchParams.error}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Executar calculo estimado IBS/CBS/IS</CardTitle>
          <CardDescription>Selecione o cenario e confirme a simulacao para gerar o run.</CardDescription>
        </CardHeader>
        <CardContent>
          <form id="calc-form" action={calculateAction} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label htmlFor="scenarioId" className="text-sm font-medium">
                Cenario
              </label>
              <select
                id="scenarioId"
                name="scenarioId"
                className="h-10 min-w-[280px] rounded-md border bg-card px-3 text-sm"
                aria-describedby="scenario-help"
              >
                <option value="">Sem cenario (baseline)</option>
                {scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.name}
                  </option>
                ))}
              </select>
              <p id="scenario-help" className="text-xs text-muted-foreground">
                O baseline usa regras ativas sem parametros extras de simulacao.
              </p>
            </div>

            <CalculateConfirmSubmit formId="calc-form" scenarioSelectId="scenarioId" />
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historico de runs</CardTitle>
          <CardDescription>{runs.length} run(s) para este documento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {runs.map((run) => (
            <div key={run.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">{new Date(run.runAt).toLocaleString("pt-BR")}</p>
                <p className="text-muted-foreground">
                  Cenario: {run.scenario?.name ?? "Baseline"} | IBS R$ {Number(run.summary?.ibsTotal ?? 0).toFixed(2)} | CBS R${" "}
                  {Number(run.summary?.cbsTotal ?? 0).toFixed(2)} | IS R$ {Number(run.summary?.isTotal ?? 0).toFixed(2)}
                </p>
              </div>
              <Link href={`/documents/${params.id}?runId=${run.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Abrir
              </Link>
            </div>
          ))}
        </CardContent>
      </Card>

      {selectedRun ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Resumo do run selecionado</CardTitle>
              <CardDescription>Run ID {selectedRun.id}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
              <p>
                <span className="font-medium">IBS Total:</span> R$ {Number(selectedRun.summary?.ibsTotal ?? 0).toFixed(2)}
              </p>
              <p>
                <span className="font-medium">CBS Total:</span> R$ {Number(selectedRun.summary?.cbsTotal ?? 0).toFixed(2)}
              </p>
              <p>
                <span className="font-medium">IS Total:</span> R$ {Number(selectedRun.summary?.isTotal ?? 0).toFixed(2)}
              </p>
              <p>
                <span className="font-medium">Credito:</span> R$ {Number(selectedRun.summary?.creditTotal ?? 0).toFixed(2)}
              </p>
              <p>
                <span className="font-medium">Effective Rate:</span> {Number(selectedRun.summary?.effectiveRate ?? 0).toFixed(4)}
              </p>
              <p>
                <span className="font-medium">Transicao (Final):</span> R$ {Number(runSummary?.transitionTaxTotal ?? 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>

          {runConfidence && confidenceStyle ? (
            <Card className={confidenceStyle.card}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Score de confianca da simulacao
                  <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${confidenceStyle.badge}`}>
                    {runConfidence.level}
                  </span>
                </CardTitle>
                <CardDescription>
                  Leitura de cobertura com base em trilha de regras, pesos de transicao e itens unsupported.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>Confianca geral</span>
                    <span className="font-medium">{runConfidence.score.toFixed(1)} / 100</span>
                  </div>
                  <div className="h-2 rounded bg-muted" aria-hidden="true">
                    <div className={`h-2 rounded ${confidenceStyle.bar}`} style={{ width: `${runConfidence.score}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">0 a 59: baixa | 60 a 79: media | 80 a 100: alta.</p>
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <p>Itens: {runConfidence.metrics.totalItems}</p>
                  <p>Unsupported: {runConfidence.metrics.unsupportedItems}</p>
                  <p>Regras IBS aplicadas: {runConfidence.metrics.itemsWithMatchedRule}</p>
                  <p>Trilha IBS detalhada: {runConfidence.metrics.itemsWithIbsAudit}</p>
                  <p>Aliquota legado rastreada: {runConfidence.metrics.itemsWithLegacyRateConfig}</p>
                  <p>Pesos de transicao: {runConfidence.metrics.itemsWithWeights}</p>
                </div>

                <div className="space-y-1 text-muted-foreground">
                  {runConfidence.highlights.map((line) => (
                    <p key={line}>- {line}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {effectiveRateLegend ? (
            <Card>
              <CardHeader>
                <CardTitle>Legenda: effective rate</CardTitle>
                <CardDescription>{effectiveRateLegend.message}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {runSummary ? <RunResultsTabs rows={runRows} summary={runSummary} /> : null}
        </>
      ) : null}
    </div>
  );
}
