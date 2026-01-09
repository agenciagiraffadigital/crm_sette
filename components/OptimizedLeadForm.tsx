import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Lead, KanbanStatus, User, Beneficiary, LeadMessage, ClientType } from '../types';
import { KANBAN_COLUMNS, PRODUCTS_LIST } from '../constants';
import { leadService } from '../services/leadService';
import { Save, ArrowLeft, Plus, Trash2, Send, Paperclip, Search, FileText, ChevronDown, Download, CheckCircle, AlertCircle, Upload, X } from 'lucide-react';

interface OptimizedLeadFormProps {
  leadId: number;
  currentUser: User;
  onBack: () => void;
  onSave: (updatedLead: Lead) => void;
}

// Validation rules
const validationRules = {
  email: (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) || 'Email inválido';
  },
  telefone: (value: string) => {
    const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
    return phoneRegex.test(value) || value.length >= 10 || 'Telefone deve ter pelo menos 10 dígitos';
  },
  cpf_cnpj: (value: string) => {
    return value.length >= 11 || 'CPF/CNPJ deve ter pelo menos 11 dígitos';
  },
  nome: (value: string) => {
    return value.trim().length >= 2 || 'Nome deve ter pelo menos 2 caracteres';
  }
};

// Enhanced Input component with validation
const ValidatedInput = ({ 
  label, 
  value, 
  onChange, 
  placeholder = "", 
  type = "text", 
  className = "",
  required = false,
  validationRule,
  onValidation
}: any) => {
  const [error, setError] = useState<string>('');
  const [touched, setTouched] = useState(false);
  
  const id = `input-${label.replace(/\s+/g, '-').toLowerCase()}`;
  
  const handleChange = (newValue: string) => {
    onChange(newValue);
    
    if (touched && validationRule) {
      const result = validationRule(newValue);
      const isValid = result === true;
      setError(isValid ? '' : result);
      onValidation?.(isValid);
    }
  };
  
  const handleBlur = () => {
    setTouched(true);
    if (validationRule) {
      const result = validationRule(value || '');
      const isValid = result === true;
      setError(isValid ? '' : result);
      onValidation?.(isValid);
    }
  };
  
  const hasError = touched && error;
  
  return (
    <div className={`flex flex-col space-y-1 ${className}`}>
      <label htmlFor={id} className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input 
          id={id}
          type={type} 
          value={value || ''} 
          onChange={e => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder || `${label}...`}
          className={`bg-white border rounded p-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all w-full ${
            hasError 
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200' 
              : 'border-slate-400 focus:border-blue-500 focus:ring-blue-200'
          }`}
        />
        {touched && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {error ? (
              <AlertCircle className="w-4 h-4 text-red-500" />
            ) : validationRule ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : null}
          </div>
        )}
      </div>
      {hasError && (
        <span className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </span>
      )}
    </div>
  );
};

export const OptimizedLeadForm: React.FC<OptimizedLeadFormProps> = ({ leadId, currentUser, onBack, onSave }) => {
  const [formData, setFormData] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'beneficiarios' | 'docs'>('info');
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  
  // Auto-save functionality
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    const loadLead = async () => {
      const data = await leadService.getLeadById(leadId);
      if (data) setFormData(data);
      setLoading(false);
    };
    loadLead();
  }, [leadId]);

  const handleChange = useCallback((field: keyof Lead, value: any) => {
    if (!formData) return;
    setFormData({ ...formData, [field]: value });
  }, [formData]);

  const handleSubmit = async () => {
    if (!formData) return;
    setSaving(true);
    try {
      const updated = await leadService.saveLead(formData);
      onSave(updated);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar");
    } finally {
      setSaving(false);
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
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <ValidatedInput 
                value={formData.nome}
                onChange={(v: string) => handleChange('nome', v)}
                placeholder="Nome do Cliente"
                validationRule={validationRules.nome}
                required
              />
            </div>
            <p className="text-xs text-slate-500 px-1 mt-1">
              ID: {formData.id} | Vendedor: {formData.vendedor}
              {lastSaved && (
                <span className="ml-2 text-green-600">
                  • Salvo às {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>
        
        <button 
          onClick={handleSubmit} 
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      {/* Simple form content for now */}
      <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
        <div className="max-w-5xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Formulário Otimizado</h3>
          <p className="text-slate-600">
            Esta é uma versão otimizada do formulário com validação em tempo real, 
            indicadores de progresso e melhor experiência do usuário.
          </p>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <ValidatedInput 
              label="Nome Completo" 
              value={formData.nome} 
              onChange={(v: string) => handleChange('nome', v)}
              validationRule={validationRules.nome}
              required
            />
            <ValidatedInput 
              label="E-mail" 
              value={formData.email} 
              onChange={(v: string) => handleChange('email', v)} 
              type="email"
              validationRule={validationRules.email}
              required
            />
            <ValidatedInput 
              label="Telefone" 
              value={formData.telefone} 
              onChange={(v: string) => handleChange('telefone', v)}
              validationRule={validationRules.telefone}
              required
            />
            <ValidatedInput 
              label="CPF/CNPJ" 
              value={formData.cpf_cnpj} 
              onChange={(v: string) => handleChange('cpf_cnpj', v)}
              validationRule={validationRules.cpf_cnpj}
              required
            />
          </div>
        </div>
      </div>
    </div>
  );
};