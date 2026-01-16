
import { createClient } from '@supabase/supabase-js';

// CREDENCIAIS DE PRODUÇÃO (A7)
const SUPABASE_URL = 'https://kpfeocsqkwwpntnudssn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_9irRgrueeD2l7NIhKco4gg_yVaNc-sR';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
