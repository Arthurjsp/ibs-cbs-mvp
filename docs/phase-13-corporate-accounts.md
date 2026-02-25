# Fase 13 - Conta corporativa e usuarios

## Objetivo

Evoluir o acesso do produto para o modelo B2B:

- `Tenant` como conta corporativa
- usuarios individuais por empresa
- autenticacao com email + senha
- gestao de usuarios por ADMIN

## Entregas

1. Login com senha
- `CredentialsProvider` agora exige `email` e `password`
- valida hash de senha antes de autenticar
- atualiza `lastLoginAt` no login valido
- bloqueia usuario inativo (`isActive=false`)

2. Cadastro corporativo
- endpoint: `POST /api/auth/register-company`
- pagina: `/auth/register-company`
- cria tenant, company profile e usuario ADMIN inicial
- aplica defaults do produto:
  - ruleset IBS/CBS ativo
  - ruleset legado ativo
  - cenario baseline

3. Gestao de usuarios
- pagina: `/settings/users` (apenas ADMIN)
- criar usuario com papel (`ADMIN`, `FISCAL`, `CFO`)
- ativar/desativar usuario
- impede desativacao do proprio usuario autenticado

4. Schema Prisma
- `User.isActive` (`Boolean`, default `true`)
- `User.lastLoginAt` (`DateTime?`)
- migration: `0008_user_auth_hardening`

## Observacoes

- O isolamento de dados continua por `tenantId`.
- Usuarios do mesmo tenant compartilham os mesmos dados corporativos.
- Usuarios de tenants diferentes nao se enxergam.

