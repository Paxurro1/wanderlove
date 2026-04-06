// ============================================================================
// ARCHIVO: MapPickerModal.jsx
// DESCRIPCIÓN: Modal con mapa Leaflet para elegir una ubicación haciendo clic
// o buscando por nombre. Retorna { lat, lng, name } al componente padre.
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Search, MapPin, Check } from 'lucide-react';

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
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Subcomponente: captura los clics en el mapa y actualiza la posición
function ClickHandler({ onLocationClick }) {
  useMapEvents({
    click(e) {
      onLocationClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

// Subcomponente: mueve la vista del mapa cuando cambia la posición
function MapMover({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], Math.max(map.getZoom(), 12), { animate: true });
    }
  }, [lat, lng, map]);
  return null;
}

export default function MapPickerModal({ isOpen, onClose, onSelect, initialLat = 40.416, initialLng = -3.703, title = 'Seleccionar Ubicación' }) {
  const [selectedLat, setSelectedLat] = useState(null);
  const [selectedLng, setSelectedLng] = useState(null);
  const [selectedName, setSelectedName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Limpiar estado al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setSelectedLat(null);
      setSelectedLng(null);
      setSelectedName('');
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMapClick = async (lat, lng) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    // Reverse geocoding para obtener el nombre del lugar
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`
      );
      const data = await resp.json();
      if (data?.display_name) {
        // Usamos el nombre corto (localidad o primer elemento)
        const shortName = data.name || data.display_name.split(',')[0];
        setSelectedName(shortName);
      }
    } catch {
      setSelectedName(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data = await resp.json();
      setSearchResults(data);
    } catch {
      console.error('Error buscando ubicación');
    } finally {
      setSearching(false);
    }
  };

  const selectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setSelectedLat(lat);
    setSelectedLng(lng);
    setSelectedName(result.display_name.split(',')[0]);
    setSearchResults([]);
    setSearchQuery(result.display_name.split(',')[0]);
  };

  const handleConfirm = () => {
    if (selectedLat === null || selectedLng === null) return;
    onSelect({ lat: selectedLat, lng: selectedLng, name: selectedName });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        width: '100%', maxWidth: '750px', maxHeight: '90vh',
        background: 'var(--color-surface)', borderRadius: 'var(--border-radius-lg)',
        border: '1px solid var(--color-border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {/* Cabecera */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--color-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin size={20} color="var(--color-primary)" />
            <h3 style={{ margin: 0 }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={22} />
          </button>
        </div>

        {/* Buscador */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', position: 'relative', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
              placeholder="Buscar lugar... o haz clic directamente en el mapa"
              style={{
                flex: 1, padding: '10px 14px', borderRadius: '8px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)', color: 'var(--color-text-main)',
                fontSize: '0.9rem'
              }}
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              style={{
                padding: '10px 14px', borderRadius: '8px',
                background: 'var(--color-primary)', border: 'none',
                color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Search size={16} />
            </button>
          </div>
          {/* Resultados de búsqueda */}
          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: '16px', right: '16px',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: '8px', zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              maxHeight: '200px', overflowY: 'auto'
            }}>
              {searchResults.map(res => (
                <div
                  key={res.place_id}
                  onClick={() => selectSearchResult(res)}
                  style={{
                    padding: '10px 14px', cursor: 'pointer',
                    borderBottom: '1px solid var(--color-border)',
                    fontSize: '0.875rem', color: 'var(--color-text-main)',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(118,75,162,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <MapPin size={12} style={{ marginRight: '6px', color: 'var(--color-primary)', flexShrink: 0 }} />
                  {res.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instrucción */}
        <div style={{ padding: '8px 16px', background: 'rgba(118,75,162,0.08)', flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🖱️ Haz clic en el mapa para seleccionar la ubicación exacta
            {selectedLat && (
              <span style={{ marginLeft: 'auto', color: 'var(--color-primary)', fontWeight: 600 }}>
                📍 {selectedName || `${selectedLat.toFixed(4)}, ${selectedLng.toFixed(4)}`}
              </span>
            )}
          </p>
        </div>

        {/* Mapa */}
        <div style={{ flex: 1, minHeight: '350px' }}>
          <MapContainer
            center={[initialLat, initialLng]}
            zoom={5}
            style={{ height: '100%', width: '100%', minHeight: '350px' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <ClickHandler onLocationClick={handleMapClick} />
            {selectedLat && selectedLng && (
              <>
                <Marker position={[selectedLat, selectedLng]} />
                <MapMover lat={selectedLat} lng={selectedLng} />
              </>
            )}
          </MapContainer>
        </div>

        {/* Botones de acción */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid var(--color-border)',
          display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px', borderRadius: '8px',
              background: 'transparent', border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)', cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedLat === null}
            style={{
              padding: '10px 20px', borderRadius: '8px',
              background: selectedLat !== null ? 'var(--color-primary)' : 'var(--color-border)',
              border: 'none', color: 'white', cursor: selectedLat !== null ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: '8px',
              fontWeight: 600, transition: 'all 0.2s'
            }}
          >
            <Check size={16} /> Confirmar ubicación
          </button>
        </div>
      </div>
    </div>
  );
}
