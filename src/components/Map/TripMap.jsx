// ============================================================================
// ARCHIVO: TripMap.jsx
// DESCRIPCIÓN: Componente de visualización de Mapa interactivo usando Leaflet.
// Muestra los puntos de interés (markers) guardados para el viaje actual.
// ============================================================================

import { useEffect, useState } from 'react';
// Importamos componentes de react-leaflet para manejar el mapa de forma declarativa.
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // Estilos obligatorios de Leaflet
import L from 'leaflet';
import { supabase } from '../../lib/supabase';

// -- CORRECCIÓN DE ICONOS DE LEAFLET --
// Debido a un bug conocido en Webpack/Vite con Leaflet, los iconos por defecto no cargan solos.
// Aquí los importamos y configuramos manualmente para que se vean en el mapa.
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
// Escucha cambios en los lugares y auto-ajusta el zoom/centro del mapa para que todos sean visibles.
function MapBounds({ places }) {
  const map = useMap();
  useEffect(() => {
    if (places.length === 0) return;
    // Creamos un área que abarque todas las coordenadas.
    const bounds = L.latLngBounds(places.map(p => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [50, 50] }); // Ajustamos el mapa con un margen de 50px.
  }, [places, map]);
  return null;
}

export default function TripMap({ tripId, onAddPlace, isReadOnly }) {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlaces();
  }, [tripId]);

  const fetchPlaces = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('trip_id', tripId);
      
      if (error) throw error;
      setPlaces(data || []);
    } catch (error) {
      console.error('Error al cargar lugares del mapa:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
      {/* Cabecera del Mapa */}
      <div style={{ padding: 'var(--spacing-md) var(--spacing-xl)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Lugares Guardados ({places.length})</h3>
        {!isReadOnly && (
          <button 
            className="btn-primary" 
            onClick={onAddPlace}
            style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: '0.9rem' }}
          >
            + Añadir Lugar
          </button>
        )}
      </div>
      
      {/* Contenedor del Mapa de Leaflet */}
      <div style={{ height: '500px', width: '100%', borderRadius: '0 0 var(--border-radius-lg) var(--border-radius-lg)', overflow: 'hidden' }}>
        <MapContainer 
          center={[0, 0]} 
          zoom={2} 
          scrollWheelZoom={true} 
          style={{ height: '100%', width: '100%' }}
        >
          {/* Capa de diseño del mapa (CartoDB Voyager: estilo claro y moderno) */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          {/* Lógica de auto-enfoque */}
          {places.length > 0 && <MapBounds places={places} />}
          
          {/* Renderizado de chinchetas (Markers) */}
          {places.map(place => (
            <Marker key={place.id} position={[place.lat, place.lng]}>
              <Popup>
                {/* Popup informativo al hacer click en un marcador */}
                <div style={{ padding: '4px' }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{place.name}</h4>
                  <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>{place.reason}</p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked={place.visited} disabled={isReadOnly} />
                    <span style={{ fontSize: '0.9rem' }}>Marcado como visitado</span>
                  </label>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
