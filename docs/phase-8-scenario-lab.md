# Fase 8 - Scenario Lab (Sprint D+14)

## Objetivo

Tornar `/scenarios` uma tela de decisão, não apenas cadastro.

## Entregas

- comparação lado a lado de até 3 cenários com baseline
- cards por cenário com:
  - tributo final
  - delta de tributo vs baseline
  - impacto no preço (baseado em repasse)
  - resultado líquido estimado
  - margem estimada e delta em p.p.
- grafico consolidado por cenário (tributo, impacto em preço e resultado)
- formulário de criação com sliders e preview imediato de:
  - transição IBS/CBS vs legado
  - repasse percentual
- ação de duplicar cenário

## Arquivos principais

- `apps/web/app/scenarios/page.tsx`
- `apps/web/components/scenarios/scenario-form-fields.tsx`
- `apps/web/components/scenarios/scenario-lab-panel.tsx`
- `apps/web/lib/scenarios/lab.ts`
- `apps/web/test/scenario-lab.test.ts`

## Metodologia de comparação

- baseline: último run sem cenário
- referência por documento:
  - para cada cenário, tenta baseline do mesmo documento
  - se não existir, usa baseline global mais recente
- impacto no preço:
  - `deltaTributo * (repasse / 100)`
- resultado líquido estimado:
  - `(receita ajustada) - tributo do cenário`

## Validação técnica

- `corepack pnpm --filter @mvp/web test`
- `corepack pnpm --filter @mvp/web typecheck`
- `corepack pnpm --filter @mvp/web build`
