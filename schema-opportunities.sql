-- ============================================
-- Schema Updates for Opportunities System
-- ============================================

-- ============================================
-- Update users_profile table to add distribution control
-- ============================================
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS active_for_distribution BOOLEAN DEFAULT TRUE;
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS last_lead_assigned_at TIMESTAMP;
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS total_leads_assigned INTEGER DEFAULT 0;
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- ============================================
-- Create opportunities table
-- ============================================
CREATE TABLE IF NOT EXISTS opportunities (
  id BIGSERIAL PRIMARY KEY,
  
  -- Basic Info
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  
  -- Status and Flow
  status TEXT DEFAULT 'OPORTUNIDADES' CHECK (status IN ('OPORTUNIDADES', 'EM_CONTATO', 'NEGOCIAÇÃO')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Contact and Value
  first_contact_date TIMESTAMP,
  quoted_value NUMERIC(12, 2),
  quoted_at TIMESTAMP,
  
  -- Assignment
  vendedor TEXT NOT NULL,
  vendedor_email TEXT NOT NULL,
  vendedor_id BIGINT NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  
  -- Source and Raw Data
  origem TEXT NOT NULL,
  raw_json JSONB,
  
  -- Loss Tracking
  lost_at TIMESTAMP,
  loss_reason JSONB, -- {category: string, description?: string}
  loss_description TEXT,
  
  -- Conversion
  converted_to_proposal_at TIMESTAMP,
  proposal_id BIGINT REFERENCES leads(id) ON DELETE SET NULL
);

-- ============================================
-- Create activity_logs table for audit trail
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id BIGINT REFERENCES opportunities(id) ON DELETE CASCADE,
  lead_id BIGINT REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('STATUS_CHANGE', 'DOCUMENT_UPLOAD', 'NOTE_ADDED', 'VALUE_UPDATED', 'REASSIGNMENT', 'CONTACT_MADE', 'LOSS_RECORDED', 'CONVERSION')),
  description TEXT NOT NULL,
  user_id BIGINT NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

-- ============================================
-- Create assignment_history table for reassignment tracking
-- ============================================
CREATE TABLE IF NOT EXISTS assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id BIGINT REFERENCES opportunities(id) ON DELETE CASCADE,
  lead_id BIGINT REFERENCES leads(id) ON DELETE CASCADE,
  previous_seller_id BIGINT REFERENCES users_profile(id) ON DELETE SET NULL,
  new_seller_id BIGINT NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  assigned_by_user_id BIGINT NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  assigned_by_name TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Update leads table to add tracking fields
-- ============================================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_from_opportunity_id BIGINT REFERENCES opportunities(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversion_date TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP DEFAULT NOW();

-- ============================================
-- Índices para melhor performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_opportunities_vendedor_id ON opportunities(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_email ON opportunities(email);
CREATE INDEX IF NOT EXISTS idx_opportunities_nome ON opportunities USING GIN(to_tsvector('portuguese', nome));
CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON opportunities(created_at);

CREATE INDEX IF NOT EXISTS idx_activity_logs_opportunity_id ON activity_logs(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_lead_id ON activity_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_assignment_history_opportunity_id ON assignment_history(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_lead_id ON assignment_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_created_at ON assignment_history(created_at);

CREATE INDEX IF NOT EXISTS idx_users_active_for_distribution ON users_profile(active_for_distribution);
CREATE INDEX IF NOT EXISTS idx_users_last_lead_assigned_at ON users_profile(last_lead_assigned_at);

-- ============================================
-- Triggers para atualizar updated_at
-- ============================================
CREATE TRIGGER update_opportunities_updated_at
BEFORE UPDATE ON opportunities
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS (Row Level Security) Policies para opportunities
-- ============================================
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_history ENABLE ROW LEVEL SECURITY;

-- Vendedores podem ver apenas suas próprias oportunidades
CREATE POLICY "Sellers can view own opportunities" ON opportunities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE auth_id = auth.uid() AND id = opportunities.vendedor_id
    )
  );

-- Admins podem ver todas as oportunidades
CREATE POLICY "Admins can view all opportunities" ON opportunities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE auth_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Service role pode fazer tudo (para webhooks)
CREATE POLICY "Service role full access opportunities" ON opportunities
  FOR ALL USING (auth.role() = 'service_role');

-- Activity logs policies
CREATE POLICY "Users can view related activity logs" ON activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE auth_id = auth.uid() AND (
        id = activity_logs.user_id OR
        role = 'ADMIN' OR
        (opportunity_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM opportunities 
          WHERE id = activity_logs.opportunity_id AND vendedor_id = users_profile.id
        )) OR
        (lead_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM leads 
          WHERE id = activity_logs.lead_id AND vendedor_id = users_profile.id
        ))
      )
    )
  );

CREATE POLICY "Service role full access activity logs" ON activity_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Assignment history policies
CREATE POLICY "Users can view related assignment history" ON assignment_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE auth_id = auth.uid() AND (
        id = assignment_history.new_seller_id OR
        id = assignment_history.previous_seller_id OR
        id = assignment_history.assigned_by_user_id OR
        role = 'ADMIN'
      )
    )
  );

CREATE POLICY "Service role full access assignment history" ON assignment_history
  FOR ALL USING (auth.role() = 'service_role');