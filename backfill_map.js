
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

async function backfill() {
  console.log('--- INICIANDO BACKFILL DE GEOLOCALIZACIÓN ---');
  
  // 1. Obtener todos los viajes
  const { data: trips, error: tError } = await supabase.from('trips').select('*');
  if (tError) {
    console.error('Error fetching trips:', tError);
    return;
  }

  console.log(`Procesando ${trips.length} viajes...`);

  for (const trip of trips) {
    console.log(`\n> PROCESANDO VIAJE: ${trip.destination} (${trip.status})`);
    
    // 2. Marcar todos los lugares de este viaje como visitados si el viaje es pasado
    if (trip.status === 'past') {
      console.log(`  [UPDATE] Marcando todos los lugares de '${trip.destination}' como visitados.`);
      const { error: updError } = await supabase
        .from('places')
        .update({ visited: true })
        .eq('trip_id', trip.id);
      if (updError) console.error(`  [ERROR] Al actualizar lugares:`, updError.message);
    }

    // 3. Verificar si ya tiene un lugar con su nombre (destino principal) que tenga coordenadas válidas
    const { data: existingMainPlaces, error: pError } = await supabase
      .from('places')
      .select('*')
      .eq('trip_id', trip.id)
      .eq('name', trip.destination);

    let needsGeocoding = true;
    if (existingMainPlaces && existingMainPlaces.length > 0) {
      const p = existingMainPlaces[0];
      if (p.lat !== 0 && p.lng !== 0) {
        console.log(`  [SKIP] '${trip.destination}' ya tiene coordenadas válidas.`);
        needsGeocoding = false;
        
        // Asegurar que esté marcado como visitado si es pasado
        if (trip.status === 'past' && !p.visited) {
            await supabase.from('places').update({ visited: true }).eq('id', p.id);
        }
      } else {
        console.log(`  [INFO] '${trip.destination}' existe pero tiene coordenadas (0,0). Vamos a re-localizar.`);
      }
    }

    // 4. Geolocalizar destino si es necesario
    if (needsGeocoding) {
      console.log(`  [GEO] Localizando '${trip.destination}' via Nominatim...`);
      try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trip.destination)}&limit=1`, {
          headers: {
            'User-Agent': 'WanderLove-App-Migration'
          }
        });
        
        if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`HTTP ${resp.status}: ${text.substring(0, 50)}`);
        }
        
        const geo = await resp.json();

        if (geo && geo.length > 0) {
          const lat = parseFloat(geo[0].lat);
          const lng = parseFloat(geo[0].lon);

          if (existingMainPlaces && existingMainPlaces.length > 0) {
            // Actualizar el existente
            await supabase.from('places').update({ lat, lng, visited: trip.status === 'past' }).eq('id', existingMainPlaces[0].id);
            console.log(`  [SUCCESS] Punto existente actualizado a (${lat}, ${lng}).`);
          } else {
            // Crear nuevo
            const newPlace = {
              trip_id: trip.id,
              name: trip.destination,
              lat,
              lng,
              visited: trip.status === 'past',
              reason: 'Destino principal (Generado por migración)',
              day_index: 1
            };
            const { error: insError } = await supabase.from('places').insert([newPlace]);
            if (insError) throw insError;
            console.log(`  [SUCCESS] Nuevo punto creado en (${lat}, ${lng}).`);
          }
        } else {
          console.warn(`  [WARN] No se encontraron coordenadas para '${trip.destination}'. Ignorando.`);
        }
      } catch (err) {
        console.error(`  [ERROR] Fallo al procesar '${trip.destination}':`, err.message);
      }
      
      // Pequeño delay obligatorio para respetar la política de Nominatim
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  // 5. Un último check: Hay lugares perdidos (no main destination) con lat=0? 
  // Intentar localizarlos por su nombre.
  console.log('\n--- VERIFICANDO LUGARES SECUNDARIOS SIN COORDENADAS ---');
  const { data: zeroPlaces } = await supabase.from('places').select('*').eq('lat', 0).eq('lng', 0);
  
  if (zeroPlaces && zeroPlaces.length > 0) {
    console.log(`Encontrados ${zeroPlaces.length} lugares con coordenadas (0,0).`);
    for (const p of zeroPlaces) {
       console.log(`  [GEO] Localizando sitio secundario: '${p.name}'...`);
       try {
         const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(p.name)}&limit=1`, {
           headers: { 'User-Agent': 'WanderLove-App-Migration' }
         });
         const geo = await resp.json();
         if (geo && geo.length > 0) {
           await supabase.from('places').update({ 
             lat: parseFloat(geo[0].lat), 
             lng: parseFloat(geo[0].lon) 
           }).eq('id', p.id);
           console.log(`  [SUCCESS] '${p.name}' localizado.`);
         }
       } catch (err) {
         console.error(`  [ERROR] Error con '${p.name}':`, err.message);
       }
       await new Promise(r => setTimeout(r, 1200));
    }
  }

  console.log('\n--- BACKFILL COMPLETADO ---');
}

backfill();
