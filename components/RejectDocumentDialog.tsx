import React, { useState } from 'react';
import { XCircle, X } from 'lucide-react';

interface RejectDocumentDialogProps {
  visible: boolean;
  documentName: string;
  onHide: () => void;
  onConfirm: (motivo: string) => void;
}

export const RejectDocumentDialog: React.FC<RejectDocumentDialogProps> = ({
  visible,
  documentName,
  onHide,
  onConfirm
}) => {
  const [motivo, setMotivo] = useState('');

  if (!visible) return null;

  const handleConfirm = () => {
    if (!motivo.trim()) {
      alert('Por favor, informe o motivo da rejeição');
      return;
    }
    onConfirm(motivo);
    setMotivo('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Rejeitar Documento</h3>
          </div>
          <button
            onClick={onHide}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-4">
            Documento: <strong>{documentName}</strong>
          </p>
          
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Motivo da Rejeição *
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Descreva o motivo da rejeição..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onHide}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
          >
            Rejeitar
          </button>
        </div>
      </div>
    </div>
  );
};
