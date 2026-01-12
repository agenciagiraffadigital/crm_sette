import React from 'react';
import { Card } from '../src/components/ui/Card';
import { Button } from '../src/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: 'lead' | 'oportunidade';
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card variant="elevated" padding="lg" className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            Confirmar Exclusão
          </h3>
        </div>
        
        <p className="text-sm text-gray-600 mb-6">
          Tem certeza que deseja excluir {itemType === 'lead' ? 'o lead' : 'a oportunidade'} <strong>{itemName}</strong>?
        </p>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
          <p className="text-xs text-red-700">
            <strong>Atenção:</strong> Esta ação não pode ser desfeita. Todos os dados relacionados serão perdidos permanentemente.
          </p>
        </div>

        <div className="flex gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose} 
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button 
            type="button" 
            variant="danger" 
            onClick={onConfirm} 
            className="flex-1"
          >
            Excluir
          </Button>
        </div>
      </Card>
    </div>
  );
};