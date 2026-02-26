import React, { useMemo, useState, useCallback } from 'react';
import { Lead, KanbanStatus, User } from '../types';
import { ProposalCard } from './ProposalCard';
import { SearchAndFilters, FilterState, SavedFilter } from './SearchAndFilters';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { SystemModal } from './SystemModal';
import { KANBAN_COLUMNS } from '../constants';
import { leadService } from '../services/leadService';

interface ProposalsBoardProps {
  proposals?: Lead[];
  onMoveProposal: (id: number, newStatus: KanbanStatus) => void;
  onProposalClick: (proposal: Lead) => void;
  onProposalLost?: (proposal: Lead) => void;
  user: User;
}

export const ProposalsBoard: React.FC<ProposalsBoardProps> = ({
  onMoveProposal,
  onProposalClick,
  onProposalLost,
  user
}) => {
  const PAGE_SIZE = 30;
  const [columnData, setColumnData] = useState<Record<string, Lead[]>>({});
  const [columnCounts, setColumnCounts] = useState<Record<string, number>>({});
  const [columnPages, setColumnPages] = useState<Record<string, number>>({});
  const [columnLoading, setColumnLoading] = useState<Record<string, boolean>>({});

  const loadColumn = React.useCallback(async (status: KanbanStatus, page: number) => {
    setColumnLoading(prev => ({ ...prev, [status]: true }));
    try {
      const from = page * PAGE_SIZE;
      const { data, count } = await leadService.getLeadsByStatus(user, status, from, from + PAGE_SIZE - 1);
      setColumnData(prev => ({ ...prev, [status]: page === 0 ? data : [...(prev[status] || []), ...data] }));
      setColumnCounts(prev => ({ ...prev, [status]: count }));
      setColumnPages(prev => ({ ...prev, [status]: page }));
    } finally {
      setColumnLoading(prev => ({ ...prev, [status]: false }));
    }
  }, [user]);

  React.useEffect(() => {
    KANBAN_COLUMNS.forEach(col => loadColumn(col.id as KanbanStatus, 0));
  }, [loadColumn]);

  const reloadAllColumns = React.useCallback(() => {
    KANBAN_COLUMNS.forEach(col => loadColumn(col.id as KanbanStatus, 0));
  }, [loadColumn]);

  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '', sellers: [], operators: [], dateRange: {}, status: [], source: [], valueRange: {}
  });
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; proposalId: number | null; proposalName: string }>({
    isOpen: false, proposalId: null, proposalName: ''
  });
  const [systemModal, setSystemModal] = useState<{ isOpen: boolean; type: 'alert'|'confirm'|'success'|'error'; title: string; message: string }>(
    { isOpen: false, type: 'alert', title: '', message: '' }
  );

  const allProposals = useMemo(() => KANBAN_COLUMNS.flatMap(col => columnData[col.id] || []), [columnData]);

  const { sellers, operators, sourceOptions } = useMemo(() => {
    const allSellers = new Set<string>();
    const allOperators = new Set<string>();
    const allSources = new Set<string>();
    allProposals.forEach(p => {
      if (p.vendedor) allSellers.add(p.vendedor);
      if (p.operadora) allOperators.add(p.operadora);
      if (p.origem) allSources.add(p.origem);
    });
    return { sellers: Array.from(allSellers), operators: Array.from(allOperators), sourceOptions: Array.from(allSources) };
  }, [allProposals]);

  const filteredProposals = useMemo(() => {
    const filtered = allProposals.filter(proposal => {
      const matchesSearch = !filters.searchTerm ||
        proposal.nome.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        proposal.email.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        proposal.id.toString().includes(filters.searchTerm);
      const matchesSeller = user.role === 'ADMIN' ? (filters.sellers.length === 0 || filters.sellers.includes(proposal.vendedor)) : true;
      const matchesOperator = filters.operators.length === 0 || filters.operators.includes(proposal.operadora);
      const matchesStatus = filters.status.length === 0 || filters.status.includes(proposal.status_kanban);
      const matchesSource = filters.source.length === 0 || filters.source.includes(proposal.origem);
      const matchesDateRange = (() => {
        if (!filters.dateRange.start && !filters.dateRange.end) return true;
        const d = new Date(proposal.created_at);
        if (filters.dateRange.start && d < new Date(filters.dateRange.start)) return false;
        if (filters.dateRange.end && d > new Date(filters.dateRange.end)) return false;
        return true;
      })();
      const matchesValueRange = (() => {
        if (filters.valueRange.min === undefined && filters.valueRange.max === undefined) return true;
        const v = proposal.valor_produto || 0;
        if (filters.valueRange.min !== undefined && v < filters.valueRange.min) return false;
        if (filters.valueRange.max !== undefined && v > filters.valueRange.max) return false;
        return true;
      })();
      return matchesSearch && matchesSeller && matchesOperator && matchesStatus && matchesSource && matchesDateRange && matchesValueRange;
    });

    const counts: Record<string, number> = {};
    KANBAN_COLUMNS.forEach(col => { counts[col.id] = filtered.filter(p => p.status_kanban === col.id).length; });
    setStatusCounts(counts);
    return filtered;
  }, [allProposals, filters, user.role]);

  const handleMoveProposal = useCallback(async (id: number, newStatus: KanbanStatus) => {
    await onMoveProposal(id, newStatus);
    reloadAllColumns();
  }, [onMoveProposal, reloadAllColumns]);

  const handleDeleteProposal = (proposalId: number) => {
    const proposal = allProposals.find(p => p.id === proposalId);
    if (!proposal) return;
    setDeleteModalState({ isOpen: true, proposalId, proposalName: proposal.nome });
  };

  const handleConfirmDelete = async () => {
    if (deleteModalState.proposalId) {
      try {
        await leadService.deleteLead(deleteModalState.proposalId, user);
        setDeleteModalState({ isOpen: false, proposalId: null, proposalName: '' });
        reloadAllColumns();
      } catch (error) {
        setSystemModal({ isOpen: true, type: 'error', title: 'Erro ao Excluir', message: 'Erro ao excluir: ' + (error instanceof Error ? error.message : 'Erro desconhecido') });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = (e: React.DragEvent, targetStatus: KanbanStatus) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.currentStatus !== targetStatus) handleMoveProposal(data.proposalId, targetStatus);
    } catch (error) { console.error('Error handling drop:', error); }
  };

  return (
    <>
    <div className="h-full flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            {user.role === 'ADMIN' ? 'Quadro Geral de Propostas' : 'Minhas Propostas'}
          </h1>
          <p className="text-slate-600 mt-1">Gerencie suas propostas e acompanhe o progresso</p>
        </div>
      </div>

      <SearchAndFilters
        title=""
        filters={filters}
        onFiltersChange={setFilters}
        sellers={sellers}
        operators={operators}
        statusOptions={KANBAN_COLUMNS.map(col => col.id)}
        sourceOptions={sourceOptions}
        showSellerFilter={user.role === 'ADMIN'}
        savedFilters={savedFilters}
        onSaveFilter={(name, f) => setSavedFilters(prev => [...prev, { id: Date.now().toString(), name, filters: f, createdAt: new Date().toISOString() }])}
        onLoadFilter={(f) => setFilters(f.filters)}
        onDeleteFilter={(id) => setSavedFilters(prev => prev.filter(f => f.id !== id))}
      />

      <div className="flex flex-col md:flex-row gap-4 pb-4">
        {KANBAN_COLUMNS.map((column) => {
          const columnProposals = filteredProposals.filter(p => p.status_kanban === column.id);
          return (
            <div key={column.id} className="flex flex-col w-full md:flex-1 md:min-w-[300px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
              onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, column.id as KanbanStatus)}>
              <div className={`px-4 py-3 ${column.color.split(' ')[0]} border-b border-white/20`}>
                <div className="flex justify-between items-center">
                  <h3 className={`font-bold text-sm ${column.color.split(' ')[1]}`}>{column.label}</h3>
                  <span className={`text-xs font-bold px-2.5 py-1 bg-white/30 backdrop-blur-sm rounded-full ${column.color.split(' ')[1]}`}>
                    {columnCounts[column.id] || 0}
                  </span>
                </div>
              </div>
              <div className="p-3 space-y-3 bg-slate-50/50 flex-1 max-h-[400px] md:max-h-none overflow-y-auto md:overflow-y-visible">
                {columnProposals.map(proposal => (
                  <ProposalCard key={proposal.id} proposal={proposal} onMove={handleMoveProposal}
                    onClick={onProposalClick} onLost={onProposalLost}
                    onDelete={user.role === 'ADMIN' ? () => handleDeleteProposal(proposal.id) : undefined}
                    currentUser={user} />
                ))}
                {columnProposals.length === 0 && (
                  <div className="h-32 flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200">
                    <p className="text-xs text-slate-400 font-medium">Arraste propostas aqui</p>
                  </div>
                )}
                {(columnData[column.id]?.length || 0) < (columnCounts[column.id] || 0) && (
                  <div className="text-center py-2">
                    <button
                      onClick={() => loadColumn(column.id as KanbanStatus, (columnPages[column.id] || 0) + 1)}
                      disabled={columnLoading[column.id]}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                    >
                      {columnLoading[column.id] ? 'Carregando...' : `Carregar mais +${PAGE_SIZE}`}
                    </button>
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
    <SystemModal
      isOpen={systemModal.isOpen} type={systemModal.type} title={systemModal.title} message={systemModal.message}
      onConfirm={() => setSystemModal({ isOpen: false, type: 'alert', title: '', message: '' })}
      onCancel={() => setSystemModal({ isOpen: false, type: 'alert', title: '', message: '' })}
    />
    </>
  );
};
