# Fase 6 - Apuração Assistida e Gestão de Divergências

## Objetivo

Adicionar uma camada de reconciliação entre a simulação interna do motor e a prévia assistida (manual/oficial), com trilha de justificativas para governança.

## Entregas

- Novos modelos Prisma:
  - `AssistedAssessmentSnapshot`
  - `AssessmentDivergence`
  - enum `DivergenceStatus` (`OPEN`, `JUSTIFIED`, `RESOLVED`)
- Extensão de telemetria:
  - `ASSISTED_ASSESSMENT_IMPORTED`
  - `DIVERGENCE_JUSTIFIED`
- Nova tela:
  - `/assisted-assessment`
- Integração no dashboard:
  - card "Apuração assistida" com status das divergências

## Fluxo funcional

1. Usuário informa mês e totais da prévia assistida (`IBS`, `CBS`, `IS`, `effectiveRate` opcional).
2. Sistema calcula totais simulados no mesmo mês com base em `CalcRun.summary`.
3. Sistema grava snapshot e gera divergências por métrica:
   - `IBS_TOTAL`
   - `CBS_TOTAL`
   - `IS_TOTAL`
   - `EFFECTIVE_RATE` (quando informado)
4. Usuário classifica/justifica divergências na própria tela.
5. Eventos de telemetria são registrados para auditoria de uso.

## Comandos

```bash
corepack pnpm db:generate
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Para aplicar no banco:

```bash
DATABASE_URL="<url de migration/session mode>" npx prisma migrate deploy --schema prisma/schema.prisma
```

## Observabilidade mínima

- Cada importação de prévia gera `ASSISTED_ASSESSMENT_IMPORTED`.
- Cada justificativa gera `DIVERGENCE_JUSTIFIED`.
- Dashboard agrega divergências por status para leitura executiva.

## Limitações do MVP

- Importação da prévia é manual (sem integração oficial RTC neste passo).
- Não há workflow de aprovação multiusuário para justificativas.
- Não há SLA automático nem fila de tarefas por divergência (planejado para próxima fase).
