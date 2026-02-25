# Fase 4 - Transição ICMS/ISS -> IBS

## Objetivo

Adicionar cálculo legado (ICMS/ISS), orquestração por ano de emissão e visão comparativa no detalhe do documento.

## Escopo implementado

1. Persistência e regras legadas
- Tabelas Prisma:
  - `LegacyRuleSet` (vigência/status)
  - `ICMSRate` (UF, NCM/categoria opcionais, alíquota, vigência)
  - `LegacyUFConfig` (parametrização por UF origem/destino com `internalRate`, `interstateRate`, `stRate`, `stMva`, `difalEnabled`, `stEnabled`)
- Componentes persistidos:
  - `CalcItemResult.componentsJson`
  - `CalcSummary.componentsJson`

2. Legacy engine v2 (`packages/legacy-engine`)
- ICMS proprio:
  - base = `item.totalValue`
  - prioridade de alíquota: `NCM+CATEGORIA` > `NCM` > `CATEGORIA` > fallback UF config
- DIFAL simplificado:
  - operação interestadual e `difalEnabled=true`
  - `difalRate = max(internalRateDestino - aliquotaInterestadualAplicada, 0)`
  - `difalValue = base * difalRate`
- ST básica:
  - acionada por CFOP de ST (`540*`/`640*`) ou `stEnabled=true`
  - `stBase = base * (1 + stMva)`
  - `stValue = max((stBase * stRate) - icmsProprio, 0)`
- ISS placeholder:
  - valor 0, com nota explícita em auditoria.

3. Orquestrador (`apps/web/lib/transition/orchestrator.ts`)
- Executa motores legado e IBS/CBS/IS.
- Aplica ponderação por ano:
  - `<=2028`: 1.0 / 0.0
  - `2029`: 0.9 / 0.1
  - `2030`: 0.8 / 0.2
  - `2031`: 0.7 / 0.3
  - `2032`: 0.6 / 0.4
  - `>=2033`: 0.0 / 1.0
- Guarda de confiabilidade:
  - quando `wLegacy > 0`, o servico exige configuração `LegacyUFConfig` valida para o par `emitterUf -> recipientUf`.
  - sem config valida, o cálculo falha com erro explícito em vez de estimar com baseline inconsistente.

4. UI em `/documents/[id]`
- Aba `Legado (ICMS/ISS)` com colunas:
  - ICMS proprio
  - DIFAL
  - ST básica (alíquota + MVA + valor)
  - ISS
  - Total legado

## Metodologia de cálculo

- `legacyTaxItem = icmsValue + stValue + difalValue + issValue`
- `ibsTaxItem = ibsValue + cbsValue + isValue`
- `finalTaxItem = (legacyTaxItem * wLegacy) + (ibsTaxItem * wIBS)`
- `effectiveRateFinal = finalTaxTotal / baseTotal`

## Limitações do MVP

- ST e DIFAL estão em modo simplificado (sem ST avançada, MVA setorial detalhada, partilha completa, FCP, etc).
- ISS ainda e placeholder (0).
- Resultado e estimativo para decisão gerencial e não substitui apuração oficial.

## Testes

1. `packages/legacy-engine/test/calculate.test.ts`
- DIFAL simplificado interestadual
- ST básica com MVA
- parametrização interna por UF

2. `apps/web/test/transition-orchestrator.test.ts`
- validação dos pesos da transição
- ponderação final para 2028, 2029 e 2033
