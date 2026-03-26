-- ============================================================
-- MIGRACIÓN: Viajes Públicos/Privados
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Añadir columna is_public a trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- 2. Actualizar políticas RLS para trips
-- Primero eliminar la política SELECT existente (si existe)
DROP POLICY IF EXISTS "Users can view their own trips" ON trips;
DROP POLICY IF EXISTS "Users can view trips they participate in" ON trips;
DROP POLICY IF EXISTS "Allow users to view own and participated trips" ON trips;
DROP POLICY IF EXISTS "Trips are viewable by owner and participants" ON trips;

-- Nueva política unificada: ver viaje si eres owner, participante, o el viaje es público
CREATE POLICY "Trips viewable by owner, participants, or if public"
ON trips FOR SELECT
USING (
  is_public = true
  OR owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM trip_participants
    WHERE trip_participants.trip_id = trips.id
      AND trip_participants.user_id = auth.uid()
      AND trip_participants.status = 'accepted'
  )
);

-- 3. Actualizar políticas RLS para places (para viajes públicos)
DROP POLICY IF EXISTS "Users can view places of their trips" ON places;
DROP POLICY IF EXISTS "Places are viewable by trip participants" ON places;
DROP POLICY IF EXISTS "Allow users to view places of their trips" ON places;

CREATE POLICY "Places viewable if trip is accessible"
ON places FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = places.trip_id
      AND (
        trips.is_public = true
        OR trips.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM trip_participants
          WHERE trip_participants.trip_id = trips.id
            AND trip_participants.user_id = auth.uid()
            AND trip_participants.status = 'accepted'
        )
      )
  )
);

-- INSTRUCCIONES:
-- 1. Abre el Editor SQL de Supabase (https://app.supabase.com)
-- 2. Selecciona tu proyecto WanderLove
-- 3. Ve a "SQL Editor" y pega todo este script
-- 4. Haz clic en "Run"
-- NOTA: Si algún DROP POLICY falla, es porque esa política no existía.
-- Puedes ejecutar solo el ALTER TABLE y los CREATE POLICY.
