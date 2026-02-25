import React, { useState } from 'react';
import { XCircle } from 'lucide-react';
import { InputSwitch } from 'primereact/inputswitch';

interface LostDialogProps {
  visible: boolean;
  onHide: () => void;
  onConfirm: (data: {
    motivo: string;
    detalhes?: string;
    followup: boolean;
    followupData?: string;
    followupStatus?: string;
  }) => void;
}

const MOTIVOS = [
  'Achou caro',
  'Não tem interesse',
  'Já possui Serviço/Produto semelhante',
  'Outros'
];

const STATUS_FOLLOWUP = [
  { value: 'OPORTUNIDADES', label: 'Oportunidades' },
  { value: 'EM_CONTATO', label: 'Em Contato' },
  { value: 'NEGOCIACAO', label: 'Negociação' }
];

export const LostDialog: React.FC<LostDialogProps> = ({ visible, onHide, onConfirm }) => {
  const [motivo, setMotivo] = useState('');
  const [detalhes, setDetalhes] = useState('');
  const [followup, setFollowup] = useState(false);
  const [followupData, setFollowupData] = useState('');
  const [followupStatus, setFollowupStatus] = useState('OPORTUNIDADES');

  const handleConfirm = () => {
    if (!motivo) return;
    if (motivo === 'Outros' && !detalhes) return;
    if (followup && (!followupData || !followupStatus)) return;

    onConfirm({
      motivo,
      detalhes: motivo === 'Outros' ? detalhes : undefined,
      followup,
      followupData: followup ? followupData : undefined,
      followupStatus: followup ? followupStatus : undefined
    });

    setMotivo('');
    setDetalhes('');
    setFollowup(false);
    setFollowupData('');
    setFollowupStatus('OPORTUNIDADES');
  };

  const handleHide = () => {
    setMotivo('');
    setDetalhes('');
    setFollowup(false);
    setFollowupData('');
    setFollowupStatus('OPORTUNIDADES');
    onHide();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Marcar como Perdido</h3>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Motivo *</label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none bg-white text-gray-900"
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
              <textarea
                value={detalhes}
                onChange={(e) => setDetalhes(e.target.value)}
                placeholder="Digite o motivo"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none resize-none"
              />
            </div>
          )}

          <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
            <label className="text-sm font-medium text-gray-700">Follow-up</label>
            <InputSwitch checked={followup} onChange={(e) => setFollowup(e.value)} className="scale-75" />
          </div>

          {followup && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data de Retorno *</label>
                <input
                  type="date"
                  value={followupData}
                  onChange={(e) => setFollowupData(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status de Retorno *</label>
                <select
                  value={followupStatus}
                  onChange={(e) => setFollowupStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white text-gray-900"
                >
                  {STATUS_FOLLOWUP.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={handleHide}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={
              !motivo ||
              (motivo === 'Outros' && !detalhes) ||
              (followup && (!followupData || !followupStatus))
            }
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};
