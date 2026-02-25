# MVP SaaS Motor de Cálculo + Simulador Estratégico IBS/CBS

Monorepo com Next.js 14, TypeScript, Prisma/PostgreSQL e engine de cálculo puro em TS para simulação estimada da reforma tributária (IBS/CBS), com trilha de auditoria por item.

## Aviso do produto

Este MVP é **simulador/estimativa** para estratégia e planejamento.  
Não substitui apuração oficial nem obrigações acessórias.

## Stack

- `apps/web`: Next.js 14+ App Router, Tailwind, componentes no padrão shadcn/ui, NextAuth, Recharts
- `packages/engine`: motor de cálculo IBS/CBS (puro TS) com avaliação de regras versionadas
- `packages/shared`: tipos, schemas zod, utilitários
- `prisma`: schema, migration inicial e seed
- `docs`: documentação funcional e técnica do MVP

## Pré-requisitos

1. Node.js 20+
2. pnpm 9+ (ou `corepack pnpm`)
3. PostgreSQL
4. (Opcional) Redis para fila BullMQ

## Setup rápido

1. Instalar dependências:

```bash
pnpm install
# alternativa sem pnpm global:
# corepack pnpm install
```

2. Copiar env:

```bash
cp .env.example .env
```

3. Rodar migration:

```bash
pnpm db:migrate
```

4. Seed de dados de desenvolvimento:

```bash
pnpm db:seed
```

5. Subir aplicação web:

```bash
pnpm dev
```

6. Login:

- Email: `admin@demo.local`
- (MVP com credencial simplificada por email no dev)

## Fluxo E2E do MVP

1. Acesse `/auth/signin`.
2. Faça onboarding em `/onboarding` (tenant/company/ruleset default se necessário).
3. Faça upload XML NF-e em `/documents/upload`.
4. Abra o documento em `/documents/[id]` e clique em `Calcular`.
5. Veja resultados:
- por item (IBS, CBS, base, crédito, auditoria)
- resumo do documento
- histórico de runs/cenários
6. Crie cenários em `/scenarios` e recalcule.
7. Exporte CSV em `/reports` por mês e cenário.
8. Importe prévia oficial/manual em `/assisted-assessment` para reconciliar divergências.
9. Acompanhe o ledger de créditos simulados em `/credits`.

## Billing scaffold

- Página: `/billing`
- Limites de simulação por plano:
- `FREE`: 5/mês
- `PRO`: 50/mês
- `ENTERPRISE`: ilimitado
- Bloqueio aplicado no serviço de cálculo.

## Jobs (BullMQ scaffold)

- Arquivo de fila: `apps/web/lib/jobs/calc-queue.ts`
- Worker scaffold: `apps/web/lib/jobs/worker.ts`
- Em dev, padrão síncrono com `JOBS_SYNC=true` ou sem `REDIS_URL`.

## Testes e qualidade

1. Testes unitários da engine:

```bash
pnpm test
```

2. Typecheck:

```bash
pnpm typecheck
```

3. Build:

```bash
pnpm build
```

## Estrutura

```text
apps/
  web/
packages/
  engine/
  shared/
prisma/
  schema.prisma
  migrations/
  seed.ts
docs/
```

## Regra JSON suportada na engine

`whenJson` suporta:

- `eq`, `ne`, `in`, `notIn`, `gt`, `gte`, `lt`, `lte`, `and`, `or`

Campos de contexto:

- `emitterUf`, `recipientUf`, `ncm`, `category`, `operationType`, `issueDate`, `itemValue`

`thenJson` suporta:

- `ibsRate`, `cbsRate`, `creditEligible`, `notes`

## RuleSet default do seed

1. Padrão: `ibsRate=0.17`, `cbsRate=0.09`, `creditEligible=true`
2. Reduzida: `category in ["REDUZIDA"]` => `0.10 / 0.05`
3. Isenta: `category in ["ISENTA"]` => `0 / 0`, `creditEligible=false`

## Dashboard Executivo e Telemetria

- Dashboard com cards executivos, variacao MoM/YoY e explicacao das metricas.
- Eventos coletados automaticamente:
  - `DOCUMENT_UPLOADED`
  - `CALCULATION_EXECUTED`
  - `SCENARIO_APPLIED`
  - `EXPORT_CSV`
  - `EXPORT_XLSX`
  - `ASSISTED_ASSESSMENT_IMPORTED`
  - `DIVERGENCE_JUSTIFIED`
- Endpoint de telemetria manual:
  - `POST /api/telemetry`

Detalhamento tecnico:

- `docs/phase-1-dashboard-telemetry.md`

## Upload Guiado e Validacao de XML

- Fluxo com passo a passo em `/documents/upload`.
- Mensagens de erro com orientacao para XML invalido.
- Limite de tamanho e validacao de tipo de arquivo.

Detalhes tecnicos:

- `docs/phase-2-upload-ux-validation.md`

## Fase 3 - Feedback e Confianca

- Banner de estimativa com link para `/docs/engine`.
- Modal de confirmacao antes do calculo em `/documents/[id]`.
- Legenda de effective rate com formula e exemplo financeiro.

Detalhamento tecnico:

- `docs/phase-3-trust-feedback.md`

## Fase 4 - Transição ICMS/ISS -> IBS

- Novo pacote `packages/legacy-engine` para cálculo legado (ICMS próprio + ST básica + DIFAL simplificado + ISS placeholder).
- Parametrização por UF via `LegacyUFConfig` (origem/destino, alíquotas e MVA).
- Orquestrador de transição no cálculo de documento com ponderação por ano de emissão.
- Persistência de componentes legado/IBS/final em:
  - `CalcItemResult.componentsJson`
  - `CalcSummary.componentsJson`
- Detalhamento técnico:
  - `docs/phase-4-transition-legacy-ibs.md`

## Fase 6 - Apuração Assistida e Divergências

- Importação de prévia mensal (manual/oficial) para comparação com simulado.
- Geração de divergências por métrica (`IBS_TOTAL`, `CBS_TOTAL`, `IS_TOTAL`, `EFFECTIVE_RATE`).
- Justificativa e classificação de divergências com trilha de telemetria.
- Detalhamento técnico:
  - `docs/phase-6-assisted-assessment-divergences.md`

## Publicação remota para testes

- Guia completo (GitHub + Supabase + Vercel):
  - `docs/deploy-vercel-supabase.md`

## Posicionamento Tax Transition OS

- O produto foi reposicionado para decisao tributaria e risco financeiro na transicao IBS/CBS.
- Pagina de estrategia interna: `/strategy`.
- Documento de estrategia e ICP: `docs/tax-transition-os.md`.
- Objetivo comercial: nao competir como compliance commodity, e sim como cockpit de decisao para CFO/Controller.

## Fase 8 - Scenario Lab (D+14)

- Comparacao lado a lado de ate 3 cenarios no `/scenarios`.
- Baseline automatico com delta de tributo e leitura de impacto em preco/resultado.
- Formulario com sliders para transicao e repasse, com preview imediato.
- Acao de duplicar cenario para acelerar simulacoes.
- Detalhamento tecnico:
  - `docs/phase-8-scenario-lab.md`
