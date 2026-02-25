# Fase 10 - D+30.1 (Polimento Executivo)

## Objetivo

Refinar a entrega visual e executiva para decisão de diretoria sem alterar o core de cálculo.

## Entregas

### 1) Auditoria com layout executivo em `/documents/[id]`

- cada célula de auditoria agora mostra:
  - badge de prioridade (`ALTA`, `MEDIA`, `BAIXA`)
  - frase de resumo principal
  - trilha explicada expansível
  - JSON bruto expansível
- o foco passou a ser leitura de risco, não apenas dump técnico.

### 2) XLSX com aba `Resumo Diretoria`

- export `xlsx` inclui:
  - aba 1: `Resumo Diretoria`
    - KPIs do período
    - alertas/recomendações por severidade
    - top exposição tributária por documento/cenário
  - aba 2: dados detalhados no template selecionado
- mantem formatações para uso em reunião executiva.

### 3) Relatórios web com bloco executivo

- `/reports` agora exibe:
  - card `Resumo para diretoria`
  - card `Maior exposição no período`
  - insights gerados a partir dos dados do filtro.

## Arquivos principais

- `apps/web/components/documents/run-results-tabs.tsx`
- `apps/web/lib/reports/template.ts`
- `apps/web/app/reports/page.tsx`
- `apps/web/app/api/reports/xlsx/route.ts`
- `apps/web/test/report-template.test.ts`

## Validação

- `corepack pnpm test`
- `corepack pnpm typecheck`
- `corepack pnpm --dir apps/web exec next build`
