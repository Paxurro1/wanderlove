-- ============================================================================
-- MIGRACIÓN: Añadir coordenadas lat/lng a accommodations y airport_transfers
-- Para permitir selección de ubicación en el mapa desde los modales
-- ============================================================================

-- Coordenadas para alojamientos
ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS lat FLOAT DEFAULT 0;
ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS lng FLOAT DEFAULT 0;

-- Coordenadas para traslados (punto de inicio del trayecto)
ALTER TABLE airport_transfers ADD COLUMN IF NOT EXISTS lat FLOAT DEFAULT 0;
ALTER TABLE airport_transfers ADD COLUMN IF NOT EXISTS lng FLOAT DEFAULT 0;
