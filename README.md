# CRM Sette SAS

## Setup

1. Instale as dependências: `npm install`
2. Configure o `.env.local` com as chaves do Supabase.
3. Execute o SQL abaixo no painel do Supabase para criar tabelas organizadas.

## SQL para Supabase

```sql
-- Criar tabelas organizadas
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  auth_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'SELLER'))
);

CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  tipo_cliente TEXT CHECK (tipo_cliente IN ('PF', 'PJ', 'ADESAO')),
  cpf_cnpj TEXT,
  rg_ie TEXT,
  data_nascimento_abertura TEXT,
  dados_responsavel JSONB,
  havera_remissao BOOLEAN,
  operadora TEXT,
  produto TEXT,
  valor_produto NUMERIC,
  reducao_carencia BOOLEAN,
  coparticipacao TEXT,
  vigencia TEXT,
  endereco JSONB,
  beneficiarios JSONB,
  mensagens JSONB,
  documentos JSONB,
  origem TEXT,
  raw_json JSONB,
  vendedor TEXT,
  vendedor_email TEXT,
  vendedor_id INTEGER REFERENCES users(id),
  status_kanban TEXT CHECK (status_kanban IN ('ENVIADA', 'ANÁLISE', 'IMPLANTADA', 'CANCELADA')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

4. Execute o script de inicialização: `node scripts/init.js`

Isso criará 5 usuários (com senhas '123') e 6 leads iniciais.

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
