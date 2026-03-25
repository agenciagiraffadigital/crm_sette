import React, { useState, useEffect } from 'react';
import { documentoConfigService, BeneficiarioDocumento } from '../services/documentoConfigService';
import { FileText, Upload, Download, CheckCircle, XCircle, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { RejectDocumentDialog } from './RejectDocumentDialog';

interface BeneficiarioDocumentosProps {
  beneficiarioId: string;
  leadId: number;
  operadoraId: number;
  produtoId: number;
  tipoCliente: 'PF' | 'PME' | 'ADESAO';
  isAdmin: boolean;
  currentUserId: number;
  onStatusChange?: () => void;
}

export const BeneficiarioDocumentos: React.FC<BeneficiarioDocumentosProps> = ({
  beneficiarioId,
  leadId,
  operadoraId,
  produtoId,
  tipoCliente,
  isAdmin,
  currentUserId,
  onStatusChange
}) => {
  const [documentos, setDocumentos] = useState<BeneficiarioDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ visible: boolean; docId: string; docName: string }>({ 
    visible: false, 
    docId: '', 
    docName: '' 
  });

  useEffect(() => {
    loadDocumentos();
  }, [beneficiarioId, operadoraId, produtoId, tipoCliente]);

  const loadDocumentos = async () => {
    try {
      // Verificar se beneficiário existe no banco (é UUID válido)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(beneficiarioId)) {
        setDocumentos([]);
        setLoading(false);
        return;
      }

      // Validar se tem operadora e produto
      if (!operadoraId || !produtoId || operadoraId === 0 || produtoId === 0) {
        setDocumentos([]);
        setLoading(false);
        return;
      }

      // Buscar configs de documentos
      const configs = await documentoConfigService.getDocumentoConfigs(operadoraId, produtoId, tipoCliente);
      
      // Buscar documentos já enviados
      const existentes = await documentoConfigService.getBeneficiarioDocumentos(beneficiarioId);
      
      // Criar registros para configs que não existem
      const docsMap = new Map(existentes.map(d => [d.documento_config_id, d]));
      const todosDocumentos: BeneficiarioDocumento[] = [];
      
      for (const config of configs) {
        if (docsMap.has(config.id)) {
          todosDocumentos.push(docsMap.get(config.id)!);
        } else {
          // Verificar se já existe no banco antes de criar
          const { data: existing } = await supabase
            .from('beneficiario_documentos')
            .select('*, documento_config:documento_configs(*)')
            .eq('beneficiario_id', beneficiarioId)
            .eq('documento_config_id', config.id)
            .maybeSingle();
          
          if (existing) {
            todosDocumentos.push(existing as BeneficiarioDocumento);
          } else {
            const novoDoc = await documentoConfigService.createBeneficiarioDocumento(beneficiarioId, config.id);
            todosDocumentos.push(novoDoc);
          }
        }
      }
      
      setDocumentos(todosDocumentos);
      
      // Notificar mudança de status
      if (todosDocumentos.length > 0) {
        onStatusChange?.();
      }
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (docId: string, file: File) => {
    setUploading(docId);
    try {
      const updated = await documentoConfigService.uploadDocumento(docId, file, leadId, beneficiarioId);
      setDocumentos(prev => prev.map(d => d.id === docId ? updated : d));
      onStatusChange?.();
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload do documento');
    } finally {
      setUploading(null);
    }
  };

  const handleAprovar = async (docId: string) => {
    try {
      const updated = await documentoConfigService.aprovarDocumento(docId, currentUserId);
      setDocumentos(prev => prev.map(d => d.id === docId ? updated : d));
      onStatusChange?.();
    } catch (error) {
      console.error('Erro ao aprovar:', error);
      alert('Erro ao aprovar documento');
    }
  };

  const handleRejeitar = async (motivo: string) => {
    try {
      const updated = await documentoConfigService.rejeitarDocumento(rejectDialog.docId, currentUserId, motivo);
      setDocumentos(prev => prev.map(d => d.id === rejectDialog.docId ? updated : d));
      setRejectDialog({ visible: false, docId: '', docName: '' });
      onStatusChange?.();
    } catch (error) {
      console.error('Erro ao rejeitar:', error);
      alert('Erro ao rejeitar documento');
    }
  };

  const handleExcluir = async (doc: BeneficiarioDocumento) => {
    if (!confirm(`Tem certeza que deseja excluir o documento "${doc.documento_config?.nome_documento || 'Documento'}"?`)) return;
    
    setDeleting(doc.id);
    try {
      const updated = await documentoConfigService.excluirDocumento(doc.id, doc.arquivo_url);
      setDocumentos(prev => prev.map(d => d.id === doc.id ? updated : d));
      onStatusChange?.();
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      alert('Erro ao excluir documento');
    } finally {
      setDeleting(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APROVADO': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'REJEITADO': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'ENVIADO': return <Clock className="w-5 h-5 text-yellow-600" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDENTE: 'bg-gray-100 text-gray-700',
      ENVIADO: 'bg-yellow-100 text-yellow-700',
      APROVADO: 'bg-green-100 text-green-700',
      REJEITADO: 'bg-red-100 text-red-700'
    };
    return badges[status as keyof typeof badges] || badges.PENDENTE;
  };

  if (loading) {
    return <div className="text-center py-4"><img src="/loading.gif" className="w-8 h-8 mx-auto" /></div>;
  }

  if (documentos.length === 0) {
    // Verificar se é beneficiário temporário
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(beneficiarioId)) {
      return (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>Salve o lead primeiro para gerenciar documentos</p>
        </div>
      );
    }
    
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>Selecione operadora e produto para configurar documentos</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documentos.map((doc) => (
        <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              {getStatusIcon(doc.status)}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900">{doc.documento_config?.nome_documento}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getStatusBadge(doc.status)}`}>
                    {doc.status}
                  </span>
                </div>
                
                {doc.arquivo_nome && (
                  <p className="text-sm text-gray-600 mt-1">{doc.arquivo_nome}</p>
                )}
                
                {doc.motivo_rejeicao && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded mt-2">
                    <strong>Motivo:</strong> {doc.motivo_rejeicao}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Upload Button */}
              {doc.status !== 'APROVADO' && (
                <label className="cursor-pointer">
                  <div className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                    {uploading === doc.id ? (
                      <>Enviando...</>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        {doc.arquivo_nome ? 'Reenviar' : 'Upload'}
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg"
                    disabled={uploading === doc.id}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(doc.id, file);
                    }}
                  />
                </label>
              )}

              {/* Download Button */}
              {doc.arquivo_url && (
                <a
                  href={doc.arquivo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Baixar
                </a>
              )}

              {/* Delete Button - visível quando tem arquivo e não está aprovado */}
              {doc.arquivo_url && doc.status !== 'APROVADO' && (
                <button
                  onClick={() => handleExcluir(doc)}
                  disabled={deleting === doc.id}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                  title="Excluir documento"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting === doc.id ? 'Excluindo...' : 'Excluir'}
                </button>
              )}

              {/* Admin Actions */}
              {isAdmin && doc.status === 'ENVIADO' && (
                <>
                  <button
                    onClick={() => handleAprovar(doc.id)}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Aprovar
                  </button>
                  <button
                    onClick={() => setRejectDialog({ 
                      visible: true, 
                      docId: doc.id, 
                      docName: doc.documento_config?.nome_documento || 'Documento' 
                    })}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Rejeitar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}

      <RejectDocumentDialog
        visible={rejectDialog.visible}
        documentName={rejectDialog.docName}
        onHide={() => setRejectDialog({ visible: false, docId: '', docName: '' })}
        onConfirm={handleRejeitar}
      />
    </div>
  );
};
