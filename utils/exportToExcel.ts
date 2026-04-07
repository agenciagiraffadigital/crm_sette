import * as XLSX from 'xlsx';

export interface ExportRow {
  nome: string;
  telefone: string;
  email: string;
  tipo_cliente: string;
  cpf_cnpj: string;
  status: string;
  vendedor: string;
  operadora: string;
  produto: string;
  valor: number | null;
  origem: string;
  data_criacao: string;
}

const STATUS_LABELS: Record<string, string> = {
  'OPORTUNIDADES': 'Oportunidade',
  'EM_CONTATO': 'Em Contato',
  'NEGOCIACAO': 'Negociação',
  'ENVIADA': 'Enviada',
  'ANÁLISE': 'Em Análise (Adm)',
  'ANÁLISE_OPERADORA': 'Análise Operadora',
  'IMPLANTADA': 'Implantada',
  'PROPOSTA': 'Proposta',
  'CANCELADA': 'Cancelada',
  'PERDIDA': 'Perdida',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return dateStr;
  }
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null || value === 0) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function exportToExcel(rows: ExportRow[], fileName: string) {
  const data = rows.map(row => ({
    'Nome': row.nome || '',
    'Telefone': row.telefone || '',
    'Email': row.email || '',
    'Tipo Pessoa': row.tipo_cliente || '',
    'CPF/CNPJ': row.cpf_cnpj || '',
    'Status': STATUS_LABELS[row.status] || row.status || '',
    'Vendedor Responsável': row.vendedor || '',
    'Operadora': row.operadora || '',
    'Produto': row.produto || '',
    'Valor': formatCurrency(row.valor),
    'Origem do Lead': row.origem || '',
    'Data de Criação': formatDate(row.data_criacao),
  }));

  const ws = XLSX.utils.json_to_sheet(data);

  // Auto-size columns
  const colWidths = Object.keys(data[0] || {}).map(key => {
    const maxLen = Math.max(
      key.length,
      ...data.map(row => String((row as Record<string, string>)[key] || '').length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
