-- =====================================================
-- MIGRATION: Desabilitar RLS no Ambiente DEV
-- =====================================================
-- ATENÇÃO: Execute apenas no ambiente de DESENVOLVIMENTO
-- NÃO execute em PRODUÇÃO
-- =====================================================

-- Desabilitar RLS nas novas tabelas
ALTER TABLE public.documento_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiario_documentos DISABLE ROW LEVEL SECURITY;

-- Remover policies existentes
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.documento_configs;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.beneficiario_documentos;

-- Remover policies do storage
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can download" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;

-- Criar policies públicas para storage (DEV only)
CREATE POLICY "Public can upload to beneficiario-documentos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'beneficiario-documentos');

CREATE POLICY "Public can download from beneficiario-documentos" ON storage.objects
FOR SELECT USING (bucket_id = 'beneficiario-documentos');

CREATE POLICY "Public can delete from beneficiario-documentos" ON storage.objects
FOR DELETE USING (bucket_id = 'beneficiario-documentos');

CREATE POLICY "Public can update in beneficiario-documentos" ON storage.objects
FOR UPDATE USING (bucket_id = 'beneficiario-documentos');
