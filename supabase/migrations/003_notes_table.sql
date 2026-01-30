-- Migração para tabela de notas
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    atividade VARCHAR(20) NOT NULL CHECK (atividade IN ('Apresentação', 'Ligação', 'Proposta', 'Reunião', 'Whatsapp')),
    data DATE NOT NULL,
    horario TIME NOT NULL,
    duracao VARCHAR(50),
    anotacoes TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notes_lead_id ON notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);

-- RLS (Row Level Security)
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Policy para vendedores verem apenas suas notas
CREATE POLICY "Vendedores veem apenas suas notas" ON notes
    FOR ALL USING (
        -- Permite acesso se não há usuário autenticado (desenvolvimento)
        auth.uid() IS NULL
        OR
        -- Ou se o usuário é o dono da nota (produção)
        EXISTS (
            SELECT 1 FROM users_profile 
            WHERE users_profile.id = notes.user_id 
            AND users_profile.auth_id = auth.uid()
        )
    );