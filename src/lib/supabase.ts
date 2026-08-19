import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://seu-projeto.supabase.co' &&
  !supabaseUrl.includes('seu-projeto')
);

if (!isSupabaseConfigured) {
  console.warn(
    '[CubeTimer] Supabase não está configurado. O app continuará funcionando em modo local (localStorage). ' +
    'Para ativar a nuvem, defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
