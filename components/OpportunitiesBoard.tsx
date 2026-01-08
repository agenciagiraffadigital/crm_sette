import React, { useState, useMemo } from 'react';
import { Opportunity, OpportunityStatus, User, LossReason } from '../types';
import { OpportunityCard } from './OpportunityCard';
import { Button } from '../src/components/ui/Button';
import { Input } from '../src/components/ui/Input';
import { Select } from '../src/components/ui/Select';
import { Card } from '../src/components/ui/Card';
import { useToast } from '../src/hooks/useToast';
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
            Valor Cotado - {opportunityName}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Para avançar para NEGOCIAÇÃO, é necessário informar o valor cotado para o cliente.
          </p>
          <Input
            label="Valor Cotado (R$)"
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
  currentUser
}) => {
  const { showToast } = useToast();
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

  // Filter opportunities based on current filters
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opportunity => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const matchesSearch = 
          opportunity.nome.toLowerCase().includes(searchTerm) ||
          opportunity.email.toLowerCase().includes(searchTerm) ||
          opportunity.telefone.includes(searchTerm) ||
          opportunity.id.toString().includes(searchTerm);
        
        if (!matchesSearch) return false;
      }

      // Seller filter
      if (filters.seller && opportunity.vendedor !== filters.seller) {
        return false;
      }

      // Origin filter
      if (filters.origem && opportunity.origem !== filters.origem) {
        return false;
      }

      // Date range filter
      if (filters.dateRange) {
        const opportunityDate = new Date(opportunity.created_at);
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        
        if (opportunityDate < startDate || opportunityDate > endDate) {
          return false;
        }
      }

      return true;
    });
  }, [opportunities, filters]);

  // Group opportunities by status
  const opportunitiesByStatus = useMemo(() => {
    const groups: Record<OpportunityStatus, Opportunity[]> = {
      'OPORTUNIDADES': [],
      'EM_CONTATO': [],
      'NEGOCIAÇÃO': []
    };

    filteredOpportunities.forEach(opportunity => {
      if (!opportunity.lost_at && !opportunity.converted_to_proposal_at) {
        groups[opportunity.status].push(opportunity);
      }
    });

    return groups;
  }, [filteredOpportunities]);

  const handleMoveOpportunity = async (opportunityId: number, targetStatus: OpportunityStatus) => {
    const opportunity = opportunities.find(o => o.id === opportunityId);
    if (!opportunity) return;

    // Validation: require quoted value when moving to NEGOCIAÇÃO
    if (targetStatus === 'NEGOCIAÇÃO' && !opportunity.quoted_value) {
      setValueModalState({
        isOpen: true,
        opportunityId,
        opportunityName: opportunity.nome
      });
      return;
    }

    try {
      onMoveOpportunity(opportunityId, targetStatus);
      showToast({
        type: 'success',
        title: 'Status atualizado',
        message: `Oportunidade movida para ${targetStatus}`
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Erro ao atualizar status',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  };

  const handleValueSubmit = (value: number) => {
    if (valueModalState.opportunityId) {
      try {
        onMoveOpportunity(valueModalState.opportunityId, 'NEGOCIAÇÃO', { quoted_value: value });
        showToast({
          type: 'success',
          title: 'Valor cotado salvo',
          message: `Oportunidade movida para NEGOCIAÇÃO com valor R$ ${value.toFixed(2)}`
        });
      } catch (error) {
        showToast({
          type: 'error',
          title: 'Erro ao salvar valor',
          message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
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
        showToast({
          type: 'success',
          title: 'Oportunidade marcada como perdida',
          message: `Motivo: ${lossReason.category}`
        });
        // Trigger a refresh of opportunities
        window.location.reload();
      } catch (error) {
        showToast({
          type: 'error',
          title: 'Erro ao marcar como perdida',
          message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
  };

  const handleConvertToProposal = async (opportunityId: number) => {
    try {
      await opportunityService.convertOpportunityToProposal(opportunityId, currentUser);
      showToast({
        type: 'success',
        title: 'Oportunidade convertida',
        message: 'Oportunidade convertida para proposta com sucesso'
      });
      // Trigger a refresh of opportunities
      window.location.reload();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Erro na conversão',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  };

  const statusColumns: { status: OpportunityStatus; title: string; color: string }[] = [
    { status: 'OPORTUNIDADES', title: 'OPORTUNIDADES', color: 'bg-blue-50 border-blue-200' },
    { status: 'EM_CONTATO', title: 'EM CONTATO', color: 'bg-yellow-50 border-yellow-200' },
    { status: 'NEGOCIAÇÃO', title: 'NEGOCIAÇÃO', color: 'bg-green-50 border-green-200' }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Filters */}
      <Card variant="outlined" padding="md" className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Buscar por nome, email, telefone ou ID..."
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          />
          <Select
            placeholder="Filtrar por vendedor"
            value={filters.seller || ''}
            onChange={(e) => onFiltersChange({ ...filters, seller: e.target.value })}
            options={[
              { value: '', label: 'Todos os vendedores' },
              ...Array.from(new Set(opportunities.map(o => o.vendedor)))
                .map(seller => ({ value: seller, label: seller }))
            ]}
          />
          <Select
            placeholder="Filtrar por origem"
            value={filters.origem || ''}
            onChange={(e) => onFiltersChange({ ...filters, origem: e.target.value })}
            options={[
              { value: '', label: 'Todas as origens' },
              ...Array.from(new Set(opportunities.map(o => o.origem)))
                .map(origem => ({ value: origem, label: origem }))
            ]}
          />
          <Button
            variant="outline"
            onClick={() => onFiltersChange({})}
          >
            Limpar Filtros
          </Button>
        </div>
      </Card>

      {/* Kanban Board */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {statusColumns.map(({ status, title, color }) => (
          <div key={status} className="flex flex-col min-h-0">
            <div className={`p-3 rounded-t-lg border-b-2 ${color}`}>
              <h3 className="font-semibold text-gray-800">
                {title} ({opportunitiesByStatus[status].length})
              </h3>
            </div>
            <div className="flex-1 p-2 bg-gray-50 rounded-b-lg overflow-y-auto">
              <div className="space-y-2">
                {opportunitiesByStatus[status].map(opportunity => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                    onMove={handleMoveOpportunity}
                    onClick={() => onOpenOpportunity(opportunity)}
                    onMarkAsLost={() => handleMarkAsLost(opportunity.id)}
                    onConvertToProposal={() => handleConvertToProposal(opportunity.id)}
                    currentUser={currentUser}
                    data-testid={`opportunity-card-${opportunity.id}`}
                  />
                ))}
                {opportunitiesByStatus[status].length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    Nenhuma oportunidade em {title.toLowerCase()}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
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
    </div>
  );
};