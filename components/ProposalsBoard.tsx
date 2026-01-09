import React, { useMemo, useState, useCallback } from 'react';
import { Lead, KanbanStatus, User } from '../types';
import { ProposalCard } from './ProposalCard';
import { SearchAndFilters, FilterState, SavedFilter } from './SearchAndFilters';
import { KANBAN_COLUMNS } from '../constants';

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
    return proposals.filter(proposal => {
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

  const handleMoveProposal = useCallback((id: number, newStatus: KanbanStatus) => {
    onMoveProposal(id, newStatus);
  }, [onMoveProposal]);

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
            const columnProposals = filteredProposals.filter(p => p.status_kanban === column.id);
            return (
              <div key={column.id} className="flex-1 flex flex-col min-w-[280px] bg-slate-50 rounded-xl border border-slate-200">
                {/* Column Header */}
                <div className={`p-3 border-b border-slate-200 rounded-t-xl flex justify-between items-center ${column.color.split(' ')[0]}`}>
                  <h3 className={`font-semibold text-sm ${column.color.split(' ')[1]}`}>{column.label}</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 bg-white bg-opacity-50 rounded-full ${column.color.split(' ')[1]}`}>
                    {columnProposals.length}
                  </span>
                </div>
                
                {/* Column Body with Virtualization for Performance */}
                <div className="p-2 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                  {columnProposals.map(proposal => (
                    <ProposalCard 
                      key={proposal.id} 
                      proposal={proposal} 
                      onMove={handleMoveProposal} 
                      onClick={onProposalClick} 
                    />
                  ))}
                  {columnProposals.length === 0 && (
                    <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg m-2">
                      <p className="text-xs text-slate-400">Nenhuma proposta</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};