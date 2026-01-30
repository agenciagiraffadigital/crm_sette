import React, { useState, useEffect } from 'react';
import { Lead, User, Beneficiary, Note } from '../types';
import { KANBAN_COLUMNS, OPPORTUNITY_COLUMNS } from '../constants';
import { leadService } from '../services/leadService';
import { authService } from '../services/authService';
import { operadoraService, Operadora, Produto } from '../services/operadoraService';
import { ArrowLeft, Save, User as UserIcon, Mail, Phone, MapPin, Package, DollarSign, Edit3, Users, FileText, Plus, Trash2, Paperclip, MoreVertical, Trophy, XCircle, MessageCircle, UserPlus, Trash, RefreshCw, TrendingUp, AlertCircle, MessageSquare, X } from 'lucide-react';
import { maskPhone, maskCPFOrCNPJ, unmask } from '../utils/masks';
import { maskCEP } from '../utils/cepMask';
import { formatStatus, formatDateTime } from '../utils/formatters';
import { WhatsAppModal } from './WhatsAppModal';
import { WinDialog } from './WinDialog';
import { LostDialog } from './LostDialog';
import { ErrorDialog } from './ErrorDialog';
import { NotesDialog } from './NotesDialog';

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
}) => (
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
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
    />
  </div>
);

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
}) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4" />}
      {label}
      {required && <span className="text-red-500">*</span>}
    </label>
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
    >
      <option value="">Selecione...</option>
      {options.map((opt: any) => (
        <option key={opt.value || opt} value={opt.value || opt}>
          {opt.label || opt}
        </option>
      ))}
    </select>
  </div>
);

const Card = ({ title, children, icon: Icon }: {
  title: string;
  children: React.ReactNode;
  icon?: React.ComponentType<any>;
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
      {Icon && <Icon className="w-5 h-5 text-blue-600" />}
      {title}
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
  
  // Notes state
  const [notesDialog, setNotesDialog] = useState({ isOpen: false, loading: false });
  const [notes, setNotes] = useState<Note[]>([]);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [viewNote, setViewNote] = useState<Note | null>(null);

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

  // Determine which status columns to use
  const isOpportunity = formData && ['OPORTUNIDADES', 'EM_CONTATO', 'NEGOCIACAO'].includes(formData.status_kanban);
  const statusColumns = isOpportunity ? OPPORTUNITY_COLUMNS : KANBAN_COLUMNS;
  const canChangeSeller = isOpportunity; // Só pode trocar vendedor em oportunidades

  useEffect(() => {
    const loadLead = async () => {
      try {
        const data = await leadService.getLeadById(leadId);
        if (data) setFormData(data);
        
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
      parentesco: "Titular",
      type: 'DEPENDENTE'
    };
    setFormData({ ...formData, beneficiarios: [...formData.beneficiarios, newBen] });
  };

  const updateBeneficiary = (id: string, field: keyof Beneficiary, value: string) => {
    if (!formData) return;
    const updated = formData.beneficiarios.map(b => b.id === id ? { ...b, [field]: value } : b);
    setFormData({ ...formData, beneficiarios: updated });
  };

  const removeBeneficiary = (id: string) => {
    if (!formData) return;
    setFormData({ ...formData, beneficiarios: formData.beneficiarios.filter(b => b.id !== id) });
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
      
      onSave(updated);
    } catch (e) {
      console.error('Erro completo:', e);
      setErrorMessage('Erro ao salvar lead');
      setShowErrorDialog(true);
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
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-8 py-6">
          <div className="flex items-start justify-between gap-6">
            {/* Left */}
            <div className="flex items-start gap-4">
              <button
                onClick={onBack}
                className="mt-1 p-2 hover:bg-slate-100 rounded-lg transition-colors"
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
              <select
                value={formData.status_kanban}
                onChange={(e) => handleChange('status_kanban', e.target.value)}
                className="min-w-[200px] px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium text-slate-700"
              >
                {statusColumns.map(col => (
                  <option key={col.id} value={col.id}>{col.label}</option>
                ))}
              </select>

              <div className="relative actions-menu-container">
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
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
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
                <Save className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-slate-50 min-h-screen">
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
            <Select
              label="Tipo de Cliente"
              value={formData.tipo_cliente}
              onChange={(value) => handleChange('tipo_cliente', value)}
              options={['PF', 'PME', 'ADESAO']}
            />
          </div>
        </Card>

        {/* Address */}
        <Card title="Endereço" icon={MapPin}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="CEP"
              value={maskCEP(formData.cep || '')}
              onChange={(value) => handleChange('cep', value)}
              mask={maskCEP}
              placeholder="00000-000"
            />
            <Input
              label="Logradouro"
              value={formData.logradouro || ''}
              onChange={(value) => handleChange('logradouro', value)}
              className="lg:col-span-2"
            />
            <Input
              label="Número"
              value={formData.numero || ''}
              onChange={(value) => handleChange('numero', value)}
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
            />
          </div>
        </Card>

        {/* Product Info */}
        <Card title="Produto" icon={Package}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select
              label="Operadora"
              value={formData.operadora}
              onChange={(value) => {
                handleChange('operadora', value);
                handleChange('produto', ''); // Reset produto when operadora changes
              }}
              options={operadoras.map(op => op.nome)}
              required
            />
            <Select
              label="Produto"
              value={formData.produto}
              onChange={(value) => handleChange('produto', value)}
              options={produtos.map(p => p.nome)}
              required
            />
            <Input
              label="Valor (R$)"
              value={formData.valor_produto}
              onChange={(value) => handleChange('valor_produto', value)}
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
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Lista de Vidas
              </h3>
              <button 
                onClick={addBeneficiary} 
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Adicionar Vida
              </button>
            </div>

            <div className="space-y-4">
              {formData.beneficiarios.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum beneficiário cadastrado.</p>
                </div>
              )}
              {formData.beneficiarios.map((ben) => (
                <div key={ben.id} className="bg-white border border-gray-200 rounded-lg p-4 relative group">
                  <button 
                    onClick={() => removeBeneficiary(ben.id)} 
                    className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-12">
                    <Input 
                      label="Nome Completo" 
                      value={ben.nome} 
                      onChange={(v) => updateBeneficiary(ben.id, 'nome', v)} 
                      required
                    />
                    <Input 
                      label="Data Nascimento" 
                      type="date" 
                      value={ben.data_nascimento} 
                      onChange={(v) => updateBeneficiary(ben.id, 'data_nascimento', v)} 
                      required
                    />
                    <Input 
                      label="Parentesco" 
                      value={ben.parentesco} 
                      onChange={(v) => updateBeneficiary(ben.id, 'parentesco', v)} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documentos Tab */}
        {activeTab === 'docs' && (
          <div className="space-y-6">
            <label className="block">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer">
                <div className="bg-white p-4 rounded-full shadow-sm mb-4 w-16 h-16 mx-auto flex items-center justify-center">
                  <Paperclip className="w-8 h-8 text-blue-500" />
                </div>
                <h4 className="font-semibold text-gray-700 mb-2">Clique para enviar documentos</h4>
                <p className="text-sm text-gray-500">Aceita: PDF, PNG e JPEG (máx. 10MB)</p>
              </div>
              <input 
                type="file" 
                accept=".pdf,.png,.jpg,.jpeg" 
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    // Simular upload - adicionar arquivo à lista
                    const newDoc = { name: file.name, url: URL.createObjectURL(file) };
                    setFormData(prev => prev ? {
                      ...prev,
                      documentos: [...prev.documentos, newDoc]
                    } : null);
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
                {formData.documentos.map((doc, i) => (
                  <div key={i} className="flex flex-col items-center p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <FileText className="w-10 h-10 text-gray-400 mb-2" />
                    <span className="text-xs font-medium text-gray-700 truncate w-full text-center" title={typeof doc === 'string' ? doc : doc.name}>
                      {typeof doc === 'string' ? doc : doc.name}
                    </span>
                    <span className="text-[10px] text-gray-400 mb-3">Documento</span>
                  </div>
                ))}
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
                  Criado em: {new Date(viewNote.created_at).toLocaleString('pt-BR')}
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
    </div>
  );
};