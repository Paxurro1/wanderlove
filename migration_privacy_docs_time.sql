-- WanderLove 2.3 Migration
-- 1. Añadir privacidad de documentos/fotos a los viajes
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS documents_public BOOLEAN DEFAULT false;

-- 2. Añadir hora de actividad/llegada al itinerario (places)
ALTER TABLE places 
ADD COLUMN IF NOT EXISTS activity_time VARCHAR(10);
