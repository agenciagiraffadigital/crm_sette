# 🚀 Deploy - CRM Sette

## 🎯 Problema Resolvido

Erro de "API key inválida" no dev.settesaude.com.br foi causado porque o build não especificava qual ambiente usar.

**Solução:** Usar `npm run build:dev` para DEV e `npm run build:prod` para PROD.

---

## 📁 Estrutura de Ambientes

```
.env.development  → Banco DEV (local + dev.settesaude.com.br)
.env.production   → Banco PROD (sistema.settesaude.com.br)
.env.local        → Override local (não commitado)
```

---

## 🔧 Deploy Manual no Servidor

### DEV (dev.settesaude.com.br)

```bash
ssh usuario@dev.settesaude.com.br
cd /var/www/crm_sette
bash deploy/deploy-dev.sh
```

### PROD (sistema.settesaude.com.br)

```bash
ssh usuario@sistema.settesaude.com.br
cd /var/www/crm_sette
bash deploy/deploy-prod.sh
```

---

## 🤖 Deploy Automático (GitHub Actions)

- **Push para `develop`** → Deploy automático para DEV
- **Push para `master`** → Deploy automático para PROD

O GitHub Actions já está configurado para usar `build:dev` e `build:prod` automaticamente.

---

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento local
npm run dev

# Build
npm run build:dev   # Para DEV
npm run build:prod  # Para PROD

# Verificar configuração
npm run check:env:dev
npm run check:env:prod

# Monitoramento
pm2 status
pm2 logs crm-webhook
pm2 restart crm-webhook
```

---

## 🔍 Troubleshooting

### Erro "API key inválida"

```bash
# No servidor
cd /var/www/crm_sette
npm run build:dev  # ou build:prod
pm2 restart crm-webhook
```

### Build falha

```bash
rm -rf dist/ node_modules/.vite/
npm ci
npm run build:dev
```

---

## 🔐 Edge Functions (Supabase)

As Edge Functions (webhook-handler e send-notification) precisam de secrets configuradas no painel do Supabase:

1. Acesse https://supabase.com → Projeto DEV
2. Settings → Edge Functions → Secrets
3. Adicione:
   - `PROJECT_URL`: https://cmeusxhjciomrjhgpgzf.supabase.co
   - `SERVICE_ROLE_KEY`: (sua service role key)

**Deploy das functions:**
```bash
supabase login
supabase link --project-ref cmeusxhjciomrjhgpgzf
supabase functions deploy webhook-handler
supabase functions deploy send-notification
```

---

## ⚠️ Importante

- ✅ `.env.development` pode ser commitado (banco de teste)
- ❌ `.env.production` nunca commite com credenciais reais
- ✅ Configure `.env.production` direto no servidor de produção
- ✅ Sempre teste no DEV antes de ir para PROD
