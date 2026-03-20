import React, { useState, useMemo, useCallback } from 'react';
import { Opportunity, OpportunityStatus, User, LossReason } from '../types';
import { OpportunityCard } from './OpportunityCard';
import { OpportunityForm } from './OpportunityForm';
import { NewOpportunityForm } from './NewOpportunityForm';
import { SearchAndFilters, FilterState, SavedFilter, defaultFilters } from './SearchAndFilters';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { ErrorDialog } from './ErrorDialog';
import { OPPORTUNITY_COLUMNS } from '../constants';
import { Button } from '../src/components/ui/Button';
import { Input } from '../src/components/ui/Input';
import { Select } from '../src/components/ui/Select';
import { Card } from '../src/components/ui/Card';
import { opportunityService, OpportunityQueryFilters } from '../services/opportunityService';
import { leadService } from '../services/leadService';
import { authService } from '../services/authService';
import { supabase } from '../services/supabaseClient';
import { getEnvironment } from '../utils/environment';
import { exportToExcel } from '../utils/exportToExcel';
import { Dialog } from 'primereact/dialog';
import { Plus, Download } from 'lucide-react';

interface OpportunityFilters {
  search?: string;
  seller?: string;
  origem?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

interface OpportunitiesBoardProps {
  opportunities: Opportunity[];
  onMoveOpportunity: (id: number, status: OpportunityStatus, additionalData?: { quoted_value?: number }) => void;
  onOpenOpportunity: (opportunity: Opportunity) => void;
  filters: OpportunityFilters;
  onFiltersChange: (filters: OpportunityFilters) => void;
  currentUser: User;
  onDataChange?: () => void;
  showNewOpportunityForm?: boolean;
  onShowNewOpportunityForm?: (show: boolean) => void;
  searchFilters: FilterState;
  onSearchFiltersChange: (filters: FilterState) => void;
}

interface ValueInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: number) => void;
  opportunityName: string;
}

