
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnostic() {
  console.log('--- DIAGNÓSTICO DE DATOS ---');
  
  // 1. Verificar Lugares
  const { data: places, error: pError } = await supabase.from('places').select('*');
  if (pError) console.error('Error fetching places:', pError);
  console.log(`Total lugares found: ${places?.length || 0}`);
  places?.forEach(p => {
    console.log(`  - PLACE: ${p.id} | ${p.name} | Lat=${p.lat} | Lng=${p.lng} | Visited=${p.visited}`);
  });

  // 2. Verificar Viajes
  const { data: trips, error: tError } = await supabase.from('trips').select('*');
  if (tError) console.error('Error fetching trips:', tError);
  console.log(`Total viajes found: ${trips?.length || 0}`);
  trips?.forEach(t => {
    console.log(`  - TRIP: ${t.id} | ${t.destination} | Status=${t.status}`);
  });
}

diagnostic();
