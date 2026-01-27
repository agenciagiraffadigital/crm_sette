import React from 'react';
import { AlertCircle, CheckCircle, X, AlertTriangle } from 'lucide-react';

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
  if (!isOpen) return null;

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

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'confirm':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <div className="fixed top-20 left-0 right-0 flex justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-[90%] border-2 border-slate-300">
        <div className={`p-4 border-b ${getColors()}`}>
          <div className="flex items-center space-x-3">
            {getIcon()}
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-slate-600">{message}</p>
        </div>
        
        <div className="p-4 border-t border-slate-200 flex justify-end space-x-3">
          {type === 'confirm' && onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm || onCancel}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
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
      </div>
    </div>
  );
};