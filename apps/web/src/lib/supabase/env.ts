/**
 * Configuración pública de Supabase. La clave "publishable" es pública por diseño
 * (la protege RLS). NUNCA usar aquí la service role.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = (): boolean => Boolean(supabaseUrl && supabaseKey);
