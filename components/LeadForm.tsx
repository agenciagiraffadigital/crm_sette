import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Lead, KanbanStatus, User, Beneficiary, LeadMessage, ClientType } from '../types';
import { KANBAN_COLUMNS, OPPORTUNITY_COLUMNS, PRODUCTS_LIST } from '../constants';
import { leadService } from '../services/leadService';
import { authService } from '../services/authService';
import { Save, ArrowLeft, Plus, Trash2, Paperclip, Search, FileText, ChevronDown, Download, CheckCircle, AlertCircle, Upload, Edit3 } from 'lucide-react';
import { Button } from '../src/components/ui/Button';
import { Card } from '../src/components/ui/Card';
import { Select as UISelect } from '../src/components/ui/Select';
import { maskPhone, maskCPFOrCNPJ, maskRG, unmask, validatePhone, validateCPF, validateCNPJ } from '../utils/masks';
import { SystemModal } from './SystemModal';

interface LeadFormProps {
  leadId: number;
  currentUser: User;
  onBack: () => void;
  onSave: (updatedLead: Lead) => void;
}

// Validation rules for real-time validation
const validationRules = {
  email: (value: string) => {
    if (!value) return true; // Allow empty for optional fields
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) || 'Email inválido';
  },
  telefone: (value: string) => {
    if (!value) return true;
    return validatePhone(value) || 'Telefone inválido (10 ou 11 dígitos)';
  },
  cpf_cnpj: (value: string) => {
    if (!value) return true;
    const cleaned = unmask(value);
    if (cleaned.length === 11) return validateCPF(value) || 'CPF inválido';
    if (cleaned.length === 14) return validateCNPJ(value) || 'CNPJ inválido';
    return 'CPF/CNPJ inválido';
  },
  nome: (value: string) => {
    if (!value) return true;
    return value.trim().length >= 2 || 'Nome deve ter pelo menos 2 caracteres';
  }
};

