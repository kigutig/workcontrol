# Secrets Necessários — CI/CD WorkControl

## GitHub Repository Secrets

Configure em: **Settings → Secrets and variables → Actions → New repository secret**

### Deploy (Obrigatório)

| Secret | Como obter |
|--------|-----------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Dashboard → My Profile → API Tokens → Create Token (use template "Edit Cloudflare Workers") |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → lado direito da página inicial |

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

---

## Cloudflare Pages Setup

1. Vá em Cloudflare Dashboard → **Workers & Pages → Create application → Pages**
2. Conecte ao repositório GitHub
3. Configure:
   - **Project name**: `workcontrol`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Environment variables**: Adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
