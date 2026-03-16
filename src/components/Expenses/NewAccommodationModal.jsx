// ============================================================================
// ARCHIVO: NewAccommodationModal.jsx
// DESCRIPCIÓN: Formulario modal para registrar un nuevo alojamiento.
// Permite elegir tipo (Hotel/Camper), fechas, coste y valoración.
// ============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';

export default function NewAccommodationModal({ isOpen, onClose, tripId, onAccommodationAdded, editingAccommodation }) {
  const [loading, setLoading] = useState(false);
  
  // -- ESTADO INICIAL DEL FORMULARIO --
  const [formData, setFormData] = useState({
    type: 'hotel',    // valor por defecto
    name: '',
    cost: '',
    rating: 0,
    check_in: '',
    check_out: '',
    notes: ''
  });

  // Efecto para cargar los datos si estamos editando.
  useEffect(() => {
    if (editingAccommodation) {
      setFormData({
        type: editingAccommodation.type || 'hotel',
        name: editingAccommodation.name || '',
        cost: editingAccommodation.cost || '',
        rating: editingAccommodation.rating || 0,
        check_in: editingAccommodation.check_in || '',
        check_out: editingAccommodation.check_out || '',
        notes: editingAccommodation.notes || ''
      });
    } else {
      setFormData({ type: 'hotel', name: '', cost: '', rating: 0, check_in: '', check_out: '', notes: '' });
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
        // Convertimos a número si hay valor, sino 0.
        cost: formData.cost ? parseFloat(formData.cost) : 0,
        rating: parseInt(formData.rating, 10),
        // Fechas: si están vacías mandamos null
        check_in: formData.check_in || null,
        check_out: formData.check_out || null,
        notes: formData.notes
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
    // Overlay oscuro tras el modal
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 'var(--spacing-md)'
    }}>
      {/* Caja del Modal con scroll interno por si hay muchos campos */}
      <div className="glass-panel animate-fade-in" style={{ 
        background: 'var(--color-surface)', width: '100%', maxWidth: '500px', 
        padding: 'var(--spacing-xl)', position: 'relative',
        maxHeight: '90vh', overflowY: 'auto'
      }}>
        {/* Botón X para cerrar */}
        <button onClick={onClose} style={{ position: 'absolute', top: 'var(--spacing-md)', right: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>
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

          {/* Nombre del establecimiento */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Nombre del lugar</label>
            <input 
              type="text" required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Ej. Hotel Riverside"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
            />
          </div>

          {/* Fechas de estancia */}
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Check-in</label>
              <input 
                type="date"
                value={formData.check_in}
                onChange={e => setFormData({...formData, check_in: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Check-out</label>
              <input 
                type="date"
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
  );
}
