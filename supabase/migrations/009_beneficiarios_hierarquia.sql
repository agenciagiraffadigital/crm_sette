-- =====================================================
-- MIGRATION: Adicionar Relação Titular-Dependente
-- =====================================================

-- Adicionar colunas para hierarquia de beneficiários
ALTER TABLE public.beneficiarios 
ADD COLUMN IF NOT EXISTS titular_id uuid,
ADD COLUMN IF NOT EXISTS parentesco text,
ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'TITULAR' CHECK (tipo IN ('TITULAR', 'DEPENDENTE'));

-- Foreign key para titular
ALTER TABLE public.beneficiarios
ADD CONSTRAINT beneficiarios_titular_id_fkey 
FOREIGN KEY (titular_id) REFERENCES public.beneficiarios(id) ON DELETE CASCADE;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_beneficiarios_titular_id ON public.beneficiarios(titular_id);
