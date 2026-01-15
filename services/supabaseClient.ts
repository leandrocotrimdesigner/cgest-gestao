import { createClient } from '@supabase/supabase-js';

// NOTA: Em um ambiente real, estas variáveis viriam de process.env
// Para este demo funcionar sem chaves reais, usaremos um mock service se as chaves não existirem.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;
