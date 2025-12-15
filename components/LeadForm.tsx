import React, { useState, useEffect } from 'react';
import { Lead, KanbanStatus, User, Beneficiary, LeadMessage, ClientType } from '../types';
import { KANBAN_COLUMNS, PRODUCTS_LIST } from '../constants';
import { leadService } from '../services/leadService';
import { Save, ArrowLeft, Plus, Trash2, Send, Paperclip, Search, FileText, ChevronDown, Download } from 'lucide-react';

interface LeadFormProps {
  leadId: number;
  currentUser: User;
  onBack: () => void;
  onSave: (updatedLead: Lead) => void;
}

const Input = ({ label, value, onChange, placeholder = "", type = "text", className = "" }: any) => {
    const id = `input-${label.replace(/\s+/g, '-').toLowerCase()}`;
    return (
      <div className={`flex flex-col space-y-1 ${className}`}>
          <label htmlFor={id} className="text-xs font-bold text-slate-500 uppercase">{label}</label>
          <input 
            id={id}
            type={type} 
            value={value || ''} 
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder || `${label}...`}
            className="bg-white border border-slate-400 rounded p-2 text-slate-900 placeholder-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
      </div>
    );
  };

  const Select = ({ label, value, onChange, options }: any) => {
    const id = `select-${label.replace(/\s+/g, '-').toLowerCase()}`;
    return (
      <div className="flex flex-col space-y-1">
        <label htmlFor={id} className="text-xs font-bold text-slate-500 uppercase">{label}</label>
        <select 
          id={id}
          value={value || ''} 
          onChange={e => onChange(e.target.value)}
          className="bg-white border border-slate-400 rounded p-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
            <option value="">Selecione...</option>
            {options.map((opt: any) => (
                <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>
            ))}
        </select>
    </div>
    );
  };

  const SectionTitle = ({ children }: any) => (
      <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 mt-6">{children}</h3>
  );

export const LeadForm: React.FC<LeadFormProps> = ({ leadId, currentUser, onBack, onSave }) => {
  const [formData, setFormData] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'beneficiarios' | 'docs' | 'chat'>('info');
  const [newMessage, setNewMessage] = useState('');
  
  // Available products based on selected Operator
  const availableProducts = PRODUCTS_LIST.find(p => p.operadora === formData?.operadora)?.produtos || [];

  useEffect(() => {
    const loadLead = async () => {
        const data = await leadService.getLeadById(leadId);
        if (data) setFormData(data);
        setLoading(false);
    };
    loadLead();
  }, [leadId]);

  const handleChange = (field: keyof Lead, value: any) => {
    console.log('handleChange called with', field, value);
    if (!formData) return;
    setFormData({ ...formData, [field]: value });
  };

  const handleAddressChange = (field: string, value: string) => {
      if (!formData) return;
      setFormData({
          ...formData,
          endereco: { ...formData.endereco, [field]: value }
      });
  };

  const handleResponsibleChange = (field: string, value: string) => {
    if (!formData) return;
    setFormData({
        ...formData,
        dados_responsavel: { 
            nome: '', cpf: '', endereco: '', data_nascimento: '',
            ...formData.dados_responsavel, 
            [field]: value 
        }
    });
};

  const fetchCnpj = async () => {
      if (!formData?.cpf_cnpj) return;
      // Simulate API call
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

  const addBeneficiary = () => {
      if (!formData) return;
      const newBen: Beneficiary = {
          id: Math.random().toString(36).substr(2, 9),
          nome: "",
          data_nascimento: "",
          parentesco: "Titular",
          type: formData.tipo_cliente === 'PJ' ? 'TITULAR' : 'DEPENDENTE'
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

  const handleSendMessage = () => {
      if (!formData || !newMessage.trim()) return;
      const msg: LeadMessage = {
          id: Math.random().toString(36).substr(2, 9),
          user_name: currentUser.name,
          role: currentUser.role,
          message: newMessage,
          created_at: new Date().toISOString()
      };
      setFormData({ ...formData, mensagens: [...formData.mensagens, msg] });
      setNewMessage('');
  };

  const handleFileUpload = () => {
      // Mock file upload
      if (!formData) return;
      const mockFile = `Documento_${new Date().getTime()}.pdf`;
      setFormData({ ...formData, documentos: [...formData.documentos, mockFile] });
  };

  const handleDownload = (fileName: string) => {
    // Simulate file download
    const text = `Este é um arquivo simulado para: ${fileName}\n\nEm um ambiente real, este seria o download do arquivo armazenado no servidor/bucket.`;
    const blob = new Blob([text], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};

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

  if (loading || !formData) return <div className="p-8 text-center">Carregando formulário...</div>;

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
                    {/* Editable Name */}
                    <input 
                      value={formData.nome}
                      onChange={(e) => handleChange('nome', e.target.value)}
                      className="text-xl font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 transition-colors min-w-[200px]"
                      placeholder="Nome do Cliente"
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
                <p className="text-xs text-slate-500 px-1 mt-1">ID: {formData.id} | Vendedor: {formData.vendedor}</p>
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
                    {KANBAN_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
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
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 px-8">
          {[
              { id: 'info', label: 'Dados do Cliente' },
              { id: 'beneficiarios', label: `Beneficiários (${formData.beneficiarios.length})` },
              { id: 'docs', label: `Documentos (${formData.documentos.length})` },
              { id: 'chat', label: 'Mensagens / Validação' }
          ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                  {tab.label}
              </button>
          ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
          <div className="max-w-5xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            
            {/* TAB: INFO */}
            {activeTab === 'info' && (
                <div className="space-y-6 animate-fade-in">
                    
                    {/* PJ Specifics */}
                    {formData.tipo_cliente === 'PJ' && (
                        <>
                            <SectionTitle>Dados da Empresa (PJ)</SectionTitle>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="flex items-end gap-2">
                                    <Input label="CNPJ" value={formData.cpf_cnpj} onChange={(v: string) => handleChange('cpf_cnpj', v)} className="flex-1" />
                                </div>
                                <Input label="Razão Social" value={formData.nome} onChange={(v: string) => handleChange('nome', v)} className="md:col-span-2" />
                            </div>

                            <SectionTitle>Dados do Responsável</SectionTitle>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input label="Nome Completo" value={formData.dados_responsavel?.nome} onChange={(v: string) => handleResponsibleChange('nome', v)} />
                                <Input label="CPF" value={formData.dados_responsavel?.cpf} onChange={(v: string) => handleResponsibleChange('cpf', v)} />
                                <Input label="Endereço Residencial" value={formData.dados_responsavel?.endereco} onChange={(v: string) => handleResponsibleChange('endereco', v)} className="md:col-span-2" />
                            </div>
                        </>
                    )}

                    {/* PF / ADESAO Specifics */}
                    {(formData.tipo_cliente === 'PF' || formData.tipo_cliente === 'ADESAO') && (
                        <>
                            <SectionTitle>Dados do Titular ({formData.tipo_cliente})</SectionTitle>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input label="Nome Completo" value={formData.nome} onChange={(v: string) => handleChange('nome', v)} />
                                <Input label="CPF" value={formData.cpf_cnpj} onChange={(v: string) => handleChange('cpf_cnpj', v)} />
                                <Input label="Data de Nascimento" type="date" value={formData.data_nascimento_abertura} onChange={(v: string) => handleChange('data_nascimento_abertura', v)} />
                                <Input label="RG / Org. Emissor" value={formData.rg_ie} onChange={(v: string) => handleChange('rg_ie', v)} />
                            </div>
                        </>
                    )}

                    {/* Common Contact & Address */}
                    <SectionTitle>Contato e Endereço</SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Input label="E-mail" value={formData.email} onChange={(v: string) => handleChange('email', v)} type="email" />
                        <Input label="Telefone / WhatsApp" value={formData.telefone} onChange={(v: string) => handleChange('telefone', v)} />
                        <Input label="CEP" value={formData.endereco.cep} onChange={(v: string) => handleAddressChange('cep', v)} />
                        <Input label="Logradouro" value={formData.endereco.logradouro} onChange={(v: string) => handleAddressChange('logradouro', v)} className="md:col-span-2" />
                        <Input label="Número" value={formData.endereco.numero} onChange={(v: string) => handleAddressChange('numero', v)} />
                        <Input label="Bairro" value={formData.endereco.bairro} onChange={(v: string) => handleAddressChange('bairro', v)} />
                        <Input label="Cidade" value={formData.endereco.cidade} onChange={(v: string) => handleAddressChange('cidade', v)} />
                        <Input label="UF" value={formData.endereco.uf} onChange={(v: string) => handleAddressChange('uf', v)} />
                    </div>

                    {/* Product Info */}
                    <SectionTitle>Dados do Produto</SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Select 
                            label="Operadora" 
                            value={formData.operadora} 
                            options={PRODUCTS_LIST.map(p => p.operadora)}
                            onChange={(v: string) => handleChange('operadora', v)} 
                        />
                        <Input
                            label="Produto Contratado"
                            value={formData.produto}
                            onChange={(v: string) => handleChange('produto', v)}
                            placeholder="Digite o nome do produto"
                        />
                        <Input label="Valor (R$)" type="number" value={formData.valor_produto} onChange={(v: string) => handleChange('valor_produto', v)} />
                        
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
                        
                        <Input label="Vigência Prevista" type="date" value={formData.vigencia} onChange={(v: string) => handleChange('vigencia', v)} />
                    </div>
                </div>
            )}

            {/* TAB: BENEFICIARIOS */}
            {activeTab === 'beneficiarios' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-800">Lista de Vidas</h3>
                        <button onClick={addBeneficiary} className="flex items-center text-sm bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold hover:bg-blue-200">
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
                                    <button onClick={() => removeBeneficiary(ben.id)} className="text-red-500 hover:text-red-700" aria-label="Remover beneficiário">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="md:col-span-2">
                                        <Input label="Nome Completo" value={ben.nome} onChange={(v: string) => updateBeneficiary(ben.id, 'nome', v)} className="bg-white" />
                                    </div>
                                    <Select 
                                        label="Tipo" 
                                        value={ben.type} 
                                        options={['TITULAR', 'DEPENDENTE']}
                                        onChange={(v: any) => updateBeneficiary(ben.id, 'type', v)} 
                                    />
                                    <Input label="Data Nascimento" type="date" value={ben.data_nascimento} onChange={(v: string) => updateBeneficiary(ben.id, 'data_nascimento', v)} />
                                    
                                    <Input label="CPF" value={ben.cpf} onChange={(v: string) => updateBeneficiary(ben.id, 'cpf', v)} />
                                    <Input label="Parentesco" value={ben.parentesco} onChange={(v: string) => updateBeneficiary(ben.id, 'parentesco', v)} />
                                    <Input label="E-mail" value={ben.email} onChange={(v: string) => updateBeneficiary(ben.id, 'email', v)} />
                                    <Input label="Telefone" value={ben.telefone} onChange={(v: string) => updateBeneficiary(ben.id, 'telefone', v)} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB: DOCUMENTS */}
            {activeTab === 'docs' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer" onClick={handleFileUpload}>
                        <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                            <Paperclip className="w-8 h-8 text-blue-500" />
                        </div>
                        <h4 className="font-bold text-slate-700">Clique para enviar documentos</h4>
                        <p className="text-sm text-slate-500 max-w-sm mt-2">
                            Faça o upload de RGs, CNH, Contrato Social, Cartão CNPJ e Comprovantes de Endereço.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold text-slate-700 mb-4">Arquivos Anexados</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {formData.documentos.map((doc, i) => (
                                <div key={i} className="flex flex-col items-center p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow relative group">
                                    <FileText className="w-10 h-10 text-slate-400 mb-2" />
                                    <span className="text-xs font-medium text-slate-700 truncate w-full text-center" title={doc}>{doc}</span>
                                    <span className="text-[10px] text-slate-400 mb-3">Documento PDF</span>
                                    
                                    <button 
                                        onClick={() => handleDownload(doc)}
                                        className="flex items-center justify-center w-full text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 py-2 rounded transition-colors"
                                    >
                                        <Download className="w-3 h-3 mr-1.5" />
                                        Baixar
                                    </button>
                                </div>
                            ))}
                             {formData.documentos.length === 0 && (
                                <p className="text-slate-500 text-sm col-span-full">Nenhum documento anexado ainda.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: CHAT */}
            {activeTab === 'chat' && (
                <div className="space-y-6 animate-fade-in flex flex-col h-[600px]">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                        <p className="text-sm text-blue-800">
                            <strong>Área de Validação:</strong> Utilize este espaço para comunicação entre Vendedor e Administrativo sobre pendências de documentos ou dados faltantes.
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200 custom-scrollbar">
                        {formData.mensagens.length === 0 && (
                            <p className="text-center text-slate-400 text-sm italic mt-10">Nenhuma mensagem registrada.</p>
                        )}
                        {formData.mensagens.map(msg => (
                            <div key={msg.id} className={`flex flex-col ${msg.role === currentUser.role ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl p-4 ${
                                    msg.role === 'ADMIN' ? 'bg-amber-100 text-amber-900 rounded-tl-none' : 'bg-blue-100 text-blue-900 rounded-tr-none'
                                }`}>
                                    <p className="text-xs font-bold mb-1 opacity-70">{msg.user_name} ({msg.role})</p>
                                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                </div>
                                <span className="text-[10px] text-slate-400 mt-1 px-2">
                                    {new Date(msg.created_at).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <input 
                            type="text" 
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Digite uma mensagem ou observação..."
                            className="flex-1 bg-white border border-slate-300 rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button 
                            onClick={handleSendMessage}
                            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors shadow-lg"
                            aria-label="Enviar mensagem"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

          </div>
      </div>
    </div>
  );
};