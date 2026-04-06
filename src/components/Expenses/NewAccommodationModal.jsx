// ============================================================================
// ARCHIVO: NewAccommodationModal.jsx
// DESCRIPCIÓN: Formulario modal para registrar un nuevo alojamiento.
// - Nombre con autocompletado Nominatim (busca al escribir y muestra sugerencias)
// - Botón de ubicar en el mapa interactivo
// - Fechas limitadas al periodo del viaje (min/max)
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Map, MapPin } from 'lucide-react';
import MapPickerModal from '../Map/MapPickerModal';

// Convierte un datetime string a formato "YYYY-MM-DDTHH:MM" para datetime-local input
function toDateTimeLocal(val) {
  if (!val) return '';
  const d = new Date(val);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

// Convierte una fecha de viaje a "YYYY-MM-DDTHH:MM" para los atributos min/max
function toMinMax(dateStr, isEnd) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isEnd) d.setHours(23, 59);
    else d.setHours(0, 0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  } catch { return ''; }
}

export default function NewAccommodationModal({ isOpen, onClose, tripId, tripStartDate, tripEndDate, onAccommodationAdded, editingAccommodation }) {
  const [loading, setLoading] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  // Autocompletado del nombre
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [nameSearchTimer, setNameSearchTimer] = useState(null);
  const nameRef = useRef(null);

  const [formData, setFormData] = useState({
    type: 'hotel',
    name: '',
    cost: '',
    rating: 0,
    check_in: '',
    check_out: '',
    notes: '',
    lat: 0,
    lng: 0
  });

  useEffect(() => {
    if (editingAccommodation) {
      setFormData({
        type: editingAccommodation.type || 'hotel',
        name: editingAccommodation.name || '',
        cost: editingAccommodation.cost || '',
        rating: editingAccommodation.rating || 0,
        check_in: toDateTimeLocal(editingAccommodation.check_in),
        check_out: toDateTimeLocal(editingAccommodation.check_out),
        notes: editingAccommodation.notes || '',
        lat: editingAccommodation.lat || 0,
        lng: editingAccommodation.lng || 0
      });
    } else {
      setFormData({ type: 'hotel', name: '', cost: '', rating: 0, check_in: '', check_out: '', notes: '', lat: 0, lng: 0 });
    }
    setNameSuggestions([]);
  }, [editingAccommodation, isOpen]);

  if (!isOpen) return null;

  // -- Autocompletado del nombre del hotel/lugar --
  const handleNameChange = (value) => {
    setFormData(prev => ({ ...prev, name: value }));
    if (nameSearchTimer) clearTimeout(nameSearchTimer);
    if (value.length < 3) { setNameSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=5&addressdetails=1`
        );
        const data = await resp.json();
        setNameSuggestions(data);
      } catch { setNameSuggestions([]); }
    }, 400); // debounce 400ms
    setNameSearchTimer(timer);
  };

  // Al seleccionar una sugerencia: rellena nombre, lat/lng y cierra el desplegable
  const selectSuggestion = (result) => {
    setFormData(prev => ({
      ...prev,
      name: result.display_name.split(',')[0],
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon)
    }));
    setNameSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    setLoading(true);
    try {
      const accommodationData = {
        trip_id: tripId,
        type: formData.type,
        name: formData.name,
        cost: formData.cost ? parseFloat(formData.cost) : 0,
        rating: parseInt(formData.rating, 10),
        check_in: formData.check_in || null,
        check_out: formData.check_out || null,
        notes: formData.notes,
        lat: formData.lat || 0,
        lng: formData.lng || 0
      };

      let result;
      if (editingAccommodation) {
        result = await supabase.from('accommodations').update(accommodationData).eq('id', editingAccommodation.id).select();
      } else {
        result = await supabase.from('accommodations').insert([accommodationData]).select();
      }
      if (result.error) throw result.error;

      if (formData.cost && parseFloat(formData.cost) > 0) {
        await supabase.from('expenses').insert([{
          trip_id: tripId,
          description: `Alojamiento: ${formData.name} (${formData.type})`,
          amount: parseFloat(formData.cost),
          category: 'Alojamiento'
        }]);
      }

      onAccommodationAdded(result.data[0]);
      onClose();
    } catch (error) {
      alert('Error al procesar el alojamiento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const minDate = toMinMax(tripStartDate, false);
  const maxDate = toMinMax(tripEndDate, true);

  return (
    <>
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in">
        <button onClick={onClose} style={{ position: 'absolute', top: 'var(--spacing-md)', right: 'var(--spacing-md)', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={24} />
        </button>

        <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>
          {editingAccommodation ? 'Editar Alojamiento' : 'Añadir Alojamiento'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {/* Tipo de alojamiento */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Tipo de Alojamiento</label>
            <select
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
            >
              <option value="hotel">Hotel / Apartamento / Airbnb</option>
              <option value="camper_paid">Área Camper (De pago)</option>
              <option value="camper_free">Área Camper (Gratuita)</option>
            </select>
          </div>

          {/* Nombre con autocompletado */}
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Nombre del lugar</label>
            <input
              ref={nameRef}
              type="text" required
              value={formData.name}
              onChange={e => handleNameChange(e.target.value)}
              onBlur={() => setTimeout(() => setNameSuggestions([]), 200)}
              placeholder="Ej. Hotel Riverside — escribe para buscar"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
            />
            {/* Desplegable de sugerencias */}
            {nameSuggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                maxHeight: '200px', overflowY: 'auto'
              }}>
                {nameSuggestions.map(res => (
                  <div
                    key={res.place_id}
                    onMouseDown={() => selectSuggestion(res)}
                    style={{
                      padding: '10px 14px', cursor: 'pointer',
                      borderBottom: '1px solid var(--color-border)',
                      fontSize: '0.875rem', color: 'var(--color-text-main)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(118,75,162,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <MapPin size={12} style={{ marginRight: '6px', color: 'var(--color-primary)' }} />
                    {res.display_name}
                  </div>
                ))}
              </div>
            )}
            {/* Botón ubicar en mapa + coordenadas */}
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsMapPickerOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '8px',
                  border: '1px solid var(--color-primary)',
                  background: 'rgba(118,75,162,0.08)',
                  color: 'var(--color-primary)',
                  cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500
                }}
              >
                <Map size={14} /> Ubicar en el mapa
              </button>
              {formData.lat !== 0 && (
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12} color="var(--color-primary)" />
                  {formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}
                </span>
              )}
            </div>
          </div>

          {/* Fechas limitadas al periodo del viaje */}
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Check-in</label>
              <input
                type="datetime-local"
                value={formData.check_in}
                min={minDate} max={maxDate}
                onChange={e => setFormData({...formData, check_in: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Check-out</label>
              <input
                type="datetime-local"
                value={formData.check_out}
                min={formData.check_in || minDate} max={maxDate}
                onChange={e => setFormData({...formData, check_out: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
          </div>

          {/* Coste y valoración */}
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Coste Total (€)</label>
              <input
                type="number" step="0.01"
                value={formData.cost}
                onChange={e => setFormData({...formData, cost: e.target.value})}
                placeholder="0.00"
                disabled={formData.type === 'camper_free'}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: formData.type === 'camper_free' ? 'var(--color-border)' : 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Vuestra Nota (0-5)</label>
              <input
                type="number" min="0" max="5"
                value={formData.rating}
                onChange={e => setFormData({...formData, rating: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Notas</label>
            <input
              type="text"
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              placeholder="Ej. Desayuno incluido, cama cómoda"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 'var(--spacing-md)' }}>
            {loading ? 'Guardando...' : (editingAccommodation ? 'Guardar Cambios' : 'Añadir Alojamiento')}
          </button>
        </form>
      </div>
    </div>

    <MapPickerModal
      isOpen={isMapPickerOpen}
      onClose={() => setIsMapPickerOpen(false)}
      onSelect={({ lat, lng, name }) => {
        setFormData(prev => ({ ...prev, lat, lng, name: name || prev.name }));
      }}
      title="Ubicación del alojamiento"
    />
    </>
  );
}
