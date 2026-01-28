import React, { useMemo, useState, useCallback } from 'react';
import { Lead, KanbanStatus, User } from '../types';
import { ProposalCard } from './ProposalCard';
import { SearchAndFilters, FilterState, SavedFilter } from './SearchAndFilters';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { Button } from '../src/components/ui/Button';
import { KANBAN_COLUMNS } from '../constants';
import { leadService } from '../services/leadService';

interface ProposalsBoardProps {
  proposals: Lead[];
  onMoveProposal: (id: number, newStatus: KanbanStatus) => void;
  onProposalClick: (proposal: Lead) => void;
  user: User;
}

export const ProposalsBoard: React.FC<ProposalsBoardProps> = ({ 
  proposals, 
  onMoveProposal, 
  onProposalClick, 
  user 
}) => {
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    sellers: [],
    operators: [],
    dateRange: {},
    status: [],
    source: [],
    valueRange: {}
  });

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  const [limits, setLimits] = useState<Record<string, number>>({
    'ENVIADA': 30,
    'ANÁLISE': 30,
    'IMPLANTADA': 30,
    'CANCELADA': 30
  });

  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    proposalId: number | null;
    proposalName: string;
  }>({
    isOpen: false,
    proposalId: null,
    proposalName: ''
  });

  const { sellers, operators, statusOptions, sourceOptions } = useMemo(() => {
    const allSellers = new Set<string>();
    const allOperators = new Set<string>();
    const allSources = new Set<string>();
    
    proposals.forEach(proposal => {
      if (proposal.vendedor) allSellers.add(proposal.vendedor);
      if (proposal.operadora) allOperators.add(proposal.operadora);
      if (proposal.origem) allSources.add(proposal.origem);
    });

    return {
      sellers: Array.from(allSellers),
      operators: Array.from(allOperators),
      statusOptions: KANBAN_COLUMNS.map(col => col.id),
      sourceOptions: Array.from(allSources)
    };
  }, [proposals]);

  const filteredProposals = useMemo(() => {
    const filtered = proposals.filter(proposal => {
      // Search term filter
      const matchesSearch = !filters.searchTerm || 
        proposal.nome.toLowerCase().includes(filters.searchTerm.toLowerCase()) || 
        proposal.email.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        proposal.id.toString().includes(filters.searchTerm);
      
      // Seller filter
      const matchesSeller = user.role === 'ADMIN'
        ? (filters.sellers.length === 0 || filters.sellers.includes(proposal.vendedor))
        : true;
      
      // Operator filter
      const matchesOperator = filters.operators.length === 0 || filters.operators.includes(proposal.operadora);
      
      // Status filter
      const matchesStatus = filters.status.length === 0 || filters.status.includes(proposal.status_kanban);
      
      // Source filter
      const matchesSource = filters.source.length === 0 || filters.source.includes(proposal.origem);
      
      // Date range filter
      const matchesDateRange = (() => {
        if (!filters.dateRange.start && !filters.dateRange.end) return true;
        const proposalDate = new Date(proposal.created_at);
        const startDate = filters.dateRange.start ? new Date(filters.dateRange.start) : null;
        const endDate = filters.dateRange.end ? new Date(filters.dateRange.end) : null;
        
        if (startDate && proposalDate < startDate) return false;
        if (endDate && proposalDate > endDate) return false;
        return true;
      })();
      
      // Value range filter
      const matchesValueRange = (() => {
        if (filters.valueRange.min === undefined && filters.valueRange.max === undefined) return true;
        const value = proposal.valor_produto || 0;
        if (filters.valueRange.min !== undefined && value < filters.valueRange.min) return false;
        if (filters.valueRange.max !== undefined && value > filters.valueRange.max) return false;
        return true;
      })();
        
      return matchesSearch && matchesSeller && matchesOperator && matchesStatus && 
             matchesSource && matchesDateRange && matchesValueRange;
    });

    // Calculate status counts
    const counts: Record<string, number> = {};
    KANBAN_COLUMNS.forEach(column => {
      counts[column.id] = filtered.filter(p => p.status_kanban === column.id).length;
    });
    setStatusCounts(counts);

    return filtered;
  }, [proposals, filters, user.role]);

  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
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
    setFilters(savedFilter.filters);
  }, []);

  const handleDeleteFilter = useCallback((filterId: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== filterId));
  }, []);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Visual feedback removal if needed
  };

  const handleDrop = (e: React.DragEvent, targetStatus: KanbanStatus) => {
    e.preventDefault();
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const { proposalId, currentStatus } = data;
      
      if (currentStatus !== targetStatus) {
        handleMoveProposal(proposalId, targetStatus);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  const handleMoveProposal = useCallback((id: number, newStatus: KanbanStatus) => {
    onMoveProposal(id, newStatus);
  }, [onMoveProposal]);

  const handleDeleteProposal = (proposalId: number) => {
    const proposal = proposals.find(p => p.id === proposalId);
    if (!proposal) return;

    setDeleteModalState({
      isOpen: true,
      proposalId,
      proposalName: proposal.nome
    });
  };

  const handleConfirmDelete = async () => {
    if (deleteModalState.proposalId) {
      try {
        await leadService.deleteLead(deleteModalState.proposalId, user);
        setDeleteModalState({ isOpen: false, proposalId: null, proposalName: '' });
        window.location.reload();
      } catch (error) {
        alert('Erro ao excluir: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
      }
    }
  };

  return (
    <>
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            {user.role === 'ADMIN' ? 'Quadro Geral de Propostas' : 'Minhas Propostas'}
          </h1>
          <p className="text-slate-600 mt-1">Gerencie suas propostas e acompanhe o progresso</p>
        </div>
      </div>

      {/* Filters Section */}
      <SearchAndFilters
        title=""
        filters={filters}
        onFiltersChange={handleFiltersChange}
        sellers={sellers}
        operators={operators}
        statusOptions={statusOptions}
        sourceOptions={sourceOptions}
        showSellerFilter={user.role === 'ADMIN'}
        savedFilters={savedFilters}
        onSaveFilter={handleSaveFilter}
        onLoadFilter={handleLoadFilter}
        onDeleteFilter={handleDeleteFilter}
      />

      {/* Board Columns */}
      <div className="flex flex-col md:flex-row gap-4 pb-4">
        {KANBAN_COLUMNS.map((column) => {
          const columnProposals = filteredProposals.filter(p => p.status_kanban === column.id).slice(0, limits[column.id]);
          return (
            <div 
              key={column.id} 
              className="flex flex-col w-full md:flex-1 md:min-w-[300px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id as KanbanStatus)}
            >
              {/* Column Header */}
              <div className={`px-4 py-3 ${column.color.split(' ')[0]} border-b border-white/20`}>
                <div className="flex justify-between items-center">
                  <h3 className={`font-bold text-sm ${column.color.split(' ')[1]}`}>{column.label}</h3>
                  <span className={`text-xs font-bold px-2.5 py-1 bg-white/30 backdrop-blur-sm rounded-full ${column.color.split(' ')[1]}`}>
                    {statusCounts[column.id] || 0}
                  </span>
                </div>
              </div>
              
              {/* Column Body */}
              <div className="p-3 space-y-3 bg-slate-50/50 flex-1 max-h-[400px] md:max-h-none overflow-y-auto md:overflow-y-visible">
                {columnProposals.map(proposal => (
                  <ProposalCard 
                    key={proposal.id} 
                    proposal={proposal} 
                    onMove={handleMoveProposal} 
                    onClick={onProposalClick}
                    onDelete={user.role === 'ADMIN' ? () => handleDeleteProposal(proposal.id) : undefined}
                    currentUser={user}
                  />
                ))}
                {columnProposals.length === 0 && (
                  <div className="h-32 flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200">
                    <p className="text-xs text-slate-400 font-medium">Arraste propostas aqui</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>

    <DeleteConfirmationModal
      isOpen={deleteModalState.isOpen}
      onClose={() => setDeleteModalState({ isOpen: false, proposalId: null, proposalName: '' })}
      onConfirm={handleConfirmDelete}
      itemName={deleteModalState.proposalName}
      itemType="lead"
    />
    </>
  );
};