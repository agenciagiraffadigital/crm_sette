-- Tabela de Operadoras
CREATE TABLE IF NOT EXISTS operadoras (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL UNIQUE,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Produtos
CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  operadora_id INTEGER NOT NULL REFERENCES operadoras(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(operadora_id, nome)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_produtos_operadora ON produtos(operadora_id);
CREATE INDEX IF NOT EXISTS idx_operadoras_ativa ON operadoras(ativa);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON produtos(ativo);
