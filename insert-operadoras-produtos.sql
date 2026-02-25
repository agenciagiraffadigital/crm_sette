-- Inserir Operadoras e Produtos
-- Execute este SQL no painel do Supabase após criar as tabelas

-- Inserir Operadoras
INSERT INTO operadoras (nome, ativa) VALUES
('Amil', true),
('Amil Dental', true),
('Bradesco', true),
('Go Care', true),
('Hapvida', true),
('Medsênior', true),
('Porto Saúde', true),
('Santa Tereza', true),
('Saúde Beneficência', true),
('Sul América', true),
('Supermed Amil', true),
('Única Saúde', true),
('Vera Cruz', true)
ON CONFLICT (nome) DO NOTHING;

-- Inserir Produtos da Amil
INSERT INTO produtos (operadora_id, nome, ativo)
SELECT id, produto, true FROM operadoras, (VALUES
  ('Black R1 A'),
  ('Black R2 A'),
  ('Bronze SP Mais E'),
  ('Ouro A'),
  ('Ouro E'),
  ('Platinum R1 A'),
  ('Platinum R2 A'),
  ('Prata A'),
  ('Prata E'),
  ('S2500 R1 A'),
  ('S2500 R2 A'),
  ('S380 A'),
  ('S380 E'),
  ('S450 A'),
  ('S450 E'),
  ('S750 R1 A'),
  ('S750 R2 A'),
  ('S750 R3 A')
) AS produtos(produto)
WHERE operadoras.nome = 'Amil'
ON CONFLICT (operadora_id, nome) DO NOTHING;

-- Inserir Produtos da Amil Dental
INSERT INTO produtos (operadora_id, nome, ativo)
SELECT id, produto, true FROM operadoras, (VALUES
  ('205'),
  ('E80'),
  ('K25')
) AS produtos(produto)
WHERE operadoras.nome = 'Amil Dental'
ON CONFLICT (operadora_id, nome) DO NOTHING;

-- Inserir Produtos da Bradesco
INSERT INTO produtos (operadora_id, nome, ativo)
SELECT id, produto, true FROM operadoras, (VALUES
  ('Efetivo A'),
  ('Efetivo E'),
  ('Ideal A'),
  ('Ideal E'),
  ('Nacional Flex A'),
  ('Nacional Flex E'),
  ('Nacional II E'),
  ('Nacional III 2 A'),
  ('Nacional III 3 A'),
  ('Nacional III A'),
  ('Nacional Plus 4 A'),
  ('Nacional Plus 6 A'),
  ('Nacional Plus 8 A'),
  ('Premium 10 A'),
  ('Premium 6 A'),
  ('Premium 8 A')
) AS produtos(produto)
WHERE operadoras.nome = 'Bradesco'
ON CONFLICT (operadora_id, nome) DO NOTHING;

-- Inserir Produtos da Go Care
INSERT INTO produtos (operadora_id, nome, ativo)
SELECT id, produto, true FROM operadoras, (VALUES
  ('Gold Campinas E'),
  ('Green Campinas E'),
  ('Platinum Campinas A')
) AS produtos(produto)
WHERE operadoras.nome = 'Go Care'
ON CONFLICT (operadora_id, nome) DO NOTHING;

-- Inserir Produtos da Hapvida
INSERT INTO produtos (operadora_id, nome, ativo)
SELECT id, produto, true FROM operadoras, (VALUES
  ('200 Campinas E'),
  ('200 Up E'),
  ('300 E'),
  ('400 A'),
  ('400 E'),
  ('500 A'),
  ('500 E'),
  ('600 A'),
  ('600 E'),
  ('700 A'),
  ('700 E'),
  ('900 A'),
  ('Ambulatorial AMB'),
  ('Campinas E')
) AS produtos(produto)
WHERE operadoras.nome = 'Hapvida'
ON CONFLICT (operadora_id, nome) DO NOTHING;

