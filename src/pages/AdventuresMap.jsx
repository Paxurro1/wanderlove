// ============================================================================
// ARCHIVO: AdventuresMap.jsx
// DESCRIPCIÓN: Pantalla de Mapa Global que muestra todas las ciudades visitadas
// por la pareja en todos sus viajes. Utiliza Leaflet para la visualización.
// ============================================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Globe, MapPin } from 'lucide-react';

// -- CONFIGURACIÓN DE ICONOS DE LEAFLET --
// Importamos manualmente los assets de los iconos para evitar fallos de carga en Vite.
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// -- COMPONENTE AUXILIAR: MapBounds --
// Ajusta el zoom del mapa para que todos los marcadores sean visibles.
function MapBounds({ places }) {
  const map = useMap();
  useEffect(() => {
    if (places.length === 0) return;
    const bounds = L.latLngBounds(places.map(p => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [100, 100] });
  }, [places, map]);
  return null;
}

export default function AdventuresMap() {
  const [visitedPlaces, setVisitedPlaces] = useState([]);
  const [loading, setLoading] = useState(true);

  // Al cargar la página, traemos todos los lugares de la DB marcados como visitados.
  useEffect(() => {
    fetchVisitedPlaces();
  }, []);

  const fetchVisitedPlaces = async () => {
    try {
      setLoading(true);
      const now = new Date().toISOString();

      // Obtener lugares marcados como visitados en viajes ya finalizados (end_date < hoy)
      const { data: placesData, error: placesError } = await supabase
        .from('places')
        .select(`
          id, name, lat, lng, visited,
          trips (destination, start_date, end_date)
        `)
        .eq('visited', true)
        .lt('trips.end_date', now);

      if (placesError) throw placesError;

      // Filtrar: coordenadas válidas Y que el viaje haya terminado (RLS join puede retornar null si no cumple)
      const filteredPlaces = (placesData || []).filter(
        p => p.trips && p.trips.end_date && new Date(p.trips.end_date) < new Date() && (p.lat !== 0 || p.lng !== 0)
      );
      setVisitedPlaces(filteredPlaces);
    } catch (error) {
      console.error('Error al obtener lugares visitados:', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Cabecera Flotante con Glassmorphism */}
      <header style={{ 
        position: 'absolute', top: '20px', left: '20px', right: '20px', zIndex: 1000,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/" className="btn-secondary" style={{ 
            padding: '10px 15px', 
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <ArrowLeft size={20} />
          </Link>
          <div className="glass-panel" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Globe color="var(--color-primary)" />
            <h1 style={{ margin: 0, fontSize: '1.2rem' }}>Mapa de Aventuras</h1>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '10px 20px' }}>
          <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{visitedPlaces.length}</span> Ciudades Visitadas
        </div>
      </header>

      {/* Contenedor del Mapa a pantalla completa */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer 
          center={[20, 0]} 
          zoom={2} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          
          {visitedPlaces.length > 0 && <MapBounds places={visitedPlaces} />}

          {visitedPlaces.map(place => (
            <Marker key={place.id} position={[place.lat, place.lng]}>
              <Popup>
                <div style={{ textAlign: 'center', padding: '5px' }}>
                  <h3 style={{ margin: '0 0 5px 0', color: 'var(--color-primary)' }}>{place.name}</h3>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>
                    <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    Viaje a {place.trips?.destination}
                  </p>
                  <em style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Visitado en {place.trips?.start_date ? new Date(place.trips.start_date).getFullYear() : 'Fecha desconocida'}
                  </em>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {loading && (
        <div style={{ 
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'var(--glass-bg)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
          color: 'var(--color-text-main)'
        }}>
          <h2>Cargando vuestras huellas por el mundo...</h2>
        </div>
      )}
    </div>
  );
}
