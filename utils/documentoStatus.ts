import { documentoConfigService } from '../services/documentoConfigService';

export interface DocumentoStatusSummary {
  total: number;
  pendentes: number;
  enviados: number;
  aprovados: number;
  rejeitados: number;
  statusGeral: 'completo' | 'aguardando' | 'pendente' | 'rejeitado';
  cor: string;
  icone: string;
}

export async function getBeneficiarioDocumentoStatus(beneficiarioId: string): Promise<DocumentoStatusSummary> {
  try {
    // Validar se é UUID válido (beneficiário salvo no banco)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!beneficiarioId || !uuidRegex.test(beneficiarioId)) {
      return {
        total: 0,
        pendentes: 0,
        enviados: 0,
        aprovados: 0,
        rejeitados: 0,
        statusGeral: 'pendente',
        cor: 'gray',
        icone: '⚪'
      };
    }

    const docs = await documentoConfigService.getBeneficiarioDocumentos(beneficiarioId);
    
    const total = docs.length;
    const pendentes = docs.filter(d => d.status === 'PENDENTE').length;
    const enviados = docs.filter(d => d.status === 'ENVIADO').length;
    const aprovados = docs.filter(d => d.status === 'APROVADO').length;
    const rejeitados = docs.filter(d => d.status === 'REJEITADO').length;
    
    let statusGeral: DocumentoStatusSummary['statusGeral'] = 'pendente';
    let cor = 'red';
    let icone = '🔴';
    
    if (aprovados === total && total > 0) {
      statusGeral = 'completo';
      cor = 'green';
      icone = '🟢';
    } else if (rejeitados > 0) {
      statusGeral = 'rejeitado';
      cor = 'red';
      icone = '⚠️';
    } else if (enviados > 0 && pendentes === 0) {
      statusGeral = 'aguardando';
      cor = 'yellow';
      icone = '🟡';
    }
    
    return {
      total,
      pendentes,
      enviados,
      aprovados,
      rejeitados,
      statusGeral,
      cor,
      icone
    };
  } catch (error) {
    console.error('Erro ao buscar status:', error);
    return {
      total: 0,
      pendentes: 0,
      enviados: 0,
      aprovados: 0,
      rejeitados: 0,
      statusGeral: 'pendente',
      cor: 'gray',
      icone: '⚪'
    };
  }
}
