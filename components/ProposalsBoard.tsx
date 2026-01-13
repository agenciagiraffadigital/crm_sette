import React, { useMemo, useState, useCallback } from 'react';
import { Lead, KanbanStatus, User } from '../types';
import { ProposalCard } from './ProposalCard';
import { SearchAndFilters, FilterState, SavedFilter } from './SearchAndFilters';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
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
    <div className="h-full flex flex-col space-y-4">
      {/* Header with Search and Filters */}
      <SearchAndFilters
        title={user.role === 'ADMIN' ? 'Quadro Geral de Propostas' : 'Minhas Propostas'}
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
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full gap-4 min-w-[1200px] pb-4">
          {KANBAN_COLUMNS.map((column) => {
            const columnProposals = filteredProposals.filter(p => p.status_kanban === column.id).slice(0, limits[column.id]);
            return (
              <div 
                key={column.id} 
                className="flex-1 flex flex-col min-w-[280px] bg-slate-50 rounded-xl border-2 border-slate-200 transition-colors duration-200"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id as KanbanStatus)}
              >
                {/* Column Header */}
                <div className={`p-3 border-b border-slate-200 rounded-t-xl flex justify-between items-center ${column.color.split(' ')[0]}`}>
                  <h3 className={`font-semibold text-sm ${column.color.split(' ')[1]}`}>{column.label}</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 bg-white bg-opacity-50 rounded-full ${column.color.split(' ')[1]}`}>
                    {statusCounts[column.id] || 0}
                  </span>
                </div>
                
                {/* Column Body with Virtualization for Performance */}
                <div 
                  className="p-2 flex-1 overflow-y-auto space-y-2 custom-scrollbar"
                  onScroll={(e) => {
                    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                    if (scrollHeight - scrollTop <= clientHeight + 100) {
                      // Trigger load more when near bottom
                      console.log('Load more proposals for column:', column.id);
                    }
                  }}
                >
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
                    <div className="h-32 flex items-center justify-center drop-zone-empty rounded-lg m-2">
                      <p className="text-xs text-slate-400 font-medium">Arraste propostas aqui</p>
                    </div>
                  )}
                  {columnProposals.length >= limits[column.id] && (
                    <div className="text-center py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLimits(prev => ({
                          ...prev,
                          [column.id]: prev[column.id] + 30
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

      <DeleteConfirmationModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, proposalId: null, proposalName: '' })}
        onConfirm={handleConfirmDelete}
        itemName={deleteModalState.proposalName}
        itemType="lead"
      />
    </div>
  );
};