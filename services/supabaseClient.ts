
import { createClient } from '@supabase/supabase-js';

// CONFIGURAÇÃO FORÇADA (HARDCODED)
// Mantendo fixo para garantir conexão na Vercel sem depender de .env
// URL e Chave fornecidas pelo usuário
const supabaseUrl = 'https://kpfeocsqkwwpntnudssn.supabase.co';
const supabaseAnonKey = 'sb_publishable_9irRgrueeD2l7NIhKco4gg_yVaNc-sR';

// Criação direta do cliente
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Garante que a sessão persista
    autoRefreshToken: true,
  }
});
