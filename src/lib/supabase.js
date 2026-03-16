// ============================================================================
// ARCHIVO: supabase.js
// DESCRIPCIÓN: Configuración del cliente oficial de Supabase.
// centraliza la conexión con el backend usando variables de entorno.
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// Obtenemos las credenciales desde el archivo .env.local
// Si no existen, usamos placeholders para evitar que la app explote en el primer renderizado.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Exportamos la instancia única (singleton) del cliente para usarla en toda la app.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

