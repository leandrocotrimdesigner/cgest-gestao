
import { createClient } from '@supabase/supabase-js';

// CONFIGURAÇÃO FORÇADA (HARDCODED)
// Mantendo fixo para garantir conexão na Vercel sem depender de .env ou import.meta
const supabaseUrl = 'https://kpfeocsqkwwpntnudssn.supabase.co';
const supabaseAnonKey = 'sb_publishable_9irRgrueeD2l7NIhKco4gg_yVaNc-sR';

// Criação direta do cliente com persistência de sessão ativada
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
