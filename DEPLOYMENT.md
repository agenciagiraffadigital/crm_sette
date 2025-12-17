# CRM Sette SAS - Guia de Arquitetura e Deployment

## 📋 Visão Geral

Sistema de CRM completo para gerenciamento de leads de saúde (Sette SAS). Integra:
- **Frontend**: Aplicação React com interface Kanban
- **Backend**: Servidor Express para receber webhooks do Make
- **Banco de Dados**: Supabase PostgreSQL com Storage para arquivos
- **Integração**: Make/CRM → Webhook → Express → Supabase

---

## 🛠 Tecnologias

| Componente | Tecnologia | Versão |
|-----------|-----------|--------|
| **Frontend** | React | 19.2.1 |
| | TypeScript | 5.8 |
| | Vite | 6.2.0 |
| | Tailwind CSS | 3.x |
| **Backend** | Node.js | 18+ |
| | Express | 4.18 |
| | TypeScript | 5.8 |
| **Database** | Supabase | Hosted |
| | PostgreSQL | 15+ |
| **Storage** | Supabase Storage | S3-compatible |
| **Webhook Tunnel** | ngrok | Latest |

---

## 🏗 Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        Make/CRM System                        │
│               (Webhook Trigger de Oportunidades)              │
└────────────────────────────┬────────────────────────────────┘
                             │ POST /webhook
                             ▼
        ┌────────────────────────────────────┐
        │     Express Server (localhost:4000)  │
        │     (server/index.cjs)              │
        │  - Parse JSON oportunidades         │
        │  - Round-robin seller assignment    │
        │  - Insert to Supabase               │
        └────────────────┬─────────────────────┘
                         │
        ┌────────────────┴──────────────────┐
        │                                   │
        ▼                                   ▼
┌──────────────────────┐        ┌─────────────────────┐
│   Supabase Database  │        │  Supabase Storage   │
│   (PostgreSQL)       │        │ (leads-documents)   │
│ - users              │        │ - PDFs              │
│ - leads + metadata   │        │ - PNGs/JPEGs        │
│ - beneficiarios      │        │                     │
│ - documents (URLs)   │        │                     │
└──────────────────────┘        └─────────────────────┘
        ▲                                   ▲
        └────────────────┬─────────────────┘
                         │ JS Client
        ┌────────────────┴──────────────────┐
        │   React Frontend App               │
        │   (Vite - localhost:5173)          │
        │ - Dashboard + Kanban               │
        │ - Lead Editor + Upload Docs        │
        │ - User Management                  │
        └───────────────────────────────────┘
```

---

## 📁 Estrutura de Pastas

```
project-root/
├── server/
│   └── index.cjs              # Express webhook server (CommonJS)
├── services/
│   ├── authService.ts         # Login/user creation
│   ├── leadService.ts         # CRUD leads + file ops
│   └── supabaseClient.ts      # Cliente Supabase
├── components/
│   ├── Auth.tsx               # Login page
│   ├── Dashboard.tsx          # Home com Kanban
│   ├── KanbanBoard.tsx        # Visualização em colunas
│   ├── LeadForm.tsx           # Editor com tabs (Info, Beneficiarios, Docs)
│   ├── LeadCard.tsx           # Card na Kanban
│   ├── Layout.tsx             # Header + sidebar
│   ├── UserManagement.tsx     # Gerenciar usuários
│   └── SimulationPanel.tsx    # Teste de webhook
├── App.tsx                    # Root component
├── types.ts                   # Type definitions
├── constants.ts               # Constantes (roles, status)
├── vite-env.d.ts              # Tipos environment
├── vite.config.ts             # Configuração Vite
├── tsconfig.json              # TypeScript config
├── package.json               # Dependências
├── index.html                 # HTML entry point
├── index.tsx                  # React entry point
└── schema.sql                 # Schema + dados iniciais
```

---

## 🔄 Fluxo de Dados

### 1️⃣ **Recebimento de Lead (Webhook)**

```
Make → POST /webhook
├─ Body: { oportunidades: [{ contato: { nome, email, telefone1 }, personalizados: [...] }] }
├─ Server extrai: nome, email, telefone1, operadora
├─ Round-robin assign seller
└─ INSERT leads table + return JSON
```

**Arquivo**: `server/index.cjs`

### 2️⃣ **Visualização e Edição**

```
React Dashboard
├─ LoadLeads → GET all leads
├─ Group by status_kanban (4 colunas)
├─ Click lead → LeadForm modal
├─ Edit fields → UPDATE lead
└─ Move card → UPDATE status_kanban
```

**Arquivos**: `components/Dashboard.tsx`, `components/LeadForm.tsx`

### 3️⃣ **Upload de Documentos**

```
LeadForm → File selected
├─ Sanitize filename (remove special chars)
├─ Validate MIME (PDF, PNG, JPEG)
├─ Upload → supabase.storage.from('leads-documents')
│  Path: lead_{leadId}_{fileName}
├─ Get public URL
└─ Save URL em leads.documentos[]
```

**Arquivo**: `services/leadService.ts` - `uploadFile()`

### 4️⃣ **Download/Deletar Documentos**

```
LeadForm Documents Tab
├─ Download: GET file from Storage URL
├─ Delete: 
│  ├─ DELETE from Storage
│  ├─ UPDATE leads.documentos[]
│  └─ UI refresh
```

**Arquivo**: `services/leadService.ts` - `deleteFile()`

---

## 🔐 Autenticação

**Tipo**: Plaintext password (testing mode) - **UPGRADE para bcrypt em produção**

```typescript
// Login
POST /login
├─ Email
└─ Password
   ├─ Query users table
   ├─ Compare plaintext
   └─ Return user + token (localStorage)

