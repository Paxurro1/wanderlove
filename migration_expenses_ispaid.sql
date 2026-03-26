-- ============================================================
-- MIGRACIÓN: Campo is_paid en gastos
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Añadir campo is_paid a expenses (false = pendiente, true = pagado/liquidado)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;

-- INSTRUCCIONES:
-- 1. Abre el Editor SQL de Supabase (https://app.supabase.com)
-- 2. Selecciona tu proyecto WanderLove
-- 3. Ve a "SQL Editor", pega y ejecuta este script
