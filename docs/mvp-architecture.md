# Arquitetura do MVP IBS/CBS

## Domínio

- Multi-tenant via `tenantId` em tabelas de negócio.
- Regras tributárias são dados versionados (`TaxRuleSet` + `TaxRule`), sem hardcode no motor IBS/CBS.
- Cálculo legado também é parametrizável (`LegacyRuleSet` + `ICMSRate`).
- Cada execução gera trilha auditável (`CalcItemResult.auditJson`, `CalcSummary.auditJson`) com composição dos motores e pesos de transição.

## Camadas

1. `packages/shared`
- Contratos de entrada/saída dos motores e tipos de composição da transição.
- Schemas zod e utilitários de arredondamento.

2. `packages/engine`
- Avaliação de regras IBS/CBS (`whenJson`) por prioridade.
- Aplicação de efeitos (`thenJson`).
- Ajustes de cenário (`transitionFactor`, `overrideRates`, `pricePassThroughPercent`).

3. `packages/legacy-engine`
- Cálculo legado ICMS/ISS em TS puro.
- ICMS simplificado por UF/NCM/categoria com vigência.
- ISS placeholder no MVP (valor 0).
- Flags e auditoria para cenários não suportados (ex.: ST/MVA/DIFAL).

4. `apps/web`
- Auth com NextAuth.
- Upload e parsing XML NF-e.
- Orquestrador de transição (`legacy + IBS/CBS`), com pesos por ano.
- Persistência em PostgreSQL/Prisma e visualização com abas no detalhe do documento.
- Dashboard e exportações.

5. `prisma`
- Schema completo do MVP, migrations versionadas e seed de desenvolvimento.

## Metodologia de transição

- `final = (legacy * wLegacy) + (ibs * wIBS)`
- Pesos por ano de emissão:
  - `<=2028`: 100% legado
  - `2029`: 90% legado + 10% IBS
  - `2030`: 80% legado + 20% IBS
  - `2031`: 70% legado + 30% IBS
  - `2032`: 60% legado + 40% IBS
  - `>=2033`: 100% IBS

## Persistência dos componentes

- `CalcItemResult.componentsJson`:
  - componente legado por item
  - componente IBS/CBS por item
  - componente final ponderado
  - pesos usados
- `CalcSummary.componentsJson`:
  - resumos legado/IBS
  - resumo final ponderado
  - pesos usados

## Escalabilidade

- Fila BullMQ já prevista, com fallback síncrono no dev.
- Storage por interface (local em dev, adaptador S3 preparado).
- Regras versionadas por vigência (`validFrom`, `validTo`) para evolução normativa.

## Orientacao de negocio (Tax Transition OS)

- O foco do produto e reduzir incerteza operacional e risco financeiro na transicao.
- O MVP atual cobre simulacao de impacto, trilha de auditoria e cockpit executivo.
- Itens de roadmap para capturar valor: tradutor ERP, radar de risco fiscal e pricing com elasticidade.
