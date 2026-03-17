-- ==========================================
-- Migración para la funcionalidad de Alquiler de Coches
-- ==========================================

-- 1. Crear la tabla trip_rentals
CREATE TABLE IF NOT EXISTS public.trip_rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    pickup_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    return_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    pickup_location TEXT,
    return_location TEXT,
    price NUMERIC(10, 2) DEFAULT 0,
    insurance_type TEXT,
    car_model TEXT,
    gas_cost NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.trip_rentals ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Seguridad (RLS Policies)

-- Política SELECT: Los participantes aceptados pueden ver los alquileres del viaje
CREATE POLICY "Participantes pueden ver alquileres"
    ON public.trip_rentals
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.trip_participants
            WHERE trip_participants.trip_id = trip_rentals.trip_id
            AND trip_participants.user_id = auth.uid()
            AND trip_participants.status = 'accepted'
        )
        OR
        EXISTS (
            SELECT 1 FROM public.trips
            WHERE trips.id = trip_rentals.trip_id
            AND trips.owner_id = auth.uid()
        )
    );

-- Política INSERT: Los participantes aceptados pueden crear alquileres
CREATE POLICY "Participantes pueden crear alquileres"
    ON public.trip_rentals
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.trip_participants
            WHERE trip_participants.trip_id = trip_rentals.trip_id
            AND trip_participants.user_id = auth.uid()
            AND trip_participants.status = 'accepted'
        )
        OR
        EXISTS (
            SELECT 1 FROM public.trips
            WHERE trips.id = trip_rentals.trip_id
            AND trips.owner_id = auth.uid()
        )
    );

-- Política UPDATE: Los participantes aceptados pueden actualizar alquileres
CREATE POLICY "Participantes pueden actualizar alquileres"
    ON public.trip_rentals
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.trip_participants
            WHERE trip_participants.trip_id = trip_rentals.trip_id
            AND trip_participants.user_id = auth.uid()
            AND trip_participants.status = 'accepted'
        )
        OR
        EXISTS (
            SELECT 1 FROM public.trips
            WHERE trips.id = trip_rentals.trip_id
            AND trips.owner_id = auth.uid()
        )
    );

-- Política DELETE: Los participantes aceptados pueden borrar alquileres
CREATE POLICY "Participantes pueden borrar alquileres"
    ON public.trip_rentals
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.trip_participants
            WHERE trip_participants.trip_id = trip_rentals.trip_id
            AND trip_participants.user_id = auth.uid()
            AND trip_participants.status = 'accepted'
        )
        OR
        EXISTS (
            SELECT 1 FROM public.trips
            WHERE trips.id = trip_rentals.trip_id
            AND trips.owner_id = auth.uid()
        )
    );
