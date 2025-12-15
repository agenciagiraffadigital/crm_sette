import React from 'react';
import { Lead, KanbanStatus } from '../types';
import { Phone, Mail, User, Calendar, ArrowRight, Building2, PersonStanding } from 'lucide-react';
import { KANBAN_COLUMNS } from '../constants';

interface LeadCardProps {
  lead: Lead;
  onMove: (id: number, newStatus: KanbanStatus) => void;
  onClick: (lead: Lead) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onMove, onClick }) => {
  
  const getNextStatus = (current: KanbanStatus): KanbanStatus | null => {
    const idx = KANBAN_COLUMNS.findIndex(c => c.id === current);
    if (idx !== -1 && idx < KANBAN_COLUMNS.length - 1) {
      return KANBAN_COLUMNS[idx + 1].id as KanbanStatus;
    }
    return null;
  };

  const nextStatus = getNextStatus(lead.status_kanban);

  const typeConfig = {
    'PF': { color: 'bg-blue-100 text-blue-700', icon: PersonStanding },
    'PJ': { color: 'bg-purple-100 text-purple-700', icon: Building2 },
    'ADESAO': { color: 'bg-pink-100 text-pink-700', icon: PersonStanding }
  }[lead.tipo_cliente] || { color: 'bg-gray-100 text-gray-700', icon: User };

  const TypeIcon = typeConfig.icon;

  return (
    <div 
      onClick={() => onClick(lead)}
      className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200 group cursor-pointer relative"
    >
      <div className="flex justify-between items-start mb-3">
        <div className={`flex items-center space-x-1 text-xs font-bold px-2 py-1 rounded-full ${typeConfig.color}`}>
          <TypeIcon className="w-3 h-3" />
          <span>{lead.tipo_cliente}</span>
        </div>
        <span className="text-xs text-slate-400">#{lead.id}</span>
      </div>
      
      <h4 className="font-bold text-slate-800 mb-1 truncate text-sm" title={lead.nome}>{lead.nome}</h4>
      <p className="text-xs text-slate-500 mb-3 font-medium">{lead.produto || 'Produto N/A'} - {lead.operadora || 'N/A'}</p>
      
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center text-xs text-slate-600">
          <Mail className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" />
          <span className="truncate">{lead.email}</span>
        </div>
        <div className="flex items-center text-xs text-slate-600">
          <Phone className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" />
          <span>{lead.telefone}</span>
        </div>
        <div className="flex items-center text-xs text-slate-600">
          <User className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" />
          <span className="truncate">Vend: {lead.vendedor}</span>
        </div>
        <div className="flex items-center text-xs text-slate-600">
          <Calendar className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" />
          <span>{new Date(lead.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
         {nextStatus && (
           <button 
             onClick={(e) => { e.stopPropagation(); onMove(lead.id, nextStatus); }}
             className="text-[10px] font-bold uppercase text-blue-600 hover:text-blue-800 flex items-center bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
           >
             Mover <ArrowRight className="w-3 h-3 ml-1" />
           </button>
         )}
         {lead.status_kanban !== 'CANCELADA' && (
            <button 
              onClick={(e) => { e.stopPropagation(); onMove(lead.id, 'CANCELADA'); }}
              className="text-[10px] font-bold uppercase text-red-400 hover:text-red-600 ml-auto hover:bg-red-50 px-2 py-1 rounded transition-colors"
            >
              Cancelar
            </button>
         )}
      </div>
    </div>
  );
};