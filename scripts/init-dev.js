import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmeusxhjciomrjhgpgzf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtZXVzeGhqY2lvbXJqaGdwZ3pmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTc4Njk0MywiZXhwIjoyMDg1MzYyOTQzfQ.5_fvOMi936MZkeFyIVbiudrQwI5lusnl_gQyaLP_2po';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initDatabase() {
  console.log('Criando usuários no banco DEV...');

  const users = [
    { email: 'admin@sette.com.br', password: '123', name: 'Admin Sette', role: 'ADMIN' },
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
      console.log(`Erro ao criar ${user.email}:`, authError.message);
      continue;
    }

    const { error: insertError } = await supabase.from('users_profile').insert({
      auth_id: authData.user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active_for_distribution: user.role === 'SELLER',
      total_leads_assigned: 0,
    });
    
    if (insertError) {
      console.log(`Erro ao inserir ${user.email}:`, insertError.message);
    } else {
      console.log(`✓ ${user.email} criado`);
    }
  }

  console.log('\nUsuários criados no DEV!');
}

initDatabase().catch(console.error);