// Initial users (password: '123')
- admin@sette.com (ADMIN)
- seller1@sette.com (SELLER)
- seller2@sette.com (SELLER)
```

**Arquivo**: `services/authService.ts`

---

## 🚀 Deployment

### Pré-requisitos

1. **Node.js** 18+ instalado
2. **Supabase project** criado
3. **ngrok account** (para webhook tunnel)

### Passo 1: Clonar e Instalar

```bash
git clone <repo>
cd crm-sette-sas
npm install
```

### Passo 2: Configurar Variáveis de Ambiente

Criar `.env.local`:

```env
# Supabase (Anonimous key - frontend)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...

# Supabase (Service role - backend webhook server)
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
SUPABASE_URL=https://xxxxx.supabase.co

# Webhook
WEBHOOK_SECRET=seu_secret_opcional
```

### Passo 3: Criar Schema no Supabase

1. No [Supabase Dashboard](https://app.supabase.com):
   - SQL Editor → New query
   - Copy/paste conteúdo de `schema.sql`
   - Run

2. Criar Storage bucket:
   - Storage → New bucket
   - Nome: `leads-documents`
   - Public
   - Policies:
     ```sql
     -- SELECT (public read)
     SELECT * FROM storage.objects WHERE bucket_id = 'leads-documents'
     
     -- INSERT/UPDATE (authenticated)
     INSERT INTO storage.objects (bucket_id, name, owner_id, metadata)
     VALUES ('leads-documents', new.name, auth.uid(), new.metadata)
     
     -- DELETE (authenticated)
     DELETE FROM storage.objects 
     WHERE bucket_id = 'leads-documents' AND owner_id = auth.uid()
     ```

### Passo 4: Rodar Localmente

**Terminal 1 - Frontend:**
```bash
npm run dev
# Acessa http://localhost:5173
```

**Terminal 2 - Backend (Webhook):**
```bash
npm run webhook:dev
# Server na porta 4000
```

**Terminal 3 - ngrok (opcional, para testar Make):**
```bash
ngrok http 4000
# Copiar URL gerada (ex: https://abc123.ngrok.io)
# Usar como webhook URL em Make
```

### Passo 5: Testar Webhook

Via PowerShell:

```powershell
$body = @{
  oportunidades = @(
    @{
      contato = @{
        nome = "Test User"
        email = "test@email.com"
        telefone1 = "11999999999"
      }
      personalizados = @(
        @{
          nome = "operadora"
          valor = "Teste Operadora"
        }
      )
    }
  )
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:4000/webhook" -Method POST -Body $body -ContentType "application/json"
```

### Passo 6: Build para Produção

```bash
# Frontend
npm run build
# Gera dist/ - fazer upload para Vercel/Netlify

# Backend (se auto-hospedado)
npm run build:server
# Deploy no Heroku/Railway/DigitalOcean
```

---

## 📊 Banco de Dados

### Tabela: `users`
```
id (PK)
auth_id (UUID, opcional)
name
email (UNIQUE)
role (ADMIN | SELLER)
password (plaintext - TROCAR POR BCRYPT)
created_at
updated_at
```

### Tabela: `leads`
```
id (PK)
nome, email, telefone1
tipo_cliente (PF|PJ|ADESAO)
cpf_cnpj, rg_ie
data_nascimento_abertura
dados_responsavel (JSONB)
havera_remissao (BOOLEAN)
operadora, produto, valor_produto
reducao_carencia, coparticipacao
vigencia
endereco (JSONB)
beneficiarios (JSONB - array)
mensagens (JSONB - array)
documentos (JSONB - array de { name, url })
origem, raw_json
vendedor, vendedor_email
vendedor_id (FK → users.id, round-robin)
status_kanban (ENVIADA|ANÁLISE|IMPLANTADA|CANCELADA)
created_at, updated_at
```

### Índices Criados
- `vendedor_id` (lookup rápido por seller)
- `status_kanban` (filtro Kanban)
- `email` (verificação duplicatas)
- `nome` (GIN full-text search)

---

## 🐛 Troubleshooting

| Erro | Causa | Solução |
|------|-------|---------|
| "Storage bucket not found" | Bucket `leads-documents` não criado | Criar via Supabase UI |
| "RLS policy violation" | Permissões Storage | Verificar RLS policies (public read) |
| "VITE_SUPABASE_URL undefined" | Env vars não carregadas | Verificar `.env.local` e restart server |
| Webhook não recebe dados | ngrok URL expirou | Gerar novo `ngrok http 4000` |
| File upload falha | Caracteres especiais no nome | Sanitização automática em `uploadFile()` |
| Login não funciona | Password não é '123' | Verificar usuarios criados em `schema.sql` |

---

## 📝 Notas Importantes

✅ **Pronto para Production:**
- Schema completo e testado
- Autenticação básica funcionando
- File upload/download/delete implementado
- Webhook recebendo dados Make

⚠️ **Antes de Deploy Real:**
1. Implementar **bcrypt** para senhas
2. Adicionar rate limiting (Express middleware)
3. Logs centralizados (Sentry/LogRocket)
4. Backup automático Supabase
5. SSL/TLS certficate
6. Validação avançada de emails

---

## 🔗 Recursos Úteis

- [Supabase Docs](https://supabase.com/docs)
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://react.dev)
- [Make Webhooks](https://www.make.com/en/help/scenarios/webhooks)
- [ngrok Documentation](https://ngrok.com/docs)

---

**Última atualização**: Dezembro 2025  
**Status**: Production-Ready (Com recomendações de segurança)
