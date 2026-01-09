-- ============================================
-- Create users_profile table
-- ============================================

CREATE TABLE IF NOT EXISTS users_profile (
  id BIGSERIAL PRIMARY KEY,
  auth_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'SELLER')),
  
  -- Distribution control fields
  active_for_distribution BOOLEAN DEFAULT TRUE,
  last_lead_assigned_at TIMESTAMP,
  total_leads_assigned INTEGER DEFAULT 0,
  
  -- Activity tracking
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Índices para melhor performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_profile_email ON users_profile(email);
CREATE INDEX IF NOT EXISTS idx_users_profile_role ON users_profile(role);
CREATE INDEX IF NOT EXISTS idx_users_profile_auth_id ON users_profile(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_profile_active_for_distribution ON users_profile(active_for_distribution);
CREATE INDEX IF NOT EXISTS idx_users_profile_last_lead_assigned_at ON users_profile(last_lead_assigned_at);

-- ============================================
-- Função para atualizar updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_users_profile_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger para atualizar updated_at
-- ============================================
CREATE TRIGGER update_users_profile_updated_at
BEFORE UPDATE ON users_profile
FOR EACH ROW
EXECUTE FUNCTION update_users_profile_updated_at_column();

-- ============================================
-- RLS (Row Level Security) Policies
-- ============================================
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;

-- Users podem ver apenas seu próprio registro
CREATE POLICY "Users can view own profile" ON users_profile
  FOR SELECT USING (auth.uid() = auth_id);

-- Admins podem ver todos os usuários
CREATE POLICY "Admins can view all users" ON users_profile
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE auth_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Service role pode fazer tudo (para webhooks)
CREATE POLICY "Service role full access users_profile" ON users_profile
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON users_profile TO authenticated;
GRANT ALL ON users_profile TO service_role;

-- ============================================
-- Migrar dados da tabela users (se existir)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
    INSERT INTO users_profile (auth_id, name, email, role, created_at, updated_at)
    SELECT auth_id, name, email, role, created_at, updated_at
    FROM users
    ON CONFLICT (auth_id) DO NOTHING;
  END IF;
END $$;

-- ============================================
-- Inserir alguns usuários de exemplo (se não existirem)
-- ============================================
-- Note: Estes são apenas exemplos, você deve criar usuários reais através do sistema de auth
INSERT INTO users_profile (auth_id, name, email, role, active_for_distribution, total_leads_assigned)
SELECT 
  gen_random_uuid(),
  'Admin Sistema',
  'admin@settesaude.com.br',
  'ADMIN',
  FALSE,
  0
WHERE NOT EXISTS (SELECT 1 FROM users_profile WHERE email = 'admin@settesaude.com.br');

INSERT INTO users_profile (auth_id, name, email, role, active_for_distribution, total_leads_assigned)
SELECT 
  gen_random_uuid(),
  'João Vendedor',
  'joao@settesaude.com.br',
  'SELLER',
  TRUE,
  0
WHERE NOT EXISTS (SELECT 1 FROM users_profile WHERE email = 'joao@settesaude.com.br');

INSERT INTO users_profile (auth_id, name, email, role, active_for_distribution, total_leads_assigned)
SELECT 
  gen_random_uuid(),
  'Maria Vendedor',
  'maria@settesaude.com.br',
  'SELLER',
  TRUE,
  0
WHERE NOT EXISTS (SELECT 1 FROM users_profile WHERE email = 'maria@settesaude.com.br');