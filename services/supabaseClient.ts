
import { createClient } from '@supabase/supabase-js';

// CONFIGURAÇÃO FORÇADA (HARDCODED)
// Chaves inseridas diretamente para garantir conexão imediata
const supabaseUrl = 'https://kpfeocsqkwwpntnudssn.supabase.co';
const supabaseAnonKey = 'sb_publishable_9irRgrueeD2l7NIhKco4gg_yVaNc-sR';

// Criação direta do cliente (sem validações condicionais que retornam null)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
