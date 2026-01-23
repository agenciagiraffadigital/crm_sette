import React, { useState, useEffect } from 'react';
import { Lead, User, Beneficiary } from '../types';
import { KANBAN_COLUMNS, OPPORTUNITY_COLUMNS } from '../constants';
import { leadService } from '../services/leadService';
import { authService } from '../services/authService';
import { ArrowLeft, Save, User as UserIcon, Mail, Phone, MapPin, Package, DollarSign, Edit3, Users, FileText, Plus, Trash2, Paperclip } from 'lucide-react';
import { maskPhone, maskCPFOrCNPJ, unmask } from '../utils/masks';

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
  const [activeTab, setActiveTab] = useState<'info' | 'beneficiarios' | 'docs'>('info');
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [sellers, setSellers] = useState<User[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Determine which status columns to use
  const isOpportunity = formData && ['OPORTUNIDADES', 'EM_CONTATO', 'NEGOCIACAO'].includes(formData.status_kanban);
  const statusColumns = isOpportunity ? OPPORTUNITY_COLUMNS : KANBAN_COLUMNS;
  const canChangeSeller = isOpportunity; // Só pode trocar vendedor em oportunidades

  useEffect(() => {
    const loadLead = async () => {
      try {
        const data = await leadService.getLeadById(leadId);
        if (data) setFormData(data);
      } catch (error) {
        console.error('Erro ao carregar lead:', error);
      }
      setLoading(false);
    };
    loadLead();
  }, [leadId]);

  const handleChange = (field: keyof Lead, value: any) => {
    if (!formData) return;
    const cleanValue = (field === 'telefone' || field === 'cpf_cnpj') ? unmask(value) : value;
    setFormData({ ...formData, [field]: cleanValue });
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
      alert('Erro ao carregar lista de vendedores');
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
      alert('Erro ao alterar vendedor');
    }
  };

  const handleSubmit = async () => {
    if (!formData) return;
    setSaving(true);
    try {
      // Check if we should auto-advance status based on filled fields
      let updatedFormData = { ...formData };
      
      // If it's an opportunity in EM_CONTATO and valor_produto is filled, advance to NEGOCIACAO
      if (formData.status_kanban === 'EM_CONTATO' && formData.valor_produto && !isNaN(Number(formData.valor_produto))) {
        updatedFormData.status_kanban = 'NEGOCIACAO';
      }
      
      const updated = await leadService.saveLead(updatedFormData);
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
      <div className="bg-gray-50 min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Content */}
      <div className="max-w-6xl mx-auto p-6">
        {/* Header do Formulário */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{formData.nome}</h1>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">ID: #{formData.id}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                      Vendedor: {formData.vendedor}
                    </span>
                    {currentUser.role === 'ADMIN' && canChangeSeller && (
                      <button
                        onClick={handleOpenSellerModal}
                        className="p-1.5 hover:bg-blue-50 rounded-md transition-colors border border-gray-200"
                        title="Alterar vendedor"
                      >
                        <Edit3 className="w-3 h-3 text-gray-500 hover:text-blue-600" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-end gap-4">
              <div className="min-w-[200px]">
                <Select
                  label="Status"
                  value={formData.status_kanban}
                  onChange={(value) => handleChange('status_kanban', value)}
                  options={statusColumns.map(col => ({ value: col.id, label: col.label }))}
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 h-[42px]"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {[
            { id: 'info', label: 'Informações', icon: UserIcon },
            { id: 'beneficiarios', label: `Beneficiários (${formData.beneficiarios.length})`, icon: Users },
            { id: 'docs', label: `Documentos (${formData.documentos.length})`, icon: FileText }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
              options={['PF', 'PJ', 'ADESAO']}
            />
          </div>
        </Card>

        {/* Address */}
        <Card title="Endereço" icon={MapPin}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="CEP"
              value={formData.endereco?.cep || ''}
              onChange={(value) => handleAddressChange('cep', value)}
            />
            <Input
              label="Logradouro"
              value={formData.endereco?.logradouro || ''}
              onChange={(value) => handleAddressChange('logradouro', value)}
              className="lg:col-span-2"
            />
            <Input
              label="Número"
              value={formData.endereco?.numero || ''}
              onChange={(value) => handleAddressChange('numero', value)}
            />
            <Input
              label="Bairro"
              value={formData.endereco?.bairro || ''}
              onChange={(value) => handleAddressChange('bairro', value)}
            />
            <Input
              label="Cidade"
              value={formData.endereco?.cidade || ''}
              onChange={(value) => handleAddressChange('cidade', value)}
            />
            <Input
              label="UF"
              value={formData.endereco?.uf || ''}
              onChange={(value) => handleAddressChange('uf', value)}
            />
          </div>
        </Card>

        {/* Product Info */}
        <Card title="Produto" icon={Package}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Operadora"
              value={formData.operadora}
              onChange={(value) => handleChange('operadora', value)}
            />
            <Input
              label="Produto"
              value={formData.produto}
              onChange={(value) => handleChange('produto', value)}
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
    </div>
  );
};