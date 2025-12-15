import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initDatabase() {
  console.log('Limpando dados existentes...');

  // Limpar leads primeiro (por causa da foreign key)
  await supabase.from('leads').delete().neq('id', 0);
  await supabase.from('users').delete().neq('id', 0);

  // Deletar auth users existentes
  const emails = ['admin@sette.com.br', 'joao@sette.com.br', 'maria@sette.com.br', 'pedro@sette.com.br', 'ana@sette.com.br'];
  const { data: allUsers } = await supabase.auth.admin.listUsers();
  for (const u of allUsers.users) {
    if (emails.includes(u.email)) {
      await supabase.auth.admin.deleteUser(u.id);
    }
  }

  console.log('Inserindo usuários...');

  // Inserir usuários (criar auth users primeiro)
  const users = [
    { email: 'admin@sette.com.br', password: '123', name: 'Admin', role: 'ADMIN' },
    { email: 'joao@sette.com.br', password: '123', name: 'João Silva', role: 'SELLER' },
    { email: 'maria@sette.com.br', password: '123', name: 'Maria Santos', role: 'SELLER' },
    { email: 'pedro@sette.com.br', password: '123', name: 'Pedro Oliveira', role: 'SELLER' },
    { email: 'ana@sette.com.br', password: '123', name: 'Ana Costa', role: 'SELLER' },
  ];

  for (const user of users) {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
    });
    if (authError) {
      console.log(`Erro ao criar auth user ${user.email}:`, authError.message);
      continue;
    }

    const { error: insertError } = await supabase.from('users').insert({
      auth_id: authData.user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
    if (insertError) console.log(`Erro ao inserir user ${user.email}:`, insertError.message);
  }

  console.log('Inserindo leads...');

  const leads = [
    { id: 1, nome: 'Carlos Pereira', email: 'carlos@email.com', telefone: '11999999999', vendedor_id: 2 },
    { id: 2, nome: 'Empresa XYZ', email: 'contato@xyz.com', telefone: '11888888888', vendedor_id: 3 },
    { id: 3, nome: 'Fernanda Lima', email: 'fernanda@email.com', telefone: '11777777777', vendedor_id: 4 },
    { id: 4, nome: 'Roberto Alves', email: 'roberto@email.com', telefone: '11666666666', vendedor_id: 5 },
    { id: 5, nome: 'Tech Solutions Ltda', email: 'info@tech.com', telefone: '11555555555', vendedor_id: 2 },
    { id: 6, nome: 'Juliana Rocha', email: 'juliana@email.com', telefone: '11444444444', vendedor_id: 3 },
  ];

  for (const leadData of leads) {
    const lead = {
      nome: leadData.nome,
      email: leadData.email,
      telefone: leadData.telefone,
      tipo_cliente: null, // Opcional
      cpf_cnpj: '',
      rg_ie: '',
      data_nascimento_abertura: '',
      dados_responsavel: null,
      havera_remissao: false,
      operadora: '',
      produto: '',
      valor_produto: null,
      reducao_carencia: false,
      coparticipacao: 'NÃO',
      vigencia: '',
      endereco: { cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '' },
      beneficiarios: [],
      mensagens: [],
      documentos: [],
      origem: 'Inicial',
      raw_json: null,
      vendedor: '', // será preenchido
      vendedor_email: '',
      vendedor_id: leadData.vendedor_id,
      status_kanban: 'ENVIADA',
    };

    // Buscar nome do vendedor
    const { data: seller } = await supabase.from('users').select('name, email').eq('id', leadData.vendedor_id).single();
    if (seller) {
      lead.vendedor = seller.name;
      lead.vendedor_email = seller.email;
    }

    const { error } = await supabase.from('leads').insert(lead);
    if (error) console.log(`Erro ao inserir lead ${leadData.id}:`, error.message);
  }

  console.log('Inicialização concluída!');
}

initDatabase().catch(console.error);