# Fase 9 - Sprint D+30 (Confianca, Auditoria e Governanca)

## Objetivo

Elevar o produto para operacao mais proxima de ambiente enterprise com foco em:

1. confianca da simulacao por run
2. trilha de auditoria explicada para fiscal e controller
3. relatorios com template executivo/tecnico e pre-visualizacao
4. billing com visao de consumo e risco de bloqueio

## Entregas

### 1) Score de confianca por run (`/documents/[id]`)

- calculo de score (0-100) com nivel `ALTA | MEDIA | BAIXA`
- fatores considerados:
  - itens `unsupported`
  - cobertura de trilha IBS
  - itens com regra IBS claramente aplicada
  - origem de aliquota legado rastreada
  - presenca de pesos de transicao
- card com barra de progresso, metricas e highlights

### 2) Auditoria legivel por item

- em cada aba (`Legado`, `IBS/CBS/IS`, `Transicao`) a coluna de auditoria mostra:
  - explicacao textual (linhas resumidas)
  - JSON bruto em detalhe expansivel
- reduz dependencia de leitura tecnica de JSON para entendimento rapido

### 3) Relatorios com templates

- filtro novo `template` em `/reports`:
  - `EXECUTIVE`
  - `TECHNICAL`
- pre-visualizacao dinamica por colunas do template
- export CSV/XLSX respeita template
- resumo do periodo com:
  - total de runs
  - tributo final total
  - credito total
  - itens unsupported acumulados

### 4) Billing orientado a decisao

- barra de consumo mensal por plano
- status de limite e alerta de bloqueio
- cards de plano com CTA de upgrade (scaffold)
- telemetria operacional dos ultimos 30 dias na propria pagina

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

## Comandos de validacao

- `corepack pnpm test`
- `corepack pnpm typecheck`
- `corepack pnpm --filter @mvp/web exec next build`

Nota: em ambiente Windows + OneDrive, `pnpm db:generate` pode falhar com `EPERM` no binario do Prisma quando o arquivo esta bloqueado pelo SO.
