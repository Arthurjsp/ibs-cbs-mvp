# Fase 9 - Sprint D+30 (Confiança, Auditoria e Governança)

## Objetivo

Elevar o produto para operação mais próxima de ambiente enterprise com foco em:

1. confiança da simulação por run
2. trilha de auditoria explicada para fiscal e controller
3. relatórios com template executivo/técnico e pre-visualização
4. billing com visão de consumo e risco de bloqueio

## Entregas

### 1) Score de confiança por run (`/documents/[id]`)

- cálculo de score (0-100) com nivel `ALTA | MEDIA | BAIXA`
- fatores considerados:
  - itens `unsupported`
  - cobertura de trilha IBS
  - itens com regra IBS claramente aplicada
  - origem de alíquota legado rastreada
  - presenca de pesos de transição
- card com barra de progresso, métricas e highlights

### 2) Auditoria legivel por item

- em cada aba (`Legado`, `IBS/CBS/IS`, `Transição`) a coluna de auditoria mostra:
  - explicação textual (linhas resumidas)
  - JSON bruto em detalhe expansível
- reduz dependência de leitura técnica de JSON para entendimento rápido

### 3) Relatórios com templates

- filtro novo `template` em `/reports`:
  - `EXECUTIVE`
  - `TECHNICAL`
- pre-visualização dinamica por colunas do template
- export CSV/XLSX respeita template
- resumo do período com:
  - total de runs
  - tributo final total
  - crédito total
  - itens unsupported acumulados

### 4) Billing orientado a decisão

- barra de consumo mensal por plano
- status de limite e alerta de bloqueio
- cards de plano com CTA de upgrade (scaffold)
- telemetria operacional dos últimos 30 dias na própria página

## Arquivos principais

- `apps/web/app/documents/[id]/page.tsx`
- `apps/web/components/documents/run-results-tabs.tsx`
- `apps/web/lib/documents/confidence.ts`
- `apps/web/lib/documents/audit-readable.ts`
- `apps/web/app/reports/page.tsx`
- `apps/web/lib/reports/template.ts`
- `apps/web/app/api/reports/csv/route.ts`
- `apps/web/app/api/reports/xlsx/route.ts`
- `apps/web/app/billing/page.tsx`

## Testes

- `apps/web/test/document-confidence.test.ts`
- `apps/web/test/audit-readable.test.ts`
- `apps/web/test/report-template.test.ts`

## Comandos de validação

- `corepack pnpm test`
- `corepack pnpm typecheck`
- `corepack pnpm --filter @mvp/web exec next build`

Nota: em ambiente Windows + OneDrive, `pnpm db:generate` pode falhar com `EPERM` no binario do Prisma quando o arquivo esta bloqueado pelo SO.
