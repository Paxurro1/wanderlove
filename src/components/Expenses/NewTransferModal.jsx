// ============================================================================
// ARCHIVO: NewTransferModal.jsx
// DESCRIPCIÓN: Modal para gestionar la logística de traslados, su coste y ubicación.
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Car, Bus, Train, DollarSign, Map, MapPin } from 'lucide-react';
import MapPickerModal from '../Map/MapPickerModal';

export default function NewTransferModal({ isOpen, onClose, tripId, onTransferAdded, editingTransfer }) {
  const [loading, setLoading] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [parkingSuggestions, setParkingSuggestions] = useState([]);
  const [parkingSearchTimer, setParkingSearchTimer] = useState(null);
  
  const [formData, setFormData] = useState({
    type: 'car',
    parking_name: '',
    parking_cost: '',
    parking_duration: '',
    transfer_duration_mins: '',
    cost: '',
    departure_time: '',
    lat: 0,
    lng: 0
  });

  useEffect(() => {
    if (editingTransfer) {
      setFormData({
        type: editingTransfer.type || 'car',
        parking_name: editingTransfer.parking_name || '',
        parking_cost: editingTransfer.parking_cost || '',
        parking_duration: editingTransfer.parking_duration || '',
        transfer_duration_mins: editingTransfer.transfer_duration_mins || '',
        cost: editingTransfer.cost || '',
        departure_time: editingTransfer.departure_time || '',
        lat: editingTransfer.lat || 0,
        lng: editingTransfer.lng || 0
      });
    } else {
      setFormData({
        type: 'car',
        parking_name: '',
        parking_cost: '',
        parking_duration: '',
        transfer_duration_mins: '',
        cost: '',
        departure_time: '',
        lat: 0,
        lng: 0
      });
    }
  }, [editingTransfer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // El coste del billete se guarda en airport_transfers Y se sincroniza con gastos.
      const transferData = {
        trip_id: tripId,
        type: formData.type,
        parking_name: formData.parking_name || null,
        parking_cost: formData.parking_cost ? parseFloat(formData.parking_cost) : 0,
        parking_duration: formData.parking_duration || null,
        transfer_duration_mins: formData.transfer_duration_mins ? parseInt(formData.transfer_duration_mins, 10) : null,
        cost: formData.cost ? parseFloat(formData.cost) : 0,
        departure_time: formData.departure_time || null,
        lat: formData.lat || 0,
        lng: formData.lng || 0
      };

      let result;
      if (editingTransfer) {
        console.log('UPDATING TRANSFER ID:', editingTransfer.id);
        console.log('DATA TO UPDATE:', transferData);
        result = await supabase.from('airport_transfers').update(transferData).eq('id', editingTransfer.id).select();
      } else {
        console.log('INSERTING NEW TRANSFER:', transferData);
        result = await supabase.from('airport_transfers').insert([transferData]).select();
      }

      if (result.error) throw result.error;

      // -- SINCRONIZACIÓN CON GASTOS --
      const ticketCost = parseFloat(formData.cost) || 0;
      const parkingCost = parseFloat(formData.parking_cost) || 0;
      
      if (ticketCost > 0 || parkingCost > 0) {
        const expenseData = {
          trip_id: tripId,
          description: `Logística: ${formData.type} ${formData.parking_name ? '(Parking: '+formData.parking_name+')' : ''}`,
          amount: ticketCost + parkingCost,
          category: 'Transporte'
        };
        await supabase.from('expenses').insert([expenseData]);
      }
      
      onTransferAdded(result.data[0]);
      onClose();
    } catch (error) {
      console.error('Error al guardar traslado:', error);
      alert('Error: ' + (error.message || JSON.stringify(error)));
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
          {editingTransfer ? 'Editar Traslado' : 'Añadir Traslado'}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>¿Cómo vais al aeropuerto?</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: 'car', label: 'Coche' },
                { id: 'bus', label: 'Autobús' },
                { id: 'ave', label: 'AVE' }
              ].map(t => (
                <button
                  key={t.id} type="button"
                  onClick={() => setFormData({...formData, type: t.id})}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)',
                    background: formData.type === t.id ? 'var(--color-primary)' : 'var(--color-bg)',
                    color: formData.type === t.id ? 'white' : 'var(--color-text-main)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s'
                  }}
                >
                  {t.id === 'car' && <Car size={18} />}
                  {t.id === 'bus' && <Bus size={18} />}
                  {t.id === 'ave' && <Train size={18} />}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Hora de salida</label>
              <input 
                type="datetime-local"
                value={formData.departure_time ? formData.departure_time.slice(0, 16) : ''}
                onChange={e => setFormData({...formData, departure_time: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Duración (mins)</label>
              <input 
                type="number"
                value={formData.transfer_duration_mins}
                onChange={e => setFormData({...formData, transfer_duration_mins: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Coste Billete (€)</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="number" step="0.01"
                  value={formData.cost}
                  onChange={e => setFormData({...formData, cost: e.target.value})}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '12px', paddingLeft: '35px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
                />
                <DollarSign size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              </div>
            </div>
          </div>

          {formData.type === 'car' && (
            <div style={{ padding: 'var(--spacing-md)', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px dashed var(--color-border)' }}>
              <div style={{ marginBottom: 'var(--spacing-md)', position: 'relative' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Nombre del Parking</label>
                <input 
                  type="text"
                  value={formData.parking_name}
                  onChange={e => {
                    const val = e.target.value;
                    setFormData({...formData, parking_name: val});
                    if (parkingSearchTimer) clearTimeout(parkingSearchTimer);
                    if (val.length >= 3) {
                      const t = setTimeout(async () => {
                        try {
                          let searchTerm = val;
                          if (!val.toLowerCase().includes('parking')) {
                            searchTerm += ' parking';
                          }
                          const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&limit=5&addressdetails=1`);
                          const data = await resp.json();
                          setParkingSuggestions(data);
                        } catch { setParkingSuggestions([]); }
                      }, 400);
                      setParkingSearchTimer(t);
                    } else { setParkingSuggestions([]); }
                  }}
                  onBlur={() => setTimeout(() => setParkingSuggestions([]), 200)}
                  placeholder="Ej. Parking El Corte Inglés..."
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
                />
                {/* Botón mapa para el parking */}
                <button
                  type="button"
                  onClick={() => setIsMapPickerOpen(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  <Map size={12} /> Ubicar en mapa
                </button>
                {formData.lat !== 0 && (
                  <span style={{ marginLeft: '8px', fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <MapPin size={10} color="var(--color-primary)" />
                    {formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}
                  </span>
                )}
                {/* Dropdown de sugerencias de parking */}
                {parkingSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', maxHeight: '180px', overflowY: 'auto' }}>
                    {parkingSuggestions.map(res => (
                      <div
                        key={res.place_id}
                        onMouseDown={() => {
                          setFormData(prev => ({ ...prev, parking_name: res.display_name.split(',')[0], lat: parseFloat(res.lat), lng: parseFloat(res.lon) }));
                          setParkingSuggestions([]);
                        }}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem', color: 'var(--color-text-main)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(118,75,162,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <MapPin size={11} style={{ marginRight: '5px', color: 'var(--color-primary)' }} />
                        {res.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Coste Parking (€)</label>
                  <input 
                    type="number" step="0.01"
                    value={formData.parking_cost}
                    onChange={e => setFormData({...formData, parking_cost: e.target.value})}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Días</label>
                  <input 
                    type="text"
                    value={formData.parking_duration}
                    onChange={e => setFormData({...formData, parking_duration: e.target.value})}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
                  />
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 'var(--spacing-md)' }}>
            {loading ? 'Guardando...' : (editingTransfer ? 'Guardar Cambios' : 'Añadir Traslado')}
          </button>

          {/* Selector de ubicación de inicio del traslado */}
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setIsMapPickerOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '8px',
                border: '1px solid var(--color-border)',
                background: 'transparent',
                color: 'var(--color-text-muted)',
                cursor: 'pointer', fontSize: '0.85rem'
              }}
            >
              <Map size={14} /> Ubicar inicio en mapa (opcional)
            </button>
            {formData.lat !== 0 && (
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} color="var(--color-primary)" />
                {formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>

    <MapPickerModal
      isOpen={isMapPickerOpen}
      onClose={() => setIsMapPickerOpen(false)}
      onSelect={({ lat, lng }) => setFormData(prev => ({ ...prev, lat, lng }))}
      title="Punto de salida del traslado"
    />
    </>
  );
}
