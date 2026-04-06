import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Calendar, Map, MapPin } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import MapPickerModal from '../Map/MapPickerModal';

export default function NewRentalModal({ isOpen, onClose, tripId, tripStartDate, tripEndDate, onRentalAdded, editingRental }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [mapPickerTarget, setMapPickerTarget] = useState('pickup'); // 'pickup' | 'return'
  
  // -- CALCULATING TRIP DAYS --
  const start = new Date(tripStartDate);
  const end = new Date(tripEndDate);
  // Total days formula: Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
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

  // -- STATE --
  const [formData, setFormData] = useState({
    pickup_day_index: 1,
    pickup_time: '10:00',
    return_day_index: 1,
    return_time: '10:00',
    pickup_location: '',
    return_location: '',
    pickup_lat: 0,
    pickup_lng: 0,
    return_lat: 0,
    return_lng: 0,
    price: '',
    insurance_type: 'básico',
    car_model: '',
    gas_cost: ''
  });

  // -- EFFECT: LOAD DATA FOR EDITING --
  useEffect(() => {
    if (editingRental) {
      // Calculate day indices based on datetimes
      const getDayInfo = (datetimeStr) => {
        if (!datetimeStr) return { dayIndex: 1, timeStr: '10:00' };
        
        const dt = new Date(datetimeStr);
        // Extract time (HH:MM)
        const timeStr = dt.toTimeString().slice(0, 5);
        
        // Calculate day_index relative to trip start
        dt.setHours(0,0,0,0);
        const tripStartDt = new Date(start);
        tripStartDt.setHours(0,0,0,0);
        const diffDays = Math.round((dt - tripStartDt) / (1000 * 60 * 60 * 24));
        const dayIndex = Math.min(Math.max(1, diffDays + 1), totalDays);
        
        return { dayIndex, timeStr };
      };

      const pickupInfo = getDayInfo(editingRental.pickup_datetime);
      const returnInfo = getDayInfo(editingRental.return_datetime);

      setFormData({
        pickup_day_index: pickupInfo.dayIndex,
        pickup_time: pickupInfo.timeStr,
        return_day_index: returnInfo.dayIndex,
        return_time: returnInfo.timeStr,
        pickup_location: editingRental.pickup_location || '',
        return_location: editingRental.return_location || '',
        pickup_lat: editingRental.pickup_lat || 0,
        pickup_lng: editingRental.pickup_lng || 0,
        return_lat: editingRental.return_lat || 0,
        return_lng: editingRental.return_lng || 0,
        price: editingRental.price || '',
        insurance_type: editingRental.insurance_type || 'básico',
        car_model: editingRental.car_model || '',
        gas_cost: editingRental.gas_cost || ''
      });
    } else {
      setFormData({
        pickup_day_index: 1,
        pickup_time: '10:00',
        return_day_index: totalDays,
        return_time: '18:00',
        pickup_location: '',
        return_location: '',
        pickup_lat: 0, pickup_lng: 0,
        return_lat: 0, return_lng: 0,
        price: '',
        insurance_type: 'básico',
        car_model: '',
        gas_cost: ''
      });
    }
  }, [editingRental, isOpen, tripStartDate, tripEndDate]);

  if (!isOpen) return null;

  // -- HANDLER --
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.pickup_day_index > formData.return_day_index) {
      alert("El día de devolución no puede ser anterior al día de recogida.");
      return;
    }
    
    setLoading(true);

    try {
      // 1. Calculate precise UTC timestamps by combining selected Day Date + Time Input
      const getIsoString = (dayIndex, timeStr) => {
        const tripDt = new Date(start);
        tripDt.setDate(tripDt.getDate() + (parseInt(dayIndex, 10) - 1));
        
        const [hours, minutes] = timeStr.split(':').map(Number);
        tripDt.setHours(hours, minutes, 0, 0);
        
        return tripDt.toISOString();
      };

      const pickupDatetime = getIsoString(formData.pickup_day_index, formData.pickup_time);
      let returnDatetime = getIsoString(formData.return_day_index, formData.return_time);

      const rentalData = {
        trip_id: tripId,
        pickup_datetime: pickupDatetime,
        return_datetime: returnDatetime,
        pickup_location: formData.pickup_location,
        return_location: formData.return_location,
        price: formData.price ? parseFloat(formData.price) : 0,
        insurance_type: formData.insurance_type,
        car_model: formData.car_model,
        gas_cost: formData.gas_cost ? parseFloat(formData.gas_cost) : 0
      };

      let result;

      if (editingRental) {
        result = await supabase
          .from('trip_rentals')
          .update(rentalData)
          .eq('id', editingRental.id)
          .select();
      } else {
        result = await supabase
          .from('trip_rentals')
          .insert([rentalData])
          .select();
      }

      if (result.error) throw result.error;
      
      if (result.error) throw result.error;
      
      const savedRentalId = result.data[0].id;

      // --- SYNC EXPENSES ---
      // 1. Delete existing expenses for this rental (if any) to avoid duplicates/stale data
      const { error: delError } = await supabase.from('expenses').delete().eq('source_id', savedRentalId);
      if (delError) console.warn("Error deleting synced expenses:", delError.message);

      // 2. Add Rental Price Expense
      if (formData.price && parseFloat(formData.price) > 0) {
        const { error: expError } = await supabase.from('expenses').insert([{
          trip_id: tripId,
          description: `Alquiler Coche: ${formData.car_model}`,
          amount: parseFloat(formData.price),
          category: 'Transporte',
          source_id: savedRentalId,
          paid_by: user.id
        }]);
        if (expError) console.error("Error syncing rental price expense:", expError.message);
      }
      
      // 3. Add Gas Cost Expense
      if (formData.gas_cost && parseFloat(formData.gas_cost) > 0) {
        const { error: gasError } = await supabase.from('expenses').insert([{
          trip_id: tripId,
          description: `Gasolina: ${formData.car_model}`,
          amount: parseFloat(formData.gas_cost),
          category: 'Transporte',
          source_id: savedRentalId,
          paid_by: user.id
        }]);
        if (gasError) console.error("Error syncing gas expense:", gasError.message);
      }
      
      onRentalAdded(result.data[0]);
      onClose();
    } catch (error) {
      alert('Error al guardar el alquiler: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in" style={{ padding: '0' }}>
        
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)', borderRadius: '20px 20px 0 0' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
             {editingRental ? 'Editar Alquiler' : 'Añadir Alquiler de Coche'}
          </h2>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Día de Recogida</label>
              <select 
                value={formData.pickup_day_index}
                onChange={e => setFormData({...formData, pickup_day_index: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
              >
                {tripDays.map(day => (
                  <option key={`p-${day.index}`} value={day.index}>
                    Día {day.index} - {day.dateString}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Hora de Recogida</label>
              <input 
                type="time" required
                value={formData.pickup_time}
                onChange={e => setFormData({...formData, pickup_time: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Día de Devolución</label>
              <select 
                value={formData.return_day_index}
                onChange={e => setFormData({...formData, return_day_index: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
              >
                {tripDays.map(day => (
                   <option key={`r-${day.index}`} value={day.index} disabled={day.index < formData.pickup_day_index}>
                    Día {day.index} - {day.dateString}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Hora de Devolución</label>
              <input 
                type="time" required
                value={formData.return_time}
                onChange={e => setFormData({...formData, return_time: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
              />
            </div>
          </div>

          <div>
             <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Lugar de Recogida</label>
             <input 
                type="text" required placeholder="Ej. Aeropuerto JFK"
                value={formData.pickup_location}
                onChange={e => setFormData({...formData, pickup_location: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
              />
              <button
                type="button"
                onClick={() => { setMapPickerTarget('pickup'); setIsMapPickerOpen(true); }}
                style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--color-primary)', background: 'rgba(118,75,162,0.08)', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                <Map size={12} /> Ubicar en el mapa
              </button>
              {formData.pickup_lat !== 0 && (
                <span style={{ marginLeft: '8px', fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <MapPin size={10} color="var(--color-primary)" />
                  {formData.pickup_lat.toFixed(4)}, {formData.pickup_lng.toFixed(4)}
                </span>
              )}
          </div>

          <div>
             <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Lugar de Devolución</label>
             <input 
                type="text" required placeholder="Ej. Estación Central (o igual que recogida)"
                value={formData.return_location}
                onChange={e => setFormData({...formData, return_location: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
              />
              <button
                type="button"
                onClick={() => { setMapPickerTarget('return'); setIsMapPickerOpen(true); }}
                style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--color-primary)', background: 'rgba(118,75,162,0.08)', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                <Map size={12} /> Ubicar en el mapa
              </button>
              {formData.return_lat !== 0 && (
                <span style={{ marginLeft: '8px', fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <MapPin size={10} color="var(--color-primary)" />
                  {formData.return_lat.toFixed(4)}, {formData.return_lng.toFixed(4)}
                </span>
              )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
             <div>
               <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Marca y Modelo</label>
               <input 
                  type="text" required placeholder="Ej. Volkswagen Golf"
                  value={formData.car_model}
                  onChange={e => setFormData({...formData, car_model: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
                />
             </div>
             <div>
               <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Tipo de Seguro</label>
               <select 
                  value={formData.insurance_type}
                  onChange={e => setFormData({...formData, insurance_type: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
                >
                  <option value="básico">Cobertura Básica</option>
                  <option value="franquicia">Con Franquicia</option>
                  <option value="todo_riesgo">Todo Riesgo (Premium)</option>
                </select>
             </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
             <div>
               <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Precio de Alquiler (€)</label>
               <input 
                  type="number" min="0" step="0.01" placeholder="Ej. 150.00"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
                />
             </div>
             <div>
               <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Coste de Gasolina (€)</label>
               <input 
                  type="number" min="0" step="0.01" placeholder="Ej. 60.50"
                  value={formData.gas_cost}
                  onChange={e => setFormData({...formData, gas_cost: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
                />
             </div>
          </div>

        </form>

        <div style={{ padding: '20px 24px', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)', borderRadius: '0 0 20px 20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            type="button" 
            onClick={onClose}
            style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-main)', cursor: 'pointer', fontWeight: 600 }}
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary"
            style={{ padding: '10px 24px', borderRadius: '8px' }}
          >
            {loading ? 'Guardando...' : (editingRental ? 'Actualizar Alquiler' : 'Añadir Alquiler')}
          </button>
        </div>

      </div>
    </div>
  );
}
