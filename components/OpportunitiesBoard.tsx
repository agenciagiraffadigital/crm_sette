import React, { useState, useMemo, useCallback } from 'react';
import { Opportunity, OpportunityStatus, User, LossReason } from '../types';
import { OpportunityCard } from './OpportunityCard';
import { OpportunityForm } from './OpportunityForm';
import { SearchAndFilters, FilterState, SavedFilter } from './SearchAndFilters';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { OPPORTUNITY_COLUMNS } from '../constants';
import { Button } from '../src/components/ui/Button';
import { Input } from '../src/components/ui/Input';
import { Select } from '../src/components/ui/Select';
import { Card } from '../src/components/ui/Card';
import { opportunityService } from '../services/opportunityService';

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
  onDataChange?: () => void; // Add callback for data changes
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
  onDataChange
}) => {
  const [searchFilters, setSearchFilters] = useState<FilterState>({
    searchTerm: '',
    sellers: [],
    operators: [],
    dateRange: {},
    status: [],
    source: [],
    valueRange: {}
  });
  
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  
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

  // Extract filter options from opportunities
  const { sellers, sourceOptions, statusOptions } = useMemo(() => {
    const allSellers = new Set<string>();
    const allSources = new Set<string>();
    
    opportunities.forEach(opportunity => {
      if (opportunity.vendedor) allSellers.add(opportunity.vendedor);
      if (opportunity.origem) allSources.add(opportunity.origem);
    });

    return {
      sellers: Array.from(allSellers),
      sourceOptions: Array.from(allSources),
      statusOptions: OPPORTUNITY_COLUMNS.map(col => col.id)
    };
  }, [opportunities]);

  // Filter opportunities based on search filters
  const filteredOpportunities = useMemo(() => {
    const filtered = opportunities.filter(opportunity => {
      // Search term filter
      const matchesSearch = !searchFilters.searchTerm || 
        opportunity.nome.toLowerCase().includes(searchFilters.searchTerm.toLowerCase()) || 
        opportunity.email.toLowerCase().includes(searchFilters.searchTerm.toLowerCase()) ||
        opportunity.telefone.includes(searchFilters.searchTerm) ||
        opportunity.id.toString().includes(searchFilters.searchTerm);
      
      // Seller filter
      const matchesSeller = currentUser.role === 'ADMIN'
        ? (searchFilters.sellers.length === 0 || searchFilters.sellers.includes(opportunity.vendedor))
        : true;
      
      // Status filter
      const matchesStatus = searchFilters.status.length === 0 || searchFilters.status.includes(opportunity.status);
      
      // Source filter
      const matchesSource = searchFilters.source.length === 0 || searchFilters.source.includes(opportunity.origem);
      
      // Date range filter
      const matchesDateRange = (() => {
        if (!searchFilters.dateRange.start && !searchFilters.dateRange.end) return true;
        const opportunityDate = new Date(opportunity.created_at);
        const startDate = searchFilters.dateRange.start ? new Date(searchFilters.dateRange.start) : null;
        const endDate = searchFilters.dateRange.end ? new Date(searchFilters.dateRange.end) : null;
        
        if (startDate && opportunityDate < startDate) return false;
        if (endDate && opportunityDate > endDate) return false;
        return true;
      })();
        
      return matchesSearch && matchesSeller && matchesStatus && matchesSource && matchesDateRange;
    });

    // Calculate status counts
    const counts: Record<OpportunityStatus, number> = {} as Record<OpportunityStatus, number>;
    OPPORTUNITY_COLUMNS.forEach(column => {
      counts[column.id as OpportunityStatus] = filtered.filter(o => o.status === column.id).length;
    });
    setStatusCounts(counts);

    return filtered;
  }, [opportunities, searchFilters, currentUser.role]);

  // Group opportunities by status
  const opportunitiesByStatus = useMemo(() => {
    const groups: Record<OpportunityStatus, Opportunity[]> = {
      'OPORTUNIDADES': [],
      'EM_CONTATO': [],
      'NEGOCIACAO': []
    };

    filteredOpportunities.forEach(opportunity => {
      if (groups[opportunity.status]) {
        groups[opportunity.status].push(opportunity);
      }
    });

    // Limit each status to current limit
    Object.keys(groups).forEach(status => {
      groups[status as OpportunityStatus] = groups[status as OpportunityStatus].slice(0, limits[status as OpportunityStatus]);
    });

    return groups;
  }, [filteredOpportunities, limits]);

  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setSearchFilters(newFilters);
  }, []);

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
    setSearchFilters(savedFilter.filters);
  }, []);

  const handleDeleteFilter = useCallback((filterId: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== filterId));
  }, []);

  const handleMoveOpportunity = async (opportunityId: number, targetStatus: OpportunityStatus) => {
    const opportunity = opportunities.find(o => o.id === opportunityId);
    if (!opportunity) return;

    // Validation: require quoted value when moving to NEGOCIACAO
    if (targetStatus === 'NEGOCIACAO' && !opportunity.quoted_value) {
      setValueModalState({
        isOpen: true,
        opportunityId,
        opportunityName: opportunity.nome
      });
      return;
    }

    try {
      await onMoveOpportunity(opportunityId, targetStatus);
    } catch (error) {
      console.error('Error moving opportunity:', error);
    }
  };

  const handleValueSubmit = (value: number) => {
    if (valueModalState.opportunityId) {
      onMoveOpportunity(valueModalState.opportunityId, 'NEGOCIACAO', { quoted_value: value });
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
        onDataChange?.();
      } catch (error) {
        alert('Erro ao marcar como perdida: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
      }
    }
  };

  const handleConvertToProposal = async (opportunityId: number) => {
    try {
      await opportunityService.convertOpportunityToProposal(opportunityId, currentUser);
      onDataChange?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      alert('Erro na conversão: ' + errorMessage);
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
        onDataChange?.();
      } catch (error) {
        alert('Erro ao excluir: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
      }
    }
  };

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
    console.log('Drop event triggered for status:', targetStatus);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      console.log('Dropped data:', data);
      const { opportunityId, currentStatus } = data;
      
      if (currentStatus !== targetStatus) {
        console.log('Moving from', currentStatus, 'to', targetStatus);
        handleMoveOpportunity(opportunityId, targetStatus);
      } else {
        console.log('Same status, no move needed');
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header with Search and Filters */}
      <SearchAndFilters
        title={currentUser.role === 'ADMIN' ? 'Quadro Geral de Oportunidades' : 'Minhas Oportunidades'}
        filters={searchFilters}
        onFiltersChange={handleFiltersChange}
        sellers={sellers}
        operators={[]} // Opportunities don't have operators
        statusOptions={statusOptions}
        sourceOptions={sourceOptions}
        showSellerFilter={currentUser.role === 'ADMIN'}
        savedFilters={savedFilters}
        onSaveFilter={handleSaveFilter}
        onLoadFilter={handleLoadFilter}
        onDeleteFilter={handleDeleteFilter}
      />

      {/* Board Columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full gap-4 min-w-[900px] pb-4">
          {OPPORTUNITY_COLUMNS.map((column) => {
            const columnOpportunities = opportunitiesByStatus[column.id as OpportunityStatus];
            return (
              <div 
                key={column.id} 
                className="flex-1 flex flex-col min-w-[280px] bg-slate-50 rounded-xl border-2 border-slate-200 transition-colors duration-200"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id as OpportunityStatus)}
              >
                {/* Column Header */}
                <div className={`p-3 border-b border-slate-200 rounded-t-xl flex justify-between items-center ${column.color.split(' ')[0]}`}>
                  <h3 className={`font-semibold text-sm ${column.color.split(' ')[1]}`}>{column.label}</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 bg-white bg-opacity-50 rounded-full ${column.color.split(' ')[1]}`}>
                    {statusCounts[column.id as OpportunityStatus] || 0}
                  </span>
                </div>
                
                {/* Column Body */}
                <div 
                  className="p-2 flex-1 overflow-y-auto space-y-2 custom-scrollbar"
                  onScroll={(e) => {
                    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                    if (scrollHeight - scrollTop <= clientHeight + 100) {
                      // Trigger load more when near bottom
                      console.log('Load more opportunities for column:', column.id);
                    }
                  }}
                >
                  {columnOpportunities?.map(opportunity => (
                    <OpportunityCard
                      key={opportunity.id}
                      opportunity={opportunity}
                      onMove={handleMoveOpportunity}
                      onClick={() => onOpenOpportunity(opportunity)}
                      onMarkAsLost={() => handleMarkAsLost(opportunity.id)}
                      onConvertToProposal={() => handleConvertToProposal(opportunity.id)}
                      onDelete={currentUser.role === 'ADMIN' ? () => handleDeleteOpportunity(opportunity.id) : undefined}
                      currentUser={currentUser}
                      data-testid={`opportunity-card-${opportunity.id}`}
                    />
                  ))}
                  {columnOpportunities?.length === 0 && (
                    <div className="h-32 flex items-center justify-center drop-zone-empty rounded-lg m-2">
                      <p className="text-xs text-slate-400 font-medium">Arraste oportunidades aqui</p>
                    </div>
                  )}
                  {columnOpportunities && columnOpportunities.length >= limits[column.id as OpportunityStatus] && (
                    <div className="text-center py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLimits(prev => ({
                          ...prev,
                          [column.id]: prev[column.id as OpportunityStatus] + 30
                        }))}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Carregar mais +30
                      </Button>
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
    </div>
  );
};