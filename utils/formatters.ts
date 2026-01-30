export const formatStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'OPORTUNIDADES': 'Oportunidades',
    'EM_CONTATO': 'Em Contato',
    'NEGOCIACAO': 'Negociação',
    'PROPOSTA': 'Proposta',
    'ENVIADA': 'Enviada',
    'ANÁLISE': 'Análise',
    'IMPLANTADA': 'Implantada',
    'CANCELADA': 'Cancelada'
  };
  
  return statusMap[status] || status;
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
};

export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
};
