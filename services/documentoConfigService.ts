import { supabase } from './supabaseClient';

export interface DocumentoConfig {
  id: string;
  operadora_id: number;
  produto_id: number;
  tipo_cliente: 'PF' | 'PME' | 'ADESAO';
  nome_documento: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface BeneficiarioDocumento {
  id: string;
  beneficiario_id: string;
  documento_config_id: string;
  arquivo_nome?: string;
  arquivo_url?: string;
  status: 'PENDENTE' | 'ENVIADO' | 'APROVADO' | 'REJEITADO';
  uploaded_at?: string;
  approved_by?: number;
  approved_at?: string;
  motivo_rejeicao?: string;
  documento_config?: DocumentoConfig;
}

class DocumentoConfigService {
  // ========== CONFIGURAÇÃO ==========
  
  async getDocumentoConfigs(operadoraId: number, produtoId: number, tipoCliente: string) {
    const { data, error } = await supabase
      .from('documento_configs')
      .select('*')
      .eq('operadora_id', operadoraId)
      .eq('produto_id', produtoId)
      .eq('tipo_cliente', tipoCliente)
      .eq('ativo', true)
      .order('ordem');
    
    if (error) throw error;
    return data as DocumentoConfig[];
  }

  async createDocumentoConfig(config: Omit<DocumentoConfig, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('documento_configs')
      .insert(config)
      .select()
      .single();
    
    if (error) throw error;
    return data as DocumentoConfig;
  }

  async updateDocumentoConfig(id: string, updates: Partial<DocumentoConfig>) {
    const { data, error } = await supabase
      .from('documento_configs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as DocumentoConfig;
  }

  async deleteDocumentoConfig(id: string) {
    const { error } = await supabase
      .from('documento_configs')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  async reorderDocumentos(configs: { id: string; ordem: number }[]) {
    const updates = configs.map(c => 
      supabase.from('documento_configs').update({ ordem: c.ordem }).eq('id', c.id)
    );
    await Promise.all(updates);
  }

  // ========== BENEFICIÁRIO DOCUMENTOS ==========

  async getBeneficiarioDocumentos(beneficiarioId: string) {
    const { data, error } = await supabase
      .from('beneficiario_documentos')
      .select('*, documento_config:documento_configs(*)')
      .eq('beneficiario_id', beneficiarioId)
      .order('created_at');
    
    if (error) throw error;
    return data as BeneficiarioDocumento[];
  }

  async createBeneficiarioDocumento(beneficiarioId: string, documentoConfigId: string) {
    const { data, error } = await supabase
      .from('beneficiario_documentos')
      .insert({
        beneficiario_id: beneficiarioId,
        documento_config_id: documentoConfigId,
        status: 'PENDENTE'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as BeneficiarioDocumento;
  }

  async uploadDocumento(
    beneficiarioDocId: string,
    file: File,
    leadId: number,
    beneficiarioId: string
  ) {
    // Upload para Supabase Storage
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `lead_${leadId}/beneficiario_${beneficiarioId}/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('beneficiario-documentos')
      .upload(filePath, file);
    
    if (uploadError) throw uploadError;

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from('beneficiario-documentos')
      .getPublicUrl(filePath);

    // Atualizar registro
    const { data, error } = await supabase
      .from('beneficiario_documentos')
      .update({
        arquivo_nome: file.name,
        arquivo_url: urlData.publicUrl,
        status: 'ENVIADO',
        uploaded_at: new Date().toISOString()
      })
      .eq('id', beneficiarioDocId)
      .select()
      .single();
    
    if (error) throw error;
    return data as BeneficiarioDocumento;
  }

  async aprovarDocumento(docId: string, userId: number) {
    const { data, error } = await supabase
      .from('beneficiario_documentos')
      .update({
        status: 'APROVADO',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        motivo_rejeicao: null
      })
      .eq('id', docId)
      .select()
      .single();
    
    if (error) throw error;
    return data as BeneficiarioDocumento;
  }

  async rejeitarDocumento(docId: string, userId: number, motivo: string) {
    const { data, error } = await supabase
      .from('beneficiario_documentos')
      .update({
        status: 'REJEITADO',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        motivo_rejeicao: motivo
      })
      .eq('id', docId)
      .select()
      .single();
    
    if (error) throw error;
    return data as BeneficiarioDocumento;
  }

  async checkDocumentosCompletos(leadId: number): Promise<{ completo: boolean; pendentes: string[] }> {
    // Buscar todos os beneficiários do lead
    const { data: beneficiarios, error: benError } = await supabase
      .from('beneficiarios')
      .select('id, nome')
      .eq('lead_id', leadId);
    
    if (benError) throw benError;

    const pendentes: string[] = [];

    for (const ben of beneficiarios || []) {
      const { data: docs } = await supabase
        .from('beneficiario_documentos')
        .select('status, documento_config:documento_configs(nome_documento)')
        .eq('beneficiario_id', ben.id)
        .neq('status', 'APROVADO');
      
      if (docs && docs.length > 0) {
        docs.forEach(doc => {
          pendentes.push(`${ben.nome}: ${(doc.documento_config as any)?.nome_documento}`);
        });
      }
    }

    return {
      completo: pendentes.length === 0,
      pendentes
    };
  }
}

export const documentoConfigService = new DocumentoConfigService();
