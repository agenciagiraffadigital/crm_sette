import React, { useState } from 'react';
import { Trophy } from 'lucide-react';

interface WinDialogProps {
  visible: boolean;
  onHide: () => void;
  onConfirm: (motivo: string, motivoOutro?: string) => void;
}

const MOTIVOS = [
  'Confiança',
  'Melhoria na rede de atendimento',
  'Adequação de custos',
  'Campanha de vendas',
  'O cliente já conhecia o produto/serviço',
  'Outros'
];

export const WinDialog: React.FC<WinDialogProps> = ({ visible, onHide, onConfirm }) => {
  const [motivo, setMotivo] = useState<string>('');
  const [motivoOutro, setMotivoOutro] = useState<string>('');

  const handleConfirm = () => {
    if (!motivo) return;
    onConfirm(motivo, motivo === 'Outros' ? motivoOutro : undefined);
    setMotivo('');
    setMotivoOutro('');
  };

  const handleHide = () => {
    setMotivo('');
    setMotivoOutro('');
    onHide();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Trophy className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Motivo da Venda</h3>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Motivo *</label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none bg-white text-gray-900"
            >
              <option value="">Selecione o motivo...</option>
              {MOTIVOS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {motivo === 'Outros' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Especifique o motivo *</label>
              <input
                type="text"
                value={motivoOutro}
                onChange={(e) => setMotivoOutro(e.target.value)}
                placeholder="Digite o motivo"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={handleHide}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!motivo || (motivo === 'Outros' && !motivoOutro)}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};
