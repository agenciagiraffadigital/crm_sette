import React, { useState, useEffect } from 'react';
import { Lead, User, Beneficiary, Note, TIPOS_DEPENDENTE } from '../types';
import { KANBAN_COLUMNS, OPPORTUNITY_COLUMNS } from '../constants';
import { leadService } from '../services/leadService';
import { authService } from '../services/authService';
import { operadoraService, Operadora, Produto } from '../services/operadoraService';
import { documentoConfigService } from '../services/documentoConfigService';
import { supabase } from '../services/supabaseClient';
import { ArrowLeft, Save, User as UserIcon, Mail, Phone, MapPin, Package, DollarSign, Edit3, Users, FileText, Plus, Trash2, Paperclip, MoreVertical, Trophy, XCircle, MessageCircle, UserPlus, Trash, RefreshCw, TrendingUp, AlertCircle, MessageSquare, X, ChevronDown, ChevronUp, Download, Upload } from 'lucide-react';
import { maskPhone, maskCPFOrCNPJ, unmask, maskRG } from '../utils/masks';
import { maskCEP } from '../utils/cepMask';
import { formatStatus, formatDateTime } from '../utils/formatters';
import { getTipoDependenteLabel, getTipoBeneficiarioLabel } from '../utils/beneficiarioUtils';
import { WhatsAppModal } from './WhatsAppModal';
import { WinDialog } from './WinDialog';
import { LostDialog } from './LostDialog';
import { ErrorDialog } from './ErrorDialog';
import { NotesDialog } from './NotesDialog';
import { SystemModal } from './SystemModal';
import { BeneficiarioDocumentos } from './BeneficiarioDocumentos';
import { getBeneficiarioDocumentoStatus } from '../utils/documentoStatus';

interface ModernLeadFormProps {
  leadId: number;
  currentUser: User;
  onBack: () => void;
  onSave: (updatedLead: Lead) => void;
}

const Input = ({ 
  label, 
  value, 
  onChange, 
  type = "text", 
  placeholder,
  icon: Icon,
  required = false,
  mask
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  icon?: React.ComponentType<any>;
  required?: boolean;
  mask?: (value: string) => string;
}) => {
  const isEmpty = required && (!value || value.trim() === '');
  return (
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4" />}
      {label}
      {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => {
        const newValue = mask ? mask(e.target.value) : e.target.value;
        onChange(newValue);
      }}
      placeholder={placeholder}
      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
        isEmpty ? 'border-red-500 bg-red-50' : 'border-gray-300'
      }`}
    />
  </div>
  );
};

const Select = ({ 
  label, 
  value, 
  onChange, 
  options, 
  icon: Icon,
  required = false 
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: (string | {value: string, label: string})[];
  icon?: React.ComponentType<any>;
  required?: boolean;
}) => {
  const isEmpty = required && (!value || value === '');
  return (
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4" />}
      {label}
      {required && <span className="text-red-500">*</span>}
    </label>
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${
        isEmpty ? 'border-red-500 bg-red-50' : 'border-gray-300'
      }`}
    >
      <option value="">Selecione...</option>
      {options.map((opt: any, idx) => (
        <option key={idx} value={opt.value || opt}>
          {opt.label || opt}
        </option>
      ))}
    </select>
  </div>
  );
};

