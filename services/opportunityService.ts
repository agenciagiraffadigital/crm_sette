import { Opportunity, OpportunityStatus, User, LossReason, ActivityLog, AssignmentHistory } from '../types';
import { supabase } from './supabaseClient';

export const opportunityService = {
  // Get all opportunities for current user
  getOpportunities: async (currentUser: User): Promise<Opportunity[]> => {
    const { data, error } = await supabase.from('opportunities').select('*');
    if (error) throw error;
    
    let opportunities: Opportunity[] = data.map(row => ({
      id: row.id,
      nome: row.nome,
      email: row.email,
      telefone: row.telefone,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      first_contact_date: row.first_contact_date,
      quoted_value: row.quoted_value,
      quoted_at: row.quoted_at,
      vendedor: row.vendedor,
      vendedor_email: row.vendedor_email,
      vendedor_id: row.vendedor_id,
      origem: row.origem,
      raw_json: row.raw_json,
      lost_at: row.lost_at,
      loss_reason: row.loss_reason,
      loss_description: row.loss_description,
      converted_to_proposal_at: row.converted_to_proposal_at,
      proposal_id: row.proposal_id,
    }));

    if (currentUser.role === 'ADMIN') {
      return opportunities;
    } else {
      return opportunities.filter(o => o.vendedor_id === currentUser.id);
    }
  },

  // Get opportunity by ID
  getOpportunityById: async (id: number): Promise<Opportunity> => {
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) throw new Error("Opportunity not found");
    
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

  // Update opportunity status
  updateOpportunityStatus: async (id: number, status: OpportunityStatus, currentUser: User, additionalData?: {
    quoted_value?: number;
    first_contact_date?: string;
  }): Promise<Opportunity> => {
    const opportunity = await opportunityService.getOpportunityById(id);
    
    // Validation: require quoted_value when moving to NEGOCIAÇÃO
    if (status === 'NEGOCIAÇÃO' && !additionalData?.quoted_value && !opportunity.quoted_value) {
      throw new Error('Valor cotado é obrigatório para avançar para NEGOCIAÇÃO');
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Add additional data if provided
    if (additionalData?.quoted_value) {
      updateData.quoted_value = additionalData.quoted_value;
      updateData.quoted_at = new Date().toISOString();
    }

    if (additionalData?.first_contact_date) {
      updateData.first_contact_date = additionalData.first_contact_date;
    } else if (status === 'EM_CONTATO' && !opportunity.first_contact_date) {
      updateData.first_contact_date = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('opportunities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log the status change activity
    await opportunityService.logActivity({
      opportunity_id: id,
      type: 'STATUS_CHANGE',
      description: `Status alterado de ${opportunity.status} para ${status}`,
      user_id: currentUser.id,
      user_name: currentUser.name,
      metadata: { 
        previous_status: opportunity.status, 
        new_status: status,
        quoted_value: additionalData?.quoted_value
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

  // Convert opportunity to proposal (lead)
  convertOpportunityToProposal: async (opportunityId: number, currentUser: User): Promise<{ opportunity: Opportunity; leadId: number }> => {
    const opportunity = await opportunityService.getOpportunityById(opportunityId);
    
    if (opportunity.status !== 'NEGOCIAÇÃO') {
      throw new Error('Apenas oportunidades em NEGOCIAÇÃO podem ser convertidas para propostas');
    }

    if (!opportunity.quoted_value) {
      throw new Error('Valor cotado é obrigatório para conversão');
    }

    // Create the lead from opportunity data
    const leadData = {
      nome: opportunity.nome,
      email: opportunity.email,
      telefone: opportunity.telefone,
      tipo_cliente: null, // Will be filled later
      cpf_cnpj: '',
      operadora: '',
      produto: '',
      valor_produto: opportunity.quoted_value,
      vendedor: opportunity.vendedor,
      vendedor_email: opportunity.vendedor_email,
      vendedor_id: opportunity.vendedor_id,
      status_kanban: 'ENVIADA' as const,
      origem: opportunity.origem,
      raw_json: opportunity.raw_json,
      endereco: { cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '' },
      beneficiarios: [],
      mensagens: [],
      documentos: [],
      converted_from_opportunity_id: opportunityId,
      conversion_date: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    };

    const { data: insertedLead, error: leadError } = await supabase
      .from('leads')
      .insert(leadData)
      .select()
      .single();

    if (leadError) throw leadError;

    // Update opportunity with conversion info
    const { data: updatedOpportunity, error: opportunityError } = await supabase
      .from('opportunities')
      .update({
        converted_to_proposal_at: new Date().toISOString(),
        proposal_id: insertedLead.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', opportunityId)
      .select()
      .single();

    if (opportunityError) throw opportunityError;

    // Log the conversion activity
    await opportunityService.logActivity({
      opportunity_id: opportunityId,
      type: 'CONVERSION',
      description: `Oportunidade convertida para proposta #${insertedLead.id}`,
      user_id: currentUser.id,
      user_name: currentUser.name,
      metadata: { 
        proposal_id: insertedLead.id,
        quoted_value: opportunity.quoted_value
      }
    });

    return {
      opportunity: {
        id: updatedOpportunity.id,
        nome: updatedOpportunity.nome,
        email: updatedOpportunity.email,
        telefone: updatedOpportunity.telefone,
        status: updatedOpportunity.status,
        created_at: updatedOpportunity.created_at,
        updated_at: updatedOpportunity.updated_at,
        first_contact_date: updatedOpportunity.first_contact_date,
        quoted_value: updatedOpportunity.quoted_value,
        quoted_at: updatedOpportunity.quoted_at,
        vendedor: updatedOpportunity.vendedor,
        vendedor_email: updatedOpportunity.vendedor_email,
        vendedor_id: updatedOpportunity.vendedor_id,
        origem: updatedOpportunity.origem,
        raw_json: updatedOpportunity.raw_json,
        lost_at: updatedOpportunity.lost_at,
        loss_reason: updatedOpportunity.loss_reason,
        loss_description: updatedOpportunity.loss_description,
        converted_to_proposal_at: updatedOpportunity.converted_to_proposal_at,
        proposal_id: updatedOpportunity.proposal_id,
      },
      leadId: insertedLead.id
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
};