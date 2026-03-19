import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { XCircle } from 'lucide-react';
import { User, Lead } from '../types';
import { leadService, LeadQueryFilters } from '../services/leadService';
import { supabase } from '../services/supabaseClient';
import { SearchAndFilters, FilterState, defaultFilters } from './SearchAndFilters';
import { formatDate } from '../utils/formatters';

interface LostOpportunitiesProps {
  currentUser: User;
  searchFilters: FilterState;
  onSearchFiltersChange: (filters: FilterState) => void;
}

export const LostOpportunities: React.FC<LostOpportunitiesProps> = ({ currentUser, searchFilters: filters, onSearchFiltersChange: setFilters }) => {
  const PAGE_SIZE = 30;
  const [lostLeads, setLostLeads] = useState<Lead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const buildQueryFilters = useCallback((): LeadQueryFilters | undefined => {
    const hasActive = filters.searchTerm || filters.sellers.length || filters.operators.length || filters.source.length || filters.dateRange.start || filters.dateRange.end || (filters.sortBy && filters.sortBy !== 'date-desc');
    if (!hasActive) return undefined;
    return {
      searchTerm: filters.searchTerm || undefined,
      sellers: filters.sellers.length ? filters.sellers : undefined,
      operators: filters.operators.length ? filters.operators : undefined,
      sources: filters.source.length ? filters.source : undefined,
      dateRange: (filters.dateRange.start || filters.dateRange.end) ? filters.dateRange : undefined,
      sortBy: filters.sortBy || undefined,
    };
  }, [filters]);

  const loadPage = useCallback(async (pageNum: number, queryFilters?: LeadQueryFilters) => {
    const isFirstPage = pageNum === 0;
    if (isFirstPage) setLoading(true);
    else setLoadingMore(true);

    try {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .eq('status_kanban', 'CANCELADA');

      if (currentUser.role !== 'ADMIN') {
        query = query.eq('vendedor_id', currentUser.id);
      }
      if (queryFilters?.searchTerm) {
        const term = queryFilters.searchTerm;
        query = query.or(`nome.ilike.%${term}%,email.ilike.%${term}%,telefone.ilike.%${term}%`);
      }
      if (queryFilters?.sellers?.length) {
        query = query.in('vendedor', queryFilters.sellers);
      }
      if (queryFilters?.operators?.length) {
        query = query.in('operadora', queryFilters.operators);
      }
      if (queryFilters?.sources?.length) {
        query = query.in('origem', queryFilters.sources);
      }
      if (queryFilters?.dateRange?.start) {
        query = query.gte('created_at', queryFilters.dateRange.start);
      }
      if (queryFilters?.dateRange?.end) {
        query = query.lte('created_at', queryFilters.dateRange.end + 'T23:59:59');
      }

      if (queryFilters?.sortBy === 'name-asc') {
        query = query.order('nome', { ascending: true });
      } else if (queryFilters?.sortBy === 'name-desc') {
        query = query.order('nome', { ascending: false });
      } else if (queryFilters?.sortBy === 'date-asc') {
        query = query.order('updated_at', { ascending: true });
      } else {
        query = query.order('updated_at', { ascending: false });
      }

      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      setLostLeads(prev => isFirstPage ? (data || []) : [...prev, ...(data || [])]);
      setTotalCount(count || 0);
      setPage(pageNum);
    } catch (error) {
      console.error('Erro ao carregar leads perdidos:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentUser]);

  // Reload on mount and whenever filters change
  useEffect(() => {
    loadPage(0, buildQueryFilters());
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Extract filter options from loaded data (for dropdown population)
  const { sellers, operators, sourceOptions } = useMemo(() => {
    const allSellers = new Set<string>();
    const allOperators = new Set<string>();
    const allSources = new Set<string>();
    
    lostLeads.forEach(lead => {
      if (lead.vendedor) allSellers.add(lead.vendedor);
      if (lead.operadora) allOperators.add(lead.operadora);
      if (lead.origem) allSources.add(lead.origem);
    });

    return {
      sellers: Array.from(allSellers),
      operators: Array.from(allOperators),
      sourceOptions: Array.from(allSources)
    };
  }, [lostLeads]);

  const handleRecoverLead = async (leadId: number) => {
    try {
      setLostLeads(prev => prev.filter(l => l.id !== leadId));
      setTotalCount(prev => prev - 1);
      await leadService.updateLeadStatus(leadId, 'OPORTUNIDADES', currentUser);
    } catch (error) {
      console.error('Erro ao recuperar lead:', error);
      await loadPage(0, buildQueryFilters());
    }
  };

  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <img src="/loading.gif" alt="Carregando..." className="w-64 h-64" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Oportunidades Perdidas</h1>
          <p className="text-slate-600 mt-1">Visualize e analise as oportunidades que foram perdidas</p>
        </div>
      </div>

      {/* Filters */}
      <SearchAndFilters
        title=""
        filters={filters}
        onFiltersChange={handleFiltersChange}
        sellers={sellers}
        operators={operators}
        products={[]}
        statusOptions={[]}
        sourceOptions={sourceOptions}
        showSellerFilter={currentUser.role === 'ADMIN'}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {lostLeads.length === 0 ? (
          <div className="text-center py-12">
            <XCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">Nenhuma oportunidade perdida encontrada</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {lostLeads.map((lead) => (
              <div
                key={lead.id}
                className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">{lead.nome}</h3>
                    {lead.email && (
                      <p className="text-sm text-slate-600 mb-1">{lead.email}</p>
                    )}
                    {lead.telefone && (
                      <p className="text-sm text-slate-600 mb-2">{lead.telefone}</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {lead.vendedor && (
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded">
                          {lead.vendedor}
                        </span>
                      )}
                      {lead.operadora && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {lead.operadora}
                        </span>
                      )}
                      {lead.origem && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                          {lead.origem}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Perdida
                    </span>
                    {lead.updated_at && (
                      <p className="text-xs text-slate-500 mt-2">
                        {formatDate(lead.updated_at)}
                      </p>
                    )}
                    {lead.followup_data && (
                      <p className="text-xs text-slate-600 mt-2 font-medium">
                        Data de Follow Up: {formatDate(lead.followup_data)}
                      </p>
                    )}
                    <button
                      onClick={() => handleRecoverLead(lead.id)}
                      className="mt-3 w-full px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
                    >
                      Recuperar para Oportunidades
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Carregar mais */}
            {lostLeads.length < totalCount && (
              <div className="text-center py-3">
                <button
                  onClick={() => loadPage(page + 1, buildQueryFilters())}
                  disabled={loadingMore}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                >
                  {loadingMore ? 'Carregando...' : `Carregar mais +${PAGE_SIZE}`}
                </button>
                <p className="text-xs text-slate-400 mt-1">
                  Exibindo {lostLeads.length} de {totalCount}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
