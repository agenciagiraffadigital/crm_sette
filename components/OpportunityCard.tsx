import React from 'react';
import { Opportunity, OpportunityStatus } from '../types';
import { Phone, Mail, User, Calendar, ArrowRight, Target, Clock, DollarSign, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { OPPORTUNITY_COLUMNS } from '../constants';
import { Card } from '../src/components/ui/Card';
import { Button } from '../src/components/ui/Button';

interface OpportunityCardProps {
  opportunity: Opportunity;
  onMove: (id: number, newStatus: OpportunityStatus) => void;
  onClick: (opportunity: Opportunity) => void;
  onMarkAsLost: (id: number) => void;
  onConvertToProposal: (id: number) => void;
  onLost?: (opportunity: Opportunity) => void;
  onDelete?: (id: number) => void;
  currentUser: any;
  'data-testid'?: string;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({ 
  opportunity, 
  onMove, 
  onClick, 
  onMarkAsLost,
  onConvertToProposal,
  onLost,
  onDelete,
  currentUser,
  'data-testid': testId 
}) => {
  
  const getNextStatus = (current: OpportunityStatus): OpportunityStatus | null => {
    const idx = OPPORTUNITY_COLUMNS.findIndex(c => c.id === current);
    if (idx !== -1 && idx < OPPORTUNITY_COLUMNS.length - 1) {
      return OPPORTUNITY_COLUMNS[idx + 1].id as OpportunityStatus;
    }
    return null;
  };

  const nextStatus = getNextStatus(opportunity.status);

  const formatCurrency = (value?: number) => {
    if (!value || value === 0) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Há poucos minutos';
    if (diffInHours < 24) return `Há ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Há ${diffInDays} dia${diffInDays > 1 ? 's' : ''}`;
    
    return formatDate(dateString);
  };

  const statusConfig = {
    'OPORTUNIDADES': { color: 'bg-blue-100 text-blue-700', icon: Target },
    'EM_CONTATO': { color: 'bg-amber-100 text-amber-700', icon: Clock },
    'NEGOCIACAO': { color: 'bg-green-100 text-green-700', icon: DollarSign }
  }[opportunity.status] || { color: 'bg-gray-100 text-gray-700', icon: Target };

  const StatusIcon = statusConfig.icon;

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    console.log('Opportunity drag started:', opportunity.id, opportunity.status);
    const data = {
      opportunityId: opportunity.id,
      currentStatus: opportunity.status
    };
    e.dataTransfer.setData('text/plain', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset any visual changes
  };

  return (
    <div 
      className="group cursor-move relative transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg bg-white p-4 rounded-lg border border-slate-200 select-none"
      onClick={() => onClick(opportunity)}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      data-testid={testId}
      title="Clique para editar ou arraste para mover"
    >
      {/* Header with Title and ID */}
      <div className="flex justify-between items-start mb-1">
        <h4 className="font-bold text-slate-800 truncate text-sm flex-1" title={opportunity.nome}>
          {opportunity.nome}
        </h4>
        <span className="text-xs text-slate-400 font-mono ml-2">#{opportunity.id}</span>
      </div>
      <p className="text-xs text-slate-500 mb-3 font-medium">
        {opportunity.origem || 'Origem N/A'}
      </p>
      
      {/* Essential Information */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center text-xs text-slate-600">
          <Mail className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" />
          <span className="truncate" title={opportunity.email}>{opportunity.email}</span>
        </div>
        <div className="flex items-center text-xs text-slate-600">
          <Phone className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" />
          <span>{opportunity.telefone}</span>
        </div>
        <div className="flex items-center text-xs text-slate-600">
          <User className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" />
          <span className="truncate">{opportunity.vendedor}</span>
        </div>
        {opportunity.status === 'NEGOCIACAO' && opportunity.quoted_value && opportunity.quoted_value > 0 && (
          <div className="flex items-center text-xs text-slate-600">
            <DollarSign className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" />
            <span className="font-semibold text-green-600">{formatCurrency(opportunity.quoted_value)}</span>
          </div>
        )}
      </div>

      {/* Status Indicator */}
    </div>
  );
};