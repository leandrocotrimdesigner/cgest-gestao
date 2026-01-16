
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
const SUPABASE_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Variáveis de ambiente do Supabase não encontradas.");
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '');
