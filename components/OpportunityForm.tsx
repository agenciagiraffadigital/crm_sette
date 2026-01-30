import React, { useState, useEffect, useCallback } from 'react';
import { Opportunity, OpportunityStatus, User } from '../types';
import { OPPORTUNITY_COLUMNS } from '../constants';
import { opportunityService } from '../services/opportunityService';
import { authService } from '../services/authService';
import { Save, ArrowLeft, Edit3 } from 'lucide-react';
import { Button } from '../src/components/ui/Button';
import { Card } from '../src/components/ui/Card';
import { Select as UISelect } from '../src/components/ui/Select';
import { maskPhone, unmask } from '../utils/masks';
import { SystemModal } from './SystemModal';

interface OpportunityFormProps {
  opportunityId: number;
  currentUser: User;
  onBack: () => void;
  onSave: (updatedOpportunity: Opportunity) => void;
}

// Enhanced Input component
const ValidatedInput = ({ 
  label, 
  value, 
  onChange, 
  placeholder = "", 
  type = "text", 
  className = "",
  required = false,
  mask
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  required?: boolean;
  mask?: (value: string) => string;
}) => {
  const id = label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined;
  
  return (
    <div className={`flex flex-col space-y-1 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input 
        id={id}
        type={type} 
        value={value || ''} 
        onChange={e => {
          const newValue = mask ? mask(e.target.value) : e.target.value;
          onChange(newValue);
        }}
        placeholder={placeholder || (label ? `${label}...` : '')}
        className="bg-white border border-slate-400 rounded p-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200 transition-all w-full"
      />
    </div>
  );
};

// Enhanced Select component
const Select = ({ 
  label, 
  value, 
  onChange, 
  options, 
  required = false 
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: (string | {value: string, label: string})[];
  required?: boolean;
}) => {
  const id = `select-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="flex flex-col space-y-1">
      <label htmlFor={id} className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <select 
        id={id}
        value={value || ''} 
        onChange={e => onChange(e.target.value)}
        className="bg-white border border-slate-400 rounded p-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
      >
        <option value="">Selecione...</option>
        {options.map((opt: any) => (
          <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>
        ))}
      </select>
    </div>
  );
};

// Seller Reassignment Modal (Admin Only)
interface SellerReassignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sellerId: number) => void;
  opportunityName: string;
  currentSeller: string;
  loading: boolean;
}

