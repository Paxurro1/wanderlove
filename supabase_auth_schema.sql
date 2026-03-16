-- UPDATED SCHEMA FOR WANDERLOVE
-- Includes Users, Friendships, and Trip Participants

-- 1. Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone."
ON public.profiles FOR SELECT
USING ( true );

CREATE POLICY "Users can insert their own profile."
ON public.profiles FOR INSERT
WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update own profile."
ON public.profiles FOR UPDATE
USING ( auth.uid() = id );

-- 2. Friendships table
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, friend_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own friendships."
ON public.friendships FOR SELECT
USING ( auth.uid() = user_id OR auth.uid() = friend_id );

CREATE POLICY "Users can request friendships."
ON public.friendships FOR INSERT
WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can update their friendship status."
ON public.friendships FOR UPDATE
USING ( auth.uid() = user_id OR auth.uid() = friend_id );

-- 3. Update Trips table to include owner and invite system
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id);

-- 4. Trip Participants (Invitations)
CREATE TABLE IF NOT EXISTS public.trip_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(trip_id, user_id)
);

ALTER TABLE public.trip_participants ENABLE ROW LEVEL SECURITY;

-- Security Definer function to break RLS recursion
CREATE OR REPLACE FUNCTION public.is_trip_owner(trip_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.trips WHERE id = trip_uuid AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Participants can see their own invitations."
ON public.trip_participants FOR SELECT
USING ( auth.uid() = user_id OR public.is_trip_owner(trip_id) );

CREATE POLICY "Owners can invite participants."
ON public.trip_participants FOR INSERT
WITH CHECK ( public.is_trip_owner(trip_id) );

CREATE POLICY "Users can accept their own invitation."
ON public.trip_participants FOR UPDATE
USING ( auth.uid() = user_id );

-- 5. RLS Policies for trips (Only owner or accepted participants can see/edit)
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own trips."
ON public.trips FOR INSERT
WITH CHECK ( auth.uid() = owner_id );

CREATE POLICY "Trips are viewable by owner or participants."
ON public.trips FOR SELECT
USING (
    auth.uid() = owner_id OR 
    EXISTS (
        SELECT 1 FROM public.trip_participants 
        WHERE trip_id = public.trips.id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Trips are editable by owner or accepted participants."
ON public.trips FOR UPDATE
USING (
    auth.uid() = owner_id OR 
    EXISTS (
        SELECT 1 FROM public.trip_participants 
        WHERE trip_id = public.trips.id 
        AND user_id = auth.uid() 
        AND status = 'accepted'
    )
);

CREATE POLICY "Only owners can delete trips."
ON public.trips FOR DELETE
USING ( auth.uid() = owner_id );

-- Trigger to automatically create a profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- FEATURE BATCH 2.0 - Run these if updating an existing DB
-- =========================================================

-- Allow users to delete their own friendships (unfriend)
CREATE POLICY IF NOT EXISTS "Users can delete their own friendships."
ON public.friendships FOR DELETE
USING ( auth.uid() = user_id OR auth.uid() = friend_id );

-- Allow participants to leave a trip (delete their own row)
CREATE POLICY IF NOT EXISTS "Participants can leave a trip."
ON public.trip_participants FOR DELETE
USING ( auth.uid() = user_id );

-- Add reference fields to expenses for cascade linking
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS reference_type TEXT CHECK (reference_type IN ('document', 'accommodation', 'transport', 'transfer'));
