# Guia de Migração para Supabase Edge Functions

Este guia explica como migrar do servidor Node.js local para as Supabase Edge Functions.

## 🎯 Objetivos da Migração

- ✅ **Serverless**: Eliminar necessidade de manter servidor próprio
- ✅ **Segurança**: Secrets gerenciados pelo Supabase
- ✅ **Escalabilidade**: Auto-scaling automático
- ✅ **Performance**: Edge computing com menor latência
- ✅ **Custo**: Redução significativa de custos operacionais
- ✅ **Monitoramento**: Logs e métricas nativas

## 📋 Pré-requisitos

1. **Supabase CLI instalado**:
   ```bash
   npm install -g supabase
   ```

2. **Login no Supabase**:
   ```bash
   supabase login
   ```

3. **Projeto Supabase configurado**

## 🚀 Passo a Passo

### 1. Configurar Secrets

No dashboard do Supabase ou via CLI:

```bash
# Via CLI
supabase secrets set PROJECT_URL=https://your-project.supabase.co
supabase secrets set SERVICE_ROLE_KEY=your-service-role-key

# Via Dashboard
# 1. Acesse seu projeto no Supabase Dashboard
# 2. Vá para "Edge Functions" > "Settings"
# 3. Adicione os secrets necessários
```

### 2. Deploy das Edge Functions

```bash
# Deploy webhook handler
supabase functions deploy webhook-handler --project-ref YOUR_PROJECT_REF

# Deploy notification sender
supabase functions deploy send-notification --project-ref YOUR_PROJECT_REF
```

### 3. Executar Migrações do Banco

Execute o arquivo de migração para criar a tabela de notificações:

```sql
-- Execute no SQL Editor do Supabase Dashboard
-- Ou via CLI: supabase db push
```

### 4. Atualizar URLs nos Sistemas Externos

**Antes** (servidor local):
```
http://localhost:4000/webhook
```

**Depois** (Edge Function):
```
https://your-project.supabase.co/functions/v1/webhook-handler
```

### 5. Testar as Funções

#### Teste do Webhook Handler:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/webhook-handler \
  -H "Content-Type: application/json" \
  -d '{
    "value": [{
      "contact": {
        "name": "Teste",
        "email": "teste@example.com",
        "phone": "11999999999"
      },
      "sales_channel": {
        "name": "Website"
      }
    }]
  }'
```

#### Teste do Send Notification:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "user_id": 1,
    "type": "NEW_OPPORTUNITY",
    "title": "Teste",
    "message": "Notificação de teste"
  }'
```

## 🔧 Configurações Adicionais

### 1. Atualizar Frontend

Adicione o componente NotificationCenter ao layout principal:

```tsx
import { NotificationCenter } from './components/NotificationCenter';

// No seu Layout component
<NotificationCenter currentUser={currentUser} />
```

### 2. Configurar Realtime

Certifique-se de que o Realtime está habilitado no seu projeto Supabase:

1. Vá para "Settings" > "API"
2. Verifique se "Realtime" está habilitado
3. Configure as tabelas que precisam de realtime

### 3. Configurar RLS (Row Level Security)

As migrações já incluem as políticas RLS necessárias, mas verifique se estão ativas:

```sql
-- Verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('notifications', 'opportunities', 'activity_logs');
```

## 📊 Monitoramento

### 1. Logs das Edge Functions

Acesse no Supabase Dashboard:
- Edge Functions > [Nome da Função] > Logs

### 2. Métricas

Monitore no dashboard:
- Número de invocações
- Tempo de resposta médio
- Taxa de erro
- Uso de recursos

### 3. Alertas (Opcional)

Configure alertas para:
- Taxa de erro alta (>5%)
- Tempo de resposta alto (>2s)
- Falhas de webhook

## 🗑️ Limpeza

Após confirmar que tudo está funcionando:

### 1. Remover Servidor Node.js

```bash
# Parar processos
pm2 stop crm-webhook
pm2 delete crm-webhook

# Remover arquivos (opcional)
rm -rf server/
```

### 2. Atualizar Scripts

Remova ou atualize scripts relacionados ao servidor local:

```json
// package.json - remover ou atualizar
{
  "scripts": {
    // "webhook:dev": "node server/index.cjs", // Remover
    // "start": "node server/index.cjs", // Remover
  }
}
```

### 3. Atualizar Documentação

- README.md
- Documentação de deploy
- Guias de desenvolvimento

## 🚨 Troubleshooting

### Problema: Edge Function não responde

**Solução**:
1. Verifique se os secrets estão configurados
2. Verifique logs da função
3. Teste localmente com `supabase functions serve`

### Problema: Erro de CORS

**Solução**:
1. Verifique se os headers CORS estão corretos na função
2. Teste com diferentes origins

### Problema: Webhook não cria oportunidades

**Solução**:
1. Verifique se a tabela `users_profile` tem vendedores ativos
2. Verifique se as políticas RLS estão corretas
3. Verifique logs da função para erros específicos

### Problema: Notificações não chegam em tempo real

**Solução**:
1. Verifique se Realtime está habilitado
2. Verifique se o cliente está subscrito corretamente
3. Teste a função de notificação isoladamente

## 📈 Benefícios Alcançados

Após a migração, você terá:

- ✅ **Zero manutenção de servidor**
- ✅ **Escalabilidade automática**
- ✅ **Segurança aprimorada**
- ✅ **Monitoramento nativo**
- ✅ **Menor latência global**
- ✅ **Redução de custos**
- ✅ **Deploy simplificado**

## 🔄 Rollback (Se Necessário)

Se precisar voltar ao servidor Node.js:

1. Reative o servidor local
2. Atualize URLs nos sistemas externos
3. Mantenha as Edge Functions como backup

## 📞 Suporte

- [Documentação Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Discord](https://discord.supabase.com/)
- [GitHub Issues](https://github.com/supabase/supabase/issues)