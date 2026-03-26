// ============================================================================
// ARCHIVO: NewPlaceModal.jsx
// DESCRIPCIÓN: Modal para añadir o editar lugares/actividades con buscador real.
// ============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Search, MapPin } from 'lucide-react';

export default function NewPlaceModal({ isOpen, onClose, tripId, tripStartDate, tripEndDate, onPlaceAdded, editingPlace, modalTitle = 'Añadir al plan' }) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    reason: '',
    day_index: 1,
    lat: 0,
    lng: 0,
    activity_time: ''
  });

  useEffect(() => {
    if (editingPlace) {
      setFormData({
        name: editingPlace.name || '',
        reason: editingPlace.reason || '',
        day_index: editingPlace.day_index || 1,
        lat: editingPlace.lat || 0,
        lng: editingPlace.lng || 0,
        activity_time: editingPlace.activity_time || ''
      });
      setSearchQuery(editingPlace.name || '');
    } else {
      setFormData({ name: '', reason: '', day_index: 1, lat: 0, lng: 0, activity_time: '' });
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
    
    setLoading(true);

    try {
      const placeData = {
        trip_id: tripId,
        name: formData.name,
        reason: formData.reason,
        day_index: parseInt(formData.day_index, 10),
        lat: formData.lat,
        lng: formData.lng,
        visited: editingPlace ? editingPlace.visited : false,
        activity_time: formData.activity_time || null
      };

      let result;
      if (editingPlace) {
        result = await supabase.from('places').update(placeData).eq('id', editingPlace.id).select();
      } else {
        result = await supabase.from('places').insert([placeData]).select();
      }

      if (result.error) throw result.error;
      onPlaceAdded(result.data[0]);
      onClose();
    } catch (error) {
      alert('Error al procesar el lugar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
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
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <label style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>Día del viaje:</label>
              {tripStartDate && tripEndDate ? (() => {
                const start = new Date(tripStartDate);
                const end = new Date(tripEndDate);
                const diffMs = end - start;
                const totalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
                return (
                  <select
                    value={formData.day_index}
                    onChange={e => setFormData({...formData, day_index: parseInt(e.target.value)})}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)', cursor: 'pointer', width: '100%' }}
                  >
                    {Array.from({ length: totalDays }, (_, i) => {
                      const dayDate = new Date(start);
                      dayDate.setDate(start.getDate() + i);
                      const label = dayDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                      return (
                        <option key={i + 1} value={i + 1}>
                          Día {i + 1} – {label}
                        </option>
                      );
                    })}
                  </select>
                );
              })() : (
                <input
                  type="number" min="1" required
                  value={formData.day_index}
                  onChange={e => setFormData({...formData, day_index: e.target.value})}
                  style={{ width: '70px', padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)', textAlign: 'center' }}
                />
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ fontWeight: 500 }}>Hora:</label>
              <input
                type="time"
                value={formData.activity_time}
                onChange={e => setFormData({...formData, activity_time: e.target.value})}
                style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
          </div>

          {/* Buscador de Lugar */}
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Buscar Lugar</label>
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
  );
}
