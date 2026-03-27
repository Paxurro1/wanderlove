-- WanderLove 2.4 Migration
-- Añadir hora de salida a los traslados y parking
ALTER TABLE airport_transfers 
ADD COLUMN IF NOT EXISTS departure_time TIMESTAMP WITH TIME ZONE;
