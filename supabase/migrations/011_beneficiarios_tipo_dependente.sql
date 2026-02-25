-- =====================================================
-- MIGRATION: Adicionar Tipo de Beneficiário e Tipo de Dependente
-- =====================================================

-- Adicionar colunas para os novos campos
ALTER TABLE public.beneficiarios 
ADD COLUMN IF NOT EXISTS tipo_beneficiario text DEFAULT 'TITULAR' CHECK (tipo_beneficiario IN ('TITULAR', 'DEPENDENTE')),
ADD COLUMN IF NOT EXISTS tipo_dependente text CHECK (tipo_dependente IN ('CONJUGE', 'FILHO_FILHA', 'PAI_MAE', 'IRMAOS', 'PADRASTO_MADRASTA', 'TIOS', 'SOGROS', 'SOBRINHOS', 'CUNHADOS', 'GENRO_NORA'));

-- Migrar dados existentes
UPDATE public.beneficiarios 
SET tipo_beneficiario = CASE 
  WHEN tipo = 'TITULAR' THEN 'TITULAR'
  WHEN tipo = 'DEPENDENTE' THEN 'DEPENDENTE'
  ELSE 'TITULAR'
END
WHERE tipo_beneficiario IS NULL;

-- Para dependentes existentes, definir um tipo padrão baseado no parentesco
UPDATE public.beneficiarios 
SET tipo_dependente = CASE 
  WHEN LOWER(parentesco) LIKE '%conjuge%' OR LOWER(parentesco) LIKE '%esposa%' OR LOWER(parentesco) LIKE '%marido%' THEN 'CONJUGE'
  WHEN LOWER(parentesco) LIKE '%filho%' OR LOWER(parentesco) LIKE '%filha%' THEN 'FILHO_FILHA'
  WHEN LOWER(parentesco) LIKE '%pai%' OR LOWER(parentesco) LIKE '%mae%' OR LOWER(parentesco) LIKE '%mãe%' THEN 'PAI_MAE'
  WHEN LOWER(parentesco) LIKE '%irmao%' OR LOWER(parentesco) LIKE '%irmã%' THEN 'IRMAOS'
  ELSE 'CONJUGE'
END
WHERE tipo_beneficiario = 'DEPENDENTE' AND tipo_dependente IS NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.beneficiarios.tipo_beneficiario IS 'Tipo do beneficiário: TITULAR ou DEPENDENTE';
COMMENT ON COLUMN public.beneficiarios.tipo_dependente IS 'Tipo específico do dependente quando tipo_beneficiario = DEPENDENTE';