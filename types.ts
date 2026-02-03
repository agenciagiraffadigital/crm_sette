export type ClientType = 'PF' | 'PJ' | 'ADESAO';

export type KanbanStatus = 'ENVIADA' | 'ANÁLISE' | 'IMPLANTADA' | 'CANCELADA' | 'PROPOSTA';

export type OpportunityStatus = 'OPORTUNIDADES' | 'EM_CONTATO' | 'NEGOCIACAO';

export type Role = 'ADMIN' | 'SELLER';

export type CoparticipationType = 'NÃO' | 'PARCIAL' | 'COMPLETA';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  password?: string;
  
  // New fields for distribution control
  active_for_distribution?: boolean; // Toggle for webhook lead distribution
  last_lead_assigned_at?: string;
  total_leads_assigned?: number;
  
  // Activity tracking
  last_login_at?: string;
  created_at?: string;
  updated_at?: string;
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

export interface ResponsavelFinanceiro {
  id: string;
  lead_id: number;
  nome: string;
  cpf: string;
  rg?: string;
  data_nascimento?: string;
  telefone?: string;
  email?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  created_at: string;
  updated_at: string;
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
  // Endereço
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}

export interface LeadMessage {
  id: string;
  user_name: string;
  role: Role;
  message: string;
  created_at: string;
}

export interface DocumentFile {
  name: string;
  url: string;
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

  // Responsável Financeiro
  titular_eh_responsavel_financeiro?: boolean;
  responsavel_financeiro?: ResponsavelFinanceiro;

  // Beneficiários
  possui_dependentes?: boolean;

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
  documentos: (string | DocumentFile)[]; // List of file names or DocumentFile objects
  
  // Legacy/Internal
  origem: string;
  canal_venda?: string; // Canal específico de venda
  raw_json?: any;
  
  // New fields for tracking
  converted_from_opportunity_id?: number;
  conversion_date?: string;
  
  // Enhanced tracking
  last_activity_at?: string;
  activity_log?: ActivityLog[];
  notes?: Note[];
  
  // Reassignment tracking
  assignment_history?: AssignmentHistory[];
  
  // Win/Loss tracking (JSONB)
  dados_proposta?: {
    motivo_ganho?: string;
    motivo_ganho_outro?: string;
    data_ganho?: string;
  };
  dados_perda?: {
    motivo?: string;
    detalhes?: string;
    data_perda?: string;
  };
}

export interface DashboardStats {
  totalLeads: number;
  conversionRate: number;
  byStatus: Record<KanbanStatus, number>;
  byType: Record<ClientType, number>;
}

export interface LossReason {
  category: 'PREÇO' | 'CONCORRÊNCIA' | 'TIMING' | 'NECESSIDADE' | 'OUTROS';
  description?: string;
}

export interface Opportunity {
  id: number;
  
  // Basic Info
  nome: string;
  email: string;
  telefone: string;
  
  // Status and Flow
  status: OpportunityStatus;
  created_at: string;
  updated_at: string;
  
  // Contact and Value
  first_contact_date?: string;
  quoted_value?: number;
  quoted_at?: string;
  contact_date?: string;
  next_followup?: string;
  
  // Assignment
  vendedor: string;
  vendedor_email: string;
  vendedor_id: number;
  
  // Source and Raw Data
  origem: string;
  raw_json?: any;
  
  // Notes
  notes?: string;
  note_list?: Note[];
  
  // Loss Tracking
  lost_at?: string;
  loss_reason?: LossReason;
  loss_description?: string;
  
  // Conversion
  converted_to_proposal_at?: string;
  proposal_id?: number;
}

export interface AssignmentHistory {
  id: string;
  opportunity_id?: number;
  lead_id?: number;
  previous_seller_id?: number;
  new_seller_id: number;
  assigned_by_user_id: number;
  assigned_by_name: string;
  reason?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  opportunity_id?: number;
  lead_id?: number;
  type: 'STATUS_CHANGE' | 'DOCUMENT_UPLOAD' | 'NOTE_ADDED' | 'VALUE_UPDATED' | 'REASSIGNMENT' | 'CONTACT_MADE' | 'LOSS_RECORDED' | 'CONVERSION';
  description: string;
  user_id: number;
  user_name: string;
  created_at: string;
  metadata?: any;
}

export interface Note {
  id: string;
  lead_id: number;
  atividade: 'Apresentação' | 'Ligação' | 'Proposta' | 'Reunião' | 'Whatsapp';
  data: string;
  horario: string;
  duracao?: string;
  anotacoes: string;
  user_id: number;
  user_name: string;
  created_at: string;
  updated_at: string;
}