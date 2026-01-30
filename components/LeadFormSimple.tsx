import React, { useState, useEffect } from 'react';
import { Lead, User } from '../types';
import { leadService } from '../services/leadService';
import { Save, ArrowLeft } from 'lucide-react';
import { maskPhone } from '../utils/masks';
import { SystemModal } from './SystemModal';

interface LeadFormProps {
  leadId: number;
  currentUser: User;
  onBack: () => void;
  onSave: (updatedLead: Lead) => void;
}

export const LeadFormSimple: React.FC<LeadFormProps> = ({ leadId, currentUser, onBack, onSave }) => {
  const [formData, setFormData] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [systemModal, setSystemModal] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'success' | 'error';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'alert', title: '', message: '' });

  useEffect(() => {
    const loadLead = async () => {
      try {
        const data = await leadService.getLeadById(leadId);
        if (data) setFormData(data);
      } catch (error) {
        console.error('Erro ao carregar lead:', error);
      } finally {
        setLoading(false);
      }
    };
    loadLead();
  }, [leadId]);

  const handleSubmit = async () => {
    if (!formData) return;
    setSaving(true);
    try {
      const updated = await leadService.saveLead(formData);
      onSave(updated);
    } catch (e) {
      console.error(e);
      setSystemModal({
        isOpen: true,
        type: 'error',
        title: 'Erro ao Salvar',
        message: 'Erro ao salvar as alterações'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-slate-600">Carregando formulário...</p>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Erro: Lead não encontrado</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-full flex flex-col">
      {/* Header */}
      <div className="bg-slate-100 border-b border-slate-200 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{formData.nome}</h1>
            <p className="text-xs text-slate-500">ID: {formData.id} | Vendedor: {formData.vendedor}</p>
          </div>
        </div>
        
        <button 
          onClick={handleSubmit} 
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-bold mb-4">Dados do Lead</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="text"
                value={formData.telefone}
                onChange={(e) => setFormData({...formData, telefone: maskPhone(e.target.value)})}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operadora</label>
              <input
                type="text"
                value={formData.operadora}
                onChange={(e) => setFormData({...formData, operadora: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-md font-semibold mb-2">Status</h3>
            <p className="text-sm text-gray-600">Status atual: {formData.status_kanban}</p>
          </div>
        </div>
      </div>

      {/* System Modal */}
      <SystemModal
        isOpen={systemModal.isOpen}
        type={systemModal.type}
        title={systemModal.title}
        message={systemModal.message}
        onConfirm={() => setSystemModal({ isOpen: false, type: 'alert', title: '', message: '' })}
        onCancel={() => setSystemModal({ isOpen: false, type: 'alert', title: '', message: '' })}
      />
    </div>
  );
};