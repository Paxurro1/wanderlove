// ============================================================================
// ARCHIVO: NewPlaceModal.jsx
// DESCRIPCIÓN: Modal para añadir o editar lugares/actividades con buscador real
// y selector de ubicación en mapa interactivo.
// ============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Search, MapPin, Map } from 'lucide-react';
import MapPickerModal from './MapPickerModal';

export default function NewPlaceModal({ isOpen, onClose, tripId, tripStartDate, tripEndDate, onPlaceAdded, editingPlace, modalTitle = 'Añadir al plan', isDestination = false }) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    reason: '',
    day_indices: [1],
    lat: 0,
    lng: 0,
    activity_time: ''
  });

  useEffect(() => {
    if (editingPlace) {
      setFormData({
        name: editingPlace.name || '',
        reason: editingPlace.reason || '',
        day_indices: [editingPlace.day_index || 1],
        lat: editingPlace.lat || 0,
        lng: editingPlace.lng || 0,
        activity_time: editingPlace.activity_time || ''
      });
      setSearchQuery(editingPlace.name || '');
    } else {
      setFormData({ name: '', reason: '', day_indices: [1], lat: 0, lng: 0, activity_time: '' });
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [editingPlace, isOpen]);

  if (!isOpen) return null;

  // Lógica de búsqueda con Nominatim (OpenStreetMap)
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
      const data = await resp.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error en geocoding:', error);
    } finally {
      setSearching(false);
    }
  };

  const selectPlace = (place) => {
    setFormData({
      ...formData,
      name: place.display_name.split(',')[0], // Tomamos el nombre corto
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon)
    });
    setSearchQuery(place.display_name.split(',')[0]);
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    if (!isDestination && (!formData.day_indices || formData.day_indices.length === 0)) {
      alert('Por favor, selecciona al menos un día.');
      return;
    }
    
    setLoading(true);

    try {
      const activeIndices = isDestination ? [0] : formData.day_indices;

      if (editingPlace) {
        const primaryDay = activeIndices[0];

        const placeData = {
          trip_id: tripId,
          name: formData.name,
          reason: formData.reason,
          day_index: primaryDay,
          lat: formData.lat,
          lng: formData.lng,
          visited: editingPlace.visited,
          activity_time: formData.activity_time || null,
          is_destination: isDestination
        };

        const result = await supabase.from('places').update(placeData).eq('id', editingPlace.id).select();
        if (result.error) throw result.error;

        // Insertar para el resto de días seleccionados (si los hay)
        if (activeIndices.length > 1) {
          const extraPlaces = activeIndices.slice(1).map(dayIdx => ({
            ...placeData,
            day_index: dayIdx,
            visited: false,
            activity_time: null, // Fijar a nulo para los subsiguientes días
            is_destination: isDestination
          }));
          await supabase.from('places').insert(extraPlaces);
        }

        onPlaceAdded(result.data[0]);
      } else {
        // En modo creación, insertamos un registro por cada día seleccionado
        const placesToInsert = activeIndices.map((dayIdx, index) => ({
          trip_id: tripId,
          name: formData.name,
          reason: formData.reason,
          day_index: dayIdx,
          lat: formData.lat,
          lng: formData.lng,
          visited: false,
          activity_time: (index > 0) ? null : (formData.activity_time || null),
          is_destination: isDestination
        }));

        const result = await supabase.from('places').insert(placesToInsert).select();
        if (result.error) throw result.error;
        onPlaceAdded(result.data[0]); // Para refrescar
      }

      onClose();
    } catch (error) {
      alert('Error al procesar el lugar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in" style={{ maxWidth: '450px' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 'var(--spacing-md)', right: 'var(--spacing-md)', color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <X size={24} />
        </button>
        
        <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>
          {editingPlace ? 'Editar actividad' : modalTitle}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {/* Selector de día con fechas reales y Hora */}
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                {isDestination ? 'Día de llegada' : 'Días del plan '}
                {!isDestination && <span style={{ color: 'var(--color-primary)', fontSize: '0.8rem' }}>(puedes elegir varios)</span>}
              </label>
              {tripStartDate && tripEndDate ? (() => {
                const start = new Date(tripStartDate);
                const end = new Date(tripEndDate);
                const diffMs = end - start;
                const totalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
                return (
                  <div style={{ 
                    maxHeight: '180px', overflowY: 'auto', 
                    padding: '8px', borderRadius: '8px', 
                    border: '1px solid var(--color-border)', 
                    background: 'var(--color-bg)',
                    display: 'flex', flexDirection: 'column', gap: '6px'
                  }}>
                    {Array.from({ length: totalDays }, (_, i) => {
                      const dayDate = new Date(start);
                      dayDate.setDate(start.getDate() + i);
                      const label = dayDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                      const idx = i + 1;
                      const isChecked = formData.day_indices.includes(idx);
                      
                      return (
                        <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: isChecked ? 'var(--color-primary)' : 'var(--color-text-main)', fontWeight: isChecked ? 600 : 400 }}>
                          <input 
                            type={isDestination ? "radio" : "checkbox"}
                            name={isDestination ? "day_selection" : undefined}
                            checked={isChecked}
                            onChange={(e) => {
                              if (isDestination) {
                                setFormData({...formData, day_indices: [idx]});
                              } else {
                                if (e.target.checked) {
                                  setFormData({...formData, day_indices: [...formData.day_indices, idx]});
                                } else {
                                  // No permitir quedarse sin días
                                  if (formData.day_indices.length > 1) {
                                    setFormData({...formData, day_indices: formData.day_indices.filter(d => d !== idx)});
                                  }
                                }
                              }
                            }}
                          />
                          Día {idx} – {label}
                        </label>
                      );
                    })}
                  </div>
                );
              })() : (
                <input
                  type="number" min="1" required
                  value={formData.day_indices[0] || 1}
                  onChange={e => setFormData({...formData, day_indices: [parseInt(e.target.value)]})}
                  style={{ width: '70px', padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)', textAlign: 'center' }}
                />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '120px' }}>
              <label style={{ fontWeight: 500 }}>{isDestination ? 'Hora de llegada:' : 'Hora:'}</label>
              <input
                type="time"
                value={formData.activity_time}
                onChange={e => setFormData({...formData, activity_time: e.target.value})}
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
          </div>

          {/* Buscador de Lugar + selector mapa */}
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Buscar Lugar</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={() => setIsMapPickerOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', borderRadius: '8px',
                  border: '1px solid var(--color-primary)',
                  background: 'rgba(118,75,162,0.08)',
                  color: 'var(--color-primary)',
                  cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                  whiteSpace: 'nowrap'
                }}
              >
                <Map size={14} /> Elegir en el mapa
              </button>
              {formData.lat !== 0 && (
                <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                  <MapPin size={12} color="var(--color-primary)" />
                  {formData.name || `${formData.lat.toFixed(4)}, ${formData.lng.toFixed(4)}`}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                placeholder="Ej. Torre Eiffel, Paris..."
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
              <button 
                type="button" 
                onClick={handleSearch}
                className="btn-secondary"
                style={{ padding: '10px' }}
                disabled={searching}
              >
                <Search size={20} />
              </button>
            </div>

            {/* Resultados de búsqueda */}
            {searchResults.length > 0 && (
              <div style={{ 
                position: 'absolute', top: '100%', left: 0, right: 0, 
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: '8px', marginTop: '4px', zIndex: 10, boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
              }}>
                {searchResults.map(res => (
                  <div 
                    key={res.place_id} 
                    onClick={() => selectPlace(res)}
                    style={{ 
                      padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)',
                      fontSize: '0.9rem', color: 'var(--color-text-main)', transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <MapPin size={14} style={{ marginRight: '8px', color: 'var(--color-primary)' }} />
                    {res.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirmación de nombre (se llena con el buscador) */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Nombre en el plan</label>
            <input 
              type="text" required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Nombre del sitio..."
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
            />
          </div>

          {/* Notas */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Notas / Plan</label>
            <textarea 
              value={formData.reason}
              onChange={e => setFormData({...formData, reason: e.target.value})}
              placeholder="¿Qué vamos a hacer allí?"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)', minHeight: '80px', resize: 'none' }}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 'var(--spacing-md)' }}>
            {loading ? 'Guardando...' : (editingPlace ? 'Guardar Cambios' : 'Añadir al plan')}
          </button>
        </form>
      </div>
    </div>

    <MapPickerModal
      isOpen={isMapPickerOpen}
      onClose={() => setIsMapPickerOpen(false)}
      onSelect={({ lat, lng, name }) => {
        setFormData(prev => ({ ...prev, lat, lng, name: name || prev.name }));
        setSearchQuery(name || searchQuery);
      }}
      title="Elegir ubicación del plan"
    />
    </>
  );
}
