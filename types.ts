export type ClientType = 'PF' | 'PJ' | 'ADESAO';

export type KanbanStatus = 'ENVIADA' | 'ANÁLISE' | 'IMPLANTADA' | 'CANCELADA';

export type Role = 'ADMIN' | 'SELLER';

export type CoparticipationType = 'NÃO' | 'PARCIAL' | 'COMPLETA';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  password?: string;
}

export interface Address {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface Beneficiary {
  id: string;
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  data_nascimento: string;
  parentesco: string; // Titular, Conjugue, Filho, etc.
  type: 'TITULAR' | 'DEPENDENTE';
}

export interface LeadMessage {
  id: string;
  user_name: string;
  role: Role;
  message: string;
  created_at: string;
}

export interface Lead {
  id: number;
  // Core Identifiers
  nome: string; // Razão Social for PJ, Name for PF
  email: string;
  telefone: string;
  tipo_cliente: ClientType;
  
  // System Fields
  vendedor: string;
  vendedor_email: string;
  vendedor_id: number;
  status_kanban: KanbanStatus;
  created_at: string;
  updated_at: string;

  // Specific Fields
  cpf_cnpj: string; // Holds CPF or CNPJ
  rg_ie?: string; // Inscricao Estadual or RG
  data_nascimento_abertura?: string; // DOB for PF, Opening Date for PJ

  // PJ Specific
  dados_responsavel?: {
    nome: string;
    cpf: string;
    endereco: string;
    data_nascimento: string;
  };
  havera_remissao?: boolean;

  // Common Product Info
  operadora: string;
  produto: string;
  valor_produto?: number;
  reducao_carencia?: boolean;
  coparticipacao?: CoparticipationType;
  vigencia?: string;

  // Collections
  endereco: Address;
  beneficiarios: Beneficiary[];
  mensagens: LeadMessage[]; // For Admin <-> Seller comms
  documentos: string[]; // List of file names
  
  // Legacy/Internal
  origem: string;
  raw_json?: any; 
}

export interface DashboardStats {
  totalLeads: number;
  conversionRate: number;
  byStatus: Record<KanbanStatus, number>;
  byType: Record<ClientType, number>;
}