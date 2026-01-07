# CRM Sette SAS

## Setup

1. Instale as dependências: `npm install`
2. Configure o `.env.local` com as chaves do Supabase.
3. Execute o SQL de migração no painel do Supabase: `migration.sql`
4. Execute o script de inicialização: `node scripts/init.js`

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

1. Execute `npm run build`
2. Deploy a pasta `dist` no Vercel ou Netlify.
