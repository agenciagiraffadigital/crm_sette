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

/**
 * Garante que timestamps do Supabase (timestamp without time zone)
 * sejam interpretados como UTC antes de converter para São Paulo.
 */
const toUTCDate = (dateString: string): Date => {
  // Se já tem timezone info (Z, +, -), não mexe
  if (/Z|[+-]\d{2}:\d{2}$/.test(dateString)) {
    return new Date(dateString);
  }
  // Senão, assume UTC adicionando Z
  return new Date(dateString + 'Z');
};

export const formatDate = (dateString: string): string => {
  return toUTCDate(dateString).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
};

export const formatDateTime = (dateString: string): string => {
  return toUTCDate(dateString).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
};

export const formatDateTimeCard = (dateString: string): string => {
  const date = toUTCDate(dateString);
  const datePart = date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const timePart = date.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  return `${datePart} às ${timePart}`;
};

export const getTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = toUTCDate(dateString);
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Há poucos minutos';
  if (diffInHours < 24) return `Há ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `Há ${diffInDays} dia${diffInDays > 1 ? 's' : ''}`;
  
  return formatDate(dateString);
};
