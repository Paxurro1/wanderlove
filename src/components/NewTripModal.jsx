// ============================================================================
// ARCHIVO: NewTripModal.jsx
// DESCRIPCIÓN: Modal para la creación de un nuevo viaje desde el Dashboard.
// Permite introducir destino, fechas y una imagen de portada.
// ============================================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';

export default function NewTripModal({ isOpen, onClose, editingTrip }) {
  const navigate = useNavigate(); // Hook para redirigir al usuario tras crear el viaje.
  const [loading, setLoading] = useState(false);
  
  // -- ESTADO DEL FORMULARIO --
  const [formData, setFormData] = useState({
    destination: '',
    start_date: '',
    end_date: '',
    cover_image: ''
  });

  // Si cambia editingTrip (por ejemplo al pulsar "Editar" en un viaje distinto),
  // actualizamos los valores del formulario.
  useEffect(() => {
    if (editingTrip) {
      setFormData({
        destination: editingTrip.destination || '',
        start_date: editingTrip.start_date || '',
        end_date: editingTrip.end_date || '',
        cover_image: editingTrip.cover_image || ''
      });
    } else {
      // Si no hay viaje para editar, reseteamos a vacío.
      setFormData({ destination: '', start_date: '', end_date: '', cover_image: '' });
    }
  }, [editingTrip, isOpen]);

  // Si el modal está cerrado, no renderizamos nada.
  if (!isOpen) return null;

  // Manejador del envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tripData = {
        destination: formData.destination,
        start_date: formData.start_date,
        end_date: formData.end_date,
        // Si no ponen imagen, usamos una por defecto de un avión/viaje.
        cover_image: formData.cover_image || 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=1000',
        // Determinamos si es un viaje próximo o pasado comparando la fecha de inicio con "ahora".
        status: new Date(formData.start_date) > new Date() ? 'upcoming' : 'past'
      };

      let result;

      if (editingTrip) {
        // MODO EDICIÓN: Actualizamos el registro existente.
        result = await supabase
          .from('trips')
          .update(tripData)
          .eq('id', editingTrip.id)
          .select();
      } else {
        // MODO CREACIÓN: Insertamos un nuevo registro.
        result = await supabase
          .from('trips')
          .insert([tripData])
          .select();
      }

      if (result.error) throw result.error;
      const tripId = result.data[0].id;
      
      // -- GEOLOCALIZACIÓN AUTOMÁTICA DEL DESTINO --
      if (!editingTrip) {
        try {
          // Buscamos las coordenadas del destino
          const geoResp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.destination)}&limit=1`);
          const geoData = await geoResp.json();
          
          if (geoData && geoData.length > 0) {
            const mainPlace = {
              trip_id: tripId,
              name: formData.destination,
              lat: parseFloat(geoData[0].lat),
              lng: parseFloat(geoData[0].lon),
              visited: tripData.status === 'past', // Si el viaje es pasado, lo marcamos como visitado por defecto
              reason: 'Destino del viaje',
              day_index: 1
            };
            
            await supabase.from('places').insert([mainPlace]);
          }
        } catch (geoError) {
          console.error('Error al geolocalizar destino:', geoError);
          // No bloqueamos la creación del viaje si falla el geocoding
        }
      }
      
      // Cerramos el modal tras el éxito.
      onClose();
      
      // Si era un viaje nuevo, redirigimos. Si era edición, nos quedamos donde estamos (el Dashboard refrescará).
      if (!editingTrip && result.data && result.data[0]) {
        navigate(`/trip/${result.data[0].id}`);
      }
    } catch (error) {
      alert('Error al procesar el viaje: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Fondo oscuro translúcido
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 'var(--spacing-md)'
    }}>
      {/* Contenedor principal del Modal */}
      <div className="glass-panel animate-fade-in" style={{ 
        background: 'var(--color-surface)', width: '100%', maxWidth: '500px', 
        padding: 'var(--spacing-xl)', position: 'relative'
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 'var(--spacing-md)', right: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>
          <X size={24} />
        </button>
        
        <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>
          {editingTrip ? 'Editar Viaje' : 'Planear Nuevo Viaje'}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {/* Campo Destino */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Destino</label>
            <input 
              type="text" 
              required
              value={formData.destination}
              onChange={e => setFormData({...formData, destination: e.target.value})}
              placeholder="Ej. Roma, Italia"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
            />
          </div>
          
          {/* Campos de Fechas (Ida y Vuelta) */}
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Ida</label>
              <input 
                type="date" 
                required
                value={formData.start_date}
                onChange={e => setFormData({...formData, start_date: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Vuelta</label>
              <input 
                type="date" 
                required
                value={formData.end_date}
                onChange={e => setFormData({...formData, end_date: e.target.value})}
                min={formData.start_date} // No se puede volver antes de ir.
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
          </div>

          {/* Campo URL Imagen */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>URL Imagen de Portada (Opcional)</label>
            <input 
              type="url" 
              value={formData.cover_image}
              onChange={e => setFormData({...formData, cover_image: e.target.value})}
              placeholder="https://images.unsplash..."
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
            />
          </div>

          {/* Botón de envío */}
          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 'var(--spacing-md)' }}>
            {loading ? 'Sincronizando...' : (editingTrip ? 'Guardar Cambios' : 'Crear Viaje')}
          </button>
        </form>
      </div>
    </div>
  );
}
