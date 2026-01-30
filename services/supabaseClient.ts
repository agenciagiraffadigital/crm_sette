import { createClient } from '@supabase/supabase-js'
import { getEnvironment } from '../utils/environment'

const { isDev } = getEnvironment()

// Seleciona as credenciais baseado no ambiente
const supabaseUrl = isDev 
  ? (import.meta.env.VITE_SUPABASE_DEV_URL ?? '')
  : (import.meta.env.VITE_SUPABASE_URL ?? '')

const supabaseAnonKey = isDev
  ? (import.meta.env.VITE_SUPABASE_DEV_ANON_KEY ?? '')
  : (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltam credenciais do Supabase no .env.local')
}

// Cliente normal para usuários
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
})

export const supabase = supabaseClient
export const supabaseAdmin = supabaseClient