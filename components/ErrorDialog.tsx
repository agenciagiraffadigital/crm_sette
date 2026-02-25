import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorDialogProps {
  visible: boolean;
  onHide: () => void;
  title?: string;
  message: string;
}

export const ErrorDialog: React.FC<ErrorDialogProps> = ({ 
  visible, 
  onHide, 
  title = 'Erro',
  message 
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>

        <p className="text-gray-700 mb-6">{message}</p>

        <button
          onClick={onHide}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );
};
