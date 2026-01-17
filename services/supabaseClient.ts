
import { createClient } from '@supabase/supabase-js';

// CONFIGURAÇÃO LIMPA E DIRETA
const supabaseUrl = 'https://kpfeocsqkwwpntnudssn.supabase.co';
const supabaseAnonKey = 'sb_publishable_9irRgrueeD2l7NIhKco4gg_yVaNc-sR';

console.log('Inicializando Supabase em:', supabaseUrl);

// Criação do cliente com headers globais forçados para evitar bloqueios de rede
// Adicionado 'Authorization' explicitamente para contornar falhas de injeção automática
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal' // Força resposta mais leve para evitar timeouts
    }
  }
});
