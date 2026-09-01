# Secrets Necessários — CI/CD WorkControl

## GitHub Repository Secrets

Configure em: **Settings → Secrets and variables → Actions → New repository secret**

### Deploy Vercel (Obrigatório)

| Secret | Como obter |
|--------|-----------|
| `VERCEL_TOKEN` | Vercel Dashboard → Settings → Tokens → Create Token |
| `VERCEL_ORG_ID` | Vercel Dashboard → Settings → General → **Team ID** (ou seu personal ID) |
| `VERCEL_PROJECT_ID` | Vercel Dashboard → Seu projeto → Settings → General → **Project ID** |

### Supabase (Obrigatório para Build)

| Secret | Como obter |
|--------|-----------|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon public` key |

### Testes E2E (Opcional — para smoke tests autenticados)

| Secret | Descrição |
|--------|-----------|
| `E2E_TEST_EMAIL` | Email de uma conta de teste no Supabase |
| `E2E_TEST_PASSWORD` | Senha dessa conta de teste |

### Notificações (Opcional)

| Secret | Como obter |
|--------|-----------|
| `SLACK_WEBHOOK_URL` | Slack → Apps → Incoming Webhooks → Add New Webhook |
| `GITLEAKS_LICENSE` | https://gitleaks.io/products.html (versão free não precisa) |

---

## Permissões do GitHub Actions

Ative em: **Settings → Actions → General → Workflow permissions**

- [x] **Read and write permissions**
- [x] **Allow GitHub Actions to create and approve pull requests**

---

## Branch Protection Rules

Configure em: **Settings → Branches → Add rule** para a branch `main`:

- [x] Require a pull request before merging
- [x] Require status checks to pass before merging
  - Adicionar: `CI Status Gate` (de ci.yml)
  - Adicionar: `CodeQL Analysis` (de codeql.yml)
- [x] Require conversation resolution before merging
- [x] Include administrators


## Vercel Project Setup

### 1. Instalar Vercel CLI e fazer login
```bash
npm i -g vercel
vercel login
```

### 2. Vincular o projeto ao Vercel
Execute na raiz do projeto (somente uma vez):
```bash
vercel link
```
Isso cria o arquivo `.vercel/project.json` com o `orgId` e `projectId`.

### 3. Obter os IDs para os secrets
```bash
# Mostra o project ID e org ID
cat .vercel/project.json
```

### 4. Configurar variáveis de ambiente no Vercel
No Vercel Dashboard → Seu projeto → **Settings → Environment Variables**:
- `VITE_SUPABASE_URL` → Production + Preview + Development
- `VITE_SUPABASE_ANON_KEY` → Production + Preview + Development

> ⚠️ O arquivo `.vercel/` deve estar no `.gitignore` (já está configurado ou adicione manualmente).
