import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltam credenciais do Supabase no .env.local')
  console.error('URL:', supabaseUrl)
  console.error('Anon Key:', supabaseAnonKey ? 'presente' : 'ausente')
  console.error('Service Key:', supabaseServiceKey ? 'presente' : 'ausente')
}

// Cliente normal para usuários
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'crm-auth'
  }
})

// Cliente admin (usa service_role key para operações administrativas)
const supabaseAdminClient = createClient(
  supabaseUrl, 
  supabaseServiceKey || supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'crm-admin-auth'
    }
  }
)

export const supabase = supabaseClient
export const supabaseAdmin = supabaseAdminClient