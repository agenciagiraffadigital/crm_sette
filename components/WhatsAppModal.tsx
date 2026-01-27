import React, { useState, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { Lead } from '../types';

interface WhatsAppModalProps {
  lead: Lead;
  onClose: () => void;
  onSend: (phone: string, message: string) => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ lead, onClose, onSend }) => {
  const [ddi, setDdi] = useState('+55');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (lead.telefone) {
      const cleanPhone = lead.telefone.replace(/\D/g, '');
      setPhone(cleanPhone);
    }
  }, [lead.telefone]);

  const handleSend = () => {
    if (!phone || !message.trim()) return;
    onSend(`${ddi}${phone}`, message);
  };

  const charCount = message.length;
  const maxChars = 1000;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-bold text-slate-800">Enviar WhatsApp</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Telefone
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={ddi}
                onChange={(e) => setDdi(e.target.value)}
                className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="11999999999"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mensagem
            </label>
            <textarea
              value={message}
              onChange={(e) => {
                if (e.target.value.length <= maxChars) {
                  setMessage(e.target.value);
                }
              }}
              placeholder="Digite sua mensagem..."
              rows={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
            <div className="text-right text-xs text-slate-500 mt-1">
              {charCount}/{maxChars}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={!phone || !message.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
};