// Enhanced Input component with real-time validation
const ValidatedInput = ({ 
  label, 
  value, 
  onChange, 
  placeholder = "", 
  type = "text", 
  className = "",
  required = false,
  validationRule,
  onValidation,
  mask
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  required?: boolean;
  validationRule?: (value: string) => boolean | string;
  onValidation?: (isValid: boolean) => void;
  mask?: (value: string) => string;
}) => {
  const [error, setError] = useState<string>('');
  const [touched, setTouched] = useState(false);
  
  const id = label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined;
  
  const handleChange = (newValue: string) => {
    const maskedValue = mask ? mask(newValue) : newValue;
    onChange(maskedValue);
    
    if (touched && validationRule) {
      const result = validationRule(maskedValue);
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
      {label && (
        <label htmlFor={id} className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input 
          id={id}
          type={type} 
          value={value || ''} 
          onChange={e => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder || (label ? `${label}...` : '')}
          className={`bg-white border rounded p-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all w-full ${
            hasError 
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200' 
              : 'border-slate-400 focus:border-blue-500 focus:ring-blue-200'
          }`}
        />
        {touched && validationRule && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {error ? (
              <AlertCircle className="w-4 h-4 text-red-500" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
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

// Section Title with completion indicator
const SectionTitle = ({ 
  children, 
  completed = false 
}: {
  children: React.ReactNode;
  completed?: boolean;
}) => (
  <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 mt-6 flex items-center gap-2">
    {completed && <CheckCircle className="w-5 h-5 text-green-500" />}
    {children}
  </h3>
);

// Progress indicator component
const ProgressIndicator = ({ 
  currentStep, 
  totalSteps, 
  completedSteps 
}: {
  currentStep: number;
  totalSteps: number;
  completedSteps: number;
}) => (
  <div className="flex items-center gap-2 mb-6">
    <div className="flex-1 bg-slate-200 rounded-full h-2">
      <div 
        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
        style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
      />
    </div>
    <span className="text-sm text-slate-600 font-medium">
      {completedSteps}/{totalSteps} seções completas
    </span>
  </div>
);

// Enhanced file upload component with progress
const FileUploadZone = ({ 
  onFileUpload, 
  uploading, 
  progress 
}: {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
  progress: number;
}) => (
  <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-colors relative group cursor-pointer">
    <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
      <div className="bg-white p-4 rounded-full shadow-sm mb-4">
        {uploading ? (
          <Upload className="w-8 h-8 text-blue-500 animate-pulse" />
        ) : (
          <Paperclip className="w-8 h-8 text-blue-500" />
        )}
      </div>
      <h4 className="font-bold text-slate-700">
        {uploading ? 'Enviando arquivo...' : 'Clique para enviar documentos'}
      </h4>
      <p className="text-sm text-slate-500 max-w-sm mt-2">
        Aceita: PDF, PNG e JPEG (máx. 10MB)
      </p>
      {uploading && progress !== undefined && (
        <div className="w-full max-w-xs mt-4">
          <div className="bg-slate-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-600 mt-1">{progress}% enviado</p>
        </div>
      )}
      <input 
        type="file" 
        accept=".pdf,.png,.jpg,.jpeg" 
        onChange={onFileUpload}
        disabled={uploading}
        className="hidden"
      />
    </label>
  </div>
);

// Seller Reassignment Modal (Admin Only)
interface SellerReassignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sellerId: number) => void;
  leadName: string;
  currentSeller: string;
  loading: boolean;
}

const SellerReassignmentModal: React.FC<SellerReassignmentModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  leadName, 
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
          console.log('Carregando vendedores ativos...');
          const activeSellers = await authService.getActiveSellers();
          console.log('Vendedores carregados:', activeSellers);
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
    console.log('Modal submit - selectedSellerId:', selectedSellerId);
    if (selectedSellerId) {
      onSubmit(selectedSellerId);
      setSelectedSellerId(null);
    } else {
      console.log('Nenhum vendedor selecionado');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card variant="elevated" padding="lg" className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <h3 className="text-lg font-semibold mb-4">
            Reatribuir Vendedor - {leadName}
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

export const LeadForm: React.FC<LeadFormProps> = ({ leadId, currentUser, onBack, onSave }) => {
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
  
  // Determine which columns to use based on lead status
  const isOpportunity = formData && ['OPORTUNIDADES', 'EM_CONTATO', 'NEGOCIACAO'].includes(formData.status_kanban);
  const statusColumns = isOpportunity ? OPPORTUNITY_COLUMNS : KANBAN_COLUMNS;

  // Calculate completion status for progress indicator
  const sectionCompletion = useMemo(() => {
    if (!formData) return { info: false, beneficiarios: false, docs: false };
    
    const infoComplete = !!(formData.nome && formData.email && formData.telefone && formData.operadora);
    const beneficiariosComplete = formData.beneficiarios.length > 0;
    const docsComplete = formData.documentos.length > 0;
    
    return { info: infoComplete, beneficiarios: beneficiariosComplete, docs: docsComplete };
  }, [formData]);

  const completedSections = Object.values(sectionCompletion).filter(Boolean).length;

  useEffect(() => {
    const loadLead = async () => {
      const data = await leadService.getLeadById(leadId);
      if (data) setFormData(data);
      setLoading(false);
    };
    loadLead();
  }, [leadId]);

  // Auto-save functionality with debouncing
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    
    const timer = setTimeout(async () => {
      if (formData && Object.keys(validationErrors).length === 0) {
        try {
          await leadService.saveLead(formData);
          setLastSaved(new Date());
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, 2000); // Auto-save after 2 seconds of inactivity
    
    setAutoSaveTimer(timer);
  }, [formData, validationErrors, autoSaveTimer]);

  const handleChange = useCallback((field: keyof Lead, value: any) => {
    if (!formData) return;
    // Remove mask before saving
    const cleanValue = (field === 'telefone' || field === 'cpf_cnpj' || field === 'rg_ie') ? unmask(value) : value;
    setFormData({ ...formData, [field]: cleanValue });
    scheduleAutoSave();
  }, [formData, scheduleAutoSave]);

  const handleAddressChange = useCallback((field: string, value: string) => {
    if (!formData) return;
    setFormData({
      ...formData,
      endereco: { ...formData.endereco, [field]: value }
    });
    scheduleAutoSave();
  }, [formData, scheduleAutoSave]);

  const handleResponsibleChange = useCallback((field: string, value: string) => {
    if (!formData) return;
    const cleanValue = (field === 'cpf') ? unmask(value) : value;
    setFormData({
      ...formData,
      dados_responsavel: { 
        nome: '', cpf: '', endereco: '', data_nascimento: '',
        ...formData.dados_responsavel, 
        [field]: cleanValue 
      }
    });
    scheduleAutoSave();
  }, [formData, scheduleAutoSave]);

  const handleValidation = useCallback((field: string, isValid: boolean) => {
    setValidationErrors(prev => ({
      ...prev,
      [field]: !isValid
    }));
  }, []);

  const fetchCnpj = async () => {
    if (!formData?.cpf_cnpj) return;
    const data = await leadService.fetchCnpjData(formData.cpf_cnpj);
    setFormData(prev => {
      if(!prev) return null;
      return {
        ...prev,
        nome: data.razao_social,
        endereco: {
          ...prev.endereco,
          logradouro: data.logradouro,
          numero: data.numero,
          bairro: data.bairro,
          cidade: data.cidade,
          uf: data.uf,
          cep: data.cep
        }
      }
    });
  };

  const addBeneficiary = useCallback(() => {
    if (!formData) return;
    const newBen: Beneficiary = {
      id: Math.random().toString(36).substr(2, 9),
      nome: "",
      data_nascimento: "",
      parentesco: "Titular",
      type: formData.tipo_cliente === 'PJ' ? 'TITULAR' : 'DEPENDENTE'
    };
    setFormData({ ...formData, beneficiarios: [...formData.beneficiarios, newBen] });
    scheduleAutoSave();
  }, [formData, scheduleAutoSave]);

  const updateBeneficiary = useCallback((id: string, field: keyof Beneficiary, value: string) => {
    if (!formData) return;
    const cleanValue = (field === 'cpf' || field === 'telefone') ? unmask(value) : value;
    const updated = formData.beneficiarios.map(b => b.id === id ? { ...b, [field]: cleanValue } : b);
    setFormData({ ...formData, beneficiarios: updated });
    scheduleAutoSave();
  }, [formData, scheduleAutoSave]);

  const removeBeneficiary = useCallback((id: string) => {
    if (!formData) return;
    setFormData({ ...formData, beneficiarios: formData.beneficiarios.filter(b => b.id !== id) });
    scheduleAutoSave();
  }, [formData, scheduleAutoSave]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!formData || !event.target.files) return;
    const file = event.target.files[0];
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);
      
      const { name, url } = await leadService.uploadFile(formData.id, file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setFormData({ 
        ...formData, 
        documentos: [...formData.documentos, { name, url }] 
      });
      
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
      
    } catch (error: any) {
      console.error('Erro no upload:', error);
      setSystemModal({
        isOpen: true,
        type: 'error',
        title: 'Erro no Upload',
        message: `Erro ao fazer upload: ${error.message}`
      });
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteDocument = async (fileName: string) => {
    if (!window.confirm(`Deseja deletar "${fileName}"?`)) return;
    
    try {
      const filePath = `lead_${formData?.id}_${fileName}`;
      await leadService.deleteFile(filePath);
      setFormData(prev => 
        prev ? { ...prev, documentos: prev.documentos.filter(doc => 
          (typeof doc === 'string' ? doc : doc.name) !== fileName
        )} : null
      );
    } catch (error: any) {
      console.error('Erro ao deletar:', error);
      setSystemModal({
        isOpen: true,
        type: 'error',
        title: 'Erro ao Deletar',
        message: `Erro ao deletar: ${error.message}`
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData) return;
    
    // Validate required fields
    const hasErrors = Object.values(validationErrors).some(Boolean);
    if (hasErrors) {
      setSystemModal({
        isOpen: true,
        type: 'error',
        title: 'Erro de Validação',
        message: 'Por favor, corrija os erros antes de salvar.'
      });
      return;
    }
    
    setSaving(true);
    try {
      const updated = await leadService.saveLead(formData);
      setLastSaved(new Date());
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

  // Seller reassignment handlers
  const handleOpenReassignmentModal = () => {
    setReassignmentModal({ isOpen: true, loading: false });
  };

  const handleCloseReassignmentModal = () => {
    setReassignmentModal({ isOpen: false, loading: false });
  };

  const handleSellerReassignment = async (newSellerId: number) => {
    if (!formData) return;
    
    console.log('Reatribuindo lead:', formData.id, 'para vendedor:', newSellerId);
    setReassignmentModal(prev => ({ ...prev, loading: true }));
    
    try {
      const updatedLead = await leadService.reassignLead(formData.id, newSellerId, currentUser);
      console.log('Lead reatribuído com sucesso:', updatedLead);
      setFormData(updatedLead);
      setLastSaved(new Date());
      onSave(updatedLead);
      handleCloseReassignmentModal();
      setSystemModal({
        isOpen: true,
        type: 'success',
        title: 'Sucesso',
        message: 'Lead reatribuído com sucesso!'
      });
    } catch (error: any) {
      console.error('Erro ao reatribuir lead:', error);
      setSystemModal({
        isOpen: true,
        type: 'error',
        title: 'Erro ao Reatribuir',
        message: `Erro ao reatribuir lead: ${error.message}`
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
              {/* Editable Name with validation */}
              <input 
                value={formData.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                placeholder="Nome do Cliente"
                className="text-xl font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 transition-colors min-w-[200px]"
              />

              {/* Editable Type Select */}
              <div className="relative group">
                <select
                  value={formData.tipo_cliente}
                  onChange={(e) => handleChange('tipo_cliente', e.target.value)}
                  className={`appearance-none cursor-pointer text-xs font-bold px-3 py-1.5 rounded-full border focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all pr-8 ${
                    formData.tipo_cliente === 'PF' ? 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200' : 
                    formData.tipo_cliente === 'PJ' ? 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200' : 
                    'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200'
                  }`}
                >
                  <option value="PF">PF</option>
                  <option value="PJ">PJ</option>
                  <option value="ADESAO">ADESAO</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown className={`w-3 h-3 ${
                    formData.tipo_cliente === 'PF' ? 'text-blue-800' : 
                    formData.tipo_cliente === 'PJ' ? 'text-purple-800' : 
                    'text-pink-800'
                  }`} />
                </div>
              </div>
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
              value={formData.status_kanban}
              onChange={(e) => handleChange('status_kanban', e.target.value)}
              className={`text-sm font-bold bg-transparent border-b-2 focus:outline-none pb-1 ${
                formData.status_kanban === 'IMPLANTADA' ? 'border-green-500 text-green-700' : 
                formData.status_kanban === 'CANCELADA' ? 'border-red-500 text-red-700' : 
                'border-blue-500 text-blue-700'
              }`}
            >
              {statusColumns.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          
          <button 
            onClick={handleSubmit} 
            disabled={saving || Object.values(validationErrors).some(Boolean)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="px-8 pt-4">
        <ProgressIndicator 
          currentStep={activeTab === 'info' ? 1 : activeTab === 'beneficiarios' ? 2 : 3}
          totalSteps={3}
          completedSteps={completedSections}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 px-8">
        {[
          { id: 'info', label: 'Dados do Cliente', completed: sectionCompletion.info },
          { id: 'beneficiarios', label: `Beneficiários (${formData.beneficiarios.length})`, completed: sectionCompletion.beneficiarios },
          { id: 'docs', label: `Documentos (${formData.documentos.length})`, completed: sectionCompletion.docs }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === tab.id 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.completed && <CheckCircle className="w-4 h-4 text-green-500" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
          <div className="max-w-5xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            
            {/* TAB: INFO */}
            {activeTab === 'info' && (
                <div className="space-y-6">{/* removed animate-fade-in */}
                    
                    {/* PJ Specifics */}
                    {formData.tipo_cliente === 'PJ' && (
                        <>
                            <SectionTitle completed={!!(formData.cpf_cnpj && formData.nome)}>
                              Dados da Empresa (PJ)
                            </SectionTitle>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="flex items-end gap-2">
                                    <ValidatedInput 
                                      label="CNPJ" 
                                      value={maskCPFOrCNPJ(formData.cpf_cnpj)} 
                                      onChange={(v: string) => handleChange('cpf_cnpj', v)} 
                                      className="flex-1"
                                      validationRule={validationRules.cpf_cnpj}
                                      onValidation={(isValid: boolean) => handleValidation('cpf_cnpj', isValid)}
                                      mask={maskCPFOrCNPJ}
                                      required
                                    />
                                    <button 
                                      onClick={fetchCnpj}
                                      className="px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                      title="Buscar dados do CNPJ"
                                    >
                                      <Search className="w-4 h-4" />
                                    </button>
                                </div>
                                <ValidatedInput 
                                  label="Razão Social" 
                                  value={formData.nome} 
                                  onChange={(v: string) => handleChange('nome', v)} 
                                  className="md:col-span-2"
                                  validationRule={validationRules.nome}
                                  onValidation={(isValid: boolean) => handleValidation('nome', isValid)}
                                  required
                                />
                            </div>

                            <SectionTitle completed={!!(formData.dados_responsavel?.nome && formData.dados_responsavel?.cpf)}>
                              Dados do Responsável
                            </SectionTitle>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ValidatedInput 
                                  label="Nome Completo" 
                                  value={formData.dados_responsavel?.nome} 
                                  onChange={(v: string) => handleResponsibleChange('nome', v)}
                                  validationRule={validationRules.nome}
                                  onValidation={(isValid: boolean) => handleValidation('responsavel_nome', isValid)}
                                  required
                                />
                                <ValidatedInput 
                                  label="CPF" 
                                  value={maskCPFOrCNPJ(formData.dados_responsavel?.cpf || '')} 
                                  onChange={(v: string) => handleResponsibleChange('cpf', v)}
                                  validationRule={validationRules.cpf_cnpj}
                                  onValidation={(isValid: boolean) => handleValidation('responsavel_cpf', isValid)}
                                  mask={maskCPFOrCNPJ}
                                  required
                                />
                                <ValidatedInput 
                                  label="Endereço Residencial" 
                                  value={formData.dados_responsavel?.endereco} 
                                  onChange={(v: string) => handleResponsibleChange('endereco', v)} 
                                  className="md:col-span-2" 
                                />
                            </div>
                        </>
                    )}

                    {/* PF / ADESAO Specifics */}
                    {(formData.tipo_cliente === 'PF' || formData.tipo_cliente === 'ADESAO') && (
                        <>
                            <SectionTitle completed={!!(formData.nome && formData.cpf_cnpj)}>
                              Dados do Titular ({formData.tipo_cliente})
                            </SectionTitle>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ValidatedInput 
                                  label="Nome Completo" 
                                  value={formData.nome} 
                                  onChange={(v: string) => handleChange('nome', v)}
                                  validationRule={validationRules.nome}
                                  onValidation={(isValid: boolean) => handleValidation('nome', isValid)}
                                  required
                                />
                                <ValidatedInput 
                                  label="CPF" 
                                  value={maskCPFOrCNPJ(formData.cpf_cnpj)} 
                                  onChange={(v: string) => handleChange('cpf_cnpj', v)}
                                  validationRule={validationRules.cpf_cnpj}
                                  onValidation={(isValid: boolean) => handleValidation('cpf_cnpj', isValid)}
                                  mask={maskCPFOrCNPJ}
                                  required
                                />
                                <ValidatedInput 
                                  label="Data de Nascimento" 
                                  type="date" 
                                  value={formData.data_nascimento_abertura} 
                                  onChange={(v: string) => handleChange('data_nascimento_abertura', v)} 
                                />
                                <ValidatedInput 
                                  label="RG / Org. Emissor" 
                                  value={maskRG(formData.rg_ie || '')} 
                                  onChange={(v: string) => handleChange('rg_ie', v)} 
                                  mask={maskRG}
                                />
                            </div>
                        </>
                    )}

                    {/* Common Contact & Address */}
                    <SectionTitle completed={!!(formData.email && formData.telefone)}>
                      Contato e Endereço
                    </SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <ValidatedInput 
                          label="E-mail" 
                          value={formData.email} 
                          onChange={(v: string) => handleChange('email', v)} 
                          type="email"
                          validationRule={validationRules.email}
                          onValidation={(isValid: boolean) => handleValidation('email', isValid)}
                          required
                        />
                        <ValidatedInput 
                          label="Telefone / WhatsApp" 
                          value={maskPhone(formData.telefone)} 
                          onChange={(v: string) => handleChange('telefone', v)}
                          validationRule={validationRules.telefone}
                          onValidation={(isValid: boolean) => handleValidation('telefone', isValid)}
                          mask={maskPhone}
                          required
                        />
                        <ValidatedInput 
                          label="CEP" 
                          value={formData.endereco.cep} 
                          onChange={(v: string) => handleAddressChange('cep', v)} 
                        />
                        <ValidatedInput 
                          label="Logradouro" 
                          value={formData.endereco.logradouro} 
                          onChange={(v: string) => handleAddressChange('logradouro', v)} 
                          className="md:col-span-2" 
                        />
                        <ValidatedInput 
                          label="Número" 
                          value={formData.endereco.numero} 
                          onChange={(v: string) => handleAddressChange('numero', v)} 
                        />
                        <ValidatedInput 
                          label="Bairro" 
                          value={formData.endereco.bairro} 
                          onChange={(v: string) => handleAddressChange('bairro', v)} 
                        />
                        <ValidatedInput 
                          label="Cidade" 
                          value={formData.endereco.cidade} 
                          onChange={(v: string) => handleAddressChange('cidade', v)} 
                        />
                        <ValidatedInput 
                          label="Estado (UF)" 
                          value={formData.endereco.uf} 
                          onChange={(v: string) => handleAddressChange('uf', v)} 
                        />
                        <ValidatedInput 
                          label="Complemento" 
                          value={formData.endereco.complemento} 
                          onChange={(v: string) => handleAddressChange('complemento', v)} 
                          className="md:col-span-3" 
                        />
                    </div>

                    {/* Product Info */}
                    <SectionTitle completed={!!(formData.operadora && formData.produto)}>
                      Dados do Produto e Origem
                    </SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Select 
                            label="Operadora" 
                            value={formData.operadora} 
                            options={PRODUCTS_LIST.map(p => p.operadora)}
                            onChange={(v: string) => handleChange('operadora', v)} 
                            required
                        />
                        <ValidatedInput
                            label="Produto Contratado"
                            value={formData.produto}
                            onChange={(v: string) => handleChange('produto', v)}
                            placeholder="Digite o nome do produto"
                            required
                        />
                        <ValidatedInput 
                            label="Valor (R$)" 
                            type="number" 
                            value={formData.valor_produto} 
                            onChange={(v: string) => handleChange('valor_produto', v)} 
                        />
                        
                        <ValidatedInput
                            label="Origem do Lead"
                            value={formData.origem}
                            onChange={(v: string) => handleChange('origem', v)}
                            placeholder="Ex: SITE, WHATSAPP, TELEFONE"
                        />
                        <ValidatedInput
                            label="Canal de Venda"
                            value={formData.canal_venda}
                            onChange={(v: string) => handleChange('canal_venda', v)}
                            placeholder="Ex: GOOGLE ADS, FACEBOOK, INDICAÇÃO"
                        />
                        
                        <Select 
                            label="Coparticipação" 
                            value={formData.coparticipacao} 
                            options={['NÃO', 'PARCIAL', 'COMPLETA']}
                            onChange={(v: any) => handleChange('coparticipacao', v)} 
                        />
                        <Select 
                            label="Redução de Carência?" 
                            value={formData.reducao_carencia ? 'SIM' : 'NÃO'} 
                            options={['SIM', 'NÃO']}
                            onChange={(v: string) => handleChange('reducao_carencia', v === 'SIM')} 
                        />
                        
                        {formData.tipo_cliente === 'PJ' && (
                             <Select 
                                label="Haverá Remissão?" 
                                value={formData.havera_remissao ? 'SIM' : 'NÃO'} 
                                options={['SIM', 'NÃO']}
                                onChange={(v: string) => handleChange('havera_remissao', v === 'SIM')} 
                            />
                        )}
                        
                        <ValidatedInput 
                            label="Vigência Prevista" 
                            type="date" 
                            value={formData.vigencia} 
                            onChange={(v: string) => handleChange('vigencia', v)} 
                        />
                    </div>
                </div>
            )}

            {/* TAB: BENEFICIARIOS */}
            {activeTab === 'beneficiarios' && (
                <div className="space-y-6">{/* removed animate-fade-in */}
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          {sectionCompletion.beneficiarios && <CheckCircle className="w-5 h-5 text-green-500" />}
                          Lista de Vidas
                        </h3>
                        <button 
                          onClick={addBeneficiary} 
                          className="flex items-center text-sm bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold hover:bg-blue-200 transition-colors"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Vida
                        </button>
                    </div>

                    <div className="space-y-4">
                        {formData.beneficiarios.length === 0 && (
                            <p className="text-slate-500 text-center py-8 bg-slate-50 rounded border border-dashed border-slate-300">
                                Nenhum beneficiário cadastrado.
                            </p>
                        )}
                        {formData.beneficiarios.map((ben, idx) => (
                            <div key={ben.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50 relative group">
                                <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => removeBeneficiary(ben.id)} 
                                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-100 transition-colors" 
                                      aria-label="Remover beneficiário"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="md:col-span-2">
                                        <ValidatedInput 
                                          label="Nome Completo" 
                                          value={ben.nome} 
                                          onChange={(v: string) => updateBeneficiary(ben.id, 'nome', v)} 
                                          validationRule={validationRules.nome}
                                          required
                                        />
                                    </div>
                                    <Select 
                                        label="Tipo" 
                                        value={ben.type} 
                                        options={['TITULAR', 'DEPENDENTE']}
                                        onChange={(v: any) => updateBeneficiary(ben.id, 'type', v)} 
                                        required
                                    />
                                    <ValidatedInput 
                                      label="Data Nascimento" 
                                      type="date" 
                                      value={ben.data_nascimento} 
                                      onChange={(v: string) => updateBeneficiary(ben.id, 'data_nascimento', v)} 
                                      required
                                    />
                                    
                                    <ValidatedInput 
                                      label="CPF" 
                                      value={maskCPFOrCNPJ(ben.cpf || '')} 
                                      onChange={(v: string) => updateBeneficiary(ben.id, 'cpf', v)}
                                      validationRule={validationRules.cpf_cnpj}
                                      mask={maskCPFOrCNPJ}
                                    />
                                    <ValidatedInput 
                                      label="Parentesco" 
                                      value={ben.parentesco} 
                                      onChange={(v: string) => updateBeneficiary(ben.id, 'parentesco', v)} 
                                    />
                                    <ValidatedInput 
                                      label="E-mail" 
                                      value={ben.email} 
                                      onChange={(v: string) => updateBeneficiary(ben.id, 'email', v)}
                                      validationRule={validationRules.email}
                                    />
                                    <ValidatedInput 
                                      label="Telefone" 
                                      value={maskPhone(ben.telefone || '')} 
                                      onChange={(v: string) => updateBeneficiary(ben.id, 'telefone', v)}
                                      validationRule={validationRules.telefone}
                                      mask={maskPhone}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB: DOCUMENTS */}
            {activeTab === 'docs' && (
                <div className="space-y-6">{/* removed animate-fade-in */}
                    <FileUploadZone 
                      onFileUpload={handleFileUpload}
                      uploading={uploading}
                      progress={uploadProgress}
                    />

                    <div>
                        <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                          {sectionCompletion.docs && <CheckCircle className="w-5 h-5 text-green-500" />}
                          Arquivos Anexados
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {formData.documentos.map((doc, i) => (
                                <div key={i} className="flex flex-col items-center p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow relative group">
                                    <FileText className="w-10 h-10 text-slate-400 mb-2" />
                                    <span className="text-xs font-medium text-slate-700 truncate w-full text-center" title={typeof doc === 'string' ? doc : doc.name}>
                                      {typeof doc === 'string' ? doc : doc.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400 mb-3">Documento</span>
                                    
                                    <div className="flex gap-2 w-full">
                                      <button 
                                          onClick={() => {
                                            const docObj = typeof doc === 'string' ? { name: doc, url: doc } : doc;
                                            handleDownload(docObj.url, docObj.name);
                                          }}
                                          className="flex-1 flex items-center justify-center text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 py-2 rounded transition-colors"
                                          title="Baixar documento"
                                      >
                                          <Download className="w-3 h-3" />
                                      </button>
                                      <button 
                                          onClick={() => handleDeleteDocument(typeof doc === 'string' ? doc : doc.name)}
                                          className="flex-1 flex items-center justify-center text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 py-2 rounded transition-colors"
                                          title="Deletar documento"
                                      >
                                          <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                </div>
                            ))}
                             {formData.documentos.length === 0 && (
                                <p className="text-slate-500 text-sm col-span-full">Nenhum documento anexado ainda.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

          </div>
      </div>

      {/* Seller Reassignment Modal */}
      <SellerReassignmentModal
        isOpen={reassignmentModal.isOpen}
        onClose={handleCloseReassignmentModal}
        onSubmit={handleSellerReassignment}
        leadName={formData?.nome || ''}
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