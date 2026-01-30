-- =====================================================
-- ATUALIZAÇÃO: Activity Logs - Tipos Adicionais
-- =====================================================

-- Adicionar novos tipos de log ao CHECK constraint
ALTER TABLE public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_type_check;

ALTER TABLE public.activity_logs ADD CONSTRAINT activity_logs_type_check 
CHECK (type = ANY (ARRAY[
  'STATUS_CHANGE'::text, 
  'DOCUMENT_UPLOAD'::text, 
  'NOTE_ADDED'::text, 
  'VALUE_UPDATED'::text, 
  'REASSIGNMENT'::text, 
  'CONTACT_MADE'::text, 
  'LOSS_RECORDED'::text, 
  'CONVERSION'::text,
  'MUDANCA_STATUS'::text,
  'ATUALIZACAO'::text,
  'LEAD_PERDIDO'::text,
  'FOLLOWUP_AGENDADO'::text
]));

-- Criar índice para melhorar performance de busca por tipo
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON public.activity_logs(type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
