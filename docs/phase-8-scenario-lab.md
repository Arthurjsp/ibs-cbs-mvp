# Fase 8 - Scenario Lab (Sprint D+14)

## Objetivo

Tornar `/scenarios` uma tela de decisao, nao apenas cadastro.

## Entregas

- comparacao lado a lado de ate 3 cenarios com baseline
- cards por cenario com:
  - tributo final
  - delta de tributo vs baseline
  - impacto no preco (baseado em repasse)
  - resultado liquido estimado
  - margem estimada e delta em p.p.
- grafico consolidado por cenario (tributo, impacto em preco e resultado)
- formulario de criacao com sliders e preview imediato de:
  - transicao IBS/CBS vs legado
  - repasse percentual
- acao de duplicar cenario

## Arquivos principais

- `apps/web/app/scenarios/page.tsx`
- `apps/web/components/scenarios/scenario-form-fields.tsx`
- `apps/web/components/scenarios/scenario-lab-panel.tsx`
- `apps/web/lib/scenarios/lab.ts`
- `apps/web/test/scenario-lab.test.ts`

## Metodologia de comparacao

- baseline: ultimo run sem cenario
- referencia por documento:
  - para cada cenario, tenta baseline do mesmo documento
  - se nao existir, usa baseline global mais recente
- impacto no preco:
  - `deltaTributo * (repasse / 100)`
- resultado liquido estimado:
  - `(receita ajustada) - tributo do cenario`

## Validacao tecnica

- `corepack pnpm --filter @mvp/web test`
- `corepack pnpm --filter @mvp/web typecheck`
- `corepack pnpm --filter @mvp/web build`
