import { Lead, User } from './types';

export const KANBAN_COLUMNS = [
  { id: 'ENVIADA', label: 'Oportunidade Recebida', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'ANÁLISE', label: 'Em Análise (Adm)', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'IMPLANTADA', label: 'Implantada', color: 'bg-green-100 text-green-800 border-green-200' },
  { id: 'CANCELADA', label: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-200' },
] as const;

export const PRODUCTS_LIST = [
  { operadora: "Amil", produtos: ["Amil S380", "Amil S450", "Amil S750", "Amil One"] },
  { operadora: "Bradesco", produtos: ["Efetivo", "Nacional Flex", "Top Nacional", "Top Nacional Plus"] },
  { operadora: "SulAmérica", produtos: ["Direto", "Exato", "Especial 100", "Executivo"] },
  { operadora: "Unimed", produtos: ["Absoluto", "Superior", "Exclusivo"] },
  { operadora: "NotreDame", produtos: ["Smart 200", "Smart 400", "Advance 600", "Premium 900"] },
];

export const INITIAL_USERS: User[] = [
  { id: 1, name: "Admin Geral", email: "admin@settesaude.com.br", role: 'ADMIN', password: "123" },
  { id: 2, name: "Nayara Bertolino", email: "nayara@settesaude.com.br", role: 'SELLER', password: "123" },
  { id: 3, name: "Carlos Silva", email: "carlos@settesaude.com.br", role: 'SELLER', password: "123" },
  { id: 4, name: "Mariana Souza", email: "mariana@settesaude.com.br", role: 'SELLER', password: "123" },
];

const mockAddress = {
  cep: "01001-000",
  logradouro: "Praça da Sé",
  numero: "100",
  bairro: "Sé",
  cidade: "São Paulo",
  uf: "SP"
};

export const INITIAL_LEADS: Lead[] = [
  {
    id: 13825749,
    nome: "Tech Solutions Ltda",
    email: "contato@techsolutions.com",
    telefone: "19996648624",
    tipo_cliente: "PJ",
    cpf_cnpj: "12.345.678/0001-90",
    operadora: "Amil",
    produto: "Amil S380",
    origem: "SITE",
    vendedor: "Nayara Bertolino",
    vendedor_email: "nayara@settesaude.com.br",
    vendedor_id: 2,
    status_kanban: "ENVIADA",
    created_at: "2023-10-06T06:02:07",
    updated_at: "2023-10-06T06:02:07",
    endereco: mockAddress,
    beneficiarios: [],
    mensagens: [],
    documentos: [],
    coparticipacao: 'PARCIAL',
    reducao_carencia: true,
    dados_responsavel: {
        nome: "Cris Melo",
        cpf: "123.456.789-00",
        endereco: "Rua Exemplo, 123",
        data_nascimento: "1985-05-20"
    }
  },
  {
    id: 13825750,
    nome: "Roberto Almeida",
    email: "roberto.eng@tech.com",
    telefone: "11988776655",
    tipo_cliente: "PF",
    cpf_cnpj: "987.654.321-00",
    operadora: "Bradesco",
    produto: "Top Nacional",
    origem: "INSTAGRAM",
    vendedor: "Carlos Silva",
    vendedor_email: "carlos@settesaude.com.br",
    vendedor_id: 3,
    status_kanban: "ANÁLISE",
    created_at: "2023-10-07T10:15:00",
    updated_at: "2023-10-07T10:15:00",
    endereco: mockAddress,
    beneficiarios: [],
    mensagens: [
        { id: '1', user_name: 'Admin Geral', role: 'ADMIN', message: 'Falta o comprovante de residência.', created_at: new Date().toISOString() }
    ],
    documentos: ["RG.pdf"],
    coparticipacao: 'NÃO'
  },
  {
    id: 13825751,
    nome: "Clínica Vida",
    email: "contato@clinicavida.com.br",
    telefone: "1133445566",
    tipo_cliente: "PJ",
    cpf_cnpj: "98.765.432/0001-10",
    operadora: "SulAmérica",
    produto: "Exato",
    origem: "INDICAÇÃO",
    vendedor: "Mariana Souza",
    vendedor_email: "mariana@settesaude.com.br",
    vendedor_id: 4,
    status_kanban: "IMPLANTADA",
    created_at: "2023-10-05T14:30:00",
    updated_at: "2023-10-08T09:00:00",
    endereco: mockAddress,
    beneficiarios: [],
    mensagens: [],
    documentos: ["Contrato_Social.pdf", "Cartao_CNPJ.pdf"]
  }
];