-- =====================================================
-- MIGRATION: Configuração de Documentos por Produto
-- =====================================================

-- Tabela de configuração de documentos
CREATE TABLE IF NOT EXISTS public.documento_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  operadora_id bigint NOT NULL,
  produto_id bigint NOT NULL,
  tipo_cliente text NOT NULL CHECK (tipo_cliente IN ('PF', 'PME', 'ADESAO')),
  nome_documento text NOT NULL,
  ordem int DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT documento_configs_pkey PRIMARY KEY (id),
  CONSTRAINT documento_configs_operadora_id_fkey FOREIGN KEY (operadora_id) REFERENCES public.operadoras(id) ON DELETE CASCADE,
  CONSTRAINT documento_configs_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE CASCADE
);

-- Tabela de documentos dos beneficiários
CREATE TABLE IF NOT EXISTS public.beneficiario_documentos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  beneficiario_id uuid NOT NULL,
  documento_config_id uuid NOT NULL,
  arquivo_nome text,
  arquivo_url text,
  status text DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'ENVIADO', 'APROVADO', 'REJEITADO')),
  uploaded_at timestamp without time zone,
  approved_by bigint,
  approved_at timestamp without time zone,
  motivo_rejeicao text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT beneficiario_documentos_pkey PRIMARY KEY (id),
  CONSTRAINT beneficiario_documentos_beneficiario_id_fkey FOREIGN KEY (beneficiario_id) REFERENCES public.beneficiarios(id) ON DELETE CASCADE,
  CONSTRAINT beneficiario_documentos_config_id_fkey FOREIGN KEY (documento_config_id) REFERENCES public.documento_configs(id) ON DELETE CASCADE,
  CONSTRAINT beneficiario_documentos_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users_profile(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_documento_configs_operadora ON public.documento_configs(operadora_id);
CREATE INDEX IF NOT EXISTS idx_documento_configs_produto ON public.documento_configs(produto_id);
CREATE INDEX IF NOT EXISTS idx_documento_configs_tipo ON public.documento_configs(tipo_cliente);
CREATE INDEX IF NOT EXISTS idx_beneficiario_docs_beneficiario ON public.beneficiario_documentos(beneficiario_id);
CREATE INDEX IF NOT EXISTS idx_beneficiario_docs_status ON public.beneficiario_documentos(status);

-- Triggers
CREATE TRIGGER update_documento_configs_updated_at 
BEFORE UPDATE ON public.documento_configs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_beneficiario_documentos_updated_at 
BEFORE UPDATE ON public.beneficiario_documentos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.documento_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiario_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON public.documento_configs
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable all for authenticated users" ON public.beneficiario_documentos
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- STORAGE BUCKET
-- =====================================================

-- Criar bucket para documentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('beneficiario-documentos', 'beneficiario-documentos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy para upload (authenticated users)
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'beneficiario-documentos');

-- Policy para download (authenticated users)
CREATE POLICY "Authenticated users can download" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'beneficiario-documentos');

-- Policy para delete (authenticated users)
CREATE POLICY "Authenticated users can delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'beneficiario-documentos');
