import { Lead, KanbanStatus, User } from '../types';
import { supabase } from './supabaseClient';
import { authService } from './authService';

export const leadService = {
  getLeads: async (currentUser: User): Promise<Lead[]> => {
    const { data, error } = await supabase.from('leads').select('*');
    if (error) throw error;
    let leads: Lead[] = data.map(row => ({
      id: row.id,
      nome: row.nome,
      email: row.email,
      telefone: row.telefone,
      tipo_cliente: row.tipo_cliente,
      cpf_cnpj: row.cpf_cnpj,
      rg_ie: row.rg_ie,
      data_nascimento_abertura: row.data_nascimento_abertura,
      dados_responsavel: row.dados_responsavel,
      havera_remissao: row.havera_remissao,
      operadora: row.operadora,
      produto: row.produto,
      valor_produto: row.valor_produto,
      reducao_carencia: row.reducao_carencia,
      coparticipacao: row.coparticipacao,
      vigencia: row.vigencia,
      endereco: row.endereco,
      beneficiarios: row.beneficiarios,
      mensagens: row.mensagens,
      documentos: row.documentos,
      origem: row.origem,
      raw_json: row.raw_json,
      vendedor: row.vendedor,
      vendedor_email: row.vendedor_email,
      vendedor_id: row.vendedor_id,
      status_kanban: row.status_kanban,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
    if (currentUser.role === 'ADMIN') {
      return leads;
    } else {
      return leads.filter(l => l.vendedor_id === currentUser.id);
    }
  },

  getLeadById: async (id: number): Promise<Lead> => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) throw new Error("Lead not found");
    return {
      id: data.id,
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      tipo_cliente: data.tipo_cliente,
      cpf_cnpj: data.cpf_cnpj,
      rg_ie: data.rg_ie,
      data_nascimento_abertura: data.data_nascimento_abertura,
      dados_responsavel: data.dados_responsavel,
      havera_remissao: data.havera_remissao,
      operadora: data.operadora,
      produto: data.produto,
      valor_produto: data.valor_produto,
      reducao_carencia: data.reducao_carencia,
      coparticipacao: data.coparticipacao,
      vigencia: data.vigencia,
      endereco: data.endereco,
      beneficiarios: data.beneficiarios,
      mensagens: data.mensagens,
      documentos: data.documentos,
      origem: data.origem,
      raw_json: data.raw_json,
      vendedor: data.vendedor,
      vendedor_email: data.vendedor_email,
      vendedor_id: data.vendedor_id,
      status_kanban: data.status_kanban,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },

  saveLead: async (lead: Lead): Promise<Lead> => {
    const { error } = await supabase
      .from('leads')
      .update({
        nome: lead.nome,
        email: lead.email,
        telefone: lead.telefone,
        tipo_cliente: lead.tipo_cliente,
        cpf_cnpj: lead.cpf_cnpj,
        rg_ie: lead.rg_ie,
        data_nascimento_abertura: lead.data_nascimento_abertura,
        dados_responsavel: lead.dados_responsavel,
        havera_remissao: lead.havera_remissao,
        operadora: lead.operadora,
        produto: lead.produto,
        valor_produto: lead.valor_produto,
        reducao_carencia: lead.reducao_carencia,
        coparticipacao: lead.coparticipacao,
        vigencia: lead.vigencia,
        endereco: lead.endereco,
        beneficiarios: lead.beneficiarios,
        mensagens: lead.mensagens,
        documentos: lead.documentos,
        origem: lead.origem,
        raw_json: lead.raw_json,
        vendedor: lead.vendedor,
        vendedor_email: lead.vendedor_email,
        vendedor_id: lead.vendedor_id,
        status_kanban: lead.status_kanban,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead.id);
    if (error) throw error;
    return lead;
  },

  updateLeadStatus: async function(id: number, status: KanbanStatus): Promise<Lead> {
    const lead = await leadService.getLeadById(id);
    const updatedLead = { ...lead, status_kanban: status, updated_at: new Date().toISOString() };
    return await leadService.saveLead(updatedLead);
  },

  // Mock API to fetch CNPJ data
  fetchCnpjData: async (cnpj: string): Promise<any> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                razao_social: "EMPRESA EXEMPLO LTDA",
                logradouro: "AVENIDA PAULISTA",
                numero: "1000",
                bairro: "BELA VISTA",
                cidade: "SÃO PAULO",
                uf: "SP",
                cep: "01310-100"
            });
        }, 1000);
    });
  },

    simulateWebhookIngestion: async (rawJson: any): Promise<Lead> => {
    // 1. Extrair dados do webhook
    const item = rawJson.value[0];
    const contact = item.contact;
    const { name: nome, email, phone: telefone } = contact;

    // 2. Buscar vendedores ativos
    const sellers = await authService.getActiveSellers();

    const vendedores = sellers
      .filter(u => u.role === 'SELLER')
      .sort((a, b) => a.id - b.id);

    if (vendedores.length === 0) {
      throw new Error('No sellers available for assignment');
    }

    // 3. Buscar último lead com vendedor definido
    const { data: lastLead } = await supabase
      .from('leads')
      .select('vendedor_id')
      .not('vendedor_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 4. Descobrir próximo vendedor
    let nextSeller;

    if (!lastLead) {
      nextSeller = vendedores[0];
    } else {
      const lastIndex = vendedores.findIndex(v => v.id === lastLead.vendedor_id);
      const nextIndex = (lastIndex + 1) % vendedores.length;
      nextSeller = vendedores[nextIndex];
    }

    // 5. Montar lead
    const newLead = {
      nome,
      email,
      telefone,
      tipo_cliente: null,
      cpf_cnpj: contact.document || '',
      rg_ie: '',
      data_nascimento_abertura: '',
      dados_responsavel: null,
      havera_remissao: false,
      operadora: item.custom_fields?.Operadora || '',
      produto: item.products?.[0]?.name || '',
      valor_produto: null,
      reducao_carencia: false,
      coparticipacao: 'NÃO' as const,
      vigencia: '',
      endereco: { cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '' },
      beneficiarios: [],
      mensagens: [],
      documentos: [],
      origem: item.sales_channel?.name || 'Webhook',
      raw_json: rawJson,
      vendedor: nextSeller.name,
      vendedor_email: nextSeller.email,
      vendedor_id: nextSeller.id,
      status_kanban: 'ENVIADA' as const,
    };

    // 6. Salvar no Supabase
    const { data, error } = await supabase
      .from('leads')
      .insert(newLead)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      ...newLead,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }
};