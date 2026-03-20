-- Migration: Adicionar status ANÁLISE_OPERADORA ao fluxo de propostas
-- Fluxo: ENVIADA → ANÁLISE → ANÁLISE_OPERADORA → IMPLANTADA

-- Atualizar o CHECK constraint da coluna status_kanban para incluir o novo status
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_kanban_check;

ALTER TABLE public.leads ADD CONSTRAINT leads_status_kanban_check 
  CHECK (status_kanban = ANY (ARRAY[
    'ENVIADA'::text, 
    'ANÁLISE'::text, 
    'ANÁLISE_OPERADORA'::text,
    'IMPLANTADA'::text, 
    'CANCELADA'::text, 
    'OPORTUNIDADES'::text, 
    'EM_CONTATO'::text, 
    'NEGOCIACAO'::text, 
    'PROPOSTA'::text
  ]));
