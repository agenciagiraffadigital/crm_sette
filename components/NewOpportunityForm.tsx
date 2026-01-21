import React, { useState, useEffect } from 'react';
import { User, OpportunityStatus } from '../types';
import { authService } from '../services/authService';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '../src/components/ui/Button';
import { Card } from '../src/components/ui/Card';

interface NewOpportunityFormProps {
  currentUser: User;
  onBack: () => void;
  onSave: (opportunityData: NewOpportunityData) => void;
}

interface NewOpportunityData {
  nome: string;
  email: string;
  telefone: string;
  origem: string;
  vendedor_id: number;
  vendedor: string;
  vendedor_email: string;
  status: OpportunityStatus;
  notes?: string;
}

const ValidatedInput = ({ 
  label, 
  value, 
  onChange, 
  placeholder = "", 
  type = "text", 
  required = false,
  error = ""
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: string;
}) => {
  const id = `input-${label.replace(/\s+/g, '-').toLowerCase()}`;
  
  return (
    <div className="flex flex-col space-y-1">
      <label htmlFor={id} className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <input 
        id={id}
        type={type} 
        value={value || ''} 
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || `${label}...`}
        className={`bg-white border rounded p-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200 transition-all w-full ${
          error ? 'border-red-400' : 'border-slate-400'
        }`}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};

const Select = ({ 
  label, 
  value, 
  onChange, 
  options, 
  required = false,
  error = ""
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: (string | {value: string, label: string})[];
  required?: boolean;
  error?: string;
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
        className={`bg-white border rounded p-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all ${
          error ? 'border-red-400' : 'border-slate-400'
        }`}
      >
        <option value="">Selecione...</option>
        {options.map((opt: any) => (
          <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>
        ))}
      </select>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};

export const NewOpportunityForm: React.FC<NewOpportunityFormProps> = ({ 
  currentUser, 
  onBack, 
  onSave 
}) => {
  const [formData, setFormData] = useState<NewOpportunityData>({
    nome: '',
    email: '',
    telefone: '',
    origem: '',
    vendedor_id: currentUser.id,
    vendedor: currentUser.name,
    vendedor_email: currentUser.email,
    status: 'OPORTUNIDADES',
    notes: ''
  });

  const [sellers, setSellers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (currentUser.role === 'ADMIN') {
      const loadSellers = async () => {
        try {
          const activeSellers = await authService.getActiveSellers();
          setSellers(activeSellers);
        } catch (error) {
          console.error('Erro ao carregar vendedores:', error);
        }
      };
      loadSellers();
    }
  }, [currentUser.role]);

  const handleChange = (field: keyof NewOpportunityData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSellerChange = (sellerId: string) => {
    const seller = sellers.find(s => s.id.toString() === sellerId);
    if (seller) {
      setFormData(prev => ({
        ...prev,
        vendedor_id: seller.id,
        vendedor: seller.name,
        vendedor_email: seller.email
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }

    if (!formData.telefone.trim()) {
      newErrors.telefone = 'Telefone é obrigatório';
    }

    if (!formData.origem) {
      newErrors.origem = 'Origem é obrigatória';
    }

    if (currentUser.role === 'ADMIN' && !formData.vendedor_id) {
      newErrors.vendedor_id = 'Vendedor é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white min-h-full flex flex-col">
      {/* Header */}
      <div className="bg-slate-100 border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors" aria-label="Voltar">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Nova Oportunidade</h1>
            <p className="text-xs text-slate-500">Criar uma nova oportunidade manualmente</p>
          </div>
        </div>
        
        <Button 
          onClick={handleSubmit} 
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Salvando...' : 'Criar Oportunidade'}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <form onSubmit={handleSubmit}>
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-6">
              Informações da Oportunidade
            </h3>

            <div className="space-y-6">
              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ValidatedInput 
                  label="Nome Completo" 
                  value={formData.nome} 
                  onChange={(v) => handleChange('nome', v)}
                  required
                  error={errors.nome}
                />
                <ValidatedInput 
                  label="E-mail" 
                  value={formData.email} 
                  onChange={(v) => handleChange('email', v)} 
                  type="email"
                  required
                  error={errors.email}
                />
                <ValidatedInput 
                  label="Telefone" 
                  value={formData.telefone} 
                  onChange={(v) => handleChange('telefone', v)}
                  required
                  error={errors.telefone}
                />
                <Select 
                  label="Origem" 
                  value={formData.origem} 
                  options={['SITE', 'FACEBOOK', 'GOOGLE', 'INSTAGRAM', 'WHATSAPP', 'LINKEDIN', 'EMAIL', 'INDICAÇÃO', 'OUTROS']}
                  onChange={(v) => handleChange('origem', v)} 
                  required
                  error={errors.origem}
                />
              </div>

              {/* Assignment and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {currentUser.role === 'ADMIN' && (
                  <Select 
                    label="Vendedor Responsável" 
                    value={formData.vendedor_id.toString()} 
                    options={sellers.map(seller => ({
                      value: seller.id.toString(),
                      label: seller.name
                    }))}
                    onChange={handleSellerChange} 
                    required
                    error={errors.vendedor_id}
                  />
                )}
                
                <Select 
                  label="Status Inicial" 
                  value={formData.status} 
                  options={[
                    { value: 'OPORTUNIDADES', label: 'Oportunidades' },
                    { value: 'EM_CONTATO', label: 'Em Contato' },
                    { value: 'NEGOCIACAO', label: 'Negociação' }
                  ]}
                  onChange={(v) => handleChange('status', v as OpportunityStatus)} 
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
                  Observações Iniciais
                </label>
                <textarea 
                  value={formData.notes || ''} 
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Adicione observações sobre esta oportunidade..."
                  rows={4}
                  className="w-full bg-white border border-slate-400 rounded p-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200 transition-all resize-vertical"
                />
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};