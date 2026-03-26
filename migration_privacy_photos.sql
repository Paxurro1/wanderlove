-- migration_privacy_photos.sql
-- Ejecuta esto en el SQL Editor de Supabase para separar la privacidad de fotos de los documentos

ALTER TABLE trips ADD COLUMN IF NOT EXISTS photos_public BOOLEAN DEFAULT false;
