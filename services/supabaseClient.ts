import { createClient } from '@supabase/supabase-js'
import { getEnvironment } from '../utils/environment'

const { isDev } = getEnvironment()

// Usa credenciais diferentes baseado no ambiente
const supabaseUrl = isDev 
  ? (import.meta.env.VITE_SUPABASE_DEV_URL ?? import.meta.env.VITE_SUPABASE_URL ?? '')
  : (import.meta.env.VITE_SUPABASE_URL ?? '')

const supabaseAnonKey = isDev
  ? (import.meta.env.VITE_SUPABASE_DEV_ANON_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? '')
  : (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltam credenciais do Supabase no .env.local')
  console.error('Ambiente:', isDev ? 'DEV' : 'PROD')
  console.error('URL:', supabaseUrl)
  console.error('Key:', supabaseAnonKey ? 'presente' : 'ausente')
}

// Cliente normal para usuários
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'crm-auth'
  }
})

// Cliente admin
const supabaseAdminClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'crm-admin-auth'
  }
})

export const supabase = supabaseClient
export const supabaseAdmin = supabaseAdminClient