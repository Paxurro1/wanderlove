// ============================================================================
// ARCHIVO: NewTransferModal.jsx
// DESCRIPCIÓN: Modal para gestionar la logística de traslados y su coste.
// ============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Car, Bus, Train, DollarSign } from 'lucide-react';

export default function NewTransferModal({ isOpen, onClose, tripId, onTransferAdded, editingTransfer }) {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'car',
    parking_name: '',
    parking_cost: '',
    parking_duration: '',
    transfer_duration_mins: '',
    cost: '' // Nuevo campo de coste general para BUS/AVE
  });

  useEffect(() => {
    if (editingTransfer) {
      setFormData({
        type: editingTransfer.type || 'car',
        parking_name: editingTransfer.parking_name || '',
        parking_cost: editingTransfer.parking_cost || '',
        parking_duration: editingTransfer.parking_duration || '',
        transfer_duration_mins: editingTransfer.transfer_duration_mins || '',
        cost: editingTransfer.cost || ''
      });
    } else {
      setFormData({
        type: 'car',
        parking_name: '',
        parking_cost: '',
        parking_duration: '',
        transfer_duration_mins: '',
        cost: ''
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
        cost: formData.cost ? parseFloat(formData.cost) : 0
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
              {['car', 'bus', 'ave'].map(t => (
                <button
                  key={t} type="button"
                  onClick={() => setFormData({...formData, type: t})}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)',
                    background: formData.type === t ? 'var(--color-primary)' : 'var(--color-bg)',
                    color: formData.type === t ? 'white' : 'var(--color-text-main)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s'
                  }}
                >
                  {t === 'car' && <Car size={18} />}
                  {t === 'bus' && <Bus size={18} />}
                  {t === 'ave' && <Train size={18} />}
                  <span style={{ textTransform: 'capitalize' }}>{t}</span>
                </button>
              ))}
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
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Nombre del Parking</label>
                <input 
                  type="text"
                  value={formData.parking_name}
                  onChange={e => setFormData({...formData, parking_name: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
                />
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
        </form>
      </div>
    </div>
  );
}
