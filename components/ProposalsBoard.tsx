import React, { useMemo, useState, useCallback } from 'react';
import { Lead, KanbanStatus, User } from '../types';
import { ProposalCard } from './ProposalCard';
import { SearchAndFilters, FilterState, SavedFilter } from './SearchAndFilters';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { SystemModal } from './SystemModal';
import { KANBAN_COLUMNS } from '../constants';
import { leadService, LeadQueryFilters } from '../services/leadService';
import { exportToExcel } from '../utils/exportToExcel';
import { Download } from 'lucide-react';
import { Button } from '../src/components/ui/Button';

interface ProposalsBoardProps {
  proposals?: Lead[];
  onMoveProposal: (id: number, newStatus: KanbanStatus) => void;
  onProposalClick: (proposal: Lead) => void;
  onProposalLost?: (proposal: Lead) => void;
  user: User;
  searchFilters: FilterState;
  onSearchFiltersChange: (filters: FilterState) => void;
}

export const ProposalsBoard: React.FC<ProposalsBoardProps> = ({
  onMoveProposal,
  onProposalClick,
  onProposalLost,
  user,
  searchFilters: filters,
  onSearchFiltersChange: setFilters
}) => {
  const PAGE_SIZE = 30;
  const [columnData, setColumnData] = useState<Record<string, Lead[]>>({});
  const [columnCounts, setColumnCounts] = useState<Record<string, number>>({});
  const [columnPages, setColumnPages] = useState<Record<string, number>>({});
  const [columnLoading, setColumnLoading] = useState<Record<string, boolean>>({});

  const loadColumn = React.useCallback(async (status: KanbanStatus, page: number, filtersOverride?: LeadQueryFilters) => {
    setColumnLoading(prev => ({ ...prev, [status]: true }));
    try {
      const from = page * PAGE_SIZE;
      const { data, count } = await leadService.getLeadsByStatus(user, status, from, from + PAGE_SIZE - 1, filtersOverride);
      setColumnData(prev => ({ ...prev, [status]: page === 0 ? data : [...(prev[status] || []), ...data] }));
      setColumnCounts(prev => ({ ...prev, [status]: count }));
      setColumnPages(prev => ({ ...prev, [status]: page }));
    } finally {
      setColumnLoading(prev => ({ ...prev, [status]: false }));
    }
  }, [user]);

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; proposalId: number | null; proposalName: string }>({
    isOpen: false, proposalId: null, proposalName: ''
  });
  const [systemModal, setSystemModal] = useState<{ isOpen: boolean; type: 'alert'|'confirm'|'success'|'error'; title: string; message: string }>(
    { isOpen: false, type: 'alert', title: '', message: '' }
  );
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const qf = buildQueryFilters();
      const statuses: KanbanStatus[] = ['ENVIADA', 'ANÁLISE', 'ANÁLISE_OPERADORA', 'IMPLANTADA', 'CANCELADA'];
      const rows = await leadService.getLeadsForExport(user, statuses, qf);
      if (rows.length === 0) {
        setSystemModal({ isOpen: true, type: 'alert', title: 'Exportação', message: 'Nenhum dado encontrado para exportar.' });
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      exportToExcel(rows, `propostas_${today}`);
    } catch (error) {
      setSystemModal({ isOpen: true, type: 'error', title: 'Erro na Exportação', message: 'Erro ao exportar: ' + (error instanceof Error ? error.message : 'Erro desconhecido') });
    } finally {
      setExporting(false);
    }
  };

  // Convert filters to server query format
  const buildQueryFilters = React.useCallback((): LeadQueryFilters | undefined => {
    const hasActive = filters.searchTerm || filters.sellers.length || filters.operators.length || (filters.products?.length) || filters.source.length || filters.dateRange.start || filters.dateRange.end || (filters.valueRange?.min !== undefined) || (filters.valueRange?.max !== undefined) || (filters.sortBy && filters.sortBy !== 'date-desc');
    if (!hasActive) return undefined;
    return {
      searchTerm: filters.searchTerm || undefined,
      sellers: filters.sellers.length ? filters.sellers : undefined,
      operators: filters.operators.length ? filters.operators : undefined,
      products: filters.products?.length ? filters.products : undefined,
      sources: filters.source.length ? filters.source : undefined,
      dateRange: (filters.dateRange.start || filters.dateRange.end) ? filters.dateRange : undefined,
      valueRange: (filters.valueRange?.min !== undefined || filters.valueRange?.max !== undefined) ? filters.valueRange : undefined,
      sortBy: filters.sortBy || undefined,
    };
  }, [filters]);

  // Single effect: reload on mount AND whenever filters change
  React.useEffect(() => {
    const qf = buildQueryFilters();
    KANBAN_COLUMNS.forEach(col => loadColumn(col.id as KanbanStatus, 0, qf));
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const reloadAllColumns = React.useCallback(() => {
    const qf = buildQueryFilters();
    KANBAN_COLUMNS.forEach(col => loadColumn(col.id as KanbanStatus, 0, qf));
  }, [loadColumn, buildQueryFilters]);

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

  // Use server counts directly
  React.useEffect(() => {
    const counts: Record<string, number> = {};
    KANBAN_COLUMNS.forEach(col => { counts[col.id] = columnCounts[col.id] || 0; });
    setStatusCounts(counts);
  }, [columnCounts]);

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
        {user.role === 'ADMIN' && (
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exportando...' : 'Exportar Excel'}
          </Button>
        )}
      </div>

      <SearchAndFilters
        title=""
        filters={filters}
        onFiltersChange={setFilters}
        sellers={sellers}
        operators={operators}
        statusOptions={[]}
        sourceOptions={sourceOptions}
        showSellerFilter={user.role === 'ADMIN'}
        savedFilters={savedFilters}
        onSaveFilter={(name, f) => setSavedFilters(prev => [...prev, { id: Date.now().toString(), name, filters: f, createdAt: new Date().toISOString() }])}
        onLoadFilter={(f) => setFilters(f.filters)}
        onDeleteFilter={(id) => setSavedFilters(prev => prev.filter(f => f.id !== id))}
      />

      <div className="flex gap-3 pb-4 items-start min-h-0">
        {KANBAN_COLUMNS.map((column) => {
          const columnProposals = columnData[column.id] || [];
          return (
            <div key={column.id} className="flex flex-col flex-1 min-w-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
              onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, column.id as KanbanStatus)}>
              <div className={`px-4 py-3 ${column.color.split(' ')[0]} border-b border-white/20`}>
                <div className="flex justify-between items-center">
                  <h3 className={`font-bold text-sm ${column.color.split(' ')[1]}`}>{column.label}</h3>
                  <span className={`text-xs font-bold px-2.5 py-1 bg-white/30 backdrop-blur-sm rounded-full ${column.color.split(' ')[1]}`}>
                    {columnCounts[column.id] || 0}
                  </span>
                </div>
              </div>
              <div className="p-3 space-y-3 bg-slate-50/50">
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
                      onClick={() => loadColumn(column.id as KanbanStatus, (columnPages[column.id] || 0) + 1, buildQueryFilters())}
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
