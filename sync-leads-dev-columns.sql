-- Adicionar colunas que faltam na tabela leads_dev para ficar igual a leads

-- Colunas de oportunidades
ALTER TABLE leads_dev ADD COLUMN IF NOT EXISTS first_contact_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE leads_dev ADD COLUMN IF NOT EXISTS contact_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE leads_dev ADD COLUMN IF NOT EXISTS next_followup TIMESTAMP WITH TIME ZONE;
ALTER TABLE leads_dev ADD COLUMN IF NOT EXISTS quoted_at TIMESTAMP WITH TIME ZONE;

-- Colunas de perda
ALTER TABLE leads_dev ADD COLUMN IF NOT EXISTS lost_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE leads_dev ADD COLUMN IF NOT EXISTS loss_reason JSONB;
ALTER TABLE leads_dev ADD COLUMN IF NOT EXISTS loss_description TEXT;

-- Colunas de conversão
ALTER TABLE leads_dev ADD COLUMN IF NOT EXISTS converted_to_proposal_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE leads_dev ADD COLUMN IF NOT EXISTS proposal_id INTEGER;
ALTER TABLE leads_dev ADD COLUMN IF NOT EXISTS converted_from_opportunity_id INTEGER;
ALTER TABLE leads_dev ADD COLUMN IF NOT EXISTS conversion_date TIMESTAMP WITH TIME ZONE;

-- Colunas de tracking
ALTER TABLE leads_dev ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE leads_dev ADD COLUMN IF NOT EXISTS activity_log JSONB;

-- Colunas de reatribuição
ALTER TABLE leads_dev ADD COLUMN IF NOT EXISTS assignment_history JSONB;

-- Adicionar operadora se não existir
ALTER TABLE leads_dev ADD COLUMN IF NOT EXISTS operadora TEXT;

-- Adicionar produto se não existir  
ALTER TABLE leads_dev ADD COLUMN IF NOT EXISTS produto TEXT;

COMMENT ON TABLE leads_dev IS 'Tabela de desenvolvimento - espelho da tabela leads para testes';
