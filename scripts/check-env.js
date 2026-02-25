#!/usr/bin/env node

/**
 * Script para verificar configuração de ambiente
 * Uso: node scripts/check-env.js [development|production]
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const mode = process.argv[2] || 'development';
const envFile = `.env.${mode}`;
const envPath = join(rootDir, envFile);

console.log('🔍 Verificando configuração de ambiente...\n');
console.log(`Modo: ${mode}`);
console.log(`Arquivo: ${envFile}\n`);

// Verificar se arquivo existe
if (!existsSync(envPath)) {
  console.error(`❌ Arquivo ${envFile} não encontrado!`);
  console.log(`\n💡 Crie o arquivo com as credenciais corretas.`);
  process.exit(1);
}

// Ler arquivo
const content = readFileSync(envPath, 'utf-8');
const lines = content.split('\n');

// Extrair variáveis
const vars = {};
lines.forEach(line => {
  const match = line.match(/^([A-Z_]+)=(.+)$/);
  if (match) {
    vars[match[1]] = match[2];
  }
});

// Verificar variáveis obrigatórias
const required = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

let hasErrors = false;

console.log('📋 Variáveis encontradas:\n');

required.forEach(varName => {
  const value = vars[varName];
  
  if (!value) {
    console.log(`❌ ${varName}: NÃO DEFINIDA`);
    hasErrors = true;
  } else if (value.includes('xxx') || value.includes('yyy')) {
    console.log(`⚠️  ${varName}: PLACEHOLDER (precisa configurar)`);
    hasErrors = true;
  } else {
    // Mostrar apenas início e fim para segurança
    const masked = value.length > 20 
      ? `${value.substring(0, 20)}...${value.substring(value.length - 10)}`
      : value;
    console.log(`✅ ${varName}: ${masked}`);
  }
});

// Verificar service role key (opcional mas recomendado)
if (vars['VITE_SUPABASE_SERVICE_ROLE_KEY']) {
  const value = vars['VITE_SUPABASE_SERVICE_ROLE_KEY'];
  if (value.includes('xxx') || value.includes('yyy')) {
    console.log(`⚠️  VITE_SUPABASE_SERVICE_ROLE_KEY: PLACEHOLDER (opcional)`);
  } else {
    const masked = value.substring(0, 20) + '...' + value.substring(value.length - 10);
    console.log(`✅ VITE_SUPABASE_SERVICE_ROLE_KEY: ${masked}`);
  }
} else {
  console.log(`ℹ️  VITE_SUPABASE_SERVICE_ROLE_KEY: não definida (opcional)`);
}

console.log('');

if (hasErrors) {
  console.error('❌ Configuração incompleta ou inválida!');
  console.log('\n💡 Corrija os problemas acima antes de fazer deploy.');
  process.exit(1);
} else {
  console.log('✅ Configuração válida!');
  console.log(`\n🚀 Pronto para fazer build com: npm run build:${mode === 'production' ? 'prod' : 'dev'}`);
}
