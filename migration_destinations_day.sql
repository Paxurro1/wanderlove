-- WanderLove - 2.5 Migration
-- Añadir distinción entre Destinos e Itinerario para permitir usar fechas/días en los Destinos
ALTER TABLE places ADD COLUMN IF NOT EXISTS is_destination BOOLEAN DEFAULT false;

-- Actualizar los destinos existentes a la nueva propiedad para no perderlos
UPDATE places SET is_destination = true WHERE day_index = 0 OR day_index IS NULL;
