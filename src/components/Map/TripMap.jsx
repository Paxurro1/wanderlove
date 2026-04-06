// ============================================================================
// ARCHIVO: TripMap.jsx
// DESCRIPCIÓN: Componente de visualización de Mapa interactivo usando Leaflet.
// Muestra los puntos de interés (markers) guardados para el viaje actual,
// y dibuja una línea de ruta conectando todos los puntos del itinerario.
// ============================================================================

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../../lib/supabase';

// -- CORRECCIÓN DE ICONOS DE LEAFLET --
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

/**
 * Componente AUXILIAR: MapBounds
 * Ajusta el "cámara" del mapa para que todos los puntos sean visibles.
 */
function MapBounds({ places }) {
  const map = useMap();
  useEffect(() => {
    if (places.length === 0) return;
    const bounds = L.latLngBounds(places.map(p => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [50, 50] }); 
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
        .eq('trip_id', tripId)
        .order('day_index', { ascending: true })
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      setPlaces(data || []);
    } catch (error) {
      console.error('Error al cargar lugares del mapa:', error);
    } finally {
      setLoading(false);
    }
  };

  // Puntos válidos para dibujar la ruta (excluir coords en (0,0))
  const routePoints = places
    .filter(p => p.lat !== 0 || p.lng !== 0)
    .sort((a, b) => {
      if (a.day_index !== b.day_index) return (a.day_index || 0) - (b.day_index || 0);
      return (a.order_index || 0) - (b.order_index || 0);
    })
    .map(p => [p.lat, p.lng]);

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
          {/* Capa de diseño del mapa (CartoDB Voyager) */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          {/* Lógica de auto-enfoque */}
          {places.length > 0 && <MapBounds places={places.filter(p => p.lat !== 0 || p.lng !== 0)} />}

          {/* Línea de ruta que conecta todos los puntos del itinerario en orden */}
          {routePoints.length > 1 && (
            <Polyline
              positions={routePoints}
              pathOptions={{
                color: '#764ba2',
                weight: 3,
                opacity: 0.7,
                dashArray: '8, 6'
              }}
            />
          )}
          
          {/* Marcadores del itinerario */}
          {places.map(place => (
            <Marker key={place.id} position={[place.lat, place.lng]}>
              <Popup>
                <div style={{ padding: '4px', minWidth: '150px' }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                    {place.day_index && <span style={{ fontSize: '0.75rem', display: 'block', color: '#888', marginBottom: '2px' }}>Día {place.day_index}</span>}
                    {place.name}
                  </h4>
                  <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{place.reason}</p>
                  
                  {/* El estado 'visitado' puede verse y modificarse desde el mapa */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      defaultChecked={place.visited} 
                      disabled={isReadOnly} 
                      onChange={async (e) => {
                        if (isReadOnly) return;
                        const newVisited = e.target.checked;
                        const { error } = await supabase
                          .from('places')
                          .update({ visited: newVisited })
                          .eq('id', place.id);
                        if (!error) fetchPlaces();
                      }}
                    />
                    <span style={{ fontSize: '0.9rem' }}>{place.visited ? '¡Visitado!' : 'Marcar visitado'}</span>
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

