# Implementação de Leads Perdidos

## Arquivos Criados

### Migrations
1. **migration-lost-leads-dev.sql** - Migration para ambiente de desenvolvimento
2. **migration-lost-leads-prod.sql** - Migration para ambiente de produção

### Componentes
1. **LostDialog.tsx** - Dialog para marcar lead como perdido com opções de follow-up

### Scripts
1. **process-followups.js** - Script para processar follow-ups automáticos

## Funcionalidades Implementadas

### 1. Marcar Lead como Perdido
- Botão "Perder" nos cards de leads (LeadCard e ProposalCard)
- Dialog com motivos:
  - Achou caro
  - Não tem interesse
  - Já possui Serviço/Produto semelhante
  - Outros (com campo de texto livre)

### 2. Sistema de Follow-up
- Toggle para ativar/desativar follow-up
- Seleção de data de retorno
- Seleção de status de retorno (Oportunidades/Em Contato/Negociação)
- Processamento automático via função SQL

### 3. Logs de Atividades
- Tabela `lead_activity_logs_dev` / `lead_activity_logs`
- Registro automático de:
  - Lead marcado como perdido
  - Follow-up agendado
  - Mudanças de status
- Exibição no formulário do lead (tab Histórico)

### 4. Campos Adicionados nas Tabelas

**leads_dev / leads:**
- `motivo_perda` - Motivo da perda
- `motivo_perda_detalhes` - Detalhes quando "Outros"
- `data_perda` - Data/hora da perda
- `followup_ativo` - Boolean para follow-up ativo
- `followup_data` - Data de retorno
- `followup_status` - Status de retorno

**lead_activity_logs_dev / lead_activity_logs:**
- `id` - ID do log
- `lead_id` - ID do lead
- `tipo_atividade` - Tipo da atividade
- `descricao` - Descrição da atividade
- `usuario_id` - ID do usuário
- `usuario_nome` - Nome do usuário
- `metadata` - Dados adicionais (JSONB)
- `created_at` - Data/hora do registro

## Como Usar

### 1. Executar Migrations
```sql
-- No painel do Supabase (ambiente DEV)
-- Execute: migration-lost-leads-dev.sql

-- Após testar, no ambiente PROD
-- Execute: migration-lost-leads-prod.sql
```

### 2. Marcar Lead como Perdido
1. Clique no botão "Perder" no card do lead
2. Selecione o motivo
3. (Opcional) Ative o follow-up e configure data/status
4. Confirme

### 3. Processar Follow-ups Automáticos
```bash
# Executar manualmente
node scripts/process-followups.js

# Ou configurar cron job (exemplo: diariamente às 8h)
0 8 * * * cd /var/www/crm_sette && node scripts/process-followups.js
```

### 4. Visualizar Histórico
1. Abra o formulário do lead
2. Clique na tab "Histórico"
3. Veja todas as atividades registradas

## Serviços Atualizados

### leadService.ts
- `markAsLost()` - Marca lead como perdido
- `addActivityLog()` - Adiciona log de atividade
- `getActivityLogs()` - Busca logs de um lead

## Componentes Atualizados

### App.tsx
- Integração do LostDialog
- Handlers para marcar lead como perdido

### ProposalsBoard.tsx
- Prop `onProposalLost` adicionada

### ProposalCard.tsx
- Botão "Perder" adicionado

### LeadCard.tsx
- Botão "Perder" adicionado

### KanbanBoard.tsx
- Prop `onLeadLost` adicionada

### ModernLeadForm.tsx
- Tab "Histórico" adicionada
- Exibição de logs de atividades

## Fluxo de Follow-up

1. Lead é marcado como perdido com follow-up ativo
2. Sistema registra:
   - `status_kanban = 'CANCELADA'`
   - `followup_ativo = true`
   - `followup_data = data selecionada`
   - `followup_status = status selecionado`
3. Script `process-followups.js` roda diariamente
4. Quando `followup_data <= hoje`:
   - Lead volta para o status definido em `followup_status`
   - `followup_ativo = false`
   - Log de atividade é criado

## Próximos Passos

1. Configurar cron job no servidor para executar `process-followups.js`
2. Testar fluxo completo no ambiente de desenvolvimento
3. Executar migration em produção após validação
4. Monitorar logs de atividades
