-- =====================================================
-- MIGRATION: Responsáveis Financeiros
-- Ambiente: DESENVOLVIMENTO
-- =====================================================

-- Tabela: responsaveis_financeiros
CREATE TABLE IF NOT EXISTS public.responsaveis_financeiros (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id bigint NOT NULL,
  nome text NOT NULL,
  cpf text NOT NULL,
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
  CONSTRAINT responsaveis_financeiros_pkey PRIMARY KEY (id),
  CONSTRAINT responsaveis_financeiros_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE
);

-- Adicionar coluna na tabela leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS titular_eh_responsavel_financeiro boolean DEFAULT true;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_responsaveis_financeiros_lead_id ON public.responsaveis_financeiros(lead_id);

-- Trigger para updated_at
CREATE TRIGGER update_responsaveis_financeiros_updated_at 
BEFORE UPDATE ON public.responsaveis_financeiros
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.responsaveis_financeiros ENABLE ROW LEVEL SECURITY;

-- Policies: mesmas regras dos leads
CREATE POLICY "Sellers see their responsaveis" ON public.responsaveis_financeiros FOR SELECT USING (
  lead_id IN (
    SELECT id FROM public.leads WHERE vendedor_id IN (
      SELECT id FROM public.users_profile WHERE auth_id = auth.uid()
    )
  )
  OR EXISTS (SELECT 1 FROM public.users_profile WHERE auth_id = auth.uid() AND role = 'ADMIN')
);

CREATE POLICY "Sellers update their responsaveis" ON public.responsaveis_financeiros FOR ALL USING (
  lead_id IN (
    SELECT id FROM public.leads WHERE vendedor_id IN (
      SELECT id FROM public.users_profile WHERE auth_id = auth.uid()
    )
  )
  OR EXISTS (SELECT 1 FROM public.users_profile WHERE auth_id = auth.uid() AND role = 'ADMIN')
);
