# Fase 4 - Transicao ICMS/ISS -> IBS

## Objetivo

Adicionar calculo legado (ICMS/ISS), orquestracao por ano de emissao e visao comparativa no detalhe do documento.

## Escopo implementado

1. Persistencia e regras legadas
- Tabelas Prisma:
  - `LegacyRuleSet` (vigencia/status)
  - `ICMSRate` (UF, NCM/categoria opcionais, aliquota, vigencia)
  - `LegacyUFConfig` (parametrizacao por UF origem/destino com `internalRate`, `interstateRate`, `stRate`, `stMva`, `difalEnabled`, `stEnabled`)
- Componentes persistidos:
  - `CalcItemResult.componentsJson`
  - `CalcSummary.componentsJson`

2. Legacy engine v2 (`packages/legacy-engine`)
- ICMS proprio:
  - base = `item.totalValue`
  - prioridade de aliquota: `NCM+CATEGORIA` > `NCM` > `CATEGORIA` > fallback UF config
- DIFAL simplificado:
  - operacao interestadual e `difalEnabled=true`
  - `difalRate = max(internalRateDestino - aliquotaInterestadualAplicada, 0)`
  - `difalValue = base * difalRate`
- ST basica:
  - acionada por CFOP de ST (`540*`/`640*`) ou `stEnabled=true`
  - `stBase = base * (1 + stMva)`
  - `stValue = max((stBase * stRate) - icmsProprio, 0)`
- ISS placeholder:
  - valor 0, com nota explicita em auditoria.

3. Orquestrador (`apps/web/lib/transition/orchestrator.ts`)
- Executa motores legado e IBS/CBS/IS.
- Aplica ponderacao por ano:
  - `<=2028`: 1.0 / 0.0
  - `2029`: 0.9 / 0.1
  - `2030`: 0.8 / 0.2
  - `2031`: 0.7 / 0.3
  - `2032`: 0.6 / 0.4
  - `>=2033`: 0.0 / 1.0
- Guarda de confiabilidade:
  - quando `wLegacy > 0`, o servico exige configuracao `LegacyUFConfig` valida para o par `emitterUf -> recipientUf`.
  - sem config valida, o calculo falha com erro explicito em vez de estimar com baseline inconsistente.

4. UI em `/documents/[id]`
- Aba `Legado (ICMS/ISS)` com colunas:
  - ICMS proprio
  - DIFAL
  - ST basica (aliquota + MVA + valor)
  - ISS
  - Total legado

## Metodologia de calculo

- `legacyTaxItem = icmsValue + stValue + difalValue + issValue`
- `ibsTaxItem = ibsValue + cbsValue + isValue`
- `finalTaxItem = (legacyTaxItem * wLegacy) + (ibsTaxItem * wIBS)`
- `effectiveRateFinal = finalTaxTotal / baseTotal`

## Limitacoes do MVP

- ST e DIFAL estao em modo simplificado (sem ST avancada, MVA setorial detalhada, partilha completa, FCP, etc).
- ISS ainda e placeholder (0).
- Resultado e estimativo para decisao gerencial e nao substitui apuracao oficial.

## Testes

1. `packages/legacy-engine/test/calculate.test.ts`
- DIFAL simplificado interestadual
- ST basica com MVA
- parametrizacao interna por UF

2. `apps/web/test/transition-orchestrator.test.ts`
- validacao dos pesos da transicao
- ponderacao final para 2028, 2029 e 2033
