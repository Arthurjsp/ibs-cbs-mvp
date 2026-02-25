# Fase 1 - Dashboard Executivo e Telemetria

## Objetivo

Evoluir o MVP para uma leitura mais executiva (CFO/Controller) e instrumentar eventos de uso para produto e operação.

## Entregas

### Dashboard executivo

- Cards executivos com variação `MoM` e `YoY`.
- Texto orientativo de interpretação de métricas.
- Tooltip com exemplo de impacto financeiro por métrica.
- Painel de uso (últimos 30 dias) com contagem de eventos de telemetria.

Arquivos principais:

- `apps/web/app/dashboard/page.tsx`
- `apps/web/components/dashboard/executive-kpi-card.tsx`
- `apps/web/components/dashboard/monthly-chart.tsx`
- `apps/web/lib/dashboard/metrics.ts`

### Telemetria de uso

Eventos suportados:

- `DOCUMENT_UPLOADED`
- `CALCULATION_EXECUTED`
- `SCENARIO_APPLIED`
- `EXPORT_CSV`
- `EXPORT_XLSX`

Arquivos principais:

- `apps/web/app/api/telemetry/route.ts`
- `apps/web/lib/telemetry/types.ts`
- `apps/web/lib/telemetry/track.ts`

Integração de eventos nas rotas/servicos:

- Upload: `apps/web/app/api/documents/upload/route.ts`
- Cálculo: `apps/web/lib/calc-service.ts`
- Export CSV: `apps/web/app/api/reports/csv/route.ts`
- Export XLSX: `apps/web/app/api/reports/xlsx/route.ts`

## Banco de dados

Novos artefatos:

- enum `TelemetryEventType`
- tabela `TelemetryEvent`

Arquivos:

- `prisma/schema.prisma`
- `prisma/migrations/0002_telemetry_events/migration.sql`

## Observabilidade mínima

- Persistência de eventos no banco (consulta por tenant/tipo/período).
- Log estruturado em `console.info` para cada evento.
- Captura opcional no Sentry quando `SENTRY_DSN` estiver configurado.

## Testes

Testes adicionados:

- `apps/web/test/dashboard-metrics.test.ts`
- `apps/web/test/telemetry-types.test.ts`

Comando:

```bash
corepack pnpm test
```
