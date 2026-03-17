-- ============================================================
-- MIGRACIÓN: Fotos de viajes + Arreglo de columnas de alojamiento
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Arreglar check_in y check_out en accommodations para guardar hora
-- (de DATE a TIMESTAMP para que la hora de entrada/salida se conserve)
ALTER TABLE accommodations 
  ALTER COLUMN check_in TYPE TIMESTAMP WITH TIME ZONE USING check_in::timestamp with time zone,
  ALTER COLUMN check_out TYPE TIMESTAMP WITH TIME ZONE USING check_out::timestamp with time zone;

-- 2. Tabla de fotos de viaje
CREATE TABLE IF NOT EXISTS trip_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE trip_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip participants can view photos"
  ON trip_photos FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_participants WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Trip participants can insert photos"
  ON trip_photos FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_participants WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Photo owner can delete"
  ON trip_photos FOR DELETE
  USING (uploaded_by = auth.uid());

-- 3. Bucket de almacenamiento (ejecutar si no existe aún)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('trip_photos', 'trip_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
CREATE POLICY "Public read trip_photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'trip_photos');

CREATE POLICY "Authenticated users can upload trip_photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'trip_photos' AND auth.role() = 'authenticated');

CREATE POLICY "Owner can delete trip_photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'trip_photos' AND auth.uid()::text = (storage.foldername(name))[1]);
