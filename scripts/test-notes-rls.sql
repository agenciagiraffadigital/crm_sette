-- Script para testar RLS da tabela notes
-- Execute este script no painel SQL do Supabase em produção

-- 1. Verificar se RLS está ativo
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'notes';

-- 2. Listar policies da tabela notes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'notes';

-- 3. Testar inserção de nota (deve funcionar)
INSERT INTO notes (lead_id, atividade, data, horario, anotacoes, user_id, user_name) 
VALUES (1, 'Ligação', CURRENT_DATE, CURRENT_TIME, 'Teste RLS', 1, 'Teste User');

-- 4. Verificar se consegue ver a nota inserida
SELECT id, lead_id, atividade, user_name, created_at 
FROM notes 
WHERE anotacoes = 'Teste RLS';

-- 5. Limpar teste
DELETE FROM notes WHERE anotacoes = 'Teste RLS';

-- Se todos os comandos executarem sem erro, RLS está funcionando!