# Fase 5 - Multi-tributo (IBS/CBS/IS) + Ledger de Créditos

## Objetivo

Evoluir o MVP de simulador IBS/CBS para:

- suportar IS no mesmo motor transacional
- permitir base tributável parametrizável por regra
- persistir evidencias de crédito em ledger por tributo

## O que foi implementado

1. Engine multi-tributo
- `packages/shared/src/types.ts`
- `packages/shared/src/schemas.ts`
- `packages/engine/src/calculate.ts`
- `packages/engine/test/calculate.test.ts`

Novos campos no `thenJson`:

- `isRate`
- `taxBaseMultiplier`
- `taxBaseReduction`

Novos campos de resultado:

- item: `isRate`, `isValue`
- resumo: `isTotal`

2. Orquestração e persistência
- `apps/web/lib/transition/orchestrator.ts`
- `apps/web/lib/calc-service.ts`

A composição de transição agora considera:

- legado
- IBS + CBS + IS

3. Ledger de créditos
- `prisma/schema.prisma`
- `prisma/migrations/0004_multitax_credit_ledger/migration.sql`

Novas estruturas:

- `TaxCreditLedger`
- `TaxCreditLedgerEvent`

Regra de gravação no MVP:

- ao finalizar um `CalcRun`, gerar entradas de crédito por tributo elegivel (IBS/CBS/IS)
- status inicial: `PENDING_EXTINCTION`
- evento inicial: `ACCRUED`

4. UI e relatórios
- Nova página: `apps/web/app/credits/page.tsx`
- Navegação: `apps/web/components/app-nav.tsx`
- Dashboard, documento e relatórios atualizados para exibir IS:
  - `apps/web/app/dashboard/page.tsx`
  - `apps/web/app/documents/[id]/page.tsx`
  - `apps/web/components/documents/run-results-tabs.tsx`
  - `apps/web/app/reports/page.tsx`
  - `apps/web/app/api/reports/csv/route.ts`
  - `apps/web/app/api/reports/xlsx/route.ts`

## Comandos de banco

Aplicar migration:

```bash
npx prisma migrate deploy --schema prisma/schema.prisma
```

Atualizar client:

```bash
npx prisma generate
```

Popular seed:

```bash
corepack pnpm db:seed
```

## Validação executada

- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm --filter @mvp/web build`
