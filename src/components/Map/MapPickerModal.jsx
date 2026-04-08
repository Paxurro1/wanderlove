// ============================================================================
// ARCHIVO: MapPickerModal.jsx
// DESCRIPCIÓN: Modal con mapa Leaflet para elegir una ubicación haciendo clic
// o buscando por nombre con autocompletado instantáneo. Retorna { lat, lng, name }.
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
      map.setView([lat, lng], Math.max(map.getZoom(), 15), { animate: true });
    }
  }, [lat, lng, map]);
  return null;
}

// Categorías de búsqueda rápida
const QUICK_CATEGORIES = [
  { label: '🏨 Hotel', query: 'hotel' },
  { label: '🅿️ Parking', query: 'parking' },
  { label: '🍽️ Restaurante', query: 'restaurante' },
  { label: '⛽ Gasolinera', query: 'gasolinera' },
  { label: '🏖️ Playa', query: 'playa' },
  { label: '🏛️ Museo', query: 'museo' },
];

export default function MapPickerModal({ isOpen, onClose, onSelect, initialLat = 40.416, initialLng = -3.703, title = 'Seleccionar Ubicación' }) {
  const [selectedLat, setSelectedLat] = useState(null);
  const [selectedLng, setSelectedLng] = useState(null);
  const [selectedName, setSelectedName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

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

  // Reverse geocoding al hacer clic en el mapa
  const handleMapClick = async (lat, lng) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await resp.json();
      if (data?.display_name) {
        // Primero intentamos el nombre del POI, luego nombre de calle, luego primer fragmento
        const name = data.name || data.address?.road || data.display_name.split(',')[0];
        setSelectedName(name);
      }
    } catch {
      setSelectedName(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  };

  // Búsqueda con debounce automático al escribir
  const handleSearchInput = (value) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(() => doSearch(value), 350);
  };

  // Búsqueda de lugares con Nominatim
  const doSearch = async (query) => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=7&addressdetails=1`
      );
      const data = await resp.json();
      setSearchResults(data);
    } catch {
      console.error('Error buscando ubicación');
    } finally {
      setSearching(false);
    }
  };

  // Búsqueda rápida por categoría (añade ciudad si hay una seleccionada)
  const handleQuickSearch = (query) => {
    setSearchQuery(query);
    doSearch(query);
  };

  const selectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const name = result.name || result.display_name.split(',')[0];
    setSelectedLat(lat);
    setSelectedLng(lng);
    setSelectedName(name);
    setSearchResults([]);
    setSearchQuery(name);
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
        width: '100%', maxWidth: '780px', maxHeight: '90vh',
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

        {/* Buscador con autocompletado */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', position: 'relative', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), doSearch(searchQuery))}
                placeholder="Busca hotel, restaurante, parking... o pincha en el mapa"
                autoFocus
                style={{
                  width: '100%', padding: '10px 14px 10px 38px', borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)', color: 'var(--color-text-main)',
                  fontSize: '0.9rem', boxSizing: 'border-box'
                }}
              />
              {searching && (
                <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Buscando...
                </div>
              )}
            </div>
          </div>

          {/* Atajos de categoría */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
            {QUICK_CATEGORIES.map(cat => (
              <button
                key={cat.query}
                type="button"
                onClick={() => handleQuickSearch(cat.query)}
                style={{
                  padding: '4px 10px', borderRadius: '20px', fontSize: '0.78rem',
                  border: '1px solid var(--color-border)',
                  background: searchQuery === cat.query ? 'var(--color-primary)' : 'rgba(118,75,162,0.07)',
                  color: searchQuery === cat.query ? 'white' : 'var(--color-text-main)',
                  cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Resultados de búsqueda */}
          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% - 8px)', left: '16px', right: '16px',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: '8px', zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              maxHeight: '220px', overflowY: 'auto'
            }}>
              {searchResults.map(res => (
                <div
                  key={res.place_id}
                  onClick={() => selectSearchResult(res)}
                  style={{
                    padding: '10px 14px', cursor: 'pointer',
                    borderBottom: '1px solid var(--color-border)',
                    fontSize: '0.875rem', color: 'var(--color-text-main)',
                    transition: 'background 0.15s',
                    display: 'flex', flexDirection: 'column', gap: '2px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(118,75,162,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={12} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                    <span style={{ fontWeight: 500 }}>{res.name || res.display_name.split(',')[0]}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', paddingLeft: '18px' }}>
                    {res.display_name.split(',').slice(1, 3).join(',').trim()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instrucción + lugar seleccionado */}
        <div style={{ padding: '8px 16px', background: 'rgba(118,75,162,0.08)', flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🖱️ También puedes pinchar directamente sobre cualquier lugar del mapa
            {selectedLat && (
              <span style={{ marginLeft: 'auto', color: 'var(--color-primary)', fontWeight: 600 }}>
                📍 {selectedName || `${selectedLat.toFixed(4)}, ${selectedLng.toFixed(4)}`}
              </span>
            )}
          </p>
        </div>

        {/* Mapa — tile OSM estándar para ver más nombres de POIs */}
        <div style={{ flex: 1, minHeight: '350px' }}>
          <MapContainer
            center={[initialLat, initialLng]}
            zoom={5}
            style={{ height: '100%', width: '100%', minHeight: '350px' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
