import React from 'react';
import { Dialog } from 'primereact/dialog';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface SystemModalProps {
  isOpen: boolean;
  type: 'alert' | 'confirm' | 'success' | 'error';
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const SystemModal: React.FC<SystemModalProps> = ({
  isOpen,
  type,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Cancelar'
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-600" />;
      case 'confirm':
        return <AlertTriangle className="w-6 h-6 text-orange-600" />;
      default:
        return <AlertCircle className="w-6 h-6 text-blue-600" />;
    }
  };

  const footer = (
    <div className="flex justify-end gap-2">
      {type === 'confirm' && onCancel && (
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          {cancelText}
        </button>
      )}
      <button
        onClick={onConfirm || onCancel}
        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
          type === 'error' 
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : type === 'success'
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : type === 'confirm'
            ? 'bg-orange-600 hover:bg-orange-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {confirmText}
      </button>
    </div>
  );

  return (
    <Dialog
      visible={isOpen}
      onHide={onCancel || (() => {})}
      header={
        <div className="flex items-center gap-3">
          {getIcon()}
          <span className="text-lg font-semibold">{title}</span>
        </div>
      }
      footer={footer}
      style={{ width: '450px' }}
      modal
    >
      <p className="text-slate-600 text-sm">{message}</p>
    </Dialog>
  );
};