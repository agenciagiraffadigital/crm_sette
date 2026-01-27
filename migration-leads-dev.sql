-- Migração para criar tabela leads_dev para desenvolvimento
-- Execute este SQL no painel do Supabase

-- 1. Criar tabela leads_dev com a mesma estrutura da tabela leads
CREATE TABLE IF NOT EXISTS leads_dev (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(20),
    tipo_cliente VARCHAR(50),
    cpf_cnpj VARCHAR(20),
    rg_ie VARCHAR(20),
    data_nascimento_abertura VARCHAR(20),
    dados_responsavel JSONB,
    havera_remissao BOOLEAN DEFAULT false,
    operadora VARCHAR(100),
    produto VARCHAR(255),
    valor_produto DECIMAL(10,2),
    reducao_carencia BOOLEAN DEFAULT false,
    coparticipacao VARCHAR(10) DEFAULT 'NÃO',
    vigencia VARCHAR(50),
    cep VARCHAR(10),
    logradouro VARCHAR(255),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    endereco JSONB,
    beneficiarios JSONB DEFAULT '[]'::jsonb,
    mensagens JSONB DEFAULT '[]'::jsonb,
    documentos JSONB DEFAULT '[]'::jsonb,
    origem VARCHAR(100),
    canal_venda VARCHAR(100),
    raw_json JSONB,
    vendedor VARCHAR(255),
    vendedor_email VARCHAR(255),
    vendedor_id INTEGER,
    status_kanban VARCHAR(50) DEFAULT 'OPORTUNIDADES',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_dev_vendedor_id ON leads_dev(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_leads_dev_status_kanban ON leads_dev(status_kanban);
CREATE INDEX IF NOT EXISTS idx_leads_dev_created_at ON leads_dev(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_dev_email ON leads_dev(email);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE leads_dev ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS idênticas às da tabela leads
-- Política para vendedores verem apenas seus leads
CREATE POLICY "Vendedores veem apenas seus leads_dev" ON leads_dev
    FOR ALL USING (
        auth.uid()::text IN (
            SELECT id::text FROM users_profile 
            WHERE role = 'SELLER' AND id = leads_dev.vendedor_id
        )
    );

-- Política para admins verem todos os leads
CREATE POLICY "Admins veem todos os leads_dev" ON leads_dev
    FOR ALL USING (
        auth.uid()::text IN (
            SELECT id::text FROM users_profile 
            WHERE role = 'ADMIN'
        )
    );

-- 5. Inserir alguns dados de teste (opcional)
INSERT INTO leads_dev (nome, email, telefone, operadora, produto, vendedor, vendedor_id, status_kanban) VALUES
('Lead Teste Dev 1', 'teste1@dev.com', '11999999001', 'Operadora Teste', 'Produto Teste', 'João Silva', 2, 'OPORTUNIDADES'),
('Lead Teste Dev 2', 'teste2@dev.com', '11999999002', 'Operadora Teste', 'Produto Teste', 'Maria Santos', 3, 'ENVIADA'),
('Lead Teste Dev 3', 'teste3@dev.com', '11999999003', 'Operadora Teste', 'Produto Teste', 'Pedro Costa', 4, 'ANÁLISE')
ON CONFLICT DO NOTHING;

-- Comentário: Esta migração cria uma tabela leads_dev idêntica à tabela leads
-- para uso em desenvolvimento e testes, evitando interferir com dados de produção.