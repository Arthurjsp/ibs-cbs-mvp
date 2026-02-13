# Fase 3 - Feedback e Confianca das Simulacoes

## Objetivo

Melhorar clareza para usuario CFO/Controller sobre limites da simulacao e aumentar confianca na leitura de metricas.

## Entregas

1. Amarras visuais de estimativa
- Banner em telas principais indicando:
  - resultado estimativo para decisao gerencial
  - nao substitui apuracao oficial
  - link para documentacao da engine

Arquivos:
- `apps/web/components/trust/estimation-banner.tsx`
- `apps/web/app/dashboard/page.tsx`
- `apps/web/app/reports/page.tsx`
- `apps/web/app/documents/[id]/page.tsx`

2. Legenda de effective rate
- Explicacao com formula e exemplo financeiro.
- Exibida em dashboard, reports e detalhe de documento.

Arquivo principal:
- `apps/web/lib/trust/effective-rate.ts`

3. Modal de confirmacao antes do calculo
- Antes de executar calculo em documento:
  - mostra aviso de estimativa
  - mostra cenario selecionado
  - exige confirmacao explicita via checkbox

Arquivos:
- `apps/web/components/documents/calculate-confirm-submit.tsx`
- `apps/web/app/documents/[id]/page.tsx`

4. Pagina de documentacao da engine
- Rota: `/docs/engine`
- Resumo operacional das regras e do conceito de effective rate.

Arquivo:
- `apps/web/app/docs/engine/page.tsx`

## Testes

- `apps/web/test/effective-rate.test.ts`

Cobertura:
- formatacao de moeda/percentual
- mensagem com exemplo de carga estimada

