-- ============================================
-- Tabela: users
-- ============================================
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  auth_id UUID UNIQUE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'SELLER')),
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Tabela: leads
-- ============================================
CREATE TABLE leads (
  id BIGSERIAL PRIMARY KEY,
  
  -- Core Information
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  tipo_cliente TEXT CHECK (tipo_cliente IN ('PF', 'PJ', 'ADESAO')),
  
  -- Document/ID Fields
  cpf_cnpj TEXT,
  rg_ie TEXT,
  data_nascimento_abertura DATE,
  
  -- Address (JSONB)
  endereco JSONB DEFAULT '{
    "cep": "",
    "logradouro": "",
    "numero": "",
    "complemento": "",
    "bairro": "",
    "cidade": "",
    "uf": ""
  }'::JSONB,
  
  -- Responsible Person (JSONB) - for PJ
  dados_responsavel JSONB DEFAULT '{
    "nome": "",
    "cpf": "",
    "endereco": "",
    "data_nascimento": ""
  }'::JSONB,
  
  -- Product Information
  operadora TEXT,
  produto TEXT,
  valor_produto NUMERIC(12, 2),
  coparticipacao TEXT CHECK (coparticipacao IN ('NÃO', 'PARCIAL', 'COMPLETA')),
  reducao_carencia BOOLEAN DEFAULT FALSE,
  havera_remissao BOOLEAN DEFAULT FALSE,
  vigencia DATE,
  
  -- Collections (JSONB arrays)
  beneficiarios JSONB DEFAULT '[]'::JSONB,
  mensagens JSONB DEFAULT '[]'::JSONB,
  documentos JSONB DEFAULT '[]'::JSONB,
  
  -- Origin & Raw Data
  origem TEXT,
  raw_json JSONB,
  
  -- Vendor Assignment
  vendedor TEXT,
  vendedor_email TEXT,
  vendedor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  
  -- Status & Timestamps
  status_kanban TEXT DEFAULT 'ENVIADA' CHECK (status_kanban IN ('ENVIADA', 'ANÁLISE', 'IMPLANTADA', 'CANCELADA')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Índices para melhor performance
-- ============================================
CREATE INDEX idx_leads_vendedor_id ON leads(vendedor_id);
CREATE INDEX idx_leads_status_kanban ON leads(status_kanban);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_nome ON leads USING GIN(to_tsvector('portuguese', nome));
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- Função para atualizar updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Triggers para atualizar updated_at
-- ============================================
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Inserir usuários padrão (1 ADMIN + 2 SELLERS)
-- ============================================
INSERT INTO users (name, email, role, password) VALUES
  ('Admin Sette', 'admin@settesaude.com.br', 'ADMIN', '123'),
  ('João Vendedor', 'joao@settesaude.com.br', 'SELLER', '123'),
  ('Maria Vendedor', 'maria@settesaude.com.br', 'SELLER', '123')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- Inserir alguns leads de exemplo
-- ============================================
INSERT INTO leads (
  nome, email, telefone, tipo_cliente, cpf_cnpj, operadora, produto, 
  valor_produto, coparticipacao, vigencia, vendedor, vendedor_email, 
  vendedor_id, status_kanban, origem, endereco
) VALUES
  (
    'José Silva', 
    'jose@example.com', 
    '11987654321', 
    'PF', 
    '12345678900', 
    'Amil', 
    'Saúde Premium',
    150.00,
    'PARCIAL',
    '2026-12-31',
    'João Vendedor',
    'joao@settesaude.com.br',
    2,
    'ENVIADA',
    'SITE',
    '{"cep": "01310-100", "logradouro": "Avenida Paulista", "numero": "1000", "bairro": "Bela Vista", "cidade": "São Paulo", "uf": "SP"}'::JSONB
  ),
  (
    'Ana Santos', 
    'ana@example.com', 
    '11998765432', 
    'PF', 
    '98765432100', 
    'Unimed', 
    'Saúde Básico',
    100.00,
    'NÃO',
    '2026-06-30',
    'Maria Vendedor',
    'maria@settesaude.com.br',
    3,
    'ANÁLISE',
    'SITE',
    '{"cep": "02145-000", "logradouro": "Rua das Flores", "numero": "250", "bairro": "Vila Mariana", "cidade": "São Paulo", "uf": "SP"}'::JSONB
  )
ON CONFLICT DO NOTHING;
