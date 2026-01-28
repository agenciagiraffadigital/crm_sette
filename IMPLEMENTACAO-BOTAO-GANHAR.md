# Implementação do Botão "Ganhar" - Instruções

## ✅ Arquivos Criados/Modificados

### 1. Migração SQL
- **Arquivo:** `migration-add-win-fields.sql`
- **Descrição:** Adiciona campos JSONB `dados_proposta` e `dados_perda` nas tabelas `leads` e `leads_dev`, além do status `PROPOSTA`
- **Vantagem:** Usa JSONB para evitar poluir a tabela com muitas colunas

### 2. Componente WinDialog
- **Arquivo:** `components/WinDialog.tsx`
- **Descrição:** Dialog do PrimeReact com select de motivos e input condicional

### 3. Tipos TypeScript
- **Arquivo:** `types.ts`
- **Modificações:** 
  - Adicionado `'PROPOSTA'` ao tipo `KanbanStatus`
  - Adicionados objetos `dados_proposta` e `dados_perda` (JSONB) à interface `Lead`

### 4. Constantes
- **Arquivo:** `constants.ts`
- **Modificações:** Adicionada coluna `PROPOSTA` ao `KANBAN_COLUMNS`

### 5. ModernLeadForm
- **Arquivo:** `components/ModernLeadForm.tsx`
- **Modificações:**
  - Importado `WinDialog`
  - Adicionado estado `showWinDialog`
  - Botão "Ganhar" agora abre o dialog
  - Handler `onConfirm` salva dados em `dados_proposta` (JSONB) e muda status para `PROPOSTA`

## 🚀 Passos para Deploy

### 1. Execute a Migração SQL no Supabase

Acesse o painel do Supabase e execute o arquivo `migration-add-win-fields.sql`:

```sql
-- Copie e cole o conteúdo do arquivo migration-add-win-fields.sql
```

### 2. Teste Localmente

```bash
npm run dev
```

### 3. Teste o Fluxo

1. Abra um lead no formulário
2. Clique em "Ações" → "Ganhar"
3. Selecione um motivo no dialog
4. Se selecionar "Outros", digite o motivo
5. Clique em "Confirmar"
6. Verifique se o lead mudou para status "PROPOSTA"

### 4. Deploy para Produção

```bash
git add .
git commit -m "feat: adicionar botão Ganhar com dialog de motivos"
git push origin develop  # Para ambiente de dev
# Após testar, fazer PR para master
```

## 📋 Funcionalidades Implementadas

✅ Dialog do PrimeReact com select de motivos
✅ Input condicional quando seleciona "Outros"
✅ Salvamento do motivo no banco de dados (campos `motivo_ganho` e `motivo_ganho_outro`)
✅ Mudança automática de status para "PROPOSTA"
✅ Suporte para tabelas `leads` e `leads_dev`
✅ Validação: não permite confirmar sem selecionar motivo
✅ Validação: se "Outros", obriga preenchimento do campo de texto

## 🎨 Motivos Disponíveis

1. Confiança
2. Melhoria na rede de atendimento
3. Adequação de custos
4. Campanha de vendas
5. O cliente já conhecia o produto/serviço
6. Outros (com campo de texto)

## 🔄 Fluxo de Status

```
OPORTUNIDADES → EM_CONTATO → NEGOCIACAO → [Ganhar] → PROPOSTA → IMPLANTADA
```

## 📝 Notas Importantes

- O botão "Ganhar" está no menu "Ações" do formulário
- O status "PROPOSTA" foi adicionado ao Kanban entre "ANÁLISE" e "IMPLANTADA"
- **Dados salvos em JSONB:** `dados_proposta` contém `{motivo_ganho, motivo_ganho_outro, data_ganho}`
- **Vantagem JSONB:** Não polui a tabela com muitas colunas, flexível para adicionar mais campos no futuro
- O campo `dados_perda` já foi criado para quando implementar a funcionalidade de "Perder"
- O PrimeReact já estava instalado no projeto, não foi necessário instalar

## 🔮 Estrutura JSONB

```typescript
// dados_proposta
{
  "motivo_ganho": "Confiança",
  "motivo_ganho_outro": "Cliente indicado por parceiro", // opcional
  "data_ganho": "2024-01-15T10:30:00.000Z"
}

// dados_perda (para implementação futura)
{
  "motivo": "Preço",
  "detalhes": "Concorrente ofereceu valor menor",
  "data_perda": "2024-01-15T10:30:00.000Z"
}
```
