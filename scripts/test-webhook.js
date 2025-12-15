import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Simular updateLeadStatus
async function updateLeadStatus(id, status) {
  const { data: lead } = await supabase.from('leads').select('*').eq('id', id).single();
  if (!lead) throw new Error("Lead not found");
  const updatedLead = { ...lead, status_kanban: status, updated_at: new Date().toISOString() };
  const { error } = await supabase
    .from('leads')
    .update({
      nome: updatedLead.nome,
      email: updatedLead.email,
      telefone: updatedLead.telefone,
      tipo_cliente: updatedLead.tipo_cliente,
      cpf_cnpj: updatedLead.cpf_cnpj,
      rg_ie: updatedLead.rg_ie,
      data_nascimento_abertura: updatedLead.data_nascimento_abertura,
      dados_responsavel: updatedLead.dados_responsavel,
      havera_remissao: updatedLead.havera_remissao,
      operadora: updatedLead.operadora,
      produto: updatedLead.produto,
      valor_produto: updatedLead.valor_produto,
      reducao_carencia: updatedLead.reducao_carencia,
      coparticipacao: updatedLead.coparticipacao,
      vigencia: updatedLead.vigencia,
      endereco: updatedLead.endereco,
      beneficiarios: updatedLead.beneficiarios,
      mensagens: updatedLead.mensagens,
      documentos: updatedLead.documentos,
      origem: updatedLead.origem,
      raw_json: updatedLead.raw_json,
      vendedor: updatedLead.vendedor,
      vendedor_email: updatedLead.vendedor_email,
      vendedor_id: updatedLead.vendedor_id,
      status_kanban: updatedLead.status_kanban,
      updated_at: updatedLead.updated_at,
    })
    .eq('id', id);
  if (error) throw error;
  return updatedLead;
}

async function testUpdate() {
  try {
    console.log('Listando leads...');
    const { data: leads } = await supabase.from('leads').select('id, nome, status_kanban');
    console.log('Leads:', leads);
    if (leads && leads.length > 0) {
      const id = leads[0].id;
      console.log('Testando update status para id', id);
      const result = await updateLeadStatus(id, 'ANÁLISE');
      console.log('Update ok:', result.status_kanban);
    }
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

testUpdate();