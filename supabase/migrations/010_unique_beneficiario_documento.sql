-- Remover duplicatas existentes
DELETE FROM beneficiario_documentos a USING beneficiario_documentos b
WHERE a.id > b.id 
AND a.beneficiario_id = b.beneficiario_id 
AND a.documento_config_id = b.documento_config_id;

-- Adicionar constraint única
ALTER TABLE beneficiario_documentos 
ADD CONSTRAINT beneficiario_documentos_unique 
UNIQUE (beneficiario_id, documento_config_id);