const SellerReassignmentModal: React.FC<SellerReassignmentModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  opportunityName, 
  currentSeller,
  loading 
}) => {
  const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);
  const [sellers, setSellers] = useState<User[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const loadSellers = async () => {
        setLoadingSellers(true);
        try {
          const activeSellers = await authService.getActiveSellers();
          setSellers(activeSellers);
        } catch (error) {
          console.error('Erro ao carregar vendedores:', error);
        } finally {
          setLoadingSellers(false);
        }
      };
      loadSellers();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSellerId) {
      onSubmit(selectedSellerId);
      setSelectedSellerId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card variant="elevated" padding="lg" className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <h3 className="text-lg font-semibold mb-4">
            Reatribuir Vendedor - {opportunityName}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Vendedor atual: <strong>{currentSeller}</strong>
          </p>
          
          {loadingSellers ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-sm text-gray-600">Carregando vendedores...</span>
            </div>
          ) : (
            <UISelect
              label="Novo Vendedor"
              value={selectedSellerId?.toString() || ''}
              onChange={(e) => setSelectedSellerId(e.target.value ? parseInt(e.target.value) : null)}
              options={sellers.map(seller => ({
                value: seller.id.toString(),
                label: seller.name
              }))}
              required
            />
          )}
          
          <div className="flex gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              className="flex-1" 
              disabled={!selectedSellerId || loading || loadingSellers}
            >
              {loading ? 'Reatribuindo...' : 'Confirmar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export const OpportunityForm: React.FC<OpportunityFormProps> = ({ opportunityId, currentUser, onBack, onSave }) => {
  const [formData, setFormData] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Seller reassignment modal state
  const [reassignmentModal, setReassignmentModal] = useState({
    isOpen: false,
    loading: false
  });
  
  const [systemModal, setSystemModal] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'success' | 'error';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'alert', title: '', message: '' });

  useEffect(() => {
    const loadOpportunity = async () => {
      try {
        const data = await opportunityService.getOpportunityById(opportunityId);
        if (data) setFormData(data);
      } catch (error) {
        console.error('Erro ao carregar oportunidade:', error);
      } finally {
        setLoading(false);
      }
    };
    loadOpportunity();
  }, [opportunityId]);

  const handleChange = useCallback((field: keyof Opportunity, value: any) => {
    if (!formData) return;
    const cleanValue = (field === 'telefone') ? unmask(value) : value;
    setFormData({ ...formData, [field]: cleanValue });
  }, [formData]);

  const handleSubmit = async () => {
    if (!formData) return;
    
    setSaving(true);
    try {
      const updated = await opportunityService.updateOpportunity(formData.id, formData);
      setLastSaved(new Date());
      onSave(updated);
      setSystemModal({
        isOpen: true,
        type: 'success',
        title: 'Sucesso',
        message: 'Oportunidade salva com sucesso!'
      });
    } catch (e) {
      console.error(e);
      setSystemModal({
        isOpen: true,
        type: 'error',
        title: 'Erro ao Salvar',
        message: 'Erro ao salvar oportunidade'
      });
    } finally {
      setSaving(false);
    }
  };

  // Seller reassignment handlers
  const handleOpenReassignmentModal = () => {
    setReassignmentModal({ isOpen: true, loading: false });
  };

  const handleCloseReassignmentModal = () => {
    setReassignmentModal({ isOpen: false, loading: false });
  };

  const handleSellerReassignment = async (newSellerId: number) => {
    if (!formData) return;
    
    setReassignmentModal(prev => ({ ...prev, loading: true }));
    
    try {
      const updatedOpportunity = await opportunityService.reassignOpportunity(formData.id, newSellerId, currentUser, 'Reatribuição via formulário');
      setFormData(updatedOpportunity);
      setLastSaved(new Date());
      onSave(updatedOpportunity);
      handleCloseReassignmentModal();
      setSystemModal({
        isOpen: true,
        type: 'success',
        title: 'Sucesso',
        message: 'Oportunidade reatribuída com sucesso!'
      });
    } catch (error: any) {
      console.error('Erro ao reatribuir oportunidade:', error);
      setSystemModal({
        isOpen: true,
        type: 'error',
        title: 'Erro ao Reatribuir',
        message: `Erro ao reatribuir oportunidade: ${error.message}`
      });
    } finally {
      setReassignmentModal(prev => ({ ...prev, loading: false }));
    }
  };

  if (loading || !formData) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-slate-600">Carregando formulário...</p>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-full flex flex-col">
      {/* Header */}
      <div className="bg-slate-100 border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors" aria-label="Voltar">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <input 
                value={formData.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                placeholder="Nome do Cliente"
                className="text-xl font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 transition-colors min-w-[200px]"
              />
            </div>
            <p className="text-xs text-slate-500 px-1 mt-1 flex items-center gap-2">
              ID: {formData.id} | 
              <span className="flex items-center gap-1">
                Vendedor: {formData.vendedor}
                {currentUser.role === 'ADMIN' && (
                  <button
                    onClick={handleOpenReassignmentModal}
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                    title="Reatribuir vendedor"
                  >
                    <Edit3 className="w-3 h-3 text-slate-600 hover:text-blue-600" />
                  </button>
                )}
              </span>
              {lastSaved && (
                <span className="ml-2 text-green-600">
                  • Salvo às {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex flex-col items-end mr-4">
            <label className="text-[10px] font-bold uppercase text-slate-500">Status Atual</label>
            <select 
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className={`text-sm font-bold bg-transparent border-b-2 focus:outline-none pb-1 ${
                formData.status === 'NEGOCIAÇÃO' ? 'border-green-500 text-green-700' : 
                'border-blue-500 text-blue-700'
              }`}
            >
              {OPPORTUNITY_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          
          <button 
            onClick={handleSubmit} 
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-6">
            Dados da Oportunidade
          </h3>

          <div className="space-y-6">
            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ValidatedInput 
                label="Nome Completo" 
                value={formData.nome} 
                onChange={(v: string) => handleChange('nome', v)}
                required
              />
              <ValidatedInput 
                label="E-mail" 
                value={formData.email} 
                onChange={(v: string) => handleChange('email', v)} 
                type="email"
                required
              />
              <ValidatedInput 
                label="Telefone" 
                value={maskPhone(formData.telefone)} 
                onChange={(v: string) => handleChange('telefone', v)}
                mask={maskPhone}
                required
              />
              <Select 
                label="Origem" 
                value={formData.origem} 
                options={['SITE', 'FACEBOOK', 'GOOGLE', 'INSTAGRAM', 'WHATSAPP', 'LINKEDIN', 'EMAIL', 'INDICAÇÃO', 'OUTROS']}
                onChange={(v: string) => handleChange('origem', v)} 
              />
            </div>

            {/* Opportunity Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ValidatedInput 
                label="Valor Cotado (R$)" 
                type="number" 
                step="0.01"
                value={formData.quoted_value?.toString() || ''} 
                onChange={(v: string) => handleChange('quoted_value', v ? parseFloat(v) : null)} 
              />
              <ValidatedInput 
                label="Data de Contato" 
                type="date" 
                value={formData.contact_date || ''} 
                onChange={(v: string) => handleChange('contact_date', v)} 
              />
              <ValidatedInput 
                label="Próximo Follow-up" 
                type="date" 
                value={formData.next_followup || ''} 
                onChange={(v: string) => handleChange('next_followup', v)} 
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
                Observações
              </label>
              <textarea 
                value={formData.notes || ''} 
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Adicione observações sobre esta oportunidade..."
                rows={4}
                className="w-full bg-white border border-slate-400 rounded p-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200 transition-all resize-vertical"
              />
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                  Criado em
                </label>
                <p className="text-sm text-slate-600">
                  {new Date(formData.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                  Última atualização
                </label>
                <p className="text-sm text-slate-600">
                  {new Date(formData.updated_at).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seller Reassignment Modal */}
      <SellerReassignmentModal
        isOpen={reassignmentModal.isOpen}
        onClose={handleCloseReassignmentModal}
        onSubmit={handleSellerReassignment}
        opportunityName={formData?.nome || ''}
        currentSeller={formData?.vendedor || ''}
        loading={reassignmentModal.loading}
      />

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