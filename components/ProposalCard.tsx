import React from 'react';
import { Lead, KanbanStatus } from '../types';
import { Phone, Mail, User, Calendar, ArrowRight, Building2, PersonStanding, DollarSign, Trash2 } from 'lucide-react';
import { KANBAN_COLUMNS } from '../constants';
import { Card } from '../src/components/ui/Card';
import { Button } from '../src/components/ui/Button';

interface ProposalCardProps {
  proposal: Lead;
  onMove: (id: number, newStatus: KanbanStatus) => void;
  onClick: (proposal: Lead) => void;
  onDelete?: (id: number) => void;
  currentUser?: any;
}

export const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, onMove, onClick, onDelete, currentUser }) => {
  
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <Card 
      variant="default"
      padding="md"
      hover={true}
      className="group cursor-move relative transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg select-none"
      onClick={() => onClick(proposal)}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      title="Clique para editar ou arraste para mover"
    >
      {/* Header with Type and ID */}
      <div className="flex justify-between items-start mb-3">
        <div className={`flex items-center space-x-1 text-xs font-bold px-2 py-1 rounded-full ${typeConfig.color}`}>
          <TypeIcon className="w-3 h-3" />
          <span>{proposal.tipo_cliente}</span>
        </div>
        <span className="text-xs text-slate-400 font-mono">#{proposal.id}</span>
      </div>
      
      {/* Main Info */}
      <h4 className="font-bold text-slate-800 mb-1 truncate text-sm" title={proposal.nome}>
        {proposal.nome}
      </h4>
      <p className="text-xs text-slate-500 mb-3 font-medium">
        {proposal.produto || 'Produto N/A'} - {proposal.operadora || 'N/A'}
      </p>
      
      {/* Essential Information */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center text-xs text-slate-600">
          <Mail className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" />
          <span className="truncate" title={proposal.email}>{proposal.email}</span>
        </div>
        <div className="flex items-center text-xs text-slate-600">
          <Phone className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" />
          <span>{proposal.telefone}</span>
        </div>
        <div className="flex items-center text-xs text-slate-600">
          <User className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" />
          <span className="truncate">Vend: {proposal.vendedor}</span>
        </div>
        <div className="flex items-center text-xs text-slate-600">
          <Calendar className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" />
          <span>{formatDate(proposal.created_at)}</span>
        </div>
        {proposal.valor_produto && (
          <div className="flex items-center text-xs text-slate-600">
            <DollarSign className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" />
            <span className="font-semibold text-green-600">{formatCurrency(proposal.valor_produto)}</span>
          </div>
        )}
      </div>

      {/* Action Buttons - Enhanced with smooth animations */}
      <div 
        className="pt-3 border-t border-slate-100 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0" 
        onClick={e => e.stopPropagation()}
      >
        {nextStatus && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { 
              e.stopPropagation(); 
              onMove(proposal.id, nextStatus); 
            }}
            className="text-xs font-bold uppercase text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border-blue-200 hover:border-blue-300 transition-all duration-200"
            icon={<ArrowRight className="w-3 h-3" />}
          >
            Mover
          </Button>
        )}
        
        <div className="flex gap-1 ml-auto">
          {proposal.status_kanban !== 'CANCELADA' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { 
                e.stopPropagation(); 
                onMove(proposal.id, 'CANCELADA'); 
              }}
              className="text-xs font-bold uppercase text-red-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
            >
              Cancelar
            </Button>
          )}
          
          {/* Admin only: Delete button */}
          {currentUser?.role === 'ADMIN' && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { 
                e.stopPropagation(); 
                onDelete(proposal.id); 
              }}
              className="text-xs text-red-600 hover:text-red-800 px-2 py-1"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Status Indicator */}
      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </Card>
  );
};