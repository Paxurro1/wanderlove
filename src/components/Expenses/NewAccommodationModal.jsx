// ============================================================================
// ARCHIVO: NewAccommodationModal.jsx
// DESCRIPCIÓN: Formulario modal para registrar un nuevo alojamiento.
// Permite elegir tipo (Hotel/Camper), fechas, coste, valoración y ubicación en mapa.
// ============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Map, MapPin } from 'lucide-react';
import MapPickerModal from '../Map/MapPickerModal';

export default function NewAccommodationModal({ isOpen, onClose, tripId, onAccommodationAdded, editingAccommodation }) {
  const [loading, setLoading] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  
  // -- ESTADO INICIAL DEL FORMULARIO --
  const [formData, setFormData] = useState({
    type: 'hotel',    // valor por defecto
    name: '',
    cost: '',
    rating: 0,
    check_in: '',
    check_out: '',
    notes: '',
    lat: 0,
    lng: 0
  });

  // Efecto para cargar los datos si estamos editando.
  useEffect(() => {
    if (editingAccommodation) {
      // Convert date to datetime-local format for input
      const toDateTimeLocal = (val) => {
        if (!val) return '';
        const d = new Date(val);
        const tzOffset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
      };
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
  }, [editingAccommodation, isOpen]);

  if (!isOpen) return null;

  // Manejador del envío del formulario a la base de datos
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validación mínima: el nombre es obligatorio.
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
        // ACTUALIZAR ALOJAMIENTO
        result = await supabase
          .from('accommodations')
          .update(accommodationData)
          .eq('id', editingAccommodation.id)
          .select();
      } else {
        // INSERTAR NUEVO ALOJAMIENTO
        result = await supabase
          .from('accommodations')
          .insert([accommodationData])
          .select();
      }

      if (result.error) throw result.error;
      
      // -- SINCRONIZACIÓN CON GASTOS --
      if (formData.cost && parseFloat(formData.cost) > 0) {
        const expenseData = {
          trip_id: tripId,
          description: `Alojamiento: ${formData.name} (${formData.type})`,
          amount: parseFloat(formData.cost),
          category: 'Alojamiento'
        };
        await supabase.from('expenses').insert([expenseData]);
      }
      
      // Callback para actualizar la UI del padre sin recargar.
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
    {/* Overlay oscuro tras el modal */}
    <div className="modal-overlay">
      {/* Caja del Modal con scroll interno por si hay muchos campos */}
      <div className="modal-content animate-fade-in">
        {/* Botón X para cerrar */}
        <button onClick={onClose} style={{ position: 'absolute', top: 'var(--spacing-md)', right: 'var(--spacing-md)', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={24} />
        </button>
        
        <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>
          {editingAccommodation ? 'Editar Alojamiento' : 'Añadir Alojamiento'}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {/* Selector de tipo */}
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

          {/* Nombre del establecimiento + selector de mapa */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Nombre del lugar</label>
            <input 
              type="text" required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Ej. Hotel Riverside"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
            />
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

          {/* Fechas y horas de estancia */}
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Check-in (fecha y hora)</label>
              <input 
                type="datetime-local"
                value={formData.check_in}
                onChange={e => setFormData({...formData, check_in: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Check-out (fecha y hora)</label>
              <input 
                type="datetime-local"
                value={formData.check_out}
                onChange={e => setFormData({...formData, check_out: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            {/* Campo de coste - Se deshabilita si es zona camper gratuita */}
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
            {/* Campo para poner nota a la estancia */}
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

          {/* Notas adicionales */}
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

          {/* Botón de guardar */}
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
        setFormData(prev => ({ ...prev, lat, lng }));
      }}
      title="Ubicación del alojamiento"
    />
    </>
  );
}
