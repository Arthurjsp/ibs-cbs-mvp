# Fase 12 - Billing Stripe funcional

## Objetivo

Substituir o scaffold de billing por um fluxo funcional de assinatura com Stripe:

- checkout de upgrade (`PRO` e `ENTERPRISE`)
- portal de assinatura
- sincronização automática de plano por webhook
- bloqueio de simulações por limite mensal do plano

## Alterações técnicas

## Banco de dados

Migration `0007_stripe_billing_integration` adiciona campos no `Tenant`:

- `stripeCustomerId`
- `stripeSubscriptionId`
- `stripePriceId`
- `stripeSubscriptionStatus`
- `stripeCurrentPeriodEnd`

## Backend

Novos endpoints:

- `POST /api/billing/checkout`
- `POST /api/billing/portal`
- `POST /api/billing/webhook`

Bibliotecas:

- `apps/web/lib/stripe.ts`: cliente Stripe + origem da aplicação
- `apps/web/lib/stripe-billing.ts`: criação de sessão, customer, sync de assinatura

## Frontend

Página `/billing` atualizada com:

- status de assinatura Stripe
- botão de gerenciamento no portal Stripe
- botões de upgrade por plano
- alertas de configuração de ambiente

## Variáveis de ambiente

Obrigatórias para checkout:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_ENTERPRISE`

Obrigatória para webhook:

- `STRIPE_WEBHOOK_SECRET`

## Webhook Stripe

Endpoint:

- `/api/billing/webhook`

Eventos necessários:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Fluxo de sincronização

1. Usuário inicia checkout em `/billing`.
2. Stripe cria/atualiza assinatura.
3. Stripe envia webhook para o endpoint.
4. Sistema atualiza `Tenant.plan` e metadados Stripe.
5. Limites mensais passam a respeitar o plano novo.

## Testes

Teste unitário adicionado:

- `apps/web/test/stripe-billing.test.ts`

Cobertura:

- mapeamento `priceId -> TenantPlan`
- validação de configuração mínima para checkout
