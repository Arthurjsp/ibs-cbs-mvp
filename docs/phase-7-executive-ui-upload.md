# Fase 7 - UI Executiva e Upload Guiado (D+7)

## Objetivo

Melhorar clareza para CFO/Controller e reduzir fricção do primeiro fluxo crítico:

1. leitura executiva do dashboard
2. upload XML com jornada guiada e feedback compreensível

## Entregas

- Dashboard (`/dashboard`)
  - resumo executivo do mês com explicação de MoM/YoY
  - KPIs com tooltip de impacto financeiro
  - plano de ação recomendado com destaque visual por criticidade
  - atalhos operacionais para upload, cenários e relatórios
  - gráficos com eixos e tooltips formatados em pt-BR
- Upload (`/documents/upload`)
  - fluxo guiado por etapas com status visual
  - mensagens de validação local e erro de API mais legíveis
  - explicação do que acontece após upload + checklist de consistência

## Arquivos alterados

- `apps/web/app/dashboard/page.tsx`
- `apps/web/components/dashboard/executive-kpi-card.tsx`
- `apps/web/components/dashboard/monthly-chart.tsx`
- `apps/web/components/documents/upload-form.tsx`
- `apps/web/app/documents/upload/page.tsx`
- `apps/web/lib/dashboard/metrics.ts`
- `apps/web/lib/trust/effective-rate.ts`
- `apps/web/lib/upload/flow.ts`
- `apps/web/test/dashboard-metrics.test.ts`
- `apps/web/test/effective-rate.test.ts`
- `apps/web/test/upload-flow.test.ts`

## Testes

- `corepack pnpm --filter @mvp/web test`
- `corepack pnpm --filter @mvp/web typecheck`
- `corepack pnpm --filter @mvp/web build`

## Resultado esperado de UX

- usuário novo entende o que cada métrica significa sem depender de suporte
- usuário conclui upload com orientação de etapas e menor taxa de erro
- dashboard passa a comunicar ação recomendada, não só números
