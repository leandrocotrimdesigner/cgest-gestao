
import { createClient } from '@supabase/supabase-js';

// Acesso seguro ao objeto env: se (import.meta as any).env for undefined, usa {}
const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

// Validação para evitar travamento da aplicação (White Screen)
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Atenção: Credenciais do Supabase não encontradas. Verifique o arquivo .env.local.");
}

// Exporta null se as chaves não existirem, evitando que o createClient lance erro
export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
