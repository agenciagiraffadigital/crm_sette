import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

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