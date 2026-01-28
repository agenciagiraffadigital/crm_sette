-- Migração para Leads Perdidos - PRODUÇÃO
-- Execute este SQL no painel do Supabase (ambiente PROD) APÓS TESTAR NO DEV

-- 1. Adicionar campos de leads perdidos na tabela leads
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS motivo_perda VARCHAR(100),
ADD COLUMN IF NOT EXISTS motivo_perda_detalhes TEXT,
ADD COLUMN IF NOT EXISTS data_perda TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS followup_ativo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS followup_data DATE,
ADD COLUMN IF NOT EXISTS followup_status VARCHAR(50);

-- 2. Criar tabela de logs de atividades para leads
CREATE TABLE IF NOT EXISTS lead_activity_logs (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    tipo_atividade VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    usuario_id INTEGER,
    usuario_nome VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_lead_activity_logs_lead_id ON lead_activity_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activity_logs_created_at ON lead_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_followup_data ON leads(followup_data) WHERE followup_ativo = true;

-- 4. Habilitar RLS na tabela de logs
ALTER TABLE lead_activity_logs ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para logs
CREATE POLICY "Vendedores veem logs de seus leads" ON lead_activity_logs
    FOR SELECT USING (
        lead_id IN (
            SELECT id FROM leads 
            WHERE vendedor_id IN (
                SELECT id FROM users_profile WHERE auth.uid()::text = id::text AND role = 'SELLER'
            )
        )
    );

CREATE POLICY "Admins veem todos os logs" ON lead_activity_logs
    FOR ALL USING (
        auth.uid()::text IN (
            SELECT id::text FROM users_profile WHERE role = 'ADMIN'
        )
    );

CREATE POLICY "Sistema pode inserir logs" ON lead_activity_logs
    FOR INSERT WITH CHECK (true);

-- 6. Função para processar follow-ups automáticos
CREATE OR REPLACE FUNCTION process_followups()
RETURNS void AS $$
BEGIN
    UPDATE leads
    SET 
        status_kanban = followup_status,
        followup_ativo = false,
        followup_data = NULL,
        followup_status = NULL,
        updated_at = NOW()
    WHERE 
        followup_ativo = true 
        AND followup_data <= CURRENT_DATE
        AND followup_status IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Comentário: Esta migração adiciona suporte para leads perdidos com follow-up
-- e sistema de logs de atividades para o ambiente de produção.
