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
    console.log('Drag started for opportunity:', opportunity.id, opportunity.status);
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
      {/* Header with Status and ID */}
      <div className="flex justify-between items-start mb-3">
        <div className={`flex items-center space-x-1 text-xs font-bold px-2 py-1 rounded-full ${statusConfig.color}`}>
          <StatusIcon className="w-3 h-3" />
          <span>{opportunity.status.replace('_', ' ')}</span>
        </div>
        <span className="text-xs text-slate-400 font-mono">#{opportunity.id}</span>
      </div>
      
      {/* Main Info */}
      <h4 className="font-bold text-slate-800 mb-1 truncate text-sm" title={opportunity.nome}>
        {opportunity.nome}
      </h4>
      <p className="text-xs text-slate-500 mb-3 font-medium">
        {opportunity.origem || 'Origem N/A'}
      </p>
      
      {/* Essential Information */}
      <div className="space-y-1.5 mb-4">
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
          <span className="truncate">Vend: {opportunity.vendedor}</span>
        </div>
        {opportunity.produto && opportunity.produto !== '0' && (
          <div className="flex items-center text-xs text-slate-600">
            <Target className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" />
            <span className="truncate">{opportunity.produto}</span>
          </div>
        )}
        <div className="flex items-center text-xs text-slate-600">
          <Calendar className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" />
          <span>{formatDate(opportunity.created_at)}</span>
        </div>

        {!!opportunity.first_contact_date && (
          <div className="flex items-center text-xs text-slate-600">
            <Clock className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" />
            <span>Contato: {getTimeAgo(opportunity.first_contact_date)}</span>
          </div>
        )}

        {!!opportunity.quoted_value && opportunity.quoted_value > 0 && (
          <div className="flex items-center text-xs text-slate-600">
            <DollarSign className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" />
            <span className="font-semibold text-green-600">{formatCurrency(opportunity.quoted_value)}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div 
        className="pt-3 border-t border-slate-100 flex justify-between items-center" 
        onClick={e => e.stopPropagation()}
      >
        {/* Status-specific action buttons */}
        {opportunity.status === 'OPORTUNIDADES' && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { 
              e.stopPropagation(); 
              onMove(opportunity.id, 'EM_CONTATO'); 
            }}
            className="text-xs font-bold uppercase text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border-blue-200 hover:border-blue-300 transition-all duration-200"
            icon={<ArrowRight className="w-3 h-3" />}
          >
            Contatar
          </Button>
        )}
        
        {opportunity.status === 'EM_CONTATO' && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { 
              e.stopPropagation(); 
              onMove(opportunity.id, 'NEGOCIACAO'); 
            }}
            className="text-xs font-bold uppercase text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200 hover:border-amber-300 transition-all duration-200"
            icon={<DollarSign className="w-3 h-3" />}
          >
            Cotar
          </Button>
        )}
        
        {opportunity.status === 'NEGOCIACAO' && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { 
              e.stopPropagation(); 
              onConvertToProposal(opportunity.id); 
            }}
            className="text-xs font-bold uppercase text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 border-green-200 hover:border-green-300 transition-all duration-200"
            icon={<CheckCircle className="w-3 h-3" />}
          >
            Converter
          </Button>
        )}

        <div className="flex gap-1 ml-auto">
          {/* Always show Mark as Lost */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { 
              e.stopPropagation(); 
              onMarkAsLost(opportunity.id); 
            }}
            className="text-xs font-bold uppercase text-red-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
            icon={<XCircle className="w-3 h-3" />}
          >
            Perdida
          </Button>

          {/* Admin only: Delete button */}
          {currentUser.role === 'ADMIN' && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { 
                e.stopPropagation(); 
                onDelete(opportunity.id); 
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
    </div>
  );
};