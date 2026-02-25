# CRM Sette SAS

## 📚 Documentação

**[DEPLOY.md](DEPLOY.md)** - Guia de deploy e troubleshooting

## Ambientes

### 🚀 Produção
- **URL:** sistema.settesaude.com.br
- **Branch:** `master`
- **Deploy:** Automático via GitHub Actions

### 🔧 Desenvolvimento  
- **URL:** dev.settesaude.com.br
- **Branch:** `develop`
- **Deploy:** Automático via GitHub Actions

## Workflow de Desenvolvimento

1. **Desenvolver na branch `develop`**
2. **Push para `develop`** → deploy automático para dev.settesaude.com.br
3. **Testar no ambiente de dev**
4. **Quando estiver OK:** PR de `develop` para `master`
5. **Merge do PR** → deploy automático para sistema.settesaude.com.br

## Setup

1. Instale as dependências: `npm install`
2. Configure o `.env.local` com as chaves do Supabase.
3. Execute o SQL de migração no painel do Supabase: `migration.sql`
4. **NOVO:** Execute a migração para ambiente de desenvolvimento: `migration-leads-dev.sql`
5. Execute o script de inicialização: `node scripts/init.js`

## Ambientes de Dados

### 🔄 Separação Automática de Tabelas
O sistema agora detecta automaticamente o ambiente e usa a tabela apropriada:

- **Desenvolvimento/Local:** `leads_dev` (dados de teste)
- **Produção:** `leads` (dados reais)

### ✅ Detecção Automática
O ambiente é detectado por:
- `localhost` ou `127.0.0.1`
- `dev.settesaude.com.br`
- `import.meta.env.DEV === true`
- `import.meta.env.MODE === 'development'`

### 🧪 Testando o Ambiente
```bash
node scripts/test-environment.js
```

## Migração para Supabase Auth

O sistema agora usa autenticação nativa do Supabase:

### Passos da Migração
1. **Execute migration.sql** no painel SQL do Supabase
2. **Execute init.js** para criar usuários de teste
3. **Teste o login** com os usuários criados

### Usuários Criados
- admin@sette.com.br / 123 (ADMIN)
- joao@sette.com.br / 123 (SELLER)
- maria@sette.com.br / 123 (SELLER)
- pedro@sette.com.br / 123 (SELLER)
- ana@sette.com.br / 123 (SELLER)

### Funcionalidades
- ✅ Login/logout seguro via Supabase Auth
- ✅ Senhas hasheadas automaticamente
- ✅ Sessões JWT gerenciadas automaticamente
- ✅ RLS (Row Level Security) implementado
- ✅ Vendedores veem apenas seus leads
- ✅ Admins têm acesso total
- ✅ Reset de senha via interface admin

## Testando o Projeto

1. Execute `npm run dev` para iniciar o servidor local.
2. Acesse `http://localhost:3000` no navegador.
3. Faça login com um dos usuários criados (ex: admin@sette.com.br / 123).
4. Verifique os leads no dashboard.

Para testar webhooks do Make:
- Configure o webhook no Make para enviar POST para `https://your-domain.com/api/webhook` com JSON: `{"nome": "Nome", "email": "email@test.com", "telefone": "11999999999"}`.
- No código, o endpoint seria algo como `/api/webhook` que chama `simulateWebhookIngestion`.

## Deploy

### Deploy Manual
Veja **[DEPLOY.md](DEPLOY.md)** para instruções completas.

### Deploy Automático

### Deploy Manual no Servidor
```bash
# DEV
ssh usuario@dev.settesaude.com.br
cd /var/www/crm_sette
bash deploy/deploy-dev.sh

# PROD
ssh usuario@sistema.settesaude.com.br
cd /var/www/crm_sette
bash deploy/deploy-prod.sh
```

### Deploy Manual no Servidor
```bash
# DEV
ssh usuario@dev.settesaude.com.br
cd /var/www/crm_sette
bash deploy/deploy-dev.sh

# PROD
ssh usuario@sistema.settesaude.com.br
cd /var/www/crm_sette
bash deploy/deploy-prod.sh
```