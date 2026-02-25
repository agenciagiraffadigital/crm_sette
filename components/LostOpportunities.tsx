import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { XCircle } from 'lucide-react';
import { User, Lead } from '../types';
import { leadService } from '../services/leadService';
import { supabase } from '../services/supabaseClient';
import { SearchAndFilters, FilterState, defaultFilters } from './SearchAndFilters';

interface LostOpportunitiesProps {
  currentUser: User;
}

export const LostOpportunities: React.FC<LostOpportunitiesProps> = ({ currentUser }) => {
  const [lostLeads, setLostLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  useEffect(() => {
    loadLostLeads();
  }, [currentUser]);

  const loadLostLeads = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('leads')
        .select('*')
        .eq('status_kanban', 'CANCELADA')
        .order('updated_at', { ascending: false });
      
      if (currentUser.role !== 'ADMIN') {
        query = query.eq('vendedor_id', currentUser.id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setLostLeads(data || []);
    } catch (error) {
      console.error('Erro ao carregar leads perdidos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract filter options
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

  // Filter leads
  const filteredLeads = useMemo(() => {
    return lostLeads.filter(lead => {
      const matchesSearch = !filters.searchTerm || 
        lead.nome.toLowerCase().includes(filters.searchTerm.toLowerCase()) || 
        lead.email.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        lead.telefone.includes(filters.searchTerm);
      
      const matchesSeller = currentUser.role === 'ADMIN'
        ? (filters.sellers.length === 0 || filters.sellers.includes(lead.vendedor))
        : true;
      
      const matchesOperator = filters.operators.length === 0 || filters.operators.includes(lead.operadora);
      const matchesSource = filters.source.length === 0 || filters.source.includes(lead.origem);
      
      const matchesDateRange = (() => {
        if (!filters.dateRange.start && !filters.dateRange.end) return true;
        const leadDate = new Date(lead.created_at);
        const startDate = filters.dateRange.start ? new Date(filters.dateRange.start) : null;
        const endDate = filters.dateRange.end ? new Date(filters.dateRange.end) : null;
        
        if (startDate && leadDate < startDate) return false;
        if (endDate && leadDate > endDate) return false;
        return true;
      })();
        
      return matchesSearch && matchesSeller && matchesOperator && matchesSource && matchesDateRange;
    });
  }, [lostLeads, filters, currentUser.role]);

  const handleRecoverLead = async (leadId: number) => {
    try {
      // Remover da lista imediatamente (otimista)
      setLostLeads(prev => prev.filter(l => l.id !== leadId));
      
      await leadService.updateLeadStatus(leadId, 'OPORTUNIDADES', currentUser);
    } catch (error) {
      console.error('Erro ao recuperar lead:', error);
      // Recarregar em caso de erro
      await loadLostLeads();
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
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <XCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">Nenhuma oportunidade perdida encontrada</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredLeads.map((lead) => (
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
                        {new Date(lead.updated_at).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    {lead.followup_data && (
                      <p className="text-xs text-slate-600 mt-2 font-medium">
                        Data de Follow Up: {new Date(lead.followup_data).toLocaleDateString('pt-BR')}
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
          </div>
        )}
      </div>
    </div>
  );
};
