-- Añadir orden a los lugares del itinerario
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'places'
        AND column_name = 'order_index'
    ) THEN
        ALTER TABLE places ADD COLUMN order_index integer DEFAULT 0;
    END IF;
END $$;