const Card = ({ title, children, icon: Icon }: {
  title: string | React.ReactNode;
  children: React.ReactNode;
  icon?: React.ComponentType<any>;
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
      {Icon && <Icon className="w-5 h-5 text-blue-600" />}
      {typeof title === 'string' ? title : <div className="flex-1">{title}</div>}
    </h3>
    {children}
  </div>
);

export const ModernLeadForm: React.FC<ModernLeadFormProps> = ({ 
  leadId, 
  currentUser, 
  onBack, 
  onSave 
}) => {
  const [formData, setFormData] = useState<Lead | null>(null);
  const [originalData, setOriginalData] = useState<Lead | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'beneficiarios' | 'docs' | 'notas' | 'historico'>('info');
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [sellers, setSellers] = useState<User[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [showWinDialog, setShowWinDialog] = useState(false);
  const [showValueDialog, setShowValueDialog] = useState(false);
  const [tempValue, setTempValue] = useState<number | null>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [expandedBeneficiario, setExpandedBeneficiario] = useState<string | null>(null);
  const [collapsedBeneficiarios, setCollapsedBeneficiarios] = useState<Set<string>>(new Set());
  const [beneficiariosStatus, setBeneficiariosStatus] = useState<Map<string, any>>(new Map());
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  
  // Notes state
  const [notesDialog, setNotesDialog] = useState({ isOpen: false, loading: false });
  const [notes, setNotes] = useState<Note[]>([]);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [viewNote, setViewNote] = useState<Note | null>(null);
  const [deleteDocDialog, setDeleteDocDialog] = useState<{ visible: boolean; index: number; name: string; url: string | null }>({
    visible: false, index: -1, name: '', url: null
  });
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showActionsMenu && !target.closest('.actions-menu-container')) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActionsMenu]);

  // Prevent page refresh/close when there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        setShowUnsavedDialog(true);
        return false;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // Determine which status columns to use
  const isOpportunity = formData && ['OPORTUNIDADES', 'EM_CONTATO', 'NEGOCIACAO'].includes(formData.status_kanban);
  const isPerdida = formData && formData.status_kanban === 'PERDIDA';
  const statusColumns = isOpportunity ? OPPORTUNITY_COLUMNS : KANBAN_COLUMNS;
  const canChangeSeller = currentUser.role === 'ADMIN';

  useEffect(() => {
    const loadLead = async () => {
      try {
        const data = await leadService.getLeadById(leadId);
        if (data) {
          setFormData(data);
          setOriginalData(JSON.parse(JSON.stringify(data)));
          setHasChanges(false);
          // Carregar status dos documentos de cada beneficiário e dependentes
          if (data.beneficiarios && data.beneficiarios.length > 0) {
            const statusMap = new Map();
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            for (const ben of data.beneficiarios) {
              // Só carregar status se for UUID válido
              if (ben.id && uuidRegex.test(ben.id)) {
                const status = await getBeneficiarioDocumentoStatus(ben.id);
                statusMap.set(ben.id, status);
              }
              // Carregar status dos dependentes
              if (ben.dependentes) {
                for (const dep of ben.dependentes) {
                  if (dep.id && uuidRegex.test(dep.id)) {
                    const depStatus = await getBeneficiarioDocumentoStatus(dep.id);
                    statusMap.set(dep.id, depStatus);
                  }
                }
              }
            }
            setBeneficiariosStatus(statusMap);
          }
        }
        
        const logs = await leadService.getActivityLogs(leadId);
        setActivityLogs(logs);
        
        // Load notes
        const notesData = await leadService.getNotes(leadId);
        setNotes(notesData);
      } catch (error) {
        console.error('Erro ao carregar lead:', error);
      }
      setLoading(false);
    };
    loadLead();
    
    operadoraService.getOperadoras().then(setOperadoras).catch(console.error);
  }, [leadId]);

  // Load produtos when operadora changes
  useEffect(() => {
    if (formData?.operadora) {
      const operadora = operadoras.find(op => op.nome === formData.operadora);
      if (operadora) {
        operadoraService.getProdutosByOperadora(operadora.id)
          .then(setProdutos)
          .catch(console.error);
      }
    } else {
      setProdutos([]);
    }
  }, [formData?.operadora, operadoras]);

  const handleChange = (field: keyof Lead, value: any) => {
    if (!formData) return;
    const cleanValue = (field === 'telefone' || field === 'cpf_cnpj') ? unmask(value) : value;
    setFormData({ ...formData, [field]: cleanValue });
    setHasChanges(true);
    
    // Buscar CEP automaticamente
    if (field === 'cep' && cleanValue.replace(/\D/g, '').length === 8) {
      fetch(`https://viacep.com.br/ws/${cleanValue.replace(/\D/g, '')}/json/`)
        .then(res => res.json())
        .then(data => {
          if (!data.erro) {
            setFormData(prev => prev ? {
              ...prev,
              logradouro: data.logradouro || '',
              bairro: data.bairro || '',
              cidade: data.localidade || '',
              estado: data.uf || ''
            } : null);
          }
        })
        .catch(console.error);
    }
  };

  const handleAddressChange = (field: string, value: string) => {
    if (!formData) return;
    setFormData({
      ...formData,
      endereco: { 
        cep: '',
        logradouro: '',
        numero: '',
        bairro: '',
        cidade: '',
        uf: '',
        ...formData.endereco, 
        [field]: value 
      }
    });
    setHasChanges(true);
    
    // Buscar CEP automaticamente
    if (field === 'cep' && value.replace(/\D/g, '').length === 8) {
      fetch(`https://viacep.com.br/ws/${value.replace(/\D/g, '')}/json/`)
        .then(res => res.json())
        .then(data => {
          if (!data.erro) {
            setFormData(prev => prev ? {
              ...prev,
              endereco: {
                ...prev.endereco,
                logradouro: data.logradouro || '',
                bairro: data.bairro || '',
                cidade: data.localidade || '',
                uf: data.uf || ''
              }
            } : null);
          }
        })
        .catch(console.error);
    }
  };

  const addBeneficiary = () => {
    if (!formData) return;
    const newBen: Beneficiary = {
      id: Math.random().toString(36).substr(2, 9),
      nome: "",
      data_nascimento: "",
      parentesco: "Titular", // Mantido para compatibilidade
      tipo_beneficiario: 'TITULAR',
      type: 'TITULAR', // Mantido para compatibilidade
      dependentes: []
    };
    setFormData({ ...formData, beneficiarios: [...formData.beneficiarios, newBen] });
    setHasChanges(true);
  };

  const addDependente = (titularId: string) => {
    if (!formData) return;
    const newDep: Beneficiary = {
      id: Math.random().toString(36).substr(2, 9),
      nome: "",
      data_nascimento: "",
      parentesco: "Dependente", // Mantido para compatibilidade
      tipo_beneficiario: 'DEPENDENTE',
      type: 'DEPENDENTE', // Mantido para compatibilidade
      titular_id: titularId
    };
    
    const updated = formData.beneficiarios.map(b => {
      if (b.id === titularId) {
        return { ...b, dependentes: [...(b.dependentes || []), newDep] };
      }
      return b;
    });
    setFormData({ ...formData, beneficiarios: updated });
    setHasChanges(true);
  };

  const updateBeneficiary = (id: string, field: keyof Beneficiary, value: any) => {
    if (!formData) return;
    const updated = formData.beneficiarios.map(b => {
      if (b.id === id) {
        const updatedBen = { ...b, [field]: value };
        // Se mudou para dependente, garantir que tem tipo_dependente
        if (field === 'tipo_beneficiario' && value === 'DEPENDENTE' && !updatedBen.tipo_dependente) {
          updatedBen.tipo_dependente = '';
        }
        return updatedBen;
      }
      // Atualizar dependente
      if (b.dependentes) {
        const depUpdated = b.dependentes.map(d => {
          if (d.id === id) {
            const updatedDep = { ...d, [field]: value };
            // Se mudou para dependente, garantir que tem tipo_dependente
            if (field === 'tipo_beneficiario' && value === 'DEPENDENTE' && !updatedDep.tipo_dependente) {
              updatedDep.tipo_dependente = '';
            }
            return updatedDep;
          }
          return d;
        });
        return { ...b, dependentes: depUpdated };
      }
      return b;
    });
    setFormData({ ...formData, beneficiarios: updated });
    setHasChanges(true);
  };

  const removeBeneficiary = (id: string) => {
    if (!formData) return;
    setFormData({ ...formData, beneficiarios: formData.beneficiarios.filter(b => b.id !== id) });
    setHasChanges(true);
  };

  const removeDependente = (titularId: string, dependenteId: string) => {
    if (!formData) return;
    const updated = formData.beneficiarios.map(b => {
      if (b.id === titularId && b.dependentes) {
        return { ...b, dependentes: b.dependentes.filter(d => d.id !== dependenteId) };
      }
      return b;
    });
    setFormData({ ...formData, beneficiarios: updated });
    setHasChanges(true);
  };

  const handleOpenSellerModal = async () => {
    console.log('Botão de alterar vendedor clicado');
    try {
      console.log('Carregando vendedores ativos...');
      const activeSellers = await authService.getActiveSellers();
      console.log('Vendedores carregados:', activeSellers);
      setSellers(activeSellers);
      setShowSellerModal(true);
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
      setErrorMessage('Erro ao carregar lista de vendedores');
      setShowErrorDialog(true);
    }
  };

  const handleChangeSeller = async () => {
    if (!selectedSellerId || !formData) return;
    
    try {
      const newSeller = sellers.find(s => s.id === selectedSellerId);
      if (!newSeller) return;
      
      const updatedLead = await leadService.reassignLead(formData.id, selectedSellerId, currentUser);
      setFormData(updatedLead);
      setOriginalData(JSON.parse(JSON.stringify(updatedLead)));
      setHasChanges(false);
      setShowSellerModal(false);
      setSelectedSellerId(null);
      setSuccessMessage('Vendedor alterado com sucesso!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Erro ao alterar vendedor:', error);
      setErrorMessage('Erro ao alterar vendedor');
      setShowErrorDialog(true);
    }
  };

  // Notes handlers
  const handleAddNote = async (noteData: Omit<Note, 'id' | 'user_id' | 'user_name' | 'created_at' | 'updated_at'>) => {
    if (!formData) return;
    
    setNotesDialog(prev => ({ ...prev, loading: true }));
    
    try {
      if (editNote) {
        // Editar nota existente
        const updatedNote = await leadService.updateNote(editNote.id, {
          ...noteData,
          user_id: currentUser.id,
          user_name: currentUser.name
        });
        
        setNotes(prev => prev.map(n => n.id === editNote.id ? updatedNote : n));
        setEditNote(null);
      } else {
        // Criar nova nota
        const newNote = await leadService.addNote(formData.id, {
          ...noteData,
          user_id: currentUser.id,
          user_name: currentUser.name
        });
        
        setNotes(prev => [newNote, ...prev]);
      }
      
      setNotesDialog({ isOpen: false, loading: false });
      
    } catch (error) {
      console.error('Erro ao salvar nota:', error);
      setErrorMessage('Erro ao salvar nota');
      setShowErrorDialog(true);
    } finally {
      setNotesDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta nota?')) return;
    
    try {
      await leadService.deleteNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (error) {
      console.error('Erro ao excluir nota:', error);
      setErrorMessage('Erro ao excluir nota');
      setShowErrorDialog(true);
    }
  };

  const handleSubmit = async () => {
    if (!formData) return;
    
    // Validar campos obrigatórios
    const errors: string[] = [];
    
    if (!formData.nome) errors.push('Nome');
    if (!formData.email) errors.push('E-mail');
    if (!formData.telefone) errors.push('Telefone');
    
    // Validar beneficiários
    formData.beneficiarios.forEach((ben, idx) => {
      if (!ben.nome) errors.push(`Beneficiário ${idx + 1}: Nome`);
      if (!ben.cpf) errors.push(`Beneficiário ${idx + 1}: CPF`);
      if (!ben.data_nascimento) errors.push(`Beneficiário ${idx + 1}: Data de Nascimento`);
      
      // Validar dependentes
      ben.dependentes?.forEach((dep, depIdx) => {
        if (!dep.nome) errors.push(`Beneficiário ${idx + 1} - Dependente ${depIdx + 1}: Nome`);
        if (!dep.cpf) errors.push(`Beneficiário ${idx + 1} - Dependente ${depIdx + 1}: CPF`);
        if (!dep.data_nascimento) errors.push(`Beneficiário ${idx + 1} - Dependente ${depIdx + 1}: Data de Nascimento`);
      });
    });
    
    if (errors.length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    // Validar documentos se estiver mudando para ANÁLISE
    if (formData.status_kanban === 'ANÁLISE') {
      try {
        const { completo, pendentes } = await documentoConfigService.checkDocumentosCompletos(formData.id);
        if (!completo) {
          const msg = `⚠️ Documentação Incompleta\n\nNão é possível enviar para ANÁLISE.\n\nDocumentos pendentes:\n${pendentes.map(p => `• ${p}`).join('\n')}`;
          setErrorMessage(msg);
          setShowErrorDialog(true);
          return;
        }
      } catch (error) {
        console.error('Erro ao validar documentos:', error);
      }
    }
    
    setSaving(true);
    try {
      const oldStatus = formData.status_kanban;
      
      const updated = await leadService.saveLead(formData);
      
      // Registrar log se mudou status
      if (oldStatus !== updated.status_kanban) {
        console.log('Status mudou de', oldStatus, 'para', updated.status_kanban);
        console.log('Registrando log com:', {
          tipo: 'MUDANCA_STATUS',
          descricao: `Status alterado de ${formatStatus(oldStatus)} para ${formatStatus(updated.status_kanban)}`,
          usuario_id: currentUser.id,
          usuario_nome: currentUser.name
        });
        
        await leadService.addActivityLog(updated.id, {
          tipo: 'MUDANCA_STATUS',
          descricao: `Status alterado de ${formatStatus(oldStatus)} para ${formatStatus(updated.status_kanban)}`,
          usuario_id: currentUser.id,
          usuario_nome: currentUser.name
        });
        
        console.log('Log registrado com sucesso');
        
        // Recarregar logs
        const logs = await leadService.getActivityLogs(leadId);
        console.log('Logs recarregados:', logs);
        setActivityLogs(logs);
      }
      
      setFormData(updated);
      setOriginalData(JSON.parse(JSON.stringify(updated)));
      setHasChanges(false);
      
      // Recarregar status dos documentos
      const statusMap = new Map();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      for (const ben of updated.beneficiarios) {
        if (ben.id && uuidRegex.test(ben.id)) {
          const status = await getBeneficiarioDocumentoStatus(ben.id);
          statusMap.set(ben.id, status);
        }
        if (ben.dependentes) {
          for (const dep of ben.dependentes) {
            if (dep.id && uuidRegex.test(dep.id)) {
              const depStatus = await getBeneficiarioDocumentoStatus(dep.id);
              statusMap.set(dep.id, depStatus);
            }
          }
        }
      }
      setBeneficiariosStatus(statusMap);
    } catch (e: any) {
      console.error('Erro completo:', e);
      // Só mostrar erro se não for validação de campo obrigatório
      if (e?.code !== '23502') {
        setErrorMessage('Erro ao salvar lead');
        setShowErrorDialog(true);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading || !formData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <img src="/loading.gif" alt="Carregando..." className="w-16 h-16" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header Fixo */}
      <div className="bg-white border-b border-slate-200 fixed top-16 left-0 right-0 z-30 shadow-sm">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between gap-6">
            {/* Left */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (hasChanges) {
                    setShowUnsavedDialog(true);
                  } else {
                    onBack();
                  }
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-1">{formData.nome}</h1>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">{formData.vendedor}</span>
                    {currentUser.role === 'ADMIN' && canChangeSeller && (
                      <button
                        onClick={handleOpenSellerModal}
                        className="p-1 hover:bg-blue-50 rounded transition-colors"
                        title="Alterar vendedor"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-400 hover:text-blue-600" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              {formData.status_kanban === 'ENVIADA' && Array.from(beneficiariosStatus.values()).some(s => s.statusGeral !== 'completo') && (
                <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span className="text-xs font-medium text-yellow-700">Documentos pendentes</span>
                </div>
              )}
              <select
                value={formData.status_kanban}
                onChange={(e) => handleChange('status_kanban', e.target.value)}
                className="min-w-[200px] px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium text-slate-700 h-10"
              >
                {statusColumns.map(col => (
                  <option key={col.id} value={col.id}>{col.label}</option>
                ))}
                {isPerdida && (
                  <option value="PERDIDA">Perdida</option>
                )}
              </select>

              <div className="relative actions-menu-container">
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors h-10"
                >
                  Ações
                  <MoreVertical className="w-4 h-4" />
                </button>
                {showActionsMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <button
                      onClick={() => {
                        setShowActionsMenu(false);
                        // Se está em OPORTUNIDADES ou EM_CONTATO e não tem valor, pede valor primeiro
                        if ((formData.status_kanban === 'OPORTUNIDADES' || formData.status_kanban === 'EM_CONTATO') && !formData.valor_produto) {
                          setShowValueDialog(true);
                        } else {
                          setShowWinDialog(true);
                        }
                      }}
                      className="w-full px-4 py-2 text-sm hover:bg-green-50 flex items-center justify-start gap-3 text-green-700"
                    >
                      <Trophy className="w-4 h-4" />
                      Ganhar
                    </button>
                    <button
                      onClick={() => {
                        setShowActionsMenu(false);
                        setShowLostDialog(true);
                      }}
                      className="w-full px-4 py-2 text-sm hover:bg-red-50 flex items-center justify-start gap-3 text-red-700"
                    >
                      <XCircle className="w-4 h-4" />
                      Perder
                    </button>
                    <button
                      onClick={() => {
                        setShowActionsMenu(false);
                        setShowWhatsAppModal(true);
                      }}
                      className="w-full px-4 py-2 text-sm hover:bg-green-50 flex items-center justify-start gap-3 text-green-700"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Enviar WhatsApp
                    </button>
                    {currentUser.role === 'ADMIN' && (
                      <button
                        onClick={() => {
                          setShowActionsMenu(false);
                          handleOpenSellerModal();
                        }}
                        className="w-full px-4 py-2 text-sm hover:bg-blue-50 flex items-center justify-start gap-3 text-blue-700"
                      >
                        <UserPlus className="w-4 h-4" />
                        Transferir
                      </button>
                    )}
                    <div className="border-t border-gray-200 my-2"></div>
                    {currentUser.role === 'ADMIN' && (
                      <button
                        onClick={() => {
                          setShowActionsMenu(false);
                          setShowDeleteDialog(true);
                        }}
                        className="w-full px-4 py-2 text-sm hover:bg-red-50 flex items-center justify-start gap-3 text-red-700"
                      >
                        <Trash className="w-4 h-4" />
                        Excluir
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={handleSubmit}
                disabled={saving || !hasChanges}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-10"
              >
                {saving ? 'Salvando...' : 'Salvar'}
                <Save className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-slate-50 min-h-screen" style={{ marginTop: '104px' }}>
        <div className="px-8 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'info', label: 'Informações', icon: UserIcon },
            { id: 'beneficiarios', label: `Beneficiários (${formData.beneficiarios.length})`, icon: Users },
            { id: 'docs', label: `Documentos (${formData.documentos.length})`, icon: FileText },
            { id: 'notas', label: `Notas (${notes.length})`, icon: MessageSquare },
            { id: 'historico', label: `Histórico (${activityLogs.length})`, icon: MessageCircle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'info' && (
          <div className="space-y-6">
        {/* Basic Info */}
        <Card title="Informações Básicas" icon={UserIcon}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-700">Dados do Titular</h4>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Responsável financeiro?</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.titular_eh_responsavel_financeiro}
                  onChange={(e) => {
                    const isTitular = e.target.checked;
                    setFormData(prev => prev ? {
                      ...prev,
                      titular_eh_responsavel_financeiro: isTitular,
                      responsavel_financeiro: isTitular ? undefined : (prev.responsavel_financeiro || {
                        id: '',
                        lead_id: prev.id,
                        nome: '',
                        cpf: '',
                        rg: '',
                        data_nascimento: '',
                        telefone: '',
                        email: '',
                        cep: '',
                        logradouro: '',
                        numero: '',
                        complemento: '',
                        bairro: '',
                        cidade: '',
                        estado: '',
                        created_at: '',
                        updated_at: ''
                      })
                    } : null);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Nome Completo"
              value={formData.nome}
              onChange={(value) => handleChange('nome', value)}
              icon={UserIcon}
              required
            />
            <Input
              label="E-mail"
              value={formData.email}
              onChange={(value) => handleChange('email', value)}
              type="email"
              icon={Mail}
              required
            />
            <Input
              label="Telefone"
              value={maskPhone(formData.telefone)}
              onChange={(value) => handleChange('telefone', value)}
              icon={Phone}
              mask={maskPhone}
              required
            />
            <Input
              label="CPF/CNPJ"
              value={maskCPFOrCNPJ(formData.cpf_cnpj)}
              onChange={(value) => handleChange('cpf_cnpj', value)}
              mask={maskCPFOrCNPJ}
            />
            <Input
              label="Data de Nascimento"
              type="date"
              value={formData.data_nascimento_abertura || ''}
              onChange={(value) => handleChange('data_nascimento_abertura', value)}
            />
            <Select
              label="Tipo de Cliente"
              value={formData.tipo_cliente}
              onChange={(value) => handleChange('tipo_cliente', value)}
              options={['PF', 'PME', 'ADESAO']}
            />
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              Endereço
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                label="CEP"
                value={maskCEP(formData.cep || '')}
                onChange={(value) => handleChange('cep', value)}
                mask={maskCEP}
                placeholder="00000-000"
              />
              <div className="md:col-span-2">
                <Input
                  label="Logradouro"
                  value={formData.logradouro || ''}
                  onChange={(value) => handleChange('logradouro', value)}
                />
              </div>
              <Input
                label="Número"
                value={formData.numero || ''}
                onChange={(value) => handleChange('numero', value)}
              />
              <Input
                label="Complemento"
                value={formData.complemento || ''}
                onChange={(value) => handleChange('complemento', value)}
              />
              <Input
                label="Bairro"
                value={formData.bairro || ''}
                onChange={(value) => handleChange('bairro', value)}
              />
              <Input
                label="Cidade"
                value={formData.cidade || ''}
                onChange={(value) => handleChange('cidade', value)}
              />
              <Input
                label="UF"
                value={formData.estado || ''}
                onChange={(value) => handleChange('estado', value)}
                placeholder="UF"
              />
            </div>
          </div>

          {/* Botão Replicar Para Beneficiário */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={async () => {
                if (!formData) return;
                const newBen: Beneficiary = {
                  id: Math.random().toString(36).substr(2, 9),
                  nome: formData.nome,
                  data_nascimento: "",
                  parentesco: "Titular", // Mantido para compatibilidade
                  tipo_beneficiario: 'TITULAR',
                  type: 'TITULAR', // Mantido para compatibilidade
                  cpf: formData.cpf_cnpj,
                  telefone: formData.telefone,
                  email: formData.email,
                  cep: formData.cep,
                  logradouro: formData.logradouro,
                  numero: formData.numero,
                  bairro: formData.bairro,
                  cidade: formData.cidade,
                  estado: formData.estado
                };
                const updatedFormData = { ...formData, beneficiarios: [...formData.beneficiarios, newBen] };
                setFormData(updatedFormData);
                
                // Salvar automaticamente
                try {
                  const saved = await leadService.saveLead(updatedFormData);
                  setFormData(saved);
                  
                  // Carregar status dos documentos
                  const statusMap = new Map();
                  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                  for (const ben of saved.beneficiarios) {
                    if (ben.id && uuidRegex.test(ben.id)) {
                      const status = await getBeneficiarioDocumentoStatus(ben.id);
                      statusMap.set(ben.id, status);
                    }
                  }
                  setBeneficiariosStatus(statusMap);
                  
                  setActiveTab('beneficiarios');
                  setSuccessMessage('Titular replicado para beneficiários!');
                  setShowSuccessModal(true);
                } catch (error) {
                  console.error('Erro ao salvar:', error);
                }
              }}
              disabled={false}
              title=""
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Users className="w-4 h-4" />
              Replicar Para Beneficiário
            </button>
          </div>

          {!formData.titular_eh_responsavel_financeiro && (
            <Card title="Responsável Financeiro" icon={UserIcon}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  label="Nome Completo"
                  value={formData.responsavel_financeiro?.nome || ''}
                  onChange={(value) => setFormData(prev => prev ? {
                    ...prev,
                    responsavel_financeiro: { ...prev.responsavel_financeiro!, nome: value }
                  } : null)}
                  icon={UserIcon}
                  required
                />
                <Input
                  label="CPF"
                  value={maskCPFOrCNPJ(formData.responsavel_financeiro?.cpf || '')}
                  onChange={(value) => setFormData(prev => prev ? {
                    ...prev,
                    responsavel_financeiro: { ...prev.responsavel_financeiro!, cpf: unmask(value) }
                  } : null)}
                  mask={maskCPFOrCNPJ}
                  required
                />
                <Input
                  label="RG"
                  value={maskRG(formData.responsavel_financeiro?.rg || '')}
                  onChange={(value) => setFormData(prev => prev ? {
                    ...prev,
                    responsavel_financeiro: { ...prev.responsavel_financeiro!, rg: unmask(value) }
                  } : null)}
                  mask={maskRG}
                  placeholder="Ex: 12.345.678-9"
                />
                <Input
                  label="Data de Nascimento"
                  type="date"
                  value={formData.responsavel_financeiro?.data_nascimento || ''}
                  onChange={(value) => setFormData(prev => prev ? {
                    ...prev,
                    responsavel_financeiro: { ...prev.responsavel_financeiro!, data_nascimento: value }
                  } : null)}
                />
                <Input
                  label="Telefone"
                  value={maskPhone(formData.responsavel_financeiro?.telefone || '')}
                  onChange={(value) => setFormData(prev => prev ? {
                    ...prev,
                    responsavel_financeiro: { ...prev.responsavel_financeiro!, telefone: unmask(value) }
                  } : null)}
                  icon={Phone}
                  mask={maskPhone}
                />
                <Input
                  label="E-mail"
                  type="email"
                  value={formData.responsavel_financeiro?.email || ''}
                  onChange={(value) => setFormData(prev => prev ? {
                    ...prev,
                    responsavel_financeiro: { ...prev.responsavel_financeiro!, email: value }
                  } : null)}
                  icon={Mail}
                />
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Endereço do Responsável
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Input
                    label="CEP"
                    value={maskCEP(formData.responsavel_financeiro?.cep || '')}
                    onChange={(value) => {
                      const cleanCep = unmask(value);
                      setFormData(prev => prev ? {
                        ...prev,
                        responsavel_financeiro: { ...prev.responsavel_financeiro!, cep: cleanCep }
                      } : null);
                      
                      if (cleanCep.length === 8) {
                        fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
                          .then(res => res.json())
                          .then(data => {
                            if (!data.erro) {
                              setFormData(prev => prev ? {
                                ...prev,
                                responsavel_financeiro: {
                                  ...prev.responsavel_financeiro!,
                                  logradouro: data.logradouro || '',
                                  bairro: data.bairro || '',
                                  cidade: data.localidade || '',
                                  estado: data.uf || ''
                                }
                              } : null);
                            }
                          })
                          .catch(console.error);
                      }
                    }}
                    mask={maskCEP}
                    placeholder="00000-000"
                  />
                  <div className="md:col-span-2">
                    <Input
                      label="Logradouro"
                      value={formData.responsavel_financeiro?.logradouro || ''}
                      onChange={(value) => setFormData(prev => prev ? {
                        ...prev,
                        responsavel_financeiro: { ...prev.responsavel_financeiro!, logradouro: value }
                      } : null)}
                    />
                  </div>
                  <Input
                    label="Número"
                    value={formData.responsavel_financeiro?.numero || ''}
                    onChange={(value) => setFormData(prev => prev ? {
                      ...prev,
                      responsavel_financeiro: { ...prev.responsavel_financeiro!, numero: value }
                    } : null)}
                  />
                  <Input
                    label="Complemento"
                    value={formData.responsavel_financeiro?.complemento || ''}
                    onChange={(value) => setFormData(prev => prev ? {
                      ...prev,
                      responsavel_financeiro: { ...prev.responsavel_financeiro!, complemento: value }
                    } : null)}
                  />
                  <Input
                    label="Bairro"
                    value={formData.responsavel_financeiro?.bairro || ''}
                    onChange={(value) => setFormData(prev => prev ? {
                      ...prev,
                      responsavel_financeiro: { ...prev.responsavel_financeiro!, bairro: value }
                    } : null)}
                  />
                  <Input
                    label="Cidade"
                    value={formData.responsavel_financeiro?.cidade || ''}
                    onChange={(value) => setFormData(prev => prev ? {
                      ...prev,
                      responsavel_financeiro: { ...prev.responsavel_financeiro!, cidade: value }
                    } : null)}
                  />
                  <Input
                    label="Estado"
                    value={formData.responsavel_financeiro?.estado || ''}
                    onChange={(value) => setFormData(prev => prev ? {
                      ...prev,
                      responsavel_financeiro: { ...prev.responsavel_financeiro!, estado: value }
                    } : null)}
                    placeholder="UF"
                  />
                </div>
              </div>
            </Card>
          )}
        </Card>

        {/* Product Info */}
        <Card title="Produto" icon={Package}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                Operadora
                <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.operadora || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData(prev => prev ? { ...prev, operadora: value, produto: '' } : null);
                  setHasChanges(true);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Selecione...</option>
                {operadoras.map((op) => (
                  <option key={op.id} value={op.nome}>
                    {op.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                Produto
                <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.produto || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData(prev => prev ? { ...prev, produto: value } : null);
                  setHasChanges(true);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Selecione...</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.nome}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Valor (R$)"
              value={formData.valor_produto != null ? String(formData.valor_produto) : ''}
              onChange={(value) => handleChange('valor_produto', value ? parseFloat(value) : null)}
              type="number"
              icon={DollarSign}
            />
            <Select
              label="Coparticipação"
              value={formData.coparticipacao}
              onChange={(value) => handleChange('coparticipacao', value)}
              options={['NÃO', 'PARCIAL', 'COMPLETA']}
            />
            <Select
              label="Redução de Carência"
              value={formData.reducao_carencia ? 'SIM' : 'NÃO'}
              onChange={(value) => handleChange('reducao_carencia', value === 'SIM')}
              options={['NÃO', 'SIM']}
            />
            <Input
              label="Vigência Prevista"
              value={formData.vigencia}
              onChange={(value) => handleChange('vigencia', value)}
              type="date"
            />
            </div>
          </Card>
          </div>
        )}

        {/* Beneficiários Tab */}
        {activeTab === 'beneficiarios' && (
          <div className="space-y-6">
            {/* Resumo Geral */}
            {formData.beneficiarios.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">Status da Documentação</h4>
                    <p className="text-sm text-blue-700">
                      {Array.from(beneficiariosStatus.values()).filter(s => s.statusGeral === 'completo').length} de {formData.beneficiarios.length} beneficiários com documentação completa
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Array.from(beneficiariosStatus.values()).reduce((acc, s) => acc + s.aprovados, 0)}
                      </div>
                      <div className="text-xs text-gray-600">Aprovados</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {Array.from(beneficiariosStatus.values()).reduce((acc, s) => acc + s.enviados, 0)}
                      </div>
                      <div className="text-xs text-gray-600">Aguardando</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {Array.from(beneficiariosStatus.values()).reduce((acc, s) => acc + s.pendentes + s.rejeitados, 0)}
                      </div>
                      <div className="text-xs text-gray-600">Pendentes</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end items-center mb-6">
              <button 
                onClick={addBeneficiary} 
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Adicionar Vida
              </button>
            </div>

            {formData.beneficiarios.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum beneficiário cadastrado.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {formData.beneficiarios.map((ben, index) => {
                  const isExpanded = expandedBeneficiario === ben.id;
                  const isCollapsed = collapsedBeneficiarios.has(ben.id);
                  const docStatus = beneficiariosStatus.get(ben.id);
                  return (
                  <Card 
                    key={ben.id} 
                    title={
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              const newCollapsed = new Set(collapsedBeneficiarios);
                              if (isCollapsed) {
                                newCollapsed.delete(ben.id);
                              } else {
                                newCollapsed.add(ben.id);
                              }
                              setCollapsedBeneficiarios(newCollapsed);
                            }}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                          </button>
                          <span>Beneficiário {index + 1} - {ben.nome || 'Sem nome'} ({getTipoBeneficiarioLabel(ben.tipo_beneficiario || 'TITULAR')})</span>
                        </div>
                        {docStatus && docStatus.total > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">
                              {docStatus.aprovados}/{docStatus.total} docs
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                              docStatus.statusGeral === 'completo' ? 'bg-green-100 text-green-700' :
                              docStatus.statusGeral === 'aguardando' ? 'bg-yellow-100 text-yellow-700' :
                              docStatus.statusGeral === 'rejeitado' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {docStatus.icone} {
                                docStatus.statusGeral === 'completo' ? 'Completo' :
                                docStatus.statusGeral === 'aguardando' ? 'Aguardando' :
                                docStatus.statusGeral === 'rejeitado' ? 'Rejeitado' :
                                'Pendente'
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    }
                    icon={UserIcon}
                  >
                    {!isCollapsed && (
                    <div className="relative">
                      <button 
                        onClick={() => removeBeneficiary(ben.id)} 
                        className="absolute -top-2 -right-2 text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Remover beneficiário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      
                      {/* Tabs */}
                      <div className="flex gap-2 mb-4 border-b border-gray-200">
                        <button
                          onClick={() => setExpandedBeneficiario(isExpanded ? null : ben.id)}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${
                            !isExpanded ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Dados Básicos
                        </button>
                        <button
                          onClick={() => setExpandedBeneficiario(ben.id)}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${
                            isExpanded ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Documentos
                        </button>
                      </div>

                      {!isExpanded ? (
                      <div className="space-y-6">
                        {/* Dados Básicos */}
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-gray-700">Dados Básicos</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">Possui dependentes?</span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={ben.dependentes && ben.dependentes.length > 0}
                                  onChange={(e) => {
                                    if (e.target.checked && (!ben.dependentes || ben.dependentes.length === 0)) {
                                      addDependente(ben.id);
                                    } else if (!e.target.checked && ben.dependentes && ben.dependentes.length > 0) {
                                      if (confirm('Isso removerá todos os dependentes. Confirma?')) {
                                        const updated = formData.beneficiarios.map(b => 
                                          b.id === ben.id ? { ...b, dependentes: [] } : b
                                        );
                                        setFormData({ ...formData, beneficiarios: updated });
                                      }
                                    }
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Input 
                              label="Nome Completo" 
                              value={ben.nome} 
                              onChange={(v) => updateBeneficiary(ben.id, 'nome', v)} 
                              icon={UserIcon}
                              required
                            />
                            <Input 
                              label="CPF" 
                              value={maskCPFOrCNPJ(ben.cpf || '')} 
                              onChange={(v) => updateBeneficiary(ben.id, 'cpf', unmask(v))} 
                              mask={maskCPFOrCNPJ}
                              required
                            />
                            <Input 
                              label="Data Nascimento" 
                              type="date" 
                              value={ben.data_nascimento} 
                              onChange={(v) => updateBeneficiary(ben.id, 'data_nascimento', v)} 
                              required
                            />
                            <Select 
                              label="Tipo de Beneficiário" 
                              value={ben.tipo_beneficiario || 'TITULAR'} 
                              onChange={(v) => {
                                const newTipo = v as 'TITULAR' | 'DEPENDENTE';
                                updateBeneficiary(ben.id, 'tipo_beneficiario', newTipo);
                                // Atualizar campos de compatibilidade
                                updateBeneficiary(ben.id, 'type', newTipo);
                                updateBeneficiary(ben.id, 'parentesco', newTipo === 'TITULAR' ? 'Titular' : 'Dependente');
                                // Se mudou para dependente, definir tipo padrão
                                if (newTipo === 'DEPENDENTE' && !ben.tipo_dependente) {
                                  updateBeneficiary(ben.id, 'tipo_dependente', '');
                                }
                              }}
                              options={[
                                { value: 'TITULAR', label: 'Titular' },
                                { value: 'DEPENDENTE', label: 'Dependente' }
                              ]}
                              required
                            />
                            {(ben.tipo_beneficiario === 'DEPENDENTE' || !ben.tipo_beneficiario) && (
                              <Select 
                                label="Tipo de Dependente" 
                                value={ben.tipo_dependente || ''} 
                                onChange={(v) => updateBeneficiary(ben.id, 'tipo_dependente', v)}
                                options={TIPOS_DEPENDENTE}
                                required
                              />
                            )}
                            <Input 
                              label="Telefone" 
                              value={maskPhone(ben.telefone || '')} 
                              onChange={(v) => updateBeneficiary(ben.id, 'telefone', unmask(v))} 
                              icon={Phone}
                              mask={maskPhone}
                            />
                            <Input 
                              label="E-mail" 
                              type="email" 
                              value={ben.email || ''} 
                              onChange={(v) => updateBeneficiary(ben.id, 'email', v)} 
                              icon={Mail}
                            />
                          </div>
                        </div>

                        {/* Endereço */}
                        <div className="pt-4 border-t">
                          <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-600" />
                            Endereço
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Input 
                              label="CEP" 
                              value={ben.cep || ''} 
                              onChange={(v) => {
                                const cleanCep = v.replace(/\D/g, '');
                                if (cleanCep.length === 8) {
                                  fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
                                    .then(res => res.json())
                                    .then(data => {
                                      if (!data.erro && formData) {
                                        const updated = formData.beneficiarios.map(b => 
                                          b.id === ben.id ? {
                                            ...b,
                                            cep: v,
                                            logradouro: data.logradouro || '',
                                            bairro: data.bairro || '',
                                            cidade: data.localidade || '',
                                            estado: data.uf || ''
                                          } : b
                                        );
                                        setFormData({ ...formData, beneficiarios: updated });
                                      }
                                    })
                                    .catch(console.error);
                                } else {
                                  updateBeneficiary(ben.id, 'cep', v);
                                }
                              }}
                              mask={maskCEP}
                              placeholder="00000-000"
                            />
                            <div className="md:col-span-2">
                              <Input 
                                label="Logradouro" 
                                value={ben.logradouro || ''} 
                                onChange={(v) => updateBeneficiary(ben.id, 'logradouro', v)} 
                              />
                            </div>
                            <Input 
                              label="Número" 
                              value={ben.numero || ''} 
                              onChange={(v) => updateBeneficiary(ben.id, 'numero', v)} 
                            />
                            <Input 
                              label="Bairro" 
                              value={ben.bairro || ''} 
                              onChange={(v) => updateBeneficiary(ben.id, 'bairro', v)} 
                            />
                            <Input 
                              label="Cidade" 
                              value={ben.cidade || ''} 
                              onChange={(v) => updateBeneficiary(ben.id, 'cidade', v)} 
                            />
                            <Input 
                              label="Estado" 
                              value={ben.estado || ''} 
                              onChange={(v) => updateBeneficiary(ben.id, 'estado', v)} 
                              placeholder="UF"
                            />
                          </div>
                        </div>

                        {/* Dependentes */}
                        {ben.dependentes && ben.dependentes.length > 0 && (
                        <div className="pt-4 border-t">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                              <Users className="w-4 h-4 text-blue-600" />
                              Dependentes ({ben.dependentes.length})
                            </h4>
                            <button
                              onClick={() => addDependente(ben.id)}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              Adicionar
                            </button>
                          </div>

                          {ben.dependentes && ben.dependentes.length > 0 ? (
                            <div className="space-y-4">
                              {ben.dependentes.map((dep, depIndex) => {
                                const depDocStatus = beneficiariosStatus.get(dep.id);
                                const isDepExpanded = expandedBeneficiario === dep.id;
                                const tipoLabel = dep.tipo_dependente ? getTipoDependenteLabel(dep.tipo_dependente) : 'Dependente';
                                return (
                                <div key={dep.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <h5 className="text-sm font-medium text-gray-700">Dependente {depIndex + 1} - {dep.nome || 'Sem nome'} ({tipoLabel})</h5>
                                      {depDocStatus && depDocStatus.total > 0 && (
                                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                          depDocStatus.statusGeral === 'completo' ? 'bg-green-100 text-green-700' :
                                          depDocStatus.statusGeral === 'aguardando' ? 'bg-yellow-100 text-yellow-700' :
                                          depDocStatus.statusGeral === 'rejeitado' ? 'bg-red-100 text-red-700' :
                                          'bg-gray-100 text-gray-700'
                                        }`}>
                                          {depDocStatus.icone} {depDocStatus.aprovados}/{depDocStatus.total}
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => removeDependente(ben.id, dep.id)}
                                      className="text-red-500 hover:text-red-700 p-1"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>

                                  {/* Tabs Dependente */}
                                  <div className="flex gap-2 mb-3 border-b border-gray-300">
                                    <button
                                      onClick={() => setExpandedBeneficiario(isDepExpanded ? null : dep.id)}
                                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                                        !isDepExpanded ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
                                      }`}
                                    >
                                      Dados
                                    </button>
                                    <button
                                      onClick={() => setExpandedBeneficiario(dep.id)}
                                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                                        isDepExpanded ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
                                      }`}
                                    >
                                      Documentos
                                    </button>
                                  </div>

                                  {!isDepExpanded ? (
                                    <div className="space-y-3">
                                      {/* Dados Básicos */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        <Input 
                                          label="Nome Completo" 
                                          value={dep.nome} 
                                          onChange={(v) => updateBeneficiary(dep.id, 'nome', v)} 
                                          required
                                        />
                                        <Input 
                                          label="CPF" 
                                          value={maskCPFOrCNPJ(dep.cpf || '')} 
                                          onChange={(v) => updateBeneficiary(dep.id, 'cpf', unmask(v))} 
                                          mask={maskCPFOrCNPJ}
                                          required
                                        />
                                        <Input 
                                          label="RG" 
                                          value={maskRG(dep.rg || '')} 
                                          onChange={(v) => updateBeneficiary(dep.id, 'rg', unmask(v))} 
                                          mask={maskRG}
                                        />
                                        <Input 
                                          label="Data Nascimento" 
                                          type="date" 
                                          value={dep.data_nascimento} 
                                          onChange={(v) => updateBeneficiary(dep.id, 'data_nascimento', v)} 
                                          required
                                        />
                                        <Select 
                                          label="Tipo de Dependente" 
                                          value={dep.tipo_dependente || ''} 
                                          onChange={(v) => updateBeneficiary(dep.id, 'tipo_dependente', v)}
                                          options={TIPOS_DEPENDENTE}
                                          required
                                        />
                                        <Input 
                                          label="Telefone" 
                                          value={maskPhone(dep.telefone || '')} 
                                          onChange={(v) => updateBeneficiary(dep.id, 'telefone', unmask(v))} 
                                          mask={maskPhone}
                                        />
                                        <Input 
                                          label="E-mail" 
                                          type="email" 
                                          value={dep.email || ''} 
                                          onChange={(v) => updateBeneficiary(dep.id, 'email', v)} 
                                        />
                                      </div>

                                      {/* Endereço */}
                                      <div className="pt-3 border-t border-gray-300">
                                        <h6 className="text-xs font-semibold text-gray-600 mb-2">Endereço</h6>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                          <Input 
                                            label="CEP" 
                                            value={dep.cep || ''} 
                                            onChange={(v) => {
                                              const cleanCep = v.replace(/\D/g, '');
                                              if (cleanCep.length === 8) {
                                                fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
                                                  .then(res => res.json())
                                                  .then(data => {
                                                    if (!data.erro && formData) {
                                                      setFormData(prev => {
                                                        if (!prev) return null;
                                                        const updated = prev.beneficiarios.map(b => {
                                                          if (b.dependentes) {
                                                            const depsUpdated = b.dependentes.map(d => 
                                                              d.id === dep.id ? {
                                                                ...d,
                                                                cep: v,
                                                                logradouro: data.logradouro || '',
                                                                bairro: data.bairro || '',
                                                                cidade: data.localidade || '',
                                                                estado: data.uf || ''
                                                              } : d
                                                            );
                                                            return { ...b, dependentes: depsUpdated };
                                                          }
                                                          return b;
                                                        });
                                                        return { ...prev, beneficiarios: updated };
                                                      });
                                                    }
                                                  })
                                                  .catch(console.error);
                                              } else {
                                                updateBeneficiary(dep.id, 'cep', v);
                                              }
                                            }}
                                            mask={maskCEP}
                                          />
                                          <div className="md:col-span-2">
                                            <Input 
                                              label="Logradouro" 
                                              value={dep.logradouro || ''} 
                                              onChange={(v) => updateBeneficiary(dep.id, 'logradouro', v)} 
                                            />
                                          </div>
                                          <Input 
                                            label="Número" 
                                            value={dep.numero || ''} 
                                            onChange={(v) => updateBeneficiary(dep.id, 'numero', v)} 
                                          />
                                          <Input 
                                            label="Bairro" 
                                            value={dep.bairro || ''} 
                                            onChange={(v) => updateBeneficiary(dep.id, 'bairro', v)} 
                                          />
                                          <Input 
                                            label="Cidade" 
                                            value={dep.cidade || ''} 
                                            onChange={(v) => updateBeneficiary(dep.id, 'cidade', v)} 
                                          />
                                          <Input 
                                            label="Estado" 
                                            value={dep.estado || ''} 
                                            onChange={(v) => updateBeneficiary(dep.id, 'estado', v)} 
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <BeneficiarioDocumentos
                                        beneficiarioId={dep.id}
                                        leadId={formData.id}
                                        operadoraId={operadoras.find(op => op.nome === formData.operadora)?.id || 0}
                                        produtoId={produtos.find(p => p.nome === formData.produto)?.id || 0}
                                        tipoCliente={formData.tipo_cliente}
                                        isAdmin={currentUser.role === 'ADMIN'}
                                        currentUserId={currentUser.id}
                                        onStatusChange={async () => {
                                          const status = await getBeneficiarioDocumentoStatus(dep.id);
                                          setBeneficiariosStatus(prev => new Map(prev).set(dep.id, status));
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                        )}
                      </div>
                      ) : (
                        <div>
                          <BeneficiarioDocumentos
                            beneficiarioId={ben.id}
                            leadId={formData.id}
                            operadoraId={operadoras.find(o => o.nome === formData.operadora)?.id || 0}
                            produtoId={produtos.find(p => p.nome === formData.produto)?.id || 0}
                            tipoCliente={formData.tipo_cliente}
                            isAdmin={currentUser.role === 'ADMIN'}
                            currentUserId={currentUser.id}
                            onStatusChange={async () => {
                              const status = await getBeneficiarioDocumentoStatus(ben.id);
                              setBeneficiariosStatus(prev => new Map(prev).set(ben.id, status));
                            }}
                          />
                        </div>
                      )}
                    </div>
                    )}
                  </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Documentos Tab */}
        {activeTab === 'docs' && (
          <div className="space-y-6">
            <label className="block">
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                uploadingDoc 
                  ? 'border-blue-400 bg-blue-50 cursor-wait' 
                  : 'border-gray-300 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 cursor-pointer'
              }`}>
                {uploadingDoc ? (
                  <>
                    <img src="/loading.gif" className="w-12 h-12 mx-auto mb-4" alt="Enviando..." />
                    <h4 className="font-semibold text-blue-700 mb-2">Enviando documento...</h4>
                    <p className="text-sm text-blue-500">Aguarde enquanto o arquivo é carregado</p>
                  </>
                ) : (
                  <>
                    <div className="bg-white p-4 rounded-full shadow-sm mb-4 w-16 h-16 mx-auto flex items-center justify-center">
                      <Paperclip className="w-8 h-8 text-blue-500" />
                    </div>
                    <h4 className="font-semibold text-gray-700 mb-2">Clique para enviar documentos</h4>
                    <p className="text-sm text-gray-500">Aceita: PDF, PNG e JPEG (máx. 10MB)</p>
                  </>
                )}
              </div>
              <input 
                type="file" 
                accept=".pdf,.png,.jpg,.jpeg" 
                className="hidden"
                disabled={uploadingDoc}
                onChange={async (e) => {
                  if (e.target.files && e.target.files[0] && formData) {
                    const file = e.target.files[0];
                    setUploadingDoc(true);
                    try {
                      const fileName = `${Date.now()}_${file.name}`;
                      const filePath = `lead_${formData.id}/${fileName}`;
                      
                      const { error: uploadError } = await supabase.storage
                        .from('beneficiario-documentos')
                        .upload(filePath, file);
                      
                      if (uploadError) throw uploadError;
                      
                      const { data: urlData } = supabase.storage
                        .from('beneficiario-documentos')
                        .getPublicUrl(filePath);
                      
                      const newDoc = { name: file.name, url: urlData.publicUrl };
                      const novosDocumentos = [...formData.documentos, newDoc];
                      
                      // Salvar no banco imediatamente
                      await supabase
                        .from('leads')
                        .update({ documentos: novosDocumentos, updated_at: new Date().toISOString() })
                        .eq('id', formData.id);
                      
                      setFormData(prev => prev ? {
                        ...prev,
                        documentos: novosDocumentos
                      } : null);
                      setOriginalData(prev => prev ? {
                        ...prev,
                        documentos: novosDocumentos
                      } : null);
                    } catch (err) {
                      console.error('Erro no upload:', err);
                      alert('Erro ao enviar documento');
                    } finally {
                      setUploadingDoc(false);
                    }
                  }
                }}
              />
            </label>

            <div>
              <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Arquivos Anexados
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.documentos.map((doc, i) => {
                  const docName = typeof doc === 'string' ? doc : doc.name;
                  const docUrl = typeof doc === 'string' ? null : doc.url;
                  return (
                    <div key={i} className="flex flex-col items-center p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow relative group">
                      <button
                        onClick={() => {
                          setDeleteDocDialog({ visible: true, index: i, name: docName, url: docUrl });
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                        title="Excluir documento"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <FileText className="w-10 h-10 text-gray-400 mb-2" />
                      <span className="text-xs font-medium text-gray-700 truncate w-full text-center" title={docName}>
                        {docName}
                      </span>
                      <span className="text-[10px] text-gray-400 mb-3">Documento</span>
                      {docUrl ? (
                        <a
                          href={docUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          Baixar
                        </a>
                      ) : (
                        <label className="cursor-pointer">
                          <div className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors">
                            <Upload className="w-3 h-3" />
                            Reenviar
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.png,.jpg,.jpeg"
                            disabled={uploadingDoc}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file || !formData) return;
                              setUploadingDoc(true);
                              try {
                                const fileName = `${Date.now()}_${file.name}`;
                                const filePath = `lead_${formData.id}/${fileName}`;

                                const { error: uploadError } = await supabase.storage
                                  .from('beneficiario-documentos')
                                  .upload(filePath, file);
                                if (uploadError) throw uploadError;

                                const { data: urlData } = supabase.storage
                                  .from('beneficiario-documentos')
                                  .getPublicUrl(filePath);

                                const novosDocumentos = formData.documentos.map((d, idx) =>
                                  idx === i ? { name: file.name, url: urlData.publicUrl } : d
                                );

                                await supabase
                                  .from('leads')
                                  .update({ documentos: novosDocumentos, updated_at: new Date().toISOString() })
                                  .eq('id', formData.id);

                                setFormData(prev => prev ? { ...prev, documentos: novosDocumentos } : null);
                                setOriginalData(prev => prev ? { ...prev, documentos: novosDocumentos } : null);
                              } catch (err) {
                                console.error('Erro no reenvio:', err);
                                alert('Erro ao reenviar documento');
                              } finally {
                                setUploadingDoc(false);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
                {formData.documentos.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    Nenhum documento anexado ainda.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notas Tab */}
        {activeTab === 'notas' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Notas e Atividades
              </h3>
              <button 
                onClick={() => {
                  setEditNote(null);
                  setNotesDialog({ isOpen: true, loading: false });
                }} 
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Adicionar Nota
              </button>
            </div>

            <div className="space-y-4">
              {notes.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhuma nota cadastrada.</p>
                </div>
              )}
              {notes.map((note) => (
                <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer group" onClick={() => setViewNote(note)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        note.atividade === 'Apresentação' ? 'bg-purple-100 text-purple-700' :
                        note.atividade === 'Ligação' ? 'bg-green-100 text-green-700' :
                        note.atividade === 'Proposta' ? 'bg-blue-100 text-blue-700' :
                        note.atividade === 'Reunião' ? 'bg-orange-100 text-orange-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {note.atividade}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(note.data + 'T' + note.horario).toLocaleString('pt-BR', {
                          timeZone: 'America/Sao_Paulo',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {note.duracao && (
                        <span className="text-xs text-gray-400">• {note.duracao}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditNote(note);
                          setNotesDialog({ isOpen: true, loading: false });
                        }}
                        className="p-1 hover:bg-blue-50 rounded transition-colors"
                        title="Editar nota"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                        className="p-1 hover:bg-red-50 rounded transition-colors"
                        title="Excluir nota"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-2">{note.anotacoes}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">{note.user_name}</span>
                    <span className="text-xs text-blue-600">Clique para ver detalhes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Histórico Tab */}
        {activeTab === 'historico' && (
          <div className="space-y-4">
            <Card title="Histórico de Atividades" icon={MessageCircle}>
              {activityLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma atividade registrada ainda.
                </div>
              ) : (
                <div className="space-y-3">
                  {activityLogs.map((log) => {
                    // Definir ícone e cor baseado no tipo
                    let IconComponent = MessageCircle;
                    let iconColor = 'text-blue-600';
                    let bgColor = 'bg-blue-100';
                    
                    switch(log.tipo) {
                      case 'CRIACAO':
                        IconComponent = Plus;
                        iconColor = 'text-green-600';
                        bgColor = 'bg-green-100';
                        break;
                      case 'MUDANCA_STATUS':
                        IconComponent = RefreshCw;
                        iconColor = 'text-blue-600';
                        bgColor = 'bg-blue-100';
                        break;
                      case 'LEAD_GANHO':
                        IconComponent = Trophy;
                        iconColor = 'text-yellow-600';
                        bgColor = 'bg-yellow-100';
                        break;
                      case 'LEAD_PERDIDO':
                        IconComponent = XCircle;
                        iconColor = 'text-red-600';
                        bgColor = 'bg-red-100';
                        break;
                      case 'LEAD_RECUPERADO':
                        IconComponent = TrendingUp;
                        iconColor = 'text-emerald-600';
                        bgColor = 'bg-emerald-100';
                        break;
                      case 'ATUALIZACAO':
                        IconComponent = Edit3;
                        iconColor = 'text-slate-600';
                        bgColor = 'bg-slate-100';
                        break;
                      case 'FOLLOWUP_AGENDADO':
                        IconComponent = AlertCircle;
                        iconColor = 'text-orange-600';
                        bgColor = 'bg-orange-100';
                        break;
                      default:
                        IconComponent = MessageCircle;
                        iconColor = 'text-blue-600';
                        bgColor = 'bg-blue-100';
                    }
                    
                    return (
                      <div key={log.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-shrink-0">
                          <div className={`w-8 h-8 ${bgColor} rounded-full flex items-center justify-center`}>
                            <IconComponent className={`w-4 h-4 ${iconColor}`} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{log.descricao}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{log.usuario_nome}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              {formatDateTime(log.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
      </div>

      {/* Modal de Troca de Vendedor */}
      {showSellerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Alterar Vendedor - {formData?.nome}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Vendedor atual: <strong>{formData?.vendedor}</strong>
            </p>
            
            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium text-gray-700">Novo Vendedor</label>
              <select
                value={selectedSellerId || ''}
                onChange={(e) => setSelectedSellerId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
              >
                <option value="">Selecione um vendedor...</option>
                {sellers.map(seller => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSellerModal(false);
                  setSelectedSellerId(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangeSeller}
                disabled={!selectedSellerId}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal WhatsApp */}
      {showWhatsAppModal && formData && (
        <WhatsAppModal
          lead={formData}
          onClose={() => setShowWhatsAppModal(false)}
          onSend={async (phone, message) => {
            // Encode message for WhatsApp URL
            const encodedMessage = encodeURIComponent(message);
            const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
            
            // Update status to EM_CONTATO if it's OPORTUNIDADES
            if (formData.status_kanban === 'OPORTUNIDADES') {
              try {
                const updatedLead = { ...formData, status_kanban: 'EM_CONTATO' as any };
                await leadService.saveLead(updatedLead);
                setFormData(updatedLead);
                onSave(updatedLead);
              } catch (error) {
                console.error('Erro ao atualizar status:', error);
              }
            }
            
            // Open WhatsApp in new tab
            window.open(whatsappUrl, '_blank');
            setShowWhatsAppModal(false);
          }}
        />
      )}

      {/* Modal de Sucesso */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sucesso!</h3>
            <p className="text-gray-600 mb-6">{successMessage}</p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Win Dialog */}
      <WinDialog
        visible={showWinDialog}
        onHide={() => setShowWinDialog(false)}
        onConfirm={async (motivo, motivoOutro) => {
          if (!formData) return;
          try {
            const updatedLead = {
              ...formData,
              status_kanban: 'ENVIADA' as any,
              valor_produto: tempValue || formData.valor_produto,
              converted_to_proposal_at: new Date().toISOString(),
              dados_proposta: {
                motivo_ganho: motivo,
                motivo_ganho_outro: motivoOutro,
                data_ganho: new Date().toISOString()
              }
            };
            await leadService.saveLead(updatedLead);
            
            // Registrar log de proposta ganha
            await leadService.addActivityLog(formData.id, {
              tipo: 'LEAD_GANHO',
              descricao: `Proposta ganha! Motivo: ${motivo}${motivoOutro ? ' - ' + motivoOutro : ''}`,
              usuario_id: currentUser.id,
              usuario_nome: currentUser.name,
              metadata: { motivo, motivoOutro, valor: tempValue || formData.valor_produto }
            });
            
            setFormData(updatedLead);
            onSave(updatedLead);
            setShowWinDialog(false);
            setTempValue(null);
            setSuccessMessage('Lead movido para Enviada com sucesso!');
            setShowSuccessModal(true);
          } catch (error) {
            console.error('Erro ao salvar:', error);
            setErrorMessage('Erro ao salvar lead');
            setShowErrorDialog(true);
          }
        }}
      />

      {/* Value Dialog */}
      {showValueDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Trophy className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Valor do Produto</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valor (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={tempValue || ''}
                  onChange={(e) => setTempValue(parseFloat(e.target.value))}
                  placeholder="Digite o valor"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowValueDialog(false);
                  setTempValue(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!tempValue || tempValue <= 0) {
                    setErrorMessage('Por favor, insira um valor válido');
                    setShowErrorDialog(true);
                    return;
                  }
                  setShowValueDialog(false);
                  setShowWinDialog(true);
                }}
                disabled={!tempValue || tempValue <= 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Próximo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lost Dialog */}
      <LostDialog
        visible={showLostDialog}
        onHide={() => setShowLostDialog(false)}
        onConfirm={async (data) => {
          if (!formData) return;
          try {
            await leadService.markAsLost(formData.id, data, currentUser);
            setShowLostDialog(false);
            setSuccessMessage('Lead marcado como perdido!');
            setShowSuccessModal(true);
            setTimeout(() => {
              onBack();
              window.location.reload();
            }, 1500);
          } catch (error) {
            console.error('Erro ao marcar como perdido:', error);
            setErrorMessage('Erro ao marcar lead como perdido');
            setShowErrorDialog(true);
          }
        }}
      />

      {/* Delete Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Confirmar Exclusão</h3>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-2">Tem certeza que deseja excluir este lead?</p>
              <p className="text-sm text-gray-600"><strong>{formData?.nome}</strong></p>
              <p className="text-sm text-red-600 mt-2">Esta ação não pode ser desfeita.</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!formData) return;
                  try {
                    await leadService.deleteLead(formData.id, currentUser);
                    setShowDeleteDialog(false);
                    setSuccessMessage('Lead excluído com sucesso!');
                    setShowSuccessModal(true);
                    setTimeout(() => {
                      onBack();
                      window.location.reload();
                    }, 1500);
                  } catch (error) {
                    console.error('Erro ao excluir lead:', error);
                    setErrorMessage('Erro ao excluir lead');
                    setShowErrorDialog(true);
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <ErrorDialog
        visible={showErrorDialog}
        onHide={() => setShowErrorDialog(false)}
        message={errorMessage}
      />

      {/* Notes Dialog */}
      <NotesDialog
        isOpen={notesDialog.isOpen}
        onClose={() => {
          setNotesDialog({ isOpen: false, loading: false });
          setEditNote(null);
        }}
        onSave={handleAddNote}
        loading={notesDialog.loading}
        editNote={editNote}
      />

      {/* View Note Dialog */}
      {viewNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Detalhes da Nota</h3>
              <button
                onClick={() => setViewNote(null)}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-sm font-bold px-3 py-1 rounded ${
                  viewNote.atividade === 'Apresentação' ? 'bg-purple-100 text-purple-700' :
                  viewNote.atividade === 'Ligação' ? 'bg-green-100 text-green-700' :
                  viewNote.atividade === 'Proposta' ? 'bg-blue-100 text-blue-700' :
                  viewNote.atividade === 'Reunião' ? 'bg-orange-100 text-orange-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>
                  {viewNote.atividade}
                </span>
                <span className="text-sm text-gray-600">
                  {new Date(viewNote.data + 'T' + viewNote.horario).toLocaleString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                {viewNote.duracao && (
                  <span className="text-sm text-gray-500">• {viewNote.duracao}</span>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Anotações:</h4>
                <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {viewNote.anotacoes}
                </p>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-sm text-gray-500">Por: {viewNote.user_name}</span>
                <span className="text-sm text-gray-500">
                  Criado em: {formatDateTime(viewNote.created_at)}
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setViewNote(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setEditNote(viewNote);
                  setViewNote(null);
                  setNotesDialog({ isOpen: true, loading: false });
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Dialog */}
      {showUnsavedDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Alterações Não Salvas</h3>
            </div>

            <div className="mb-6">
              <p className="text-gray-700">Você tem alterações não salvas. Deseja sair sem salvar?</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUnsavedDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowUnsavedDialog(false);
                  setHasChanges(false);
                  window.location.reload();
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
              >
                Sair Sem Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      <SystemModal
        isOpen={deleteDocDialog.visible}
        type="confirm"
        title="Excluir Documento"
        message={`Tem certeza que deseja excluir "${deleteDocDialog.name}"?`}
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={async () => {
          const { index, url } = deleteDocDialog;
          setDeleteDocDialog({ visible: false, index: -1, name: '', url: null });
          
          if (!formData) return;
          const novosDocumentos = formData.documentos.filter((_, idx) => idx !== index);
          
          if (url) {
            try {
              const bucketName = 'beneficiario-documentos';
              const urlParts = url.split(`/storage/v1/object/public/${bucketName}/`);
              if (urlParts.length > 1) {
                const filePath = decodeURIComponent(urlParts[1]);
                await supabase.storage.from(bucketName).remove([filePath]);
              }
            } catch (err) {
              console.error('Erro ao remover do storage:', err);
            }
          }
          
          await supabase
            .from('leads')
            .update({ documentos: novosDocumentos, updated_at: new Date().toISOString() })
            .eq('id', formData.id);
          
          setFormData(prev => prev ? { ...prev, documentos: novosDocumentos } : null);
          setOriginalData(prev => prev ? { ...prev, documentos: novosDocumentos } : null);
        }}
        onCancel={() => setDeleteDocDialog({ visible: false, index: -1, name: '', url: null })}
      />
    </div>
  );
};