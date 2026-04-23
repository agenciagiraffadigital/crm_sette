import { Lead, KanbanStatus, User, Note } from '../types';
import { supabase } from './supabaseClient';
import { authService } from './authService';
import { ExportRow } from '../utils/exportToExcel';

export interface LeadQueryFilters {
  searchTerm?: string;
  sellers?: string[];
  operators?: string[];
  products?: string[];
  sources?: string[];
  dateRange?: { start?: string; end?: string };
  valueRange?: { min?: number; max?: number };
  sortBy?: string;
}

export const leadService = {
  getLeadsByStatus: async (currentUser: User, status: KanbanStatus, from: number, to: number, filters?: LeadQueryFilters): Promise<{ data: Lead[], count: number }> => {
    let query = supabase
      .from('leads')
      .select('id, nome, email, telefone, tipo_cliente, operadora, produto, valor_produto, vendedor, vendedor_id, status_kanban, created_at, origem, updated_at', { count: 'exact' })
      .eq('status_kanban', status);

    if (currentUser.role !== 'ADMIN') {
      query = query.eq('vendedor_id', currentUser.id);
    }

    if (filters?.searchTerm) {
      const term = filters.searchTerm;
      query = query.or(`nome.ilike.%${term}%,email.ilike.%${term}%,telefone.ilike.%${term}%`);
    }
    if (filters?.sellers?.length) {
      query = query.in('vendedor', filters.sellers);
    }
    if (filters?.operators?.length) {
      query = query.in('operadora', filters.operators);
    }
    if (filters?.products?.length) {
      query = query.in('produto', filters.products);
    }
    if (filters?.sources?.length) {
      query = query.in('origem', filters.sources);
    }
    if (filters?.dateRange?.start) {
      query = query.gte('created_at', filters.dateRange.start);
    }
    if (filters?.dateRange?.end) {
      query = query.lte('created_at', filters.dateRange.end + 'T23:59:59');
    }
    if (filters?.valueRange?.min !== undefined) {
      query = query.gte('valor_produto', filters.valueRange.min);
    }
    if (filters?.valueRange?.max !== undefined) {
      query = query.lte('valor_produto', filters.valueRange.max);
    }

    if (filters?.sortBy === 'name-asc') {
      query = query.order('nome', { ascending: true }).order('id', { ascending: true });
    } else if (filters?.sortBy === 'name-desc') {
      query = query.order('nome', { ascending: false }).order('id', { ascending: true });
    } else if (filters?.sortBy === 'date-asc') {
      query = query.order('created_at', { ascending: true }).order('id', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false }).order('id', { ascending: false });
    }

    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      data: (data || []).map(row => ({
        id: row.id, nome: row.nome, email: row.email, telefone: row.telefone,
        tipo_cliente: row.tipo_cliente, cpf_cnpj: '', rg_ie: '', data_nascimento_abertura: '',
        dados_responsavel: null, havera_remissao: false, operadora: row.operadora,
        produto: row.produto, valor_produto: row.valor_produto, reducao_carencia: false,
        coparticipacao: 'NÃO' as const, vigencia: '', endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' },
        beneficiarios: [], mensagens: [], documentos: [], origem: '', canal_venda: '', raw_json: null,
        vendedor: row.vendedor, vendedor_email: '', vendedor_id: row.vendedor_id,
        status_kanban: row.status_kanban, created_at: row.created_at, updated_at: row.updated_at || row.created_at,
        origem: row.origem || '',
      })),
      count: count || 0
    };
  },

  getLeads: async (currentUser: User): Promise<Lead[]> => {
    const statuses: KanbanStatus[] = ['ENVIADA', 'ANÁLISE', 'ANÁLISE_OPERADORA', 'IMPLANTADA', 'CANCELADA', 'PERDIDA', 'PROPOSTA'];
    const results = await Promise.all(statuses.map(s => leadService.getLeadsByStatus(currentUser, s, 0, 29)));
    return results.flatMap(r => r.data);
  },

  _getLeads_unused: async (currentUser: User): Promise<Lead[]> => {
    let query = supabase
      .from('leads')
      .select('id, nome, email, telefone, tipo_cliente, operadora, produto, valor_produto, vendedor, vendedor_id, status_kanban, created_at')
      .in('status_kanban', ['ENVIADA', 'ANÁLISE', 'ANÁLISE_OPERADORA', 'IMPLANTADA', 'CANCELADA', 'PERDIDA', 'PROPOSTA'])
      .order('created_at', { ascending: false })
      .range(0, 999);
    
    if (currentUser.role !== 'ADMIN') {
      query = query.eq('vendedor_id', currentUser.id);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    let leads: Lead[] = data.map(row => ({
      id: row.id,
      nome: row.nome,
      email: row.email,
      telefone: row.telefone,
      tipo_cliente: row.tipo_cliente,
      cpf_cnpj: '',
      rg_ie: '',
      data_nascimento_abertura: '',
      dados_responsavel: null,
      havera_remissao: false,
      operadora: row.operadora,
      produto: row.produto,
      valor_produto: row.valor_produto,
      reducao_carencia: false,
      coparticipacao: 'NÃO' as const,
      vigencia: '',
      endereco: {
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: ''
      },
      beneficiarios: [],
      mensagens: [],
      documentos: [],
      origem: '',
      canal_venda: '',
      raw_json: null,
      vendedor: row.vendedor,
      vendedor_email: '',
      vendedor_id: row.vendedor_id,
      status_kanban: row.status_kanban,
      created_at: row.created_at,
      updated_at: row.created_at,
    }));
    
    if (currentUser.role !== 'ADMIN') {
      leads = leads.filter(l => l.vendedor_id === currentUser.id);
    }
    
    return leads;
  },

  // Get lead by ID with responsavel financeiro
  getLeadById: async (id: number): Promise<Lead> => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) throw new Error("Lead not found");
    
    // Buscar responsável financeiro se existir
    let responsavel_financeiro = undefined;
    if (!data.titular_eh_responsavel_financeiro) {
      const { data: respData, error: respError } = await supabase
        .from('responsaveis_financeiros')
        .select('*')
        .eq('lead_id', id)
        .maybeSingle();
      
      if (!respError && respData) {
        responsavel_financeiro = respData;
      }
    }

    // Buscar beneficiários
    const { data: benData, error: benError } = await supabase
      .from('beneficiarios')
      .select('*')
      .eq('lead_id', id);
    
    let beneficiarios = [];
    if (!benError && benData) {
      // Agrupar titulares e dependentes
      const titulares = benData.filter(b => b.tipo === 'TITULAR');
      beneficiarios = titulares.map(titular => ({
        id: titular.id,
        nome: titular.nome,
        cpf: titular.cpf,
        rg: titular.rg,
        email: titular.email,
        telefone: titular.telefone,
        data_nascimento: titular.data_nascimento,
        parentesco: titular.parentesco,
        tipo_beneficiario: titular.tipo_beneficiario || 'TITULAR',
        tipo_dependente: titular.tipo_dependente,
        type: 'TITULAR' as const,
        cep: titular.cep,
        logradouro: titular.logradouro,
        numero: titular.numero,
        complemento: titular.complemento,
        bairro: titular.bairro,
        cidade: titular.cidade,
        estado: titular.estado,
        dependentes: benData.filter(b => b.tipo === 'DEPENDENTE' && b.titular_id === titular.id).map(dep => ({
          id: dep.id,
          nome: dep.nome,
          cpf: dep.cpf,
          rg: dep.rg,
          email: dep.email,
          telefone: dep.telefone,
          data_nascimento: dep.data_nascimento,
          parentesco: dep.parentesco,
          tipo_beneficiario: dep.tipo_beneficiario || 'DEPENDENTE',
          tipo_dependente: dep.tipo_dependente,
          type: 'DEPENDENTE' as const,
          titular_id: dep.titular_id,
          cep: dep.cep,
          logradouro: dep.logradouro,
          numero: dep.numero,
          complemento: dep.complemento,
          bairro: dep.bairro,
          cidade: dep.cidade,
          estado: dep.estado
        }))
      }));
    }
    
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
      titular_eh_responsavel_financeiro: data.titular_eh_responsavel_financeiro ?? true,
      responsavel_financeiro,
      possui_dependentes: data.possui_dependentes ?? false,
      operadora: data.operadora,
      produto: data.produto,
      valor_produto: data.valor_produto,
      reducao_carencia: data.reducao_carencia,
      coparticipacao: data.coparticipacao,
      vigencia: data.vigencia,
      // Campos de endereço diretos
      cep: data.cep,
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      cidade: data.cidade,
      estado: data.estado,
      endereco: data.endereco,
      beneficiarios,
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

  saveLead: async (lead: Lead, currentUser?: User): Promise<Lead> => {
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
        titular_eh_responsavel_financeiro: lead.titular_eh_responsavel_financeiro ?? true,
        possui_dependentes: lead.possui_dependentes ?? false,
        operadora: lead.operadora,
        produto: lead.produto,
        valor_produto: lead.valor_produto != null ? Number(lead.valor_produto) : null,
        reducao_carencia: lead.reducao_carencia,
        coparticipacao: lead.coparticipacao,
        vigencia: lead.vigencia,
        cep: lead.cep || lead.endereco?.cep || '',
        logradouro: lead.logradouro || lead.endereco?.logradouro || '',
        numero: lead.numero || lead.endereco?.numero || '',
        complemento: lead.complemento || lead.endereco?.complemento || '',
        bairro: lead.bairro || lead.endereco?.bairro || '',
        cidade: lead.cidade || lead.endereco?.cidade || '',
        estado: lead.estado || lead.endereco?.uf || '',
        beneficiarios: lead.beneficiarios,
        mensagens: lead.mensagens,
        documentos: lead.documentos,
        origem: lead.origem,
        canal_venda: lead.canal_venda,
        raw_json: lead.raw_json,
        vendedor: lead.vendedor,
        vendedor_email: lead.vendedor_email,
        vendedor_id: lead.vendedor_id,
        status_kanban: lead.status_kanban,
        dados_proposta: lead.dados_proposta || null,
        dados_perda: lead.dados_perda || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead.id);
    if (error) throw error;
    
    // Gerenciar responsável financeiro
    if (!lead.titular_eh_responsavel_financeiro && lead.responsavel_financeiro) {
      const respData = lead.responsavel_financeiro;
      
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('responsaveis_financeiros')
        .select('id')
        .eq('lead_id', lead.id)
        .maybeSingle();
      
      if (existing) {
        // Atualizar
        await supabase
          .from('responsaveis_financeiros')
          .update({
            nome: respData.nome,
            cpf: respData.cpf,
            rg: respData.rg,
            data_nascimento: respData.data_nascimento,
            telefone: respData.telefone,
            email: respData.email,
            cep: respData.cep,
            logradouro: respData.logradouro,
            numero: respData.numero,
            complemento: respData.complemento,
            bairro: respData.bairro,
            cidade: respData.cidade,
            estado: respData.estado,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Criar
        await supabase
          .from('responsaveis_financeiros')
          .insert({
            lead_id: lead.id,
            nome: respData.nome,
            cpf: respData.cpf,
            rg: respData.rg,
            data_nascimento: respData.data_nascimento,
            telefone: respData.telefone,
            email: respData.email,
            cep: respData.cep,
            logradouro: respData.logradouro,
            numero: respData.numero,
            complemento: respData.complemento,
            bairro: respData.bairro,
            cidade: respData.cidade,
            estado: respData.estado,
          });
      }
    } else if (lead.titular_eh_responsavel_financeiro) {
      // Deletar responsável financeiro se titular passou a ser o responsável
      await supabase
        .from('responsaveis_financeiros')
        .delete()
        .eq('lead_id', lead.id);
    }

    // Gerenciar beneficiários - sempre salvar se houver
    if (lead.beneficiarios && lead.beneficiarios.length > 0) {
      // Deletar todos os beneficiários existentes
      await supabase.from('beneficiarios').delete().eq('lead_id', lead.id);
      
      // Inserir titulares e dependentes
      const allBeneficiarios: any[] = [];
      
      lead.beneficiarios.forEach(titular => {
        allBeneficiarios.push({
          lead_id: lead.id,
          nome: titular.nome,
          cpf: titular.cpf || null,
          rg: titular.rg || null,
          data_nascimento: titular.data_nascimento || null,
          telefone: titular.telefone || null,
          email: titular.email || null,
          cep: titular.cep || null,
          logradouro: titular.logradouro || null,
          numero: titular.numero || null,
          complemento: titular.complemento || null,
          bairro: titular.bairro || null,
          cidade: titular.cidade || null,
          estado: titular.estado || null,
          parentesco: titular.parentesco || 'Titular',
          tipo_beneficiario: titular.tipo_beneficiario || 'TITULAR',
          tipo_dependente: titular.tipo_dependente || null,
          tipo: 'TITULAR'
        });
        
        if (titular.dependentes) {
          titular.dependentes.forEach(dep => {
            allBeneficiarios.push({
              lead_id: lead.id,
              nome: dep.nome,
              cpf: dep.cpf || null,
              rg: dep.rg || null,
              data_nascimento: dep.data_nascimento || null,
              telefone: dep.telefone || null,
              email: dep.email || null,
              cep: dep.cep || null,
              logradouro: dep.logradouro || null,
              numero: dep.numero || null,
              complemento: dep.complemento || null,
              bairro: dep.bairro || null,
              cidade: dep.cidade || null,
              estado: dep.estado || null,
              parentesco: dep.parentesco || 'Dependente',
              tipo_beneficiario: dep.tipo_beneficiario || 'DEPENDENTE',
              tipo_dependente: dep.tipo_dependente || 'CONJUGE',
              tipo: 'DEPENDENTE'
            });
          });
        }
      });
      
      if (allBeneficiarios.length > 0) {
        const { data: insertedBens, error: insertError } = await supabase
          .from('beneficiarios')
          .insert(allBeneficiarios)
          .select();
        
        if (insertError) throw insertError;
        
        // Criar documentos obrigatórios para cada beneficiário
        if (insertedBens && lead.operadora && lead.produto && lead.tipo_cliente) {
          const { data: operadora } = await supabase
            .from('operadoras')
            .select('id')
            .eq('nome', lead.operadora)
            .single();
          
          const { data: produto } = await supabase
            .from('produtos')
            .select('id')
            .eq('nome', lead.produto)
            .single();
          
          if (operadora && produto) {
            const { data: configs } = await supabase
              .from('documento_configs')
              .select('id')
              .eq('operadora_id', operadora.id)
              .eq('produto_id', produto.id)
              .eq('tipo_cliente', lead.tipo_cliente)
              .eq('ativo', true);
            
            if (configs && configs.length > 0) {
              const docsToCreate = [];
              for (const ben of insertedBens) {
                for (const config of configs) {
                  docsToCreate.push({
                    beneficiario_id: ben.id,
                    documento_config_id: config.id,
                    status: 'PENDENTE'
                  });
                }
              }
              
              if (docsToCreate.length > 0) {
                await supabase.from('beneficiario_documentos').insert(docsToCreate);
              }
            }
          }
        }
      }
    } else {
      await supabase.from('beneficiarios').delete().eq('lead_id', lead.id);
    }
    
    if (currentUser) {
      await leadService.addActivityLog(lead.id, {
        tipo: 'ATUALIZACAO',
        descricao: `Lead atualizado por ${currentUser.name}`,
        usuario_id: currentUser.id,
        usuario_nome: currentUser.name
      });
    }
    
    return await leadService.getLeadById(lead.id);
  },

  updateLeadStatus: async function(id: number, status: KanbanStatus, currentUser?: User): Promise<Lead> {
    // Buscar status anterior ANTES de atualizar
    const { data: currentLead } = await supabase
      .from('leads')
      .select('status_kanban')
      .eq('id', id)
      .single();
    
    const oldStatus = currentLead?.status_kanban;
    
    const lead = await leadService.getLeadById(id);
    const updatedLead = { ...lead, status_kanban: status, updated_at: new Date().toISOString() };
    
    await supabase
      .from('leads')
      .update({ status_kanban: status, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (currentUser && oldStatus) {
      const { formatStatus } = await import('../utils/formatters');
      
      // Log especial para CANCELADA ou PERDIDA
      if (status === 'CANCELADA' || status === 'PERDIDA') {
        await leadService.addActivityLog(id, {
          tipo: 'LEAD_PERDIDO',
          descricao: `Lead movido para ${status === 'PERDIDA' ? 'Perdidas' : 'Canceladas'}`,
          usuario_id: currentUser.id,
          usuario_nome: currentUser.name,
          metadata: { status_anterior: oldStatus, status_novo: status }
        });
      }
      // Log especial para IMPLANTADA (ganhou)
      else if (status === 'IMPLANTADA') {
        await leadService.addActivityLog(id, {
          tipo: 'LEAD_GANHO',
          descricao: `Proposta ganha! Lead movido para Implantada`,
          usuario_id: currentUser.id,
          usuario_nome: currentUser.name,
          metadata: { status_anterior: oldStatus, status_novo: status }
        });
      }
      // Log especial quando sai de CANCELADA ou PERDIDA
      else if (oldStatus === 'CANCELADA' || oldStatus === 'PERDIDA') {
        await leadService.addActivityLog(id, {
          tipo: 'LEAD_RECUPERADO',
          descricao: `Lead recuperado de ${oldStatus === 'PERDIDA' ? 'Perdidas' : 'Canceladas'} para ${formatStatus(status)}`,
          usuario_id: currentUser.id,
          usuario_nome: currentUser.name,
          metadata: { status_anterior: oldStatus, status_novo: status }
        });
      }
      // Log normal de mudança de status
      else {
        await leadService.addActivityLog(id, {
          tipo: 'MUDANCA_STATUS',
          descricao: `Status alterado de ${formatStatus(oldStatus)} para ${formatStatus(status)}`,
          usuario_id: currentUser.id,
          usuario_nome: currentUser.name,
          metadata: { status_anterior: oldStatus, status_novo: status }
        });
      }
    }
    
    return updatedLead;
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
      // Campos separados de endereço
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      beneficiarios: [],
      mensagens: [],
      documentos: [],
      origem: item.sales_channel?.name || 'Webhook',
      canal_venda: item.utm_source || item.custom_fields?.canal_venda || '',
      raw_json: rawJson,
      vendedor: nextSeller.name,
      vendedor_email: nextSeller.email,
      vendedor_id: nextSeller.id,
      status_kanban: 'OPORTUNIDADES' as const,
    };

    // 6. Salvar no Supabase
    const { data, error } = await supabase
      .from('leads')
      .insert(newLead)
      .select()
      .single();

    if (error) throw error;

    // Registrar log de criação
    await leadService.addActivityLog(data.id, {
      tipo: 'CRIACAO',
      descricao: `Lead criado via webhook - Origem: ${newLead.origem}`,
      usuario_id: nextSeller.id,
      usuario_nome: nextSeller.name
    });

    return {
      id: data.id,
      ...newLead,
      endereco: {
        cep: data.cep || '',
        logradouro: data.logradouro || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        cidade: data.cidade || '',
        uf: data.estado || ''
      },
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },

  // Upload de arquivo
  uploadFile: async (leadId: number, file: File): Promise<{ name: string; url: string }> => {
    if (!file.type.match(/application\/pdf|image\/(png|jpeg)/)) {
      throw new Error('Apenas PDF, PNG e JPEG são permitidos');
    }

    // Sanitizar nome do arquivo: remover espaços e caracteres especiais
    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_');
    
    const fileName = `lead_${leadId}_${Date.now()}_${sanitizedName}`;
    console.log('Nome do arquivo sanitizado:', fileName);
    
    const { error: uploadError } = await supabase.storage
      .from('leads-documents')
      .upload(fileName, file);
      
    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('leads-documents')
      .getPublicUrl(fileName);

    return {
      name: file.name, // Manter nome original para exibição
      url: data.publicUrl,
    };
  },

  // Download de arquivo
  downloadFile: async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from('leads-documents')
      .download(filePath);

    if (error) throw error;
    return data;
  },

  // Deletar arquivo
  deleteFile: async (filePath: string) => {
    const { error } = await supabase.storage
      .from('leads-documents')
      .remove([filePath]);

    if (error) throw error;
  },

  // Admin Only: Reassign lead to different seller
  reassignLead: async (leadId: number, newSellerId: number, currentUser: User): Promise<Lead> => {
    if (currentUser.role !== 'ADMIN') {
      throw new Error('Apenas administradores podem reatribuir leads');
    }

    // Get the new seller info
    const { data: sellerData, error: sellerError } = await supabase
      .from('users_profile')
      .select('id, name, email')
      .eq('id', newSellerId)
      .eq('role', 'SELLER')
      .single();

    if (sellerError || !sellerData) {
      throw new Error('Vendedor não encontrado');
    }

    // Update the lead
    const { data, error } = await supabase
      .from('leads')
      .update({
        vendedor: sellerData.name,
        vendedor_email: sellerData.email,
        vendedor_id: sellerData.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;

    // Create assignment history record (if table exists)
    try {
      await supabase.from('assignment_history').insert({
        lead_id: leadId,
        new_seller_id: newSellerId,
        assigned_by_user_id: currentUser.id,
        assigned_by_name: currentUser.name,
        reason: 'Admin reassignment',
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      // Assignment history table might not exist yet, ignore error
      console.log('Assignment history not recorded:', e);
    }

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

  // Admin Only: Distribute leads round-robin among active sellers
  distributeLeadsRoundRobin: async (leadIds: number[], sellerIds: number[], currentUser: User): Promise<void> => {
    if (currentUser.role !== 'ADMIN') throw new Error('Apenas administradores podem redistribuir leads');

    const { data: sellers, error } = await supabase
      .from('users_profile')
      .select('id, name, email')
      .in('id', sellerIds);

    if (error || !sellers?.length) throw new Error('Vendedores não encontrados');

    const updates = leadIds.map((leadId, i) => {
      const seller = sellers[i % sellers.length];
      return supabase.from('leads').update({
        vendedor: seller.name,
        vendedor_email: seller.email,
        vendedor_id: seller.id,
        updated_at: new Date().toISOString(),
      }).eq('id', leadId);
    });

    await Promise.all(updates);
  },

  // Admin Only: Bulk reassign leads to different seller
  bulkReassignLeads: async (leadIds: number[], newSellerId: number, currentUser: User): Promise<void> => {
    if (currentUser.role !== 'ADMIN') {
      throw new Error('Apenas administradores podem reatribuir leads');
    }

    const { data: sellerData, error: sellerError } = await supabase
      .from('users_profile')
      .select('id, name, email')
      .eq('id', newSellerId)
      .single();

    if (sellerError || !sellerData) throw new Error('Vendedor não encontrado');

    const { error } = await supabase
      .from('leads')
      .update({
        vendedor: sellerData.name,
        vendedor_email: sellerData.email,
        vendedor_id: sellerData.id,
        updated_at: new Date().toISOString(),
      })
      .in('id', leadIds);

    if (error) throw error;

    await Promise.all(leadIds.map(leadId =>
      leadService.addActivityLog(leadId, {
        tipo: 'REASSIGNMENT',
        descricao: `Lead transferido para ${sellerData.name} por ${currentUser.name}`,
        usuario_id: currentUser.id,
        usuario_nome: currentUser.name,
      })
    ));
  },

  // Get leads by user (seller)
  getLeadsByUser: async (userId: number): Promise<Lead[]> => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('vendedor_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user leads:', error);
      return [];
    }

    return data || [];
  },

  // Admin Only: Delete lead permanently
  deleteLead: async (leadId: number, currentUser: User): Promise<void> => {
    if (currentUser.role !== 'ADMIN') {
      throw new Error('Apenas administradores podem excluir leads');
    }

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (error) throw error;
  },

  // Marcar lead como perdido
  markAsLost: async (leadId: number, data: {
    motivo: string;
    detalhes?: string;
    followup: boolean;
    followupData?: string;
    followupStatus?: string;
  }, currentUser: User): Promise<void> => {
    
    const { error } = await supabase
      .from('leads')
      .update({
        status_kanban: 'PERDIDA',
        motivo_perda: data.motivo,
        motivo_perda_detalhes: data.detalhes || null,
        data_perda: new Date().toISOString(),
        followup_ativo: data.followup,
        followup_data: data.followup ? data.followupData : null,
        followup_status: data.followup ? data.followupStatus : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (error) throw error;

    // Registrar log
    await leadService.addActivityLog(leadId, {
      tipo: 'LEAD_PERDIDO',
      descricao: `Lead marcado como perdido: ${data.motivo}${data.detalhes ? ' - ' + data.detalhes : ''}`,
      usuario_id: currentUser.id,
      usuario_nome: currentUser.name
    });

    if (data.followup) {
      await leadService.addActivityLog(leadId, {
        tipo: 'FOLLOWUP_AGENDADO',
        descricao: `Follow-up agendado para ${new Date(data.followupData!).toLocaleDateString('pt-BR')} - Retornar como ${data.followupStatus}`,
        usuario_id: currentUser.id,
        usuario_nome: currentUser.name
      });
    }
  },

  // Adicionar log de atividade
  addActivityLog: async (leadId: number, data: {
    tipo: string;
    descricao: string;
    usuario_id: number;
    usuario_nome: string;
    metadata?: any;
  }): Promise<void> => {

    const { error } = await supabase
      .from('activity_logs')
      .insert({
        lead_id: leadId,
        type: data.tipo,
        description: data.descricao,
        user_id: data.usuario_id,
        user_name: data.usuario_nome,
        metadata: data.metadata || null,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Erro ao registrar log:', error);
      throw error; // Lançar erro ao invés de só logar
    }
  },

  // Buscar logs de atividade
  getActivityLogs: async (leadId: number): Promise<any[]> => {

    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar logs:', error);
      return [];
    }

    // Mapear campos do banco para o formato esperado
    return (data || []).map(log => ({
      id: log.id,
      tipo: log.type,
      descricao: log.description,
      usuario_id: log.user_id,
      usuario_nome: log.user_name,
      created_at: log.created_at,
      metadata: log.metadata
    }));
  },

  // Adicionar nota
  addNote: async (leadId: number, note: Omit<Note, 'id' | 'created_at' | 'updated_at'>): Promise<Note> => {
    const { data, error } = await supabase
      .from('notes')
      .insert({
        lead_id: leadId,
        atividade: note.atividade,
        data: note.data,
        horario: note.horario,
        duracao: note.duracao,
        anotacoes: note.anotacoes,
        user_id: note.user_id,
        user_name: note.user_name
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Atualizar nota
  updateNote: async (noteId: string, note: Omit<Note, 'id' | 'created_at' | 'updated_at'>): Promise<Note> => {
    const { data, error } = await supabase
      .from('notes')
      .update({
        atividade: note.atividade,
        data: note.data,
        horario: note.horario,
        duracao: note.duracao,
        anotacoes: note.anotacoes,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Excluir nota
  deleteNote: async (noteId: string): Promise<void> => {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    if (error) throw error;
  },

  // Buscar notas
  getNotes: async (leadId: number): Promise<Note[]> => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Exportar propostas para Excel (busca todos sem paginação, respeitando filtros)
  getLeadsForExport: async (currentUser: User, statuses: KanbanStatus[], filters?: LeadQueryFilters): Promise<ExportRow[]> => {
    let query = supabase
      .from('leads')
      .select('nome, email, telefone, tipo_cliente, cpf_cnpj, status_kanban, vendedor, operadora, produto, valor_produto, origem, created_at')
      .in('status_kanban', statuses)
      .order('created_at', { ascending: false });

    if (currentUser.role !== 'ADMIN') {
      query = query.eq('vendedor_id', currentUser.id);
    }
    if (filters?.searchTerm) {
      const term = filters.searchTerm;
      query = query.or(`nome.ilike.%${term}%,email.ilike.%${term}%,telefone.ilike.%${term}%`);
    }
    if (filters?.sellers?.length) query = query.in('vendedor', filters.sellers);
    if (filters?.operators?.length) query = query.in('operadora', filters.operators);
    if (filters?.products?.length) query = query.in('produto', filters.products);
    if (filters?.sources?.length) query = query.in('origem', filters.sources);
    if (filters?.dateRange?.start) query = query.gte('created_at', filters.dateRange.start);
    if (filters?.dateRange?.end) query = query.lte('created_at', filters.dateRange.end + 'T23:59:59');
    if (filters?.valueRange?.min !== undefined) query = query.gte('valor_produto', filters.valueRange.min);
    if (filters?.valueRange?.max !== undefined) query = query.lte('valor_produto', filters.valueRange.max);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(row => ({
      nome: row.nome,
      telefone: row.telefone,
      email: row.email,
      tipo_cliente: row.tipo_cliente || '',
      cpf_cnpj: row.cpf_cnpj || '',
      status: row.status_kanban,
      vendedor: row.vendedor,
      operadora: row.operadora,
      produto: row.produto,
      valor: row.valor_produto,
      origem: row.origem,
      data_criacao: row.created_at,
    }));
  },
};