-- ============================================================
-- MIGRACIÓN: Políticas RLS para lectura pública de tablas relacionadas
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- IMPORTANTE: Aunque en React ocultamos las pestañas, si no añadimos estas políticas,
-- Supabase directamente bloqueará la descarga de datos para usuarios que no sean 
-- participantes, dándoles un array vacío [].

-- 1. Gastos (expenses): solo visibles si gastos son públicos
DROP POLICY IF EXISTS "Public trips expenses viewable" ON expenses;
CREATE POLICY "Public trips expenses viewable"
ON expenses FOR SELECT
USING (
  trip_id IN (SELECT id FROM trips WHERE is_public = true AND expenses_public = true)
);

-- 2. Alojamientos (accommodations): siempre visibles para viajes públicos (App oculta el precio visualmente)
DROP POLICY IF EXISTS "Public trips accommodations viewable" ON accommodations;
CREATE POLICY "Public trips accommodations viewable"
ON accommodations FOR SELECT
USING (
  trip_id IN (SELECT id FROM trips WHERE is_public = true)
);

-- 3. Transportes (transports): siempre visibles para viajes públicos (App oculta el precio visualmente)
DROP POLICY IF EXISTS "Public trips transports viewable" ON transports;
CREATE POLICY "Public trips transports viewable"
ON transports FOR SELECT
USING (
  trip_id IN (SELECT id FROM trips WHERE is_public = true)
);

-- 4. Alquileres (trip_rentals): siempre visibles para viajes públicos (App oculta el precio visualmente)
DROP POLICY IF EXISTS "Public trips rentals viewable" ON trip_rentals;
CREATE POLICY "Public trips rentals viewable"
ON trip_rentals FOR SELECT
USING (
  trip_id IN (SELECT id FROM trips WHERE is_public = true)
);

-- 5. Documentos (documents): solo visibles si documentos son públicos
DROP POLICY IF EXISTS "Public trips documents viewable" ON documents;
CREATE POLICY "Public trips documents viewable"
ON documents FOR SELECT
USING (
  trip_id IN (SELECT id FROM trips WHERE is_public = true AND documents_public = true)
);

-- 6. Fotos (trip_photos): solo visibles si fotos son públicas
DROP POLICY IF EXISTS "Public trips photos viewable" ON trip_photos;
CREATE POLICY "Public trips photos viewable"
ON trip_photos FOR SELECT
USING (
  trip_id IN (SELECT id FROM trips WHERE is_public = true AND photos_public = true)
);

-- ============================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================
