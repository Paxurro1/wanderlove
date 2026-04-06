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

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Map, MapPin } from 'lucide-react';
import MapPickerModal from '../Map/MapPickerModal';

export default function NewAccommodationModal({ isOpen, onClose, tripId, tripStartDate, tripEndDate, onAccommodationAdded, editingAccommodation }) {
  const [loading, setLoading] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  // Autocompletado del nombre
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [nameSearchTimer, setNameSearchTimer] = useState(null);
  const nameRef = useRef(null);

  // -- CALCULATING TRIP DAYS --
  const start = new Date(tripStartDate);
  const end = new Date(tripEndDate);
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const tripDays = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return {
      index: i + 1,
      dateString: d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' }),
      dateObject: d
    };
  });

  const [formData, setFormData] = useState({
    type: 'hotel',
    name: '',
    cost: '',
    rating: 0,
    check_in_day_index: 1,
    check_in_time: '14:00',
    check_out_day_index: totalDays,
    check_out_time: '11:00',
    notes: '',
    lat: 0,
    lng: 0
  });

  useEffect(() => {
    if (editingAccommodation) {
      const getDayInfo = (datetimeStr, isCheckout = false) => {
        if (!datetimeStr) return { dayIndex: 1, timeStr: isCheckout ? '11:00' : '14:00' };
        const dt = new Date(datetimeStr);
        const timeStr = dt.toTimeString().slice(0, 5);
        dt.setHours(0,0,0,0);
        const tripStartDt = new Date(start);
        tripStartDt.setHours(0,0,0,0);
        const diffDays = Math.round((dt - tripStartDt) / (1000 * 60 * 60 * 24));
        const dayIndex = Math.min(Math.max(1, diffDays + 1), totalDays);
        return { dayIndex, timeStr };
      };

      const checkInInfo = getDayInfo(editingAccommodation.check_in, false);
      const checkOutInfo = getDayInfo(editingAccommodation.check_out, true);

      setFormData({
        type: editingAccommodation.type || 'hotel',
        name: editingAccommodation.name || '',
        cost: editingAccommodation.cost || '',
        rating: editingAccommodation.rating || 0,
        check_in_day_index: checkInInfo.dayIndex,
        check_in_time: checkInInfo.timeStr,
        check_out_day_index: checkOutInfo.dayIndex,
        check_out_time: checkOutInfo.timeStr,
        notes: editingAccommodation.notes || '',
        lat: editingAccommodation.lat || 0,
        lng: editingAccommodation.lng || 0
      });
    } else {
      setFormData({ type: 'hotel', name: '', cost: '', rating: 0, check_in_day_index: 1, check_in_time: '14:00', check_out_day_index: totalDays, check_out_time: '11:00', notes: '', lat: 0, lng: 0 });
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
      // Parse check-in datetime
      const checkInDt = new Date(start);
      checkInDt.setDate(checkInDt.getDate() + (parseInt(formData.check_in_day_index) - 1));
      const [inH, inM] = formData.check_in_time.split(':');
      checkInDt.setHours(parseInt(inH), parseInt(inM), 0, 0);

      // Parse check-out datetime
      const checkOutDt = new Date(start);
      checkOutDt.setDate(checkOutDt.getDate() + (parseInt(formData.check_out_day_index) - 1));
      const [outH, outM] = formData.check_out_time.split(':');
      checkOutDt.setHours(parseInt(outH), parseInt(outM), 0, 0);

      const accommodationData = {
        trip_id: tripId,
        type: formData.type,
        name: formData.name,
        cost: formData.cost ? parseFloat(formData.cost) : 0,
        rating: parseInt(formData.rating, 10),
        check_in: checkInDt.toISOString(),
        check_out: checkOutDt.toISOString(),
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

          {/* Fechas limitadas al periodo del viaje usando índices de día */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Día de Check-in</label>
              <select 
                value={formData.check_in_day_index}
                onChange={e => setFormData({...formData, check_in_day_index: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              >
                {tripDays.map(day => (
                  <option key={`in-${day.index}`} value={day.index}>Día {day.index} - {day.dateString}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Hora Check-in</label>
              <input
                type="time" required
                value={formData.check_in_time}
                onChange={e => setFormData({...formData, check_in_time: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Día de Check-out</label>
              <select 
                value={formData.check_out_day_index}
                onChange={e => setFormData({...formData, check_out_day_index: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              >
                {tripDays.map(day => (
                  <option key={`out-${day.index}`} value={day.index} disabled={day.index < formData.check_in_day_index}>Día {day.index} - {day.dateString}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Hora Check-out</label>
              <input
                type="time" required
                value={formData.check_out_time}
                onChange={e => setFormData({...formData, check_out_time: e.target.value})}
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
