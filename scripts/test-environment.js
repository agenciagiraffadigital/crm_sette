// Script para testar o ambiente (Node.js)
console.log('🔍 Verificando ambiente...\n');

// Simular detecção de ambiente para Node.js
const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const leadsTable = isDev ? 'leads_dev' : 'leads';

console.log('📊 Informações do ambiente:');
console.log(`- Modo desenvolvimento: ${isDev ? '✅ SIM' : '❌ NÃO'}`);
console.log(`- Tabela de leads: ${leadsTable}`);
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`- Ambiente: ${isDev ? 'Desenvolvimento' : 'Produção'}`);

if (isDev) {
  console.log('\n🚧 AMBIENTE DE DESENVOLVIMENTO DETECTADO');
  console.log('- Usando tabela: leads_dev');
  console.log('- Dados de produção estão seguros! ✅');
} else {
  console.log('\n🚀 AMBIENTE DE PRODUÇÃO DETECTADO');
  console.log('- Usando tabela: leads');
  console.log('- Cuidado com os dados de produção! ⚠️');
}

console.log('\n📝 Para usar este sistema:');
console.log('1. Execute a migração SQL no Supabase (migration-leads-dev.sql)');
console.log('2. Teste localmente com npm run dev');
console.log('3. Verifique se está usando leads_dev em desenvolvimento');
console.log('4. Deploy para produção usará automaticamente a tabela leads');

console.log('\n🌐 No browser, a detecção será baseada no hostname:');
console.log('- localhost/127.0.0.1 → leads_dev');
console.log('- dev.settesaude.com.br → leads_dev');
console.log('- sistema.settesaude.com.br → leads');