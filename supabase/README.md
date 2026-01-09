# Supabase Edge Functions

Este diretório contém as Edge Functions do Supabase para o CRM Sette SAS.

## Funções Disponíveis

### 1. webhook-handler
Processa webhooks externos e cria oportunidades no sistema.

**Endpoint**: `https://your-project.supabase.co/functions/v1/webhook-handler`

**Funcionalidades**:
- Recebe dados de leads via webhook
- Distribui leads usando round-robin entre vendedores ativos
- Cria oportunidades na tabela `opportunities`
- Registra logs de auditoria
- Atualiza estatísticas de atribuição dos vendedores

### 2. send-notification
Envia notificações em tempo real para usuários.

**Endpoint**: `https://your-project.supabase.co/functions/v1/send-notification`

**Funcionalidades**:
- Cria registros de notificação
- Envia notificações via Supabase Realtime
- Suporta diferentes tipos de notificação

## Configuração

### 1. Instalar Supabase CLI
```bash
npm install -g supabase
```

### 2. Login no Supabase
```bash
supabase login
```

### 3. Configurar Secrets
```bash
# Configure as variáveis de ambiente seguras
supabase secrets set PROJECT_URL=https://your-project.supabase.co
supabase secrets set SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Deploy das Funções
```bash
# Deploy webhook handler
supabase functions deploy webhook-handler --project-ref YOUR_PROJECT_REF

# Deploy notification sender
supabase functions deploy send-notification --project-ref YOUR_PROJECT_REF
```

## Desenvolvimento Local

### 1. Iniciar Supabase Local
```bash
supabase start
```

### 2. Servir Funções Localmente
```bash
supabase functions serve
```

As funções estarão disponíveis em:
- `http://localhost:54321/functions/v1/webhook-handler`
- `http://localhost:54321/functions/v1/send-notification`

## Segurança

### Secrets Management
Todas as credenciais sensíveis são armazenadas como secrets do Supabase:
- `SUPABASE_URL`: URL do projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Chave de service role para operações privilegiadas

### CORS
As funções incluem headers CORS apropriados para permitir requisições do frontend.

### Validação
Todas as funções incluem validação robusta de entrada e tratamento de erros.

## Monitoramento

### Logs
Acesse os logs das funções no dashboard do Supabase:
1. Vá para o projeto no Supabase Dashboard
2. Navegue para "Edge Functions"
3. Selecione a função desejada
4. Visualize logs em tempo real

### Métricas
O dashboard do Supabase fornece métricas de:
- Número de invocações
- Tempo de resposta
- Taxa de erro
- Uso de recursos

## Exemplo de Uso

### Webhook Handler
```bash
curl -X POST https://your-project.supabase.co/functions/v1/webhook-handler \
  -H "Content-Type: application/json" \
  -d '{
    "value": [{
      "contact": {
        "name": "João Silva",
        "email": "joao@example.com",
        "phone": "11999999999"
      },
      "sales_channel": {
        "name": "Website"
      }
    }]
  }'
```

### Send Notification
```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "user_id": 1,
    "type": "NEW_OPPORTUNITY",
    "title": "Nova Oportunidade",
    "message": "Uma nova oportunidade foi atribuída a você"
  }'
```

## Migração do Servidor Node.js

As Edge Functions substituem completamente o servidor Node.js (`server/index.cjs`). 

**Vantagens**:
- ✅ Serverless (sem necessidade de manter servidor)
- ✅ Escalabilidade automática
- ✅ Secrets management integrado
- ✅ Logs e monitoramento nativos
- ✅ Menor latência (edge computing)
- ✅ Menor custo operacional

**Para migrar**:
1. Deploy das Edge Functions
2. Atualizar URLs de webhook nos sistemas externos
3. Remover servidor Node.js local
4. Atualizar documentação e scripts