import React, { useState } from 'react';
import { Opportunity, OpportunityStatus, User } from '../types';
import { Card } from '../src/components/ui/Card';
import { Button } from '../src/components/ui/Button';
import { 
  Phone, 
  Mail, 
  Calendar, 
  DollarSign, 
  ArrowRight, 
  ArrowLeft,
  X,
  CheckCircle,
  Clock,
  User as UserIcon
} from 'lucide-react';

interface OpportunityCardProps {
  opportunity: Opportunity;
  onMove: (opportunityId: number, status: OpportunityStatus) => void;
  onClick: () => void;
  onMarkAsLost: () => void;
  onConvertToProposal: () => void;
  currentUser: User;
  'data-testid'?: string;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  onMove,
  onClick,
  onMarkAsLost,
  onConvertToProposal,
  currentUser,
  'data-testid': testId
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const formatCurrency = (value: number | null) => {
    if (!value) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Há menos de 1h';
    if (diffInHours < 24) return `Há ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Há ${diffInDays} dia${diffInDays > 1 ? 's' : ''}`;
    
    return formatDate(dateString);
  };

  const getStatusColor = (status: OpportunityStatus) => {
    switch (status) {
      case 'OPORTUNIDADES':
        return 'text-blue-600 bg-blue-100';
      case 'EM_CONTATO':
        return 'text-yellow-600 bg-yellow-100';
      case 'NEGOCIAÇÃO':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getAvailableActions = () => {
    const actions = [];

    switch (opportunity.status) {
      case 'OPORTUNIDADES':
        actions.push({
          label: 'Iniciar Contato',
          action: () => onMove(opportunity.id, 'EM_CONTATO'),
          icon: ArrowRight,
          variant: 'primary' as const
        });
        break;
      
      case 'EM_CONTATO':
        actions.push({
          label: 'Voltar',
          action: () => onMove(opportunity.id, 'OPORTUNIDADES'),
          icon: ArrowLeft,
          variant: 'outline' as const
        });
        actions.push({
          label: 'Cotar Valor',
          action: () => onMove(opportunity.id, 'NEGOCIAÇÃO'),
          icon: DollarSign,
          variant: 'primary' as const
        });
        break;
      
      case 'NEGOCIAÇÃO':
        actions.push({
          label: 'Voltar',
          action: () => onMove(opportunity.id, 'EM_CONTATO'),
          icon: ArrowLeft,
          variant: 'outline' as const
        });
        actions.push({
          label: 'Converter',
          action: onConvertToProposal,
          icon: CheckCircle,
          variant: 'primary' as const
        });
        break;
    }

    // Always allow marking as lost
    actions.push({
      label: 'Perdida',
      action: onMarkAsLost,
      icon: X,
      variant: 'danger' as const
    });

    return actions;
  };

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', JSON.stringify({
      opportunityId: opportunity.id,
      currentStatus: opportunity.status
    }));
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const canUserEdit = currentUser.role === 'ADMIN' || opportunity.vendedor_id === currentUser.id;

  return (
    <Card
      variant="default"
      padding="md"
      hover={!isDragging}
      className={`cursor-pointer transition-all duration-200 ${
        isDragging ? 'opacity-50 transform rotate-2' : ''
      } ${!canUserEdit ? 'opacity-75' : ''}`}
      draggable={canUserEdit}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      data-testid={testId}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 
            className="font-semibold text-gray-900 truncate cursor-pointer hover:text-blue-600"
            onClick={onClick}
            title={opportunity.nome}
          >
            {opportunity.nome}
          </h4>
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(opportunity.status)}`}>
            {opportunity.status}
          </div>
        </div>
        <div className="text-xs text-gray-500 ml-2">
          #{opportunity.id}
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center text-sm text-gray-600">
          <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="truncate" title={opportunity.email}>
            {opportunity.email}
          </span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>{opportunity.telefone}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <UserIcon className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="truncate" title={opportunity.vendedor}>
            {opportunity.vendedor}
          </span>
        </div>
      </div>

      {/* Status-specific Info */}
      <div className="space-y-2 mb-3">
        {opportunity.first_contact_date && (
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>Contato: {formatDate(opportunity.first_contact_date)}</span>
          </div>
        )}
        
        {opportunity.quoted_value && (
          <div className="flex items-center text-sm font-medium text-green-600">
            <DollarSign className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{formatCurrency(opportunity.quoted_value)}</span>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <div className="flex items-center">
          <Calendar className="w-3 h-3 mr-1" />
          <span>{getTimeAgo(opportunity.created_at)}</span>
        </div>
        <div className="px-2 py-1 bg-gray-100 rounded text-xs">
          {opportunity.origem}
        </div>
      </div>

      {/* Actions */}
      {canUserEdit && (
        <div className="flex flex-wrap gap-1">
          {getAvailableActions().map((action, index) => (
            <Button
              key={index}
              variant={action.variant}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                action.action();
              }}
              className="flex items-center text-xs"
            >
              <action.icon className="w-3 h-3 mr-1" />
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {!canUserEdit && (
        <div className="text-xs text-gray-500 italic">
          Apenas o vendedor responsável pode editar
        </div>
      )}
    </Card>
  );
};