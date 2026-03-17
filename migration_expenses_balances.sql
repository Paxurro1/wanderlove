-- ==========================================
-- Migración para la funcionalidad de Balances de Gastos
-- ==========================================

-- 1. Añadir columnas a la tabla expenses
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_id UUID;

-- 2. Actualizar políticas RLS de la tabla expenses si es necesario
-- (Usualmente las políticas existentes ya cubren SELECT/INSERT/UPDATE/DELETE
-- basándose en trip_participants, pero aseguramos que la estructura esté lista).

-- Nota: Para los gastos antiguos, paid_by será NULL.
-- La UI lo manejará asignándole el icono de "Varios" o asumiendo un fondo común
-- a menos que el usuario edite el gasto y asigne un pagador retroactivamente.
