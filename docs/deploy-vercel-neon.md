# Deploy remoto para validação (Vercel + Neon)

Este guia permite que outra pessoa acesse o sistema pela internet e teste o estado atual do produto.

## O que já foi preparado no código

- Monorepo com `apps/web` (Next.js) e pacotes compartilhados.
- Migration Prisma da transição já criada/aplicada no projeto.
- Seed pronto para criar usuário `admin@demo.local`.
- Storage local ajustado para usar `/tmp/uploads` em ambiente Vercel (evita erro de escrita em filesystem read-only).

## Limitação importante

- Em Vercel, arquivos em `/tmp` são efêmeros.
- O upload XML funciona para o fluxo de teste imediato, mas não é armazenamento permanente.
- Para produção real, usar storage S3 (adaptador ainda está placeholder no MVP).

## Pré-requisitos na sua máquina

- Node.js 20+
- pnpm/corepack
- Git
- Conta GitHub
- Conta Neon
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

## 2) Criar banco no Neon

- Crie um projeto no Neon.
- Copie a `DATABASE_URL` (postgresql://...).

## 3) Aplicar schema no banco remoto

No PowerShell (mesma máquina do projeto):

```powershell
$env:DATABASE_URL="SUA_DATABASE_URL_DO_NEON"
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

### Variáveis de ambiente (Production e Preview)

- `DATABASE_URL` = URL do Neon
- `NEXTAUTH_SECRET` = segredo forte
- `NEXTAUTH_URL` = URL final do projeto na Vercel (`https://seu-projeto.vercel.app`)
- `JOBS_SYNC` = `true`
- `STORAGE_DRIVER` = `local`
- `STORAGE_LOCAL_DIR` = `/tmp/uploads`

`NEXTAUTH_SECRET` (gerar localmente):

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 5) Deploy e validação

- Faça o primeiro deploy.
- Acesse a URL pública da Vercel.
- Login:
  - Email: `admin@demo.local`

## 6) Fluxo recomendado de teste com seu sócio

1. Fazer login.
2. Ir em `/documents/upload`.
3. Enviar `nfe-teste.xml`.
4. Abrir o documento.
5. Rodar cálculo e validar abas:
- `Legado (ICMS/ISS)`
- `IBS/CBS`
- `Transição (Final)`
6. Conferir `/dashboard`, `/scenarios`, `/reports`.

## 7) Operação contínua (sempre que subir mudança)

```powershell
git add .
git commit -m "feat: ... "
git push
```

A Vercel fará deploy automático.
