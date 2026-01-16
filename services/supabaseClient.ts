
import { createClient } from '@supabase/supabase-js';

// CONFIGURAÇÃO FORÇADA (HARDCODED)
// Uso de .trim() para garantir que não há espaços em branco ou quebras de linha invisíveis
const supabaseUrl = 'https://kpfeocsqkwwpntnudssn.supabase.co'.trim();
const supabaseAnonKey = 'sb_publishable_9irRgrueeD2l7NIhKco4gg_yVaNc-sR'.trim();

console.log('Tentando conectar ao Supabase em:', supabaseUrl);

// Criação direta do cliente com persistência de sessão ativada
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