const ValueInputModal: React.FC<ValueInputModalProps> = ({ isOpen, onClose, onSubmit, opportunityName }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numValue = parseFloat(value);
    
    if (isNaN(numValue) || numValue <= 0) {
      setError('Por favor, insira um valor válido maior que zero');
      return;
    }
    
    onSubmit(numValue);
    setValue('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card variant="elevated" padding="lg" className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <h3 className="text-lg font-semibold mb-4">
            Valor do Produto - {opportunityName}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Para avançar para NEGOCIAÇÃO, é necessário informar o valor do produto para o cliente.
          </p>
          <Input
            label="Valor do Produto (R$)"
            type="number"
            step="0.01"
            min="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            error={error}
            required
            autoFocus
          />
          <div className="flex gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              Confirmar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

interface LossModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (lossReason: LossReason) => void;
  opportunityName: string;
}

const LossModal: React.FC<LossModalProps> = ({ isOpen, onClose, onSubmit, opportunityName }) => {
  const [category, setCategory] = useState<LossReason['category']>('OUTROS');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      category,
      description: description.trim() || undefined
    });
    setCategory('OUTROS');
    setDescription('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card variant="elevated" padding="lg" className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <h3 className="text-lg font-semibold mb-4">
            Marcar como Perdida - {opportunityName}
          </h3>
          <Select
            label="Motivo da Perda"
            value={category}
            onChange={(e) => setCategory(e.target.value as LossReason['category'])}
            options={[
              { value: 'PREÇO', label: 'Preço' },
              { value: 'CONCORRÊNCIA', label: 'Concorrência' },
              { value: 'TIMING', label: 'Timing' },
              { value: 'NECESSIDADE', label: 'Necessidade' },
              { value: 'OUTROS', label: 'Outros' }
            ]}
            required
          />
          <Input
            label="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            helper="Descreva mais detalhes sobre o motivo da perda"
            className="mt-4"
          />
          <div className="flex gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" variant="danger" className="flex-1">
              Marcar como Perdida
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export const OpportunitiesBoard: React.FC<OpportunitiesBoardProps> = ({
  opportunities,
  onMoveOpportunity,
  onOpenOpportunity,
  filters,
  onFiltersChange,
  currentUser,
  onDataChange,
  showNewOpportunityForm = false,
  onShowNewOpportunityForm,
  searchFilters,
  onSearchFiltersChange
}) => {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  const PAGE_SIZE = 30;
  const [columnData, setColumnData] = useState<Record<OpportunityStatus, Opportunity[]>>({
    'OPORTUNIDADES': [],
    'EM_CONTATO': [],
    'NEGOCIACAO': []
  });
  const [columnCounts, setColumnCounts] = useState<Record<OpportunityStatus, number>>({
    'OPORTUNIDADES': 0,
    'EM_CONTATO': 0,
    'NEGOCIACAO': 0
  });
  const [columnPages, setColumnPages] = useState<Record<OpportunityStatus, number>>({
    'OPORTUNIDADES': 0,
    'EM_CONTATO': 0,
    'NEGOCIACAO': 0
  });
  const [columnLoading, setColumnLoading] = useState<Record<OpportunityStatus, boolean>>({
    'OPORTUNIDADES': false,
    'EM_CONTATO': false,
    'NEGOCIACAO': false
  });

  const loadColumn = React.useCallback(async (status: OpportunityStatus, page: number, filtersOverride?: OpportunityQueryFilters) => {
    setColumnLoading(prev => ({ ...prev, [status]: true }));
    try {
      const from = page * PAGE_SIZE;
      const { data, count } = await opportunityService.getOpportunitiesByStatus(currentUser, status, from, from + PAGE_SIZE - 1, filtersOverride);
      setColumnData(prev => ({ ...prev, [status]: page === 0 ? data : [...prev[status], ...data] }));
      setColumnCounts(prev => ({ ...prev, [status]: count }));
      setColumnPages(prev => ({ ...prev, [status]: page }));
    } finally {
      setColumnLoading(prev => ({ ...prev, [status]: false }));
    }
  }, [currentUser]);

  // Convert searchFilters to server query filters
  const buildQueryFilters = React.useCallback((): OpportunityQueryFilters | undefined => {
    const hasActive = searchFilters.searchTerm || searchFilters.sellers.length || searchFilters.operators.length || (searchFilters.products?.length) || searchFilters.source.length || searchFilters.dateRange.start || searchFilters.dateRange.end || (searchFilters.sortBy && searchFilters.sortBy !== 'date-desc');
    if (!hasActive) return undefined;
    return {
      searchTerm: searchFilters.searchTerm || undefined,
      sellers: searchFilters.sellers.length ? searchFilters.sellers : undefined,
      operators: searchFilters.operators.length ? searchFilters.operators : undefined,
      products: searchFilters.products?.length ? searchFilters.products : undefined,
      sources: searchFilters.source.length ? searchFilters.source : undefined,
      dateRange: (searchFilters.dateRange.start || searchFilters.dateRange.end) ? searchFilters.dateRange : undefined,
      sortBy: searchFilters.sortBy || undefined,
    };
  }, [searchFilters]);

  // Single effect: reload all columns on mount AND whenever filters change
  React.useEffect(() => {
    const qf = buildQueryFilters();
    const statuses: OpportunityStatus[] = ['OPORTUNIDADES', 'EM_CONTATO', 'NEGOCIACAO'];
    statuses.forEach(s => loadColumn(s, 0, qf));
  }, [searchFilters]); // eslint-disable-line react-hooks/exhaustive-deps

  const [limits, setLimits] = useState<Record<OpportunityStatus, number>>({
    'OPORTUNIDADES': 30,
    'EM_CONTATO': 30,
    'NEGOCIACAO': 30
  });
  
  const [statusCounts, setStatusCounts] = useState<Record<OpportunityStatus, number>>({} as Record<OpportunityStatus, number>);
  
  const [valueModalState, setValueModalState] = useState<{
    isOpen: boolean;
    opportunityId: number | null;
    opportunityName: string;
  }>({
    isOpen: false,
    opportunityId: null,
    opportunityName: ''
  });
  
  const [lossModalState, setLossModalState] = useState<{
    isOpen: boolean;
    opportunityId: number | null;
    opportunityName: string;
  }>({
    isOpen: false,
    opportunityId: null,
    opportunityName: ''
  });

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    opportunityId: number | null;
    opportunityName: string;
  }>({
    isOpen: false,
    opportunityId: null,
    opportunityName: ''
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorDialogMessage, setErrorDialogMessage] = useState('');
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const qf = buildQueryFilters();
      const rows = await opportunityService.getOpportunitiesForExport(currentUser, qf);
      if (rows.length === 0) {
        setErrorDialogMessage('Nenhum dado encontrado para exportar.');
        setShowErrorDialog(true);
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      exportToExcel(rows, `oportunidades_${today}`);
    } catch (error) {
      setErrorDialogMessage('Erro ao exportar: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
      setShowErrorDialog(true);
    } finally {
      setExporting(false);
    }
  };

  // Auto-hide success toast
  React.useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);
  
  // Auto-hide error toast
  React.useEffect(() => {
    if (showErrorToast) {
      const timer = setTimeout(() => setShowErrorToast(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showErrorToast]);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newOppStep, setNewOppStep] = useState(1);
  const [newOppData, setNewOppData] = useState({
    nome: '',
    email: '',
    telefone: '',
    tipo_cliente: '',
    origem: '',
    vendedor_id: currentUser.id,
    notes: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: ''
  });
  const [newOppErrors, setNewOppErrors] = useState<Record<string, string>>({});
  const [sellers, setSellers] = useState<User[]>([]);
  const [loadingCep, setLoadingCep] = useState(false);

  const origemOptions = [
    'Plantão de Vendas',
    'NetWorking',
    'Diretoria',
    'JustSell',
    'Indicação (clientes)'
  ];

  // Extract filter options from opportunities
  const { filterSellers, sourceOptions, statusOptions, operatorOptions, productOptions } = useMemo(() => {
    const allSellers = new Set<string>();
    const allSources = new Set<string>();
    const allOperators = new Set<string>();
    const allProducts = new Set<string>();
    
    opportunities.forEach(opportunity => {
      if (opportunity.vendedor) allSellers.add(opportunity.vendedor);
      if (opportunity.origem) allSources.add(opportunity.origem);
      if (opportunity.operadora) allOperators.add(opportunity.operadora);
      if (opportunity.produto) allProducts.add(opportunity.produto);
    });

    return {
      filterSellers: Array.from(allSellers),
      sourceOptions: Array.from(allSources),
      statusOptions: OPPORTUNITY_COLUMNS.map(col => col.id),
      operatorOptions: Array.from(allOperators),
      productOptions: Array.from(allProducts)
    };
  }, [opportunities]);

  // Group opportunities by status directly from server-filtered data
  const opportunitiesByStatus = useMemo(() => {
    return {
      'OPORTUNIDADES': columnData['OPORTUNIDADES'],
      'EM_CONTATO': columnData['EM_CONTATO'],
      'NEGOCIACAO': columnData['NEGOCIACAO']
    };
  }, [columnData]);

  // Use server counts directly (already filtered)
  React.useEffect(() => {
    const counts: Record<OpportunityStatus, number> = {} as Record<OpportunityStatus, number>;
    OPPORTUNITY_COLUMNS.forEach(column => {
      counts[column.id as OpportunityStatus] = columnCounts[column.id as OpportunityStatus] || 0;
    });
    setStatusCounts(counts);
  }, [columnCounts]);

  const reloadAllColumns = React.useCallback(() => {
    const qf = buildQueryFilters();
    const statuses: OpportunityStatus[] = ['OPORTUNIDADES', 'EM_CONTATO', 'NEGOCIACAO'];
    statuses.forEach(s => loadColumn(s, 0, qf));
    onDataChange?.();
  }, [loadColumn, onDataChange, buildQueryFilters]);

  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    onSearchFiltersChange(newFilters);
  }, [onSearchFiltersChange]);

  const handleSaveFilter = useCallback((name: string, filterState: FilterState) => {
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name,
      filters: filterState,
      createdAt: new Date().toISOString()
    };
    setSavedFilters(prev => [...prev, newFilter]);
  }, []);

  const handleLoadFilter = useCallback((savedFilter: SavedFilter) => {
    onSearchFiltersChange(savedFilter.filters);
  }, [onSearchFiltersChange]);

  const handleDeleteFilter = useCallback((filterId: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== filterId));
  }, []);

  const handleMoveOpportunity = async (opportunityId: number, targetStatus: OpportunityStatus) => {
    const opportunity = [...columnData['OPORTUNIDADES'], ...columnData['EM_CONTATO'], ...columnData['NEGOCIACAO']].find(o => o.id === opportunityId);
    if (!opportunity) return;

    if (targetStatus === 'NEGOCIACAO' && !opportunity.quoted_value) {
      setValueModalState({ isOpen: true, opportunityId, opportunityName: opportunity.nome });
      return;
    }

    try {
      await onMoveOpportunity(opportunityId, targetStatus);
      reloadAllColumns();
    } catch (error) {
      console.error('Error moving opportunity:', error);
    }
  };

  const handleValueSubmit = (value: number) => {
    if (valueModalState.opportunityId) {
      onMoveOpportunity(valueModalState.opportunityId, 'NEGOCIACAO', { quoted_value: value })
        .then(() => reloadAllColumns());
    }
  };

  const handleMarkAsLost = (opportunityId: number) => {
    const opportunity = opportunities.find(o => o.id === opportunityId);
    if (!opportunity) return;

    setLossModalState({
      isOpen: true,
      opportunityId,
      opportunityName: opportunity.nome
    });
  };

  const handleLossSubmit = async (lossReason: LossReason) => {
    if (lossModalState.opportunityId) {
      try {
        await opportunityService.markOpportunityAsLost(
          lossModalState.opportunityId,
          lossReason,
          currentUser
        );
        reloadAllColumns();
      } catch (error) {
        setErrorDialogMessage('Erro ao marcar como perdida: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
        setShowErrorDialog(true);
      }
    }
  };

  const handleConvertToProposal = async (opportunityId: number) => {
    try {
      await opportunityService.convertOpportunityToProposal(opportunityId, currentUser);
      reloadAllColumns();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setErrorDialogMessage('Erro na conversão: ' + errorMessage);
      setShowErrorDialog(true);
    }
  };

  const handleDeleteOpportunity = (opportunityId: number) => {
    const opportunity = opportunities.find(o => o.id === opportunityId);
    if (!opportunity) return;

    setDeleteModalState({
      isOpen: true,
      opportunityId,
      opportunityName: opportunity.nome
    });
  };

  const handleConfirmDelete = async () => {
    if (deleteModalState.opportunityId) {
      try {
        await opportunityService.deleteOpportunity(deleteModalState.opportunityId, currentUser);
        setDeleteModalState({ isOpen: false, opportunityId: null, opportunityName: '' });
        reloadAllColumns();
      } catch (error) {
        setErrorDialogMessage('Erro ao excluir: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
        setShowErrorDialog(true);
      }
    }
  };

  const handleCreateNewOpportunity = async (opportunityData: {
    nome: string;
    email: string;
    telefone: string;
    origem: string;
    vendedor_id: number;
    vendedor: string;
    vendedor_email: string;
    status: OpportunityStatus;
    notes?: string;
  }) => {
    try {
      const newOpp = await opportunityService.createOpportunityManually(opportunityData);
      
      // Registrar log de criação
      await leadService.addActivityLog(newOpp.id, {
        tipo: 'CRIACAO',
        descricao: `Oportunidade criada - Origem: ${opportunityData.origem}`,
        usuario_id: currentUser.id,
        usuario_nome: currentUser.name
      });
      
      setSuccessMessage('Oportunidade criada com sucesso!');
      setShowSuccess(true);
      setTimeout(() => {
        onShowNewOpportunityForm?.(false);
        reloadAllColumns();
      }, 2000);
    } catch (error) {
      console.error('Erro completo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setErrorDialogMessage('Erro ao criar oportunidade: ' + errorMessage);
      setShowErrorDialog(true);
    }
  };

  const handleCepChange = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    setNewOppData({...newOppData, cep: cleanCep});
    
    if (cleanCep.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setNewOppData(prev => ({
            ...prev,
            logradouro: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            estado: data.uf || ''
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleSubmitNewOpp = async () => {
    const errors: Record<string, string> = {};
    
    if (!newOppData.nome) errors.nome = 'Campo obrigatório';
    if (!newOppData.telefone) errors.telefone = 'Campo obrigatório';
    
    if (Object.keys(errors).length > 0) {
      setNewOppErrors(errors);
      setShowErrorToast(true);
      return;
    }
    
    const seller = sellers.find(s => s.id === newOppData.vendedor_id) || currentUser;
    
    // Criar lead com endereço completo
    const { data, error } = await supabase
      .from('leads')
      .insert({
        nome: newOppData.nome,
        email: newOppData.email,
        telefone: newOppData.telefone,
        tipo_cliente: newOppData.tipo_cliente,
        status_kanban: 'OPORTUNIDADES',
        vendedor: seller.name,
        vendedor_email: seller.email,
        vendedor_id: seller.id,
        origem: newOppData.origem,
        cep: newOppData.cep,
        logradouro: newOppData.logradouro,
        numero: newOppData.numero,
        complemento: newOppData.complemento,
        bairro: newOppData.bairro,
        cidade: newOppData.cidade,
        estado: newOppData.estado,
        cpf_cnpj: '',
        operadora: '',
        produto: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      setErrorDialogMessage('Erro ao criar oportunidade: ' + error.message);
      setShowErrorDialog(true);
      return;
    }
    
    // Registrar log
    await leadService.addActivityLog(data.id, {
      tipo: 'CRIACAO',
      descricao: `Oportunidade criada - Origem: ${newOppData.origem}`,
      usuario_id: currentUser.id,
      usuario_nome: currentUser.name
    });
    
    setSuccessMessage('Oportunidade criada com sucesso!');
    setShowSuccess(true);
    
    setShowNewDialog(false);
    setNewOppStep(1);
    setNewOppData({
      nome: '',
      email: '',
      telefone: '',
      tipo_cliente: '',
      origem: '',
      vendedor_id: currentUser.id,
      notes: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: ''
    });
    
    setTimeout(() => {
      reloadAllColumns();
    }, 2000);
  };

  // Show new opportunity form if requested
  if (showNewOpportunityForm) {
    return (
      <NewOpportunityForm
        currentUser={currentUser}
        onBack={() => onShowNewOpportunityForm?.(false)}
        onSave={handleCreateNewOpportunity}
      />
    );
  }

  // Drag and drop handlers
  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Visual feedback removal if needed
  };

  const handleDrop = (e: React.DragEvent, targetStatus: OpportunityStatus) => {
    e.preventDefault();
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const { opportunityId, currentStatus } = data;
      
      if (currentStatus !== targetStatus) {
        handleMoveOpportunity(opportunityId, targetStatus);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  return (
    <>
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            {currentUser.role === 'ADMIN' ? 'Quadro Geral de Oportunidades' : 'Minhas Oportunidades'}
          </h1>
          <p className="text-slate-600 mt-1">Gerencie suas oportunidades e acompanhe o funil de vendas</p>
        </div>
        
        <div className="flex gap-2">
          {currentUser.role === 'ADMIN' && (
            <Button
              onClick={handleExport}
              disabled={exporting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exportando...' : 'Exportar Excel'}
            </Button>
          )}
          <Button
            onClick={async () => {
              if (currentUser.role === 'ADMIN') {
                const activeSellers = await authService.getActiveSellers();
                setSellers(activeSellers);
              }
              setShowNewDialog(true);
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Oportunidade
          </Button>
        </div>
      </div>
      
      {/* Filters Section */}
      <SearchAndFilters
        title=""
        filters={searchFilters}
        onFiltersChange={handleFiltersChange}
        sellers={filterSellers}
        operators={operatorOptions}
        products={productOptions}
        statusOptions={[]}
        sourceOptions={sourceOptions}
        showSellerFilter={currentUser.role === 'ADMIN'}
        savedFilters={savedFilters}
        onSaveFilter={handleSaveFilter}
        onLoadFilter={handleLoadFilter}
        onDeleteFilter={handleDeleteFilter}
      />

      {/* Board Columns */}
      <div className="flex flex-col md:flex-row gap-4 pb-4 items-start">
        {OPPORTUNITY_COLUMNS.map((column) => {
          const columnOpportunities = opportunitiesByStatus[column.id as OpportunityStatus];
          return (
            <div 
              key={column.id} 
              className="flex flex-col w-full md:flex-1 md:min-w-[300px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id as OpportunityStatus)}
            >
              {/* Column Header */}
              <div className={`px-4 py-3 ${column.color.split(' ')[0]} border-b border-white/20`}>
                <div className="flex justify-between items-center">
                  <h3 className={`font-bold text-sm ${column.color.split(' ')[1]}`}>{column.label}</h3>
                  <div className="flex items-center gap-2">
                    {column.id === 'NEGOCIACAO' && (() => {
                      const total = columnData['NEGOCIACAO'].reduce((sum, o) => sum + (o.quoted_value || 0), 0);
                      return total > 0 ? (
                        <span className={`text-xs font-bold px-2.5 py-1 bg-white/30 backdrop-blur-sm rounded-full ${column.color.split(' ')[1]}`}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                        </span>
                      ) : null;
                    })()}
                    <span className={`text-xs font-bold px-2.5 py-1 bg-white/30 backdrop-blur-sm rounded-full ${column.color.split(' ')[1]}`}>
                      {statusCounts[column.id as OpportunityStatus] || 0}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Column Body */}
              <div className="p-3 space-y-3 bg-slate-50/50">
                {columnOpportunities?.map(opportunity => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                    onMove={handleMoveOpportunity}
                    onClick={() => onOpenOpportunity(opportunity)}
                    onMarkAsLost={() => handleMarkAsLost(opportunity.id)}
                    onConvertToProposal={() => handleConvertToProposal(opportunity.id)}
                    onLost={(opp) => onOpenOpportunity(opp)}
                    onDelete={currentUser.role === 'ADMIN' ? () => handleDeleteOpportunity(opportunity.id) : undefined}
                    currentUser={currentUser}
                    data-testid={`opportunity-card-${opportunity.id}`}
                  />
                ))}
                {columnOpportunities?.length === 0 && (
                  <div className="h-32 flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200">
                    <p className="text-xs text-slate-400 font-medium">Arraste oportunidades aqui</p>
                  </div>
                )}
                {columnData[column.id as OpportunityStatus].length < columnCounts[column.id as OpportunityStatus] && (
                  <div className="text-center py-2">
                    <button
                      onClick={() => loadColumn(column.id as OpportunityStatus, columnPages[column.id as OpportunityStatus] + 1, buildQueryFilters())}
                      disabled={columnLoading[column.id as OpportunityStatus]}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                    >
                      {columnLoading[column.id as OpportunityStatus] ? 'Carregando...' : `Carregar mais +${PAGE_SIZE}`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Modals */}
    <ValueInputModal
      isOpen={valueModalState.isOpen}
      onClose={() => setValueModalState({ isOpen: false, opportunityId: null, opportunityName: '' })}
      onSubmit={handleValueSubmit}
      opportunityName={valueModalState.opportunityName}
    />

    <LossModal
      isOpen={lossModalState.isOpen}
      onClose={() => setLossModalState({ isOpen: false, opportunityId: null, opportunityName: '' })}
      onSubmit={handleLossSubmit}
      opportunityName={lossModalState.opportunityName}
    />

    <DeleteConfirmationModal
      isOpen={deleteModalState.isOpen}
      onClose={() => setDeleteModalState({ isOpen: false, opportunityId: null, opportunityName: '' })}
      onConfirm={handleConfirmDelete}
      itemName={deleteModalState.opportunityName}
      itemType="oportunidade"
    />
    
    {/* Success Toast */}
    {showSuccess && (
      <div className="fixed bottom-4 right-4 z-50 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg max-w-md overflow-hidden">
        <div className="flex justify-between items-center">
          <span>{successMessage}</span>
          <button 
            onClick={() => setShowSuccess(false)}
            className="ml-4 text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
        <div className="absolute bottom-0 left-0 h-1 bg-green-700 animate-[shrink_2s_linear]" style={{width: '100%'}}></div>
      </div>
    )}
    
    {/* Error Toast */}
    {showErrorToast && (
      <div className="fixed bottom-4 right-4 z-50 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg max-w-md overflow-hidden">
        <div className="flex justify-between items-center">
          <span>Preencha todos os campos obrigatórios</span>
          <button 
            onClick={() => setShowErrorToast(false)}
            className="ml-4 text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
        <div className="absolute bottom-0 left-0 h-1 bg-red-700 animate-[shrink_2s_linear]" style={{width: '100%'}}></div>
      </div>
    )}

    <Dialog
      visible={showNewDialog}
      onHide={() => {
        setShowNewDialog(false);
        setNewOppStep(1);
        setNewOppData({
          nome: '',
          email: '',
          telefone: '',
          tipo_cliente: '',
          origem: '',
          vendedor_id: currentUser.id,
          notes: '',
          cep: '',
          logradouro: '',
          numero: '',
          complemento: '',
          bairro: '',
          cidade: '',
          estado: ''
        });
      }}
      header={newOppStep === 1 ? 'Nova Oportunidade - Origem' : 'Nova Oportunidade - Dados'}
      style={{ width: '600px' }}
      modal
    >
      {newOppStep === 1 ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 mb-4">Selecione a origem da oportunidade:</p>
          <div className="grid grid-cols-2 gap-3">
            {origemOptions.map((origem) => (
              <button
                key={origem}
                type="button"
                onClick={() => setNewOppData({...newOppData, origem})}
                className={`p-3 border-2 rounded-lg text-left text-sm transition-all hover:border-green-500 hover:bg-green-50 ${
                  newOppData.origem === origem
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-200'
                }`}
              >
                {origem}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => setShowNewDialog(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => setNewOppStep(2)}
              disabled={!newOppData.origem}
              className="px-4 py-2 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próximo
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setNewOppStep(1)}
              className="text-sm text-green-600 hover:text-green-800"
            >
              ← Voltar para origem
            </button>
            <span className="text-sm text-slate-500">| Origem: {newOppData.origem}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Nome *</label>
              <input
                type="text"
                value={newOppData.nome}
                onChange={(e) => {
                  setNewOppData({...newOppData, nome: e.target.value});
                  setNewOppErrors({...newOppErrors, nome: ''});
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm ${
                  newOppErrors.nome ? 'border-red-400' : 'border-slate-300'
                }`}
              />
              {newOppErrors.nome && <span className="text-xs text-red-500 mt-1">{newOppErrors.nome}</span>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Email *</label>
              <input
                type="email"
                value={newOppData.email}
                onChange={(e) => {
                  setNewOppData({...newOppData, email: e.target.value});
                  setNewOppErrors({...newOppErrors, email: ''});
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm ${
                  newOppErrors.email ? 'border-red-400' : 'border-slate-300'
                }`}
              />
              {newOppErrors.email && <span className="text-xs text-red-500 mt-1">{newOppErrors.email}</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Telefone *</label>
              <input
                type="text"
                value={newOppData.telefone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3').replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                  setNewOppData({...newOppData, telefone: value});
                  setNewOppErrors({...newOppErrors, telefone: ''});
                }}
                placeholder="(00) 00000-0000"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm ${
                  newOppErrors.telefone ? 'border-red-400' : 'border-slate-300'
                }`}
              />
              {newOppErrors.telefone && <span className="text-xs text-red-500 mt-1">{newOppErrors.telefone}</span>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Tipo de Cliente *</label>
              <select
                value={newOppData.tipo_cliente || ''}
                onChange={(e) => {
                  setNewOppData({...newOppData, tipo_cliente: e.target.value});
                  setNewOppErrors({...newOppErrors, tipo_cliente: ''});
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm bg-white ${
                  newOppErrors.tipo_cliente ? 'border-red-400' : 'border-slate-300'
                }`}
              >
                <option value="">Selecione...</option>
                <option value="PF">PF</option>
                <option value="PME">PME</option>
                <option value="ADESAO">Adesão</option>
              </select>
              {newOppErrors.tipo_cliente && <span className="text-xs text-red-500 mt-1">{newOppErrors.tipo_cliente}</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {currentUser.role === 'ADMIN' && (
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Vendedor</label>
                <select
                  value={newOppData.vendedor_id}
                  onChange={(e) => setNewOppData({...newOppData, vendedor_id: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm bg-white"
                >
                  {sellers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">CEP *</label>
              <input
                type="text"
                value={newOppData.cep}
                onChange={(e) => {
                  handleCepChange(e.target.value);
                  setNewOppErrors({...newOppErrors, cep: ''});
                }}
                placeholder="00000-000"
                maxLength={9}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm ${
                  newOppErrors.cep ? 'border-red-400' : 'border-slate-300'
                }`}
              />
              {newOppErrors.cep && <span className="text-xs text-red-500 mt-1">{newOppErrors.cep}</span>}
              {loadingCep && <span className="text-xs text-slate-500 mt-1">Buscando...</span>}
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-700 block mb-2">Logradouro *</label>
              <input
                type="text"
                value={newOppData.logradouro}
                onChange={(e) => {
                  setNewOppData({...newOppData, logradouro: e.target.value});
                  setNewOppErrors({...newOppErrors, logradouro: ''});
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm ${
                  newOppErrors.logradouro ? 'border-red-400' : 'border-slate-300'
                }`}
              />
              {newOppErrors.logradouro && <span className="text-xs text-red-500 mt-1">{newOppErrors.logradouro}</span>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Número *</label>
              <input
                type="text"
                value={newOppData.numero}
                onChange={(e) => {
                  setNewOppData({...newOppData, numero: e.target.value});
                  setNewOppErrors({...newOppErrors, numero: ''});
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm ${
                  newOppErrors.numero ? 'border-red-400' : 'border-slate-300'
                }`}
              />
              {newOppErrors.numero && <span className="text-xs text-red-500 mt-1">{newOppErrors.numero}</span>}
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-700 block mb-2">Complemento</label>
              <input
                type="text"
                value={newOppData.complemento}
                onChange={(e) => setNewOppData({...newOppData, complemento: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Bairro *</label>
              <input
                type="text"
                value={newOppData.bairro}
                onChange={(e) => {
                  setNewOppData({...newOppData, bairro: e.target.value});
                  setNewOppErrors({...newOppErrors, bairro: ''});
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm ${
                  newOppErrors.bairro ? 'border-red-400' : 'border-slate-300'
                }`}
              />
              {newOppErrors.bairro && <span className="text-xs text-red-500 mt-1">{newOppErrors.bairro}</span>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Cidade *</label>
              <input
                type="text"
                value={newOppData.cidade}
                onChange={(e) => {
                  setNewOppData({...newOppData, cidade: e.target.value});
                  setNewOppErrors({...newOppErrors, cidade: ''});
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm ${
                  newOppErrors.cidade ? 'border-red-400' : 'border-slate-300'
                }`}
              />
              {newOppErrors.cidade && <span className="text-xs text-red-500 mt-1">{newOppErrors.cidade}</span>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Estado *</label>
              <input
                type="text"
                value={newOppData.estado}
                onChange={(e) => {
                  setNewOppData({...newOppData, estado: e.target.value.toUpperCase()});
                  setNewOppErrors({...newOppErrors, estado: ''});
                }}
                maxLength={2}
                placeholder="SP"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm uppercase ${
                  newOppErrors.estado ? 'border-red-400' : 'border-slate-300'
                }`}
              />
              {newOppErrors.estado && <span className="text-xs text-red-500 mt-1">{newOppErrors.estado}</span>}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Observações</label>
            <textarea
              value={newOppData.notes}
              onChange={(e) => setNewOppData({...newOppData, notes: e.target.value})}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => setShowNewDialog(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmitNewOpp}
              className="px-4 py-2 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Criar Oportunidade
            </button>
          </div>
        </div>
      )}
    </Dialog>

    <ErrorDialog
      visible={showErrorDialog}
      onHide={() => setShowErrorDialog(false)}
      message={errorDialogMessage}
    />
    </>
  );
};