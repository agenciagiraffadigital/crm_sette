-- =====================================================
-- MIGRATION: Beneficiários
-- =====================================================

-- Dropar policies antigas se existirem
DROP POLICY IF EXISTS "Sellers see their beneficiarios" ON public.beneficiarios;
DROP POLICY IF EXISTS "Sellers update their beneficiarios" ON public.beneficiarios;
DROP POLICY IF EXISTS "Sellers insert their beneficiarios" ON public.beneficiarios;
DROP POLICY IF EXISTS "Sellers delete their beneficiarios" ON public.beneficiarios;

-- Tabela: beneficiarios
CREATE TABLE IF NOT EXISTS public.beneficiarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id bigint NOT NULL,
  nome text NOT NULL,
  cpf text,
  rg text,
  data_nascimento date,
  telefone text,
  email text,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT beneficiarios_pkey PRIMARY KEY (id),
  CONSTRAINT beneficiarios_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE
);

-- Adicionar coluna na tabela leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS possui_dependentes boolean DEFAULT false;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_beneficiarios_lead_id ON public.beneficiarios(lead_id);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_beneficiarios_updated_at ON public.beneficiarios;
CREATE TRIGGER update_beneficiarios_updated_at 
BEFORE UPDATE ON public.beneficiarios
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.beneficiarios ENABLE ROW LEVEL SECURITY;

-- Policies simplificadas
CREATE POLICY "Enable all for authenticated users" ON public.beneficiarios
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
