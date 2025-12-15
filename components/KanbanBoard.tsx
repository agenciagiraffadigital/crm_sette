import React, { useMemo, useState } from 'react';
import { Lead, KanbanStatus, User } from '../types';
import { LeadCard } from './LeadCard';
import { KANBAN_COLUMNS } from '../constants';
import { Search, Filter, Stethoscope } from 'lucide-react';

interface KanbanBoardProps {
  leads: Lead[];
  onMoveLead: (id: number, newStatus: KanbanStatus) => void;
  onLeadClick: (lead: Lead) => void;
  user: User;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ leads, onMoveLead, onLeadClick, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');

  // Derive unique lists for filters
  const { sellers, operators } = useMemo(() => {
    const allSellers = new Set<string>();
    const allOperators = new Set<string>();
    
    leads.forEach(l => {
        if(l.vendedor) allSellers.add(l.vendedor);
        if(l.operadora) allOperators.add(l.operadora);
    });

    return {
        sellers: Array.from(allSellers),
        operators: Array.from(allOperators)
    };
  }, [leads]);

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            lead.id.toString().includes(searchTerm);
      
      const matchesSeller = user.role === 'ADMIN' 
        ? (sellerFilter === 'all' || lead.vendedor === sellerFilter)
        : true;
      
      const matchesOperator = operatorFilter === 'all' || lead.operadora === operatorFilter;
        
      return matchesSearch && matchesSeller && matchesOperator;
    });
  }, [leads, searchTerm, sellerFilter, operatorFilter, user.role]);

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Filters Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">
            {user.role === 'ADMIN' ? 'Quadro Geral de Propostas' : 'Minhas Propostas'}
        </h2>
        
        <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-48"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative">
                <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none w-full md:w-40"
                value={operatorFilter}
                onChange={(e) => setOperatorFilter(e.target.value)}
                >
                <option value="all">Todas Operadoras</option>
                {operators.map(s => (
                    <option key={s} value={s}>{s}</option>
                ))}
                </select>
            </div>
          
          {user.role === 'ADMIN' && (
            <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none w-full md:w-48"
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
                >
                <option value="all">Todos os Vendedores</option>
                {sellers.map(s => (
                    <option key={s} value={s}>{s}</option>
                ))}
                </select>
            </div>
          )}
        </div>
      </div>

      {/* Board Columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full gap-4 min-w-[1200px] pb-4">
          {KANBAN_COLUMNS.map((column) => {
            const columnLeads = filteredLeads.filter(l => l.status_kanban === column.id);
            return (
              <div key={column.id} className="flex-1 flex flex-col min-w-[280px] bg-slate-50 rounded-xl border border-slate-200">
                {/* Column Header */}
                <div className={`p-3 border-b border-slate-200 rounded-t-xl flex justify-between items-center ${column.color.split(' ')[0]}`}>
                  <h3 className={`font-semibold text-sm ${column.color.split(' ')[1]}`}>{column.label}</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 bg-white bg-opacity-50 rounded-full ${column.color.split(' ')[1]}`}>
                    {columnLeads.length}
                  </span>
                </div>
                
                {/* Column Body */}
                <div className="p-2 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                  {columnLeads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} onMove={onMoveLead} onClick={onLeadClick} />
                  ))}
                  {columnLeads.length === 0 && (
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