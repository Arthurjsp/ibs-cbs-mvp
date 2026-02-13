# Fase 4 - Transição ICMS/ISS -> IBS

## Objetivo

Adicionar cálculo legado (ICMS/ISS), orquestração de transição por ano de emissão e visualização comparativa no detalhe do documento.

## Escopo implementado

1. Persistência e regras legadas
- Novas tabelas Prisma:
  - `LegacyRuleSet` (vigência/status)
  - `ICMSRate` (UF, NCM/categoria opcionais, alíquota, vigência)
- Novos campos de composição:
  - `CalcItemResult.componentsJson`
  - `CalcSummary.componentsJson`

2. Legacy engine v1 (`packages/legacy-engine`)
- ICMS simplificado:
  - base = `item.totalValue`
  - alíquota por UF destino com desempate por especificidade:
    - `NCM+CATEGORIA` > `NCM` > `CATEGORIA` > `UF default`
- ISS placeholder:
  - valor 0, com nota explícita na auditoria.
- Unsupported:
  - marca itens com sinais de cenários não cobertos (ex.: DIFAL/ST/MVA) via flags e reasons.

3. Orquestrador (`apps/web/lib/transition/orchestrator.ts`)
- Executa motores legado e IBS/CBS.
- Aplica ponderação por ano:
  - `<=2028`: 1.0 / 0.0
  - `2029`: 0.9 / 0.1
  - `2030`: 0.8 / 0.2
  - `2031`: 0.7 / 0.3
  - `2032`: 0.6 / 0.4
  - `>=2033`: 0.0 / 1.0
- Gera componentes por item e resumo para persistência.

4. UI em `/documents/[id]`
- Abas:
  - `Legado (ICMS/ISS)`
  - `IBS/CBS`
  - `Transição (Final)`
- Exibição dos pesos e totais ponderados.
- Fallback para runs antigos sem `componentsJson`.

## Metodologia de cálculo

- `legacyTaxItem = icmsValue + issValue`
- `ibsTaxItem = ibsValue + cbsValue`
- `finalTaxItem = (legacyTaxItem * wLegacy) + (ibsTaxItem * wIBS)`
- `effectiveRateFinal = finalTaxTotal / baseTotal`

## Limitações do MVP

- Não calcula oficialmente ST/MVA/DIFAL.
- ISS ainda é placeholder (0).
- Alíquota ICMS é simplificada por regra de vigência/UF/NCM/categoria.
- Resultado é estimativo para decisão gerencial e não substitui apuração oficial.

## Testes

1. `packages/legacy-engine/test/calculate.test.ts`
- cálculo ICMS simples
- priorização de alíquota específica
- marcação de `unsupported`

2. `apps/web/test/transition-orchestrator.test.ts`
- validação de pesos e ponderação para 2028, 2029 e 2033
