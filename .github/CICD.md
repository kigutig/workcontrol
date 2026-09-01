# 🛡️ CI/CD & DevSecOps — WorkControl

Pipeline completo de integração e entrega contínua com segurança integrada (DevSecOps).

---

## 📊 Status dos Workflows

| Workflow | Trigger | Descrição |
|----------|---------|-----------|
| `ci.yml` | Push/PR | Lint, types, audit, testes, build |
| `security.yml` | Push main + semanal | SBOM, Trivy, OWASP, Semgrep |
| `cd.yml` | Push main / PR | Deploy Cloudflare Pages |
| `codeql.yml` | Push/PR + semanal | SAST avançado |

---

## 🏗️ Arquitetura do Pipeline

```
PR Aberto
    │
    ├─► 🧹 quality (lint, types, prettier)
    ├─► 🔒 security-quick (npm audit, gitleaks)
    ├─► 🔎 dependency-review (GitHub)
    ├─► 🔬 CodeQL SAST
    │
    ├─► 🧪 test (vitest + coverage)        → depende de quality
    ├─► 🏗️ build (vite build)               → depende de quality + security
    │
    └─► 🚀 preview deploy (Cloudflare)    → depende do build
         └─► 🎭 E2E smoke tests (Playwright)

Push para main
    │
    ├─► [todos os jobs do PR acima]
    ├─► 🛡️ security.yml completo (SBOM, Trivy, OWASP, Semgrep)
    ├─► 🏭 production deploy (Cloudflare)
    │    ├─► 🎭 E2E production tests
    │    ├─► 🏠 Lighthouse CI
    │    ├─► 🏷️ Release tag automático
    │    └─► 📢 Notificação Slack

Semanal (seg/qua)
    ├─► 🛡️ security.yml (scan completo)
    └─► 🔬 codeql.yml (análise completa)
```

---

## 🧪 Testes

### Unitários (Vitest)

```bash
npm run test              # Executa uma vez
npm run test:watch        # Modo watch (desenvolvimento)
npm run test:coverage     # Com relatório de cobertura
```

**Testes incluídos:**
- `src/__tests__/lib/security.test.ts` — 40+ casos de teste de segurança
- `src/__tests__/lib/task-utils.test.ts` — lógica de negócio das tarefas
- `src/__tests__/lib/utils.test.ts` — utilitário `cn()`

### E2E (Playwright)

```bash
npm run test:e2e          # Todos os testes E2E
npm run test:e2e:headed   # Com browser visível
npm run test:e2e:ui       # Interface gráfica do Playwright
npm run test:security     # Apenas testes de segurança
```

**Testes incluídos:**
- `e2e/auth.spec.ts` — fluxo de autenticação
- `e2e/dashboard.spec.ts` — smoke do dashboard
- `e2e/security.spec.ts` — headers, XSS, CSP

---

## 🛡️ DevSecOps — Ferramentas de Segurança

| Ferramenta | Tipo | O que detecta |
|-----------|------|---------------|
| **npm audit** | SCA | Vulnerabilidades em dependências |
| **Gitleaks** | Secret Scan | Secrets e tokens no código |
| **GitHub Dependency Review** | SCA | Deps com vulnerabilidades em PRs |
| **Trivy** | SCA + IaC | CVEs no filesystem e misconfigurations |
| **OWASP Dependency-Check** | SCA | Vulnerabilidades (banco NVD) |
| **Semgrep** | SAST | Padrões inseguros: XSS, SQLi, OWASP Top 10 |
| **CodeQL** | SAST | Análise de fluxo de dados, taint tracking |
| **CycloneDX SBOM** | Supply Chain | Inventário completo de dependências |

---

## ⚙️ Configuração Necessária

### Secrets no GitHub

Ver [`.github/SECRETS.md`](.github/SECRETS.md) para instruções completas.

**Obrigatórios:**
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Branch Protection (main)

- Requer PR antes de merge
- Requer `CI Status Gate` passar
- Requer `CodeQL Analysis` passar
- Requer review do CODEOWNER

---

## 📁 Estrutura de Arquivos

```
.github/
├── workflows/
│   ├── ci.yml          # CI principal
│   ├── security.yml    # DevSecOps scan
│   ├── cd.yml          # Deploy Cloudflare
│   └── codeql.yml      # SAST CodeQL
├── dependabot.yml      # Updates automáticos
├── CODEOWNERS          # Owners obrigatórios
├── SECRETS.md          # Documentação de secrets
├── owasp-suppression.xml
└── pull_request_template.md

src/
├── __tests__/
│   ├── setup.ts        # Setup global dos testes
│   └── lib/
│       ├── security.test.ts
│       ├── task-utils.test.ts
│       └── utils.test.ts
└── lib/
    └── security.ts     # Utilitários de segurança

e2e/
├── auth.spec.ts        # Testes de autenticação
├── dashboard.spec.ts   # Testes do dashboard
└── security.spec.ts    # Testes de segurança

vitest.config.ts        # Configuração Vitest
playwright.config.ts    # Configuração Playwright
.gitleaks.toml         # Config secret scanning
```
