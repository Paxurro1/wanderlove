// ============================================================================
// ARCHIVO: NewTransportModal.jsx
// DESCRIPCIÓN: Modal para registrar billetes de avión, tren, bus, etc.
// Incluye cálculo automático de la duración del trayecto.
// ============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';

export default function NewTransportModal({ isOpen, onClose, tripId, onTransportAdded, editingTransport }) {
  const [loading, setLoading] = useState(false);
  
  // -- ESTADO INICIAL DEL FORMULARIO --
  const [formData, setFormData] = useState({
    type: 'flight',
    origin: '',
    destination: '',
    departure_time: '',
    arrival_time: '',
    cost: '',
    notes: ''
  });

  // Función auxiliar para convertir formato ISO a datetime-local (YYYY-MM-DDTHH:mm)
  const formatForInput = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const tzOffset = date.getTimezoneOffset() * 60000; // offset en ms
    const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  // Efecto para cargar los datos si estamos editando.
  useEffect(() => {
    if (editingTransport) {
      setFormData({
        type: editingTransport.type || 'flight',
        origin: editingTransport.origin || '',
        destination: editingTransport.destination || '',
        departure_time: formatForInput(editingTransport.departure_time),
        arrival_time: formatForInput(editingTransport.arrival_time),
        cost: editingTransport.cost || '',
        notes: editingTransport.notes || ''
      });
    } else {
      setFormData({ type: 'flight', origin: '', destination: '', departure_time: '', arrival_time: '', cost: '', notes: '' });
    }
  }, [editingTransport, isOpen]);

  if (!isOpen) return null;

  // Manejador del envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.origin || !formData.destination) return;
    
    setLoading(true);

    try {
      // Cálculo automático de la duración en minutos comparando llegada y salida.
      const dep = new Date(formData.departure_time);
      const arr = new Date(formData.arrival_time);
      const durationMins = Math.max(0, Math.round((arr - dep) / (1000 * 60)));

      const transportData = {
        trip_id: tripId,
        type: formData.type,
        origin: formData.origin,
        destination: formData.destination,
        departure_time: new Date(formData.departure_time).toISOString(),
        arrival_time: new Date(formData.arrival_time).toISOString(),
        duration_mins: durationMins,
        cost: formData.cost ? parseFloat(formData.cost) : 0,
        notes: formData.notes
      };

      let result;

      if (editingTransport) {
        // ACTUALIZAR TRANSPORTE
        result = await supabase
          .from('transports')
          .update(transportData)
          .eq('id', editingTransport.id)
          .select();
      } else {
        // INSERTAR NUEVO TRANSPORTE
        result = await supabase
          .from('transports')
          .insert([transportData])
          .select();
      }

      if (result.error) throw result.error;
      
      // -- SINCRONIZACIÓN CON GASTOS --
      const transportCost = parseFloat(formData.cost);
      if (transportCost > 0) {
        const expenseData = {
          trip_id: tripId,
          description: `Transporte: ${formData.origin} -> ${formData.destination} (${formData.type})`,
          amount: transportCost,
          category: 'Transporte'
        };
        
        await supabase.from('expenses').insert([expenseData]);
      }

      // Notificamos al padre y cerramos
      onTransportAdded(result.data[0]);
      onClose();
    } catch (error) {
      alert('Error al procesar el transporte: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      {/* Contenedor del Modal con scroll por si hay pantallas pequeñas */}
      <div className="modal-content animate-fade-in">
        <button onClick={onClose} style={{ position: 'absolute', top: 'var(--spacing-md)', right: 'var(--spacing-md)', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={24} />
        </button>
        
        <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>
          {editingTransport ? 'Editar Transporte' : 'Añadir Transporte'}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {/* Selector de medio de transporte */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Tipo de Transporte</label>
            <select 
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
            >
              <option value="flight">Vuelo Principal</option>
              <option value="internal_flight">Vuelo Interno</option>
              <option value="bus">Autobús</option>
              <option value="train">Tren (Normal)</option>
              <option value="ave">Tren Alta Velocidad (AVE/Shinkansen)</option>
              <option value="ferry">Ferry / Barco</option>
              <option value="car">Coche</option>
            </select>
          </div>

          {/* Origen y Destino */}
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Origen</label>
              <input 
                type="text" required
                value={formData.origin}
                onChange={e => setFormData({...formData, origin: e.target.value})}
                placeholder="Ej. Madrid (MAD)"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Destino</label>
              <input 
                type="text" required
                value={formData.destination}
                onChange={e => setFormData({...formData, destination: e.target.value})}
                placeholder="Ej. Paris (CDG)"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
          </div>

          {/* Horarios con datetime-local para elegir fecha y hora exacta */}
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Salida</label>
              <input 
                type="datetime-local" required
                value={formData.departure_time}
                onChange={e => setFormData({...formData, departure_time: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Llegada</label>
              <input 
                type="datetime-local" required
                value={formData.arrival_time}
                onChange={e => setFormData({...formData, arrival_time: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
          </div>

          {/* Coste y Notas descriptivas adicionales */}
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Coste (€)</label>
              <input 
                type="number" step="0.01"
                value={formData.cost}
                onChange={e => setFormData({...formData, cost: e.target.value})}
                placeholder="0.00"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Notas</label>
              <input 
                type="text" 
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                placeholder="Ej. Vuelo Ryanair, maleta cabina pagada"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
          </div>

          {/* Botón de envío */}
          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 'var(--spacing-md)' }}>
            {loading ? 'Guardando...' : (editingTransport ? 'Guardar Cambios' : 'Añadir Transporte')}
          </button>
        </form>
      </div>
    </div>
  );
}
