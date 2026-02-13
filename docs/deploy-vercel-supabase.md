# Deploy remoto para validação (Vercel + Supabase)

Este guia permite que outra pessoa acesse o sistema pela internet e teste o estado atual do produto.

## O que já está preparado no código

- Monorepo com `apps/web` (Next.js) e pacotes compartilhados.
- Migrations Prisma versionadas.
- Seed pronto para criar usuário `admin@demo.local`.
- Storage local ajustado para usar `/tmp/uploads` em ambiente Vercel.

## Limitação importante

- Em Vercel, arquivos em `/tmp` são efêmeros.
- O upload XML funciona para fluxo de teste imediato, mas não é armazenamento permanente.
- Para produção real, usar storage S3.

## Pré-requisitos

- Node.js 20+
- pnpm/corepack
- Git
- Conta GitHub
- Conta Supabase
- Conta Vercel

## 1) Inicializar Git e publicar no GitHub

Na raiz do projeto:

```powershell
git init
git add .
git commit -m "chore: estado atual MVP IBS/CBS"
```

Criar repositório no GitHub e conectar:

```powershell
git remote add origin https://github.com/SEU_USUARIO/ibs-cbs-mvp.git
git branch -M main
git push -u origin main
```

## 2) Criar banco no Supabase

No projeto Supabase, copie duas URLs:

- `DATABASE_URL_RUNTIME`:
  - use **Transaction Pooler** (porta 6543), recomendado para app em Vercel.
- `DATABASE_URL_MIGRATION`:
  - use **Session mode** (porta 5432), para rodar migration/seed.

## 3) Aplicar schema no banco remoto (Supabase)

No PowerShell:

```powershell
$env:DATABASE_URL="DATABASE_URL_MIGRATION"
corepack pnpm db:migrate:deploy
corepack pnpm db:seed
```

## 4) Criar projeto na Vercel

### Opção UI (recomendada)

1. Em Vercel, clique em **Add New Project**.
2. Selecione o repositório GitHub.
3. Defina:
- Framework: Next.js
- Root Directory: `apps/web`

### Variáveis de ambiente na Vercel (Production e Preview)

- `DATABASE_URL` = `DATABASE_URL_RUNTIME`
- `NEXTAUTH_SECRET` = segredo forte
- `NEXTAUTH_URL` = URL final do projeto (`https://seu-projeto.vercel.app`)
- `JOBS_SYNC` = `true`
- `STORAGE_DRIVER` = `local`
- `STORAGE_LOCAL_DIR` = `/tmp/uploads`

Gerar `NEXTAUTH_SECRET`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 5) Deploy e validação

- Faça o primeiro deploy na Vercel.
- Acesse a URL pública.
- Login:
  - Email: `admin@demo.local`

## 6) Fluxo de teste com seu sócio

1. Login.
2. `/documents/upload` e envio de `nfe-teste.xml`.
3. Abrir documento e calcular.
4. Validar abas:
- `Legado (ICMS/ISS)`
- `IBS/CBS`
- `Transição (Final)`
5. Revisar `/dashboard`, `/scenarios`, `/reports`.

## 7) Operação contínua

```powershell
git add .
git commit -m "feat: ... "
git push
```

A Vercel fará deploy automático.
