-- Adicionar campos JSONB para propostas e perdas nas tabelas leads e leads_dev

-- Adicionar colunas JSONB na tabela leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS dados_proposta JSONB DEFAULT '{}'::JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS dados_perda JSONB DEFAULT '{}'::JSONB;

-- Adicionar colunas JSONB na tabela leads_dev
ALTER TABLE leads_dev ADD COLUMN IF NOT EXISTS dados_proposta JSONB DEFAULT '{}'::JSONB;
ALTER TABLE leads_dev ADD COLUMN IF NOT EXISTS dados_perda JSONB DEFAULT '{}'::JSONB;

-- Adicionar status PROPOSTA nas constraints (apenas para controle interno, não aparece no Kanban)
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_kanban_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_kanban_check 
  CHECK (status_kanban IN ('ENVIADA', 'ANÁLISE', 'IMPLANTADA', 'CANCELADA', 'OPORTUNIDADES', 'EM_CONTATO', 'NEGOCIACAO', 'PROPOSTA'));

ALTER TABLE leads_dev DROP CONSTRAINT IF EXISTS leads_dev_status_kanban_check;
ALTER TABLE leads_dev ADD CONSTRAINT leads_dev_status_kanban_check 
  CHECK (status_kanban IN ('ENVIADA', 'ANÁLISE', 'IMPLANTADA', 'CANCELADA', 'OPORTUNIDADES', 'EM_CONTATO', 'NEGOCIACAO', 'PROPOSTA'));
