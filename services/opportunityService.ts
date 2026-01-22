import { Opportunity, OpportunityStatus, User, LossReason, ActivityLog, AssignmentHistory } from '../types';
import { supabase } from './supabaseClient';

export const opportunityService = {
  // Get all opportunities (leads in opportunity phase)
  getOpportunities: async (currentUser: User): Promise<Opportunity[]> => {
    let query = supabase
      .from('leads')
      .select('id, nome, email, telefone, status_kanban, created_at, valor_produto, vendedor, vendedor_id, origem, produto')
      .in('status_kanban', ['OPORTUNIDADES', 'EM_CONTATO', 'NEGOCIACAO'])
      .order('created_at', { ascending: false });
    
    if (currentUser.role !== 'ADMIN') {
      query = query.eq('vendedor_id', currentUser.id);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    let opportunities: Opportunity[] = data.map(row => ({
      id: row.id,
      nome: row.nome,
      email: row.email,
      telefone: row.telefone,
      status: row.status_kanban,
      created_at: row.created_at,
      updated_at: row.created_at,
      first_contact_date: undefined,
      quoted_value: row.valor_produto,
      vendedor: row.vendedor,
      vendedor_email: '',
      vendedor_id: row.vendedor_id,
      origem: row.origem,
      raw_json: null,
      produto: row.produto,
    }));

    if (currentUser.role !== 'ADMIN') {
      opportunities = opportunities.filter(o => o.vendedor_id === currentUser.id);
    }
    
    return opportunities;
  },

  // Get opportunity by ID (actually a lead)
  getOpportunityById: async (id: number): Promise<Opportunity> => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) throw new Error("Opportunity not found");
    
    return {
      id: data.id,
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      status: data.status_kanban,
      created_at: data.created_at,
      updated_at: data.updated_at,
      first_contact_date: data.first_contact_date,
      quoted_value: data.valor_produto,
      contact_date: data.contact_date,
      next_followup: data.next_followup,
      vendedor: data.vendedor,
      vendedor_email: data.vendedor_email,
      vendedor_id: data.vendedor_id,
      origem: data.origem,
      raw_json: data.raw_json,
      produto: data.produto,
      notes: data.raw_json?.notes
    };
  },

  // Create new opportunity manually (Admin creates in leads table)
  createOpportunityManually: async (opportunityData: {
    nome: string;
    email: string;
    telefone: string;
    origem: string;
    vendedor_id: number;
    vendedor: string;
    vendedor_email: string;
    status: OpportunityStatus;
    notes?: string;
  }): Promise<Opportunity> => {
    const { data, error } = await supabase
      .from('leads')
      .insert({
        nome: opportunityData.nome,
        email: opportunityData.email,
        telefone: opportunityData.telefone,
        status_kanban: opportunityData.status,
        vendedor: opportunityData.vendedor,
        vendedor_email: opportunityData.vendedor_email,
        vendedor_id: opportunityData.vendedor_id,
        origem: opportunityData.origem,
        tipo_cliente: 'PF',
        cpf_cnpj: '',
        operadora: '',
        produto: ''
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      status: data.status_kanban,
      created_at: data.created_at,
      updated_at: data.updated_at,
      vendedor: data.vendedor,
      vendedor_email: data.vendedor_email,
      vendedor_id: data.vendedor_id,
      origem: data.origem,
      notes: opportunityData.notes
    };
  },

  // Create new opportunity (typically from webhook)
  createOpportunity: async (opportunityData: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>): Promise<Opportunity> => {
    const { data, error } = await supabase
      .from('opportunities')
      .insert({
        nome: opportunityData.nome,
        email: opportunityData.email,
        telefone: opportunityData.telefone,
        status: opportunityData.status || 'OPORTUNIDADES',
        first_contact_date: opportunityData.first_contact_date,
        quoted_value: opportunityData.quoted_value,
        quoted_at: opportunityData.quoted_at,
        vendedor: opportunityData.vendedor,
        vendedor_email: opportunityData.vendedor_email,
        vendedor_id: opportunityData.vendedor_id,
        origem: opportunityData.origem,
        raw_json: opportunityData.raw_json,
        lost_at: opportunityData.lost_at,
        loss_reason: opportunityData.loss_reason,
        loss_description: opportunityData.loss_description,
        converted_to_proposal_at: opportunityData.converted_to_proposal_at,
        proposal_id: opportunityData.proposal_id,
      })
      .select()
      .single();

    if (error) throw error;

    // Log the creation activity
    await opportunityService.logActivity({
      opportunity_id: data.id,
      type: 'STATUS_CHANGE',
      description: `Oportunidade criada com status ${data.status}`,
      user_id: opportunityData.vendedor_id,
      user_name: opportunityData.vendedor,
      metadata: { status: data.status, origem: opportunityData.origem }
    });

    return {
      id: data.id,
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
      first_contact_date: data.first_contact_date,
      quoted_value: data.quoted_value,
      quoted_at: data.quoted_at,
      vendedor: data.vendedor,
      vendedor_email: data.vendedor_email,
      vendedor_id: data.vendedor_id,
      origem: data.origem,
      raw_json: data.raw_json,
      lost_at: data.lost_at,
      loss_reason: data.loss_reason,
      loss_description: data.loss_description,
      converted_to_proposal_at: data.converted_to_proposal_at,
      proposal_id: data.proposal_id,
    };
  },

  // Update opportunity (actually updates lead)
  updateOpportunity: async (id: number, opportunityData: Partial<Opportunity>): Promise<Opportunity> => {
    const updateData: any = {};
    
    if (opportunityData.nome !== undefined) updateData.nome = opportunityData.nome;
    if (opportunityData.email !== undefined) updateData.email = opportunityData.email;
    if (opportunityData.telefone !== undefined) updateData.telefone = opportunityData.telefone;
    if (opportunityData.origem !== undefined) updateData.origem = opportunityData.origem;
    if (opportunityData.status !== undefined) updateData.status_kanban = opportunityData.status;
    if (opportunityData.quoted_value !== undefined) updateData.valor_produto = opportunityData.quoted_value;
    if (opportunityData.contact_date !== undefined) updateData.contact_date = opportunityData.contact_date;
    if (opportunityData.next_followup !== undefined) updateData.next_followup = opportunityData.next_followup;
    if (opportunityData.notes !== undefined) {
      // Update raw_json to include notes
      const { data: currentData } = await supabase
        .from('leads')
        .select('raw_json')
        .eq('id', id)
        .single();
      
      const currentRawJson = currentData?.raw_json || {};
      updateData.raw_json = { ...currentRawJson, notes: opportunityData.notes };
    }

    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      status: data.status_kanban,
      created_at: data.created_at,
      updated_at: data.updated_at,
      first_contact_date: data.first_contact_date,
      quoted_value: data.valor_produto,
      contact_date: data.contact_date,
      next_followup: data.next_followup,
      vendedor: data.vendedor,
      vendedor_email: data.vendedor_email,
      vendedor_id: data.vendedor_id,
      origem: data.origem,
      raw_json: data.raw_json,
      notes: data.raw_json?.notes
    };
  },

  // Update opportunity status (actually updates lead status_kanban)
  updateOpportunityStatus: async (id: number, status: OpportunityStatus, currentUser: User, additionalData?: {
    quoted_value?: number;
    first_contact_date?: string;
  }): Promise<Opportunity> => {
    const updateData: any = {
      status_kanban: status,
    };

    if (additionalData?.quoted_value) {
      updateData.valor_produto = additionalData.quoted_value;
    }

    if (status === 'EM_CONTATO' && !additionalData?.first_contact_date) {
      updateData.first_contact_date = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar: ${error.message}`);
    }

    return {
      id: data.id,
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      status: data.status_kanban,
      created_at: data.created_at,
      updated_at: data.updated_at,
      first_contact_date: data.first_contact_date,
      quoted_value: data.valor_produto,
      vendedor: data.vendedor,
      vendedor_email: data.vendedor_email,
      vendedor_id: data.vendedor_id,
      origem: data.origem,
      raw_json: data.raw_json,
      produto: data.produto,
    };
  },

  // Mark opportunity as lost
  markOpportunityAsLost: async (id: number, lossReason: LossReason, currentUser: User): Promise<Opportunity> => {
    const { data, error } = await supabase
      .from('opportunities')
      .update({
        lost_at: new Date().toISOString(),
        loss_reason: lossReason,
        loss_description: lossReason.description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log the loss activity
    await opportunityService.logActivity({
      opportunity_id: id,
      type: 'LOSS_RECORDED',
      description: `Oportunidade perdida - ${lossReason.category}: ${lossReason.description || 'Sem descrição'}`,
      user_id: currentUser.id,
      user_name: currentUser.name,
      metadata: { loss_reason: lossReason }
    });

    return {
      id: data.id,
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
      first_contact_date: data.first_contact_date,
      quoted_value: data.quoted_value,
      quoted_at: data.quoted_at,
      vendedor: data.vendedor,
      vendedor_email: data.vendedor_email,
      vendedor_id: data.vendedor_id,
      origem: data.origem,
      raw_json: data.raw_json,
      lost_at: data.lost_at,
      loss_reason: data.loss_reason,
      loss_description: data.loss_description,
      converted_to_proposal_at: data.converted_to_proposal_at,
      proposal_id: data.proposal_id,
    };
  },

  // Convert opportunity to proposal (change status to ENVIADA)
  convertOpportunityToProposal: async (opportunityId: number, currentUser: User): Promise<{ opportunity: Opportunity; leadId: number }> => {
    const opportunity = await opportunityService.getOpportunityById(opportunityId);
    
    if (opportunity.status !== 'NEGOCIACAO') {
      throw new Error('Apenas oportunidades em NEGOCIAÇÃO podem ser convertidas para propostas');
    }

    if (!opportunity.quoted_value) {
      throw new Error('Valor cotado é obrigatório para conversão');
    }

    // Update the lead status to ENVIADA (proposal phase)
    const { data, error } = await supabase
      .from('leads')
      .update({
        status_kanban: 'ENVIADA',
        updated_at: new Date().toISOString(),
      })
      .eq('id', opportunityId)
      .select()
      .single();

    if (error) throw error;

    return {
      opportunity: {
        id: data.id,
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        status: data.status_kanban,
        created_at: data.created_at,
        updated_at: data.updated_at,
        first_contact_date: data.first_contact_date,
        quoted_value: data.valor_produto,
        quoted_at: data.quoted_at,
        vendedor: data.vendedor,
        vendedor_email: data.vendedor_email,
        vendedor_id: data.vendedor_id,
        origem: data.origem,
        raw_json: data.raw_json,
      },
      leadId: data.id
    };
  },

  // Reassign opportunity to different seller (Admin only)
  reassignOpportunity: async (opportunityId: number, newSellerId: number, currentUser: User, reason?: string): Promise<Opportunity> => {
    if (currentUser.role !== 'ADMIN') {
      throw new Error('Apenas administradores podem reatribuir oportunidades');
    }

    const opportunity = await opportunityService.getOpportunityById(opportunityId);
    
    // Get new seller info
    const { data: newSeller, error: sellerError } = await supabase
      .from('users_profile')
      .select('id, name, email')
      .eq('id', newSellerId)
      .single();

    if (sellerError || !newSeller) throw new Error('Vendedor não encontrado');

    // Update opportunity
    const { data, error } = await supabase
      .from('opportunities')
      .update({
        vendedor: newSeller.name,
        vendedor_email: newSeller.email,
        vendedor_id: newSeller.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', opportunityId)
      .select()
      .single();

    if (error) throw error;

    // Record assignment history
    await opportunityService.recordAssignmentHistory({
      opportunity_id: opportunityId,
      previous_seller_id: opportunity.vendedor_id,
      new_seller_id: newSeller.id,
      assigned_by_user_id: currentUser.id,
      assigned_by_name: currentUser.name,
      reason,
    });

    // Log the reassignment activity
    await opportunityService.logActivity({
      opportunity_id: opportunityId,
      type: 'REASSIGNMENT',
      description: `Oportunidade reatribuída de ${opportunity.vendedor} para ${newSeller.name}`,
      user_id: currentUser.id,
      user_name: currentUser.name,
      metadata: { 
        previous_seller: opportunity.vendedor,
        new_seller: newSeller.name,
        reason
      }
    });

    return {
      id: data.id,
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
      first_contact_date: data.first_contact_date,
      quoted_value: data.quoted_value,
      quoted_at: data.quoted_at,
      vendedor: data.vendedor,
      vendedor_email: data.vendedor_email,
      vendedor_id: data.vendedor_id,
      origem: data.origem,
      raw_json: data.raw_json,
      lost_at: data.lost_at,
      loss_reason: data.loss_reason,
      loss_description: data.loss_description,
      converted_to_proposal_at: data.converted_to_proposal_at,
      proposal_id: data.proposal_id,
    };
  },

  // Log activity for audit trail
  logActivity: async (activityData: Omit<ActivityLog, 'id' | 'created_at'>): Promise<void> => {
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        opportunity_id: activityData.opportunity_id,
        lead_id: activityData.lead_id,
        type: activityData.type,
        description: activityData.description,
        user_id: activityData.user_id,
        user_name: activityData.user_name,
        metadata: activityData.metadata,
      });

    if (error) throw error;
  },

  // Record assignment history
  recordAssignmentHistory: async (historyData: Omit<AssignmentHistory, 'id' | 'created_at'>): Promise<void> => {
    const { error } = await supabase
      .from('assignment_history')
      .insert({
        opportunity_id: historyData.opportunity_id,
        lead_id: historyData.lead_id,
        previous_seller_id: historyData.previous_seller_id,
        new_seller_id: historyData.new_seller_id,
        assigned_by_user_id: historyData.assigned_by_user_id,
        assigned_by_name: historyData.assigned_by_name,
        reason: historyData.reason,
      });

    if (error) throw error;
  },

  // Get activity logs for opportunity
  getOpportunityActivityLogs: async (opportunityId: number): Promise<ActivityLog[]> => {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(log => ({
      id: log.id,
      opportunity_id: log.opportunity_id,
      lead_id: log.lead_id,
      type: log.type,
      description: log.description,
      user_id: log.user_id,
      user_name: log.user_name,
      created_at: log.created_at,
      metadata: log.metadata,
    }));
  },

  // Get assignment history for opportunity
  getOpportunityAssignmentHistory: async (opportunityId: number): Promise<AssignmentHistory[]> => {
    const { data, error } = await supabase
      .from('assignment_history')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(history => ({
      id: history.id,
      opportunity_id: history.opportunity_id,
      lead_id: history.lead_id,
      previous_seller_id: history.previous_seller_id,
      new_seller_id: history.new_seller_id,
      assigned_by_user_id: history.assigned_by_user_id,
      assigned_by_name: history.assigned_by_name,
      reason: history.reason,
      created_at: history.created_at,
    }));
  },

  // Get opportunities by user (seller)
  getOpportunitiesByUser: async (userId: number): Promise<Opportunity[]> => {
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('vendedor_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user opportunities:', error);
      return [];
    }

    return data || [];
  },

  // Admin Only: Delete opportunity permanently (actually deletes from leads table)
  deleteOpportunity: async (opportunityId: number, currentUser: User): Promise<void> => {
    if (currentUser.role !== 'ADMIN') {
      throw new Error('Apenas administradores podem excluir oportunidades');
    }

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', opportunityId);

    if (error) throw error;
  },
};