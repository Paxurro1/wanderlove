// ============================================================================
// ARCHIVO: NewTransportModal.jsx
// DESCRIPCIÓN: Modal para registrar billetes de avión, tren, bus, etc.
// Incluye selector de fechas restringido a los días del viaje y escalas.
// ============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';

export default function NewTransportModal({ isOpen, onClose, tripId, onTransportAdded, editingTransport, tripStartDate, tripEndDate }) {
  const [loading, setLoading] = useState(false);
  
  // -- CALCULATING TRIP DAYS --
  const start = tripStartDate ? new Date(tripStartDate) : new Date();
  const end = tripEndDate ? new Date(tripEndDate) : new Date();
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

  // -- ESTADO INICIAL DEL FORMULARIO --
  const [formData, setFormData] = useState({
    type: 'flight',
    origin: '',
    destination: '',
    dep_day_index: 1,
    dep_time: '10:00',
    arr_day_index: 1,
    arr_time: '12:00',
    cost: '',
    notes: '',
    has_layover: false,
    layover_location: '',
    layover_duration: ''
  });

  // Efecto para cargar los datos si estamos editando.
  useEffect(() => {
    if (editingTransport) {
      const getDayInfo = (datetimeStr) => {
        if (!datetimeStr) return { dayIndex: 1, timeStr: '10:00' };
        const dt = new Date(datetimeStr);
        const timeStr = dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
        // Calculate day_index relative to trip start
        dt.setHours(0,0,0,0);
        const tripStartDt = new Date(start);
        tripStartDt.setHours(0,0,0,0);
        const diffDays = Math.round((dt - tripStartDt) / (1000 * 60 * 60 * 24));
        const dayIndex = Math.min(Math.max(1, diffDays + 1), totalDays);
        return { dayIndex, timeStr };
      };

      const depInfo = getDayInfo(editingTransport.departure_time);
      const arrInfo = getDayInfo(editingTransport.arrival_time);

      setFormData({
        type: editingTransport.type || 'flight',
        origin: editingTransport.origin || '',
        destination: editingTransport.destination || '',
        dep_day_index: depInfo.dayIndex,
        dep_time: depInfo.timeStr,
        arr_day_index: arrInfo.dayIndex,
        arr_time: arrInfo.timeStr,
        cost: editingTransport.cost || '',
        notes: editingTransport.notes || '',
        has_layover: editingTransport.has_layover || false,
        layover_location: editingTransport.layover_location || '',
        layover_duration: editingTransport.layover_duration || ''
      });
    } else {
      setFormData({ 
        type: 'flight', origin: '', destination: '', 
        dep_day_index: 1, dep_time: '10:00', 
        arr_day_index: 1, arr_time: '12:00', 
        cost: '', notes: '',
        has_layover: false, layover_location: '', layover_duration: '' 
      });
    }
  }, [editingTransport, isOpen, tripStartDate, tripEndDate]);

  if (!isOpen) return null;

  // Manejador del envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.origin || !formData.destination) return;
    if (parseInt(formData.dep_day_index) > parseInt(formData.arr_day_index)) {
      alert("El día de llegada no puede ser anterior al día de salida.");
      return;
    }
    
    setLoading(true);

    try {
      const getIsoString = (dayIndex, timeStr) => {
        const tripDt = new Date(start);
        tripDt.setDate(tripDt.getDate() + (parseInt(dayIndex, 10) - 1));
        const [hours, minutes] = timeStr.split(':').map(Number);
        tripDt.setHours(hours, minutes, 0, 0);
        return tripDt.toISOString();
      };

      const departureDatetime = getIsoString(formData.dep_day_index, formData.dep_time);
      const arrivalDatetime = getIsoString(formData.arr_day_index, formData.arr_time);

      const depDateObj = new Date(departureDatetime);
      const arrDateObj = new Date(arrivalDatetime);
      const durationMins = Math.max(0, Math.round((arrDateObj - depDateObj) / (1000 * 60)));

      const transportData = {
        trip_id: tripId,
        type: formData.type,
        origin: formData.origin,
        destination: formData.destination,
        departure_time: departureDatetime,
        arrival_time: arrivalDatetime,
        duration_mins: durationMins,
        cost: formData.cost ? parseFloat(formData.cost) : 0,
        notes: formData.notes,
        has_layover: formData.has_layover,
        layover_location: formData.has_layover ? formData.layover_location : null,
        layover_duration: formData.has_layover ? formData.layover_duration : null
      };

      let result;

      if (editingTransport) {
        result = await supabase.from('transports').update(transportData).eq('id', editingTransport.id).select();
      } else {
        result = await supabase.from('transports').insert([transportData]).select();
      }

      if (result.error) throw result.error;
      
      const transportCost = parseFloat(formData.cost);
      if (transportCost > 0 && !editingTransport) {
        // En creación añadimos gasto (para edición es más complejo sincronizar sin source_id, lo dejamos como estaba original)
        await supabase.from('expenses').insert([{
          trip_id: tripId,
          description: `Transporte: ${formData.origin} -> ${formData.destination} (${formData.type})`,
          amount: transportCost,
          category: 'Transporte'
        }]);
      }

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
      <div className="modal-content animate-fade-in" style={{ padding: '0' }}>
        
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)', borderRadius: '20px 20px 0 0' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>
             {editingTransport ? 'Editar Transporte' : 'Añadir Transporte'}
          </h2>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', maxHeight: '75vh', overflowY: 'auto' }}>
          {/* Selector de medio de transporte */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Tipo de Transporte</label>
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
              <option value="car">Coche (Trayecto)</option>
            </select>
          </div>

          {/* Origen y Destino */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Origen</label>
              <input 
                type="text" required
                value={formData.origin}
                onChange={e => setFormData({...formData, origin: e.target.value})}
                placeholder="Ej. Madrid (MAD)"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Destino</label>
              <input 
                type="text" required
                value={formData.destination}
                onChange={e => setFormData({...formData, destination: e.target.value})}
                placeholder="Ej. Paris (CDG)"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
          </div>

          {/* Horarios (Días del Viaje) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Día Salida</label>
              <select 
                value={formData.dep_day_index}
                onChange={e => setFormData({...formData, dep_day_index: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
              >
                {tripDays.map(day => (
                  <option key={`d-${day.index}`} value={day.index}>Día {day.index} - {day.dateString}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Hora Salida</label>
              <input 
                type="time" required
                value={formData.dep_time}
                onChange={e => setFormData({...formData, dep_time: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Día Llegada</label>
              <select 
                value={formData.arr_day_index}
                onChange={e => setFormData({...formData, arr_day_index: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
              >
                {tripDays.map(day => (
                  <option key={`a-${day.index}`} value={day.index} disabled={parseInt(day.index) < parseInt(formData.dep_day_index)}>Día {day.index} - {day.dateString}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Hora Llegada</label>
              <input 
                type="time" required
                value={formData.arr_time}
                onChange={e => setFormData({...formData, arr_time: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
              />
            </div>
          </div>

          {/* ZONA DE ESCALAS */}
          <div style={{ padding: '16px', background: 'rgba(52,152,219,0.05)', border: '1px solid rgba(52,152,219,0.2)', borderRadius: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer', color: 'var(--color-text-main)' }}>
              <input 
                type="checkbox"
                checked={formData.has_layover}
                onChange={e => setFormData({...formData, has_layover: e.target.checked})}
                style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
              />
              ¿Este trayecto tiene escala?
            </label>
            
            {formData.has_layover && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.85rem' }}>Lugar de la escala</label>
                  <input 
                    type="text" placeholder="Ej. Doha (DOH)"
                    value={formData.layover_location}
                    onChange={e => setFormData({...formData, layover_location: e.target.value})}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
                  />
                </div>
                <div>
                   <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.85rem' }}>Duración escala (ej. 2h 30m)</label>
                   <input 
                    type="text" placeholder="Ej. 2h 30m"
                    value={formData.layover_duration}
                    onChange={e => setFormData({...formData, layover_duration: e.target.value})}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Coste y Notas descriptivas adicionales */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Coste (€)</label>
              <input 
                type="number" step="0.01"
                value={formData.cost}
                onChange={e => setFormData({...formData, cost: e.target.value})}
                placeholder="0.00"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Notas</label>
              <input 
                type="text" 
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                placeholder="Ej. Maleta cabina pagada, Asiento 15A"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
              />
            </div>
          </div>

        </form>
        
        <div style={{ padding: '20px 24px', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)', borderRadius: '0 0 20px 20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-main)', cursor: 'pointer', fontWeight: 600 }}>
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} disabled={loading} className="btn-primary" style={{ padding: '10px 24px', borderRadius: '8px' }}>
            {loading ? 'Guardando...' : (editingTransport ? 'Actualizar' : 'Añadir Trayecto')}
          </button>
        </div>

      </div>
    </div>
  );
}
