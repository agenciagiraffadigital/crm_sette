import React, { useState, useEffect } from 'react';
import { documentoConfigService, DocumentoConfig } from '../services/documentoConfigService';
import { Operadora, Produto } from '../services/operadoraService';
import { Plus, Trash2, GripVertical, FileText, ArrowLeft } from 'lucide-react';
import { SystemModal } from './SystemModal';

interface DocumentoConfigPanelProps {
  operadora: Operadora;
  produto: Produto;
  onBack: () => void;
}

export const DocumentoConfigPanel: React.FC<DocumentoConfigPanelProps> = ({ operadora, produto, onBack }) => {
  const [tipoCliente, setTipoCliente] = useState<'PF' | 'PME' | 'ADESAO'>('PF');
  const [documentos, setDocumentos] = useState<DocumentoConfig[]>([]);
  const [novoDoc, setNovoDoc] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'success' | 'error';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: 'alert', title: '', message: '' });

  useEffect(() => {
    loadDocumentos();
  }, [tipoCliente]);

  const loadDocumentos = async () => {
    setLoading(true);
    try {
      const data = await documentoConfigService.getDocumentoConfigs(operadora.id, produto.id, tipoCliente);
      setDocumentos(data);
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!novoDoc.trim()) return;
    try {
      await documentoConfigService.createDocumentoConfig({
        operadora_id: operadora.id,
        produto_id: produto.id,
        tipo_cliente: tipoCliente,
        nome_documento: novoDoc,
        ordem: documentos.length,
        ativo: true
      });
      setNovoDoc('');
      loadDocumentos();
    } catch (error) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Erro',
        message: 'Erro ao adicionar documento'
      });
    }
  };

  const handleDelete = async (id: string) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Confirmar Exclusão',
      message: 'Tem certeza que deseja excluir este documento?',
      onConfirm: async () => {
        try {
          await documentoConfigService.deleteDocumentoConfig(id);
          loadDocumentos();
          setModal({ isOpen: false, type: 'alert', title: '', message: '' });
        } catch (error) {
          setModal({
            isOpen: true,
            type: 'error',
            title: 'Erro',
            message: 'Erro ao excluir documento'
          });
        }
      }
    });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{operadora.nome} - {produto.nome}</h2>
            <p className="text-slate-600 text-sm">Configure os documentos obrigatórios por tipo de cliente</p>
          </div>
        </div>

        {/* Tabs Tipo Cliente */}
        <div className="flex gap-2 border-b border-slate-200">
          {(['PF', 'PME', 'ADESAO'] as const).map(tipo => (
            <button
              key={tipo}
              onClick={() => setTipoCliente(tipo)}
              className={`px-6 py-3 font-semibold text-sm transition-all ${
                tipoCliente === tipo
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tipo}
            </button>
          ))}
        </div>

        {/* Add Document */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={novoDoc}
              onChange={(e) => setNovoDoc(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Nome do documento (ex: RG, CPF, Comprovante de Residência)"
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              onClick={handleAdd}
              disabled={!novoDoc.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <img src="/loading.gif" alt="Carregando..." className="w-12 h-12 mx-auto" />
            </div>
          ) : documentos.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>Nenhum documento configurado para {tipoCliente}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {documentos.map((doc, index) => (
                <div key={doc.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                  <GripVertical className="w-5 h-5 text-slate-400 cursor-move" />
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                    <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                  </div>
                  <FileText className="w-5 h-5 text-slate-400" />
                  <span className="flex-1 font-medium text-slate-800">{doc.nome_documento}</span>
                  <span className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-full font-semibold">
                    OBRIGATÓRIO
                  </span>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <SystemModal
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
        onCancel={() => setModal({ isOpen: false, type: 'alert', title: '', message: '' })}
      />
    </>
  );
};
