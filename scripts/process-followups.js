// Script para processar follow-ups de leads perdidos
// Execute este script periodicamente (ex: cron job diário)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function processFollowups() {
  console.log('Iniciando processamento de follow-ups...');
  
  try {
    // Processar ambiente de desenvolvimento
    const { data: devData, error: devError } = await supabase.rpc('process_followups_dev');
    
    if (devError) {
      console.error('Erro ao processar follow-ups DEV:', devError);
    } else {
      console.log('Follow-ups DEV processados com sucesso');
    }

    // Processar ambiente de produção
    const { data: prodData, error: prodError } = await supabase.rpc('process_followups');
    
    if (prodError) {
      console.error('Erro ao processar follow-ups PROD:', prodError);
    } else {
      console.log('Follow-ups PROD processados com sucesso');
    }

    console.log('Processamento concluído!');
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

processFollowups();
