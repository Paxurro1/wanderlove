-- ============================================================
-- MIGRACIÓN: Control de privacidad de gastos en viajes públicos
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Añadir campo expenses_public a trips
-- (Por defecto false, es decir, gastos ocultos al público)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS expenses_public BOOLEAN DEFAULT false;

-- INSTRUCCIONES:
-- 1. Abre el Editor SQL de Supabase (https://app.supabase.com)
-- 2. Selecciona tu proyecto WanderLove
-- 3. Ve a "SQL Editor", pega y ejecuta este script