-- Inserir Produtos da Medsênior
INSERT INTO produtos (operadora_id, nome, ativo)
SELECT id, produto, true FROM operadoras, (VALUES
  ('Black Campinas'),
  ('Black Corporate A'),
  ('Corporate CPS1 E'),
  ('Corporate CPS2 A'),
  ('Corporate SP1 E'),
  ('Corporate SP2 A'),
  ('CPS 1 - Enfermaria'),
  ('CPS 2 - Apartamento'),
  ('Essencial - Enfermaria'),
  ('Infinite')
) AS produtos(produto)
WHERE operadoras.nome = 'Medsênior'
ON CONFLICT (operadora_id, nome) DO NOTHING;

-- Inserir Produtos da Porto Saúde
INSERT INTO produtos (operadora_id, nome, ativo)
SELECT id, produto, true FROM operadoras, (VALUES
  ('Bronze Brasil I E'),
  ('Bronze Pró E'),
  ('Diamante Mais I A'),
  ('Ouro Mais I A'),
  ('Ouro Max I A'),
  ('P220 A'),
  ('P220 E'),
  ('P320 A'),
  ('P320 E'),
  ('P420 A'),
  ('P470 A'),
  ('P520 A'),
  ('Prata Mais I A'),
  ('Prata Pró A')
) AS produtos(produto)
WHERE operadoras.nome = 'Porto Saúde'
ON CONFLICT (operadora_id, nome) DO NOTHING;

-- Inserir Produtos da Santa Tereza
INSERT INTO produtos (operadora_id, nome, ativo)
SELECT id, produto, true FROM operadoras, (VALUES
  ('Global A'),
  ('Global E'),
  ('Plus A'),
  ('Plus E'),
  ('Regional A'),
  ('Regional E')
) AS produtos(produto)
WHERE operadoras.nome = 'Santa Tereza'
ON CONFLICT (operadora_id, nome) DO NOTHING;

-- Inserir Produtos da Saúde Beneficência
INSERT INTO produtos (operadora_id, nome, ativo)
SELECT id, produto, true FROM operadoras, (VALUES
  ('Agile E'),
  ('Sabe 100 Plus A'),
  ('Sabe 300 E'),
  ('Selection 200 E'),
  ('Selection 400 A'),
  ('Vital')
) AS produtos(produto)
WHERE operadoras.nome = 'Saúde Beneficência'
ON CONFLICT (operadora_id, nome) DO NOTHING;

-- Inserir Produtos da Sul América
INSERT INTO produtos (operadora_id, nome, ativo)
SELECT id, produto, true FROM operadoras, (VALUES
  ('Clássico 100 E'),
  ('Especial 100 R1 A'),
  ('Especial Mais A'),
  ('Especial RC A'),
  ('Executivo R1 A'),
  ('Executivo R2 A'),
  ('Executivo R3 A'),
  ('Prestige A')
) AS produtos(produto)
WHERE operadoras.nome = 'Sul América'
ON CONFLICT (operadora_id, nome) DO NOTHING;

-- Inserir Produtos da Supermed Amil
INSERT INTO produtos (operadora_id, nome, ativo)
SELECT id, produto, true FROM operadoras, (VALUES
  ('Bronze SP +')
) AS produtos(produto)
WHERE operadoras.nome = 'Supermed Amil'
ON CONFLICT (operadora_id, nome) DO NOTHING;

-- Inserir Produtos da Única Saúde
INSERT INTO produtos (operadora_id, nome, ativo)
SELECT id, produto, true FROM operadoras, (VALUES
  ('Max 100 AD E'),
  ('Max 150 AD E'),
  ('Max 50 AD E'),
  ('Max 50 Cosm E'),
  ('Max Life 200 AD E')
) AS produtos(produto)
WHERE operadoras.nome = 'Única Saúde'
ON CONFLICT (operadora_id, nome) DO NOTHING;

-- Inserir Produtos da Vera Cruz
INSERT INTO produtos (operadora_id, nome, ativo)
SELECT id, produto, true FROM operadoras, (VALUES
  ('Ouro E'),
  ('Ouro Mais A'),
  ('Prata E'),
  ('Prata Mais A')
) AS produtos(produto)
WHERE operadoras.nome = 'Vera Cruz'
ON CONFLICT (operadora_id, nome) DO NOTHING;
