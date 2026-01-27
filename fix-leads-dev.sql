-- Verificar usuários existentes e inserir leads de teste com IDs corretos

-- 1. Ver todos os usuários
SELECT id, name, email, role FROM users_profile ORDER BY id;

-- 2. Limpar leads de teste antigos
DELETE FROM leads_dev WHERE email LIKE '%@dev.com';

-- 3. Inserir leads de teste com usuários reais (substitua os IDs pelos corretos)
-- Execute depois de ver os IDs dos usuários acima
INSERT INTO leads_dev (nome, email, telefone, operadora, produto, vendedor, vendedor_id, status_kanban) 
SELECT 
  'Lead Teste Dev ' || u.id,
  'teste' || u.id || '@dev.com',
  '1199999900' || u.id,
  'Operadora Teste',
  'Produto Teste',
  u.name,
  u.id,
  CASE 
    WHEN u.role = 'ADMIN' THEN 'OPORTUNIDADES'
    ELSE 'OPORTUNIDADES'
  END
FROM users_profile u 
WHERE u.role IN ('ADMIN', 'SELLER')
LIMIT 5;