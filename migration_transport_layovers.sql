-- -------------------------------------------------------------
-- SQL MIGRATION: Add layover support to transports table
-- -------------------------------------------------------------

ALTER TABLE transports 
ADD COLUMN IF NOT EXISTS has_layover BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS layover_location TEXT,
ADD COLUMN IF NOT EXISTS layover_duration TEXT;
