import { createClient } from '@supabase/supabase-js'
import { getEnvironment } from '../utils/environment'

const { isDev } = getEnvironment()

// Usa sempre as mesmas variáveis, mas valores diferentes no .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
const supabaseServiceKey = isDev
  ? (import.meta.env.VITE_SUPABASE_DEV_SERVICE_ROLE_KEY ?? '')
  : supabaseAnonKey

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltam credenciais do Supabase no .env.local')
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

// Cliente admin (só DEV usa service_role local)
const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'crm-admin-auth'
  }
})

export const supabase = supabaseClient
export const supabaseAdmin = supabaseAdminClient