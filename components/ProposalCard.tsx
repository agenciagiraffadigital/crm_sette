import React from 'react';
import { Lead, KanbanStatus } from '../types';
import { Phone, Mail, User, Calendar, ArrowRight, Building2, PersonStanding, DollarSign, Trash2, XCircle } from 'lucide-react';
import { maskPhone } from '../utils/masks';
import { formatDateTimeCard } from '../utils/formatters';
import { KANBAN_COLUMNS } from '../constants';
import { Card } from '../src/components/ui/Card';
import { Button } from '../src/components/ui/Button';

interface ProposalCardProps {
  proposal: Lead;
  onMove: (id: number, newStatus: KanbanStatus) => void;
  onClick: (proposal: Lead) => void;
  onLost?: (proposal: Lead) => void;
  onDelete?: (id: number) => void;
  currentUser?: any;
}

export const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, onMove, onClick, onLost, onDelete, currentUser }) => {
  
  const getNextStatus = (current: KanbanStatus): KanbanStatus | null => {
    const idx = KANBAN_COLUMNS.findIndex(c => c.id === current);
    if (idx !== -1 && idx < KANBAN_COLUMNS.length - 1) {
      return KANBAN_COLUMNS[idx + 1].id as KanbanStatus;
    }
    return null;
  };

  const nextStatus = getNextStatus(proposal.status_kanban);

  const typeConfig = {
    'PF': { color: 'bg-blue-100 text-blue-700', icon: PersonStanding },
    'PJ': { color: 'bg-purple-100 text-purple-700', icon: Building2 },
    'ADESAO': { color: 'bg-pink-100 text-pink-700', icon: PersonStanding }
  }[proposal.tipo_cliente] || { color: 'bg-gray-100 text-gray-700', icon: User };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    const data = {
      proposalId: proposal.id,
      currentStatus: proposal.status_kanban
    };
    e.dataTransfer.setData('text/plain', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset any visual changes
  };

  const formatCurrency = (value?: number) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div 
      className="bg-white shadow-sm p-4 rounded-lg transition-shadow duration-200 hover:shadow-md group cursor-pointer relative transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg select-none"
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onClick(proposal)}
      title="Clique para editar ou arraste para mover"
    >
      {/* Main Info */}
      <div>
        <div className="flex justify-between items-start mb-1">
          <h4 className="font-bold text-slate-800 truncate text-sm flex-1" title={proposal.nome}>
            {proposal.nome}
          </h4>
          <span className="text-xs text-slate-400 font-mono ml-2">#{proposal.id}</span>
        </div>
        <p className="text-xs text-slate-500 mb-3 font-medium">
          {proposal.produto || 'Produto N/A'} - {proposal.operadora || 'N/A'}
        </p>
      </div>
      
      {/* Essential Information */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center text-xs text-slate-600">
          <Mail className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" />
          <span className="truncate" title={proposal.email}>{proposal.email}</span>
        </div>
        <div className="flex items-center text-xs text-slate-600">
          <Phone className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" />
          <span>{maskPhone(proposal.telefone)}</span>
        </div>
        <div className="flex items-center text-xs text-slate-600">
          <User className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" />
          <span className="truncate">{proposal.vendedor}</span>
        </div>
        {proposal.valor_produto && (
          <div className="flex items-center text-xs text-slate-600">
            <DollarSign className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" />
            <span className="font-semibold text-green-600">{formatCurrency(proposal.valor_produto)}</span>
          </div>
        )}
      </div>

      {/* Entry date */}
      <div className="flex items-center text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">
        <Calendar className="w-3 h-3 mr-1.5 flex-shrink-0" />
        <span>{formatDateTimeCard(proposal.created_at)}</span>
      </div>

      {/* Status Indicator */}
    </div>
  );
};