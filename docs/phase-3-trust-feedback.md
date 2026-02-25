# Fase 3 - Feedback e Confiança das Simulações

## Objetivo

Melhorar clareza para usuário CFO/Controller sobre limites da simulação e aumentar confiança na leitura de métricas.

## Entregas

1. Amarras visuais de estimativa
- Banner em telas principais indicando:
  - resultado estimativo para decisão gerencial
  - não substitui apuração oficial
  - link para documentação da engine

Arquivos:
- `apps/web/components/trust/estimation-banner.tsx`
- `apps/web/app/dashboard/page.tsx`
- `apps/web/app/reports/page.tsx`
- `apps/web/app/documents/[id]/page.tsx`

2. Legenda de effective rate
- Explicação com fórmula e exemplo financeiro.
- Exibida em dashboard, reports e detalhe de documento.

Arquivo principal:
- `apps/web/lib/trust/effective-rate.ts`

3. Modal de confirmação antes do cálculo
- Antes de executar cálculo em documento:
  - mostra aviso de estimativa
  - mostra cenário selecionado
  - exige confirmação explícita via checkbox

Arquivos:
- `apps/web/components/documents/calculate-confirm-submit.tsx`
- `apps/web/app/documents/[id]/page.tsx`

4. Pagina de documentação da engine
- Rota: `/docs/engine`
- Resumo operacional das regras e do conceito de effective rate.

Arquivo:
- `apps/web/app/docs/engine/page.tsx`

## Testes

- `apps/web/test/effective-rate.test.ts`

Cobertura:
- formatação de moeda/percentual
- mensagem com exemplo de carga estimada
