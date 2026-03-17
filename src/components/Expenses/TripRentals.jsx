import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Car, MapPin, Clock, Edit2, Trash2, Shield, Fuel } from 'lucide-react';
import NewRentalModal from './NewRentalModal';

export default function TripRentals({ tripId, trip }) {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRental, setEditingRental] = useState(null);

  useEffect(() => {
    fetchRentals();
  }, [tripId]);

  const fetchRentals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trip_rentals')
        .select('*')
        .eq('trip_id', tripId)
        .order('pickup_datetime', { ascending: true });
        
      if (error) throw error;
      setRentals(data || []);
    } catch (error) {
      console.error('Error fetching rentals:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (rentalId) => {
    if (!window.confirm('¿Seguro que quieres borrar este alquiler? Se borrarán también los gastos financieros asociados.')) return;
    try {
      // 1. Borrar gastos asociados basándonos en el source_id
      await supabase
        .from('expenses')
        .delete()
        .eq('source_id', rentalId);

      // 2. Borrar el alquiler
      const { error } = await supabase
        .from('trip_rentals')
        .delete()
        .eq('id', rentalId);
        
      if (error) throw error;
      setRentals(rentals.filter(r => r.id !== rentalId));
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleEdit = (rental) => {
    setEditingRental(rental);
    setIsModalOpen(true);
  };

  // Calcula total gastado en coches (precio + gasolina)
  const totalSpent = rentals.reduce((sum, r) => sum + (Number(r.price) || 0) + (Number(r.gas_cost) || 0), 0);

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando vehículos...</div>;

  return (
    <div className="glass-panel" style={{ padding: 'var(--spacing-xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Car size={24} className="text-primary" /> 
            Coches de Alquiler
          </h3>
          <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
            Total gastado: {totalSpent.toFixed(2)}€
          </p>
        </div>
        
        <button 
          className="btn-primary" 
          onClick={() => {
            setEditingRental(null);
            setIsModalOpen(true);
          }}
          style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Car size={16} /> Añadir Coche
        </button>
      </div>

      {rentals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--color-surface)', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
          <Car size={48} style={{ color: 'var(--color-border)', marginBottom: '16px' }} />
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>No has añadido ningún alquiler de vehículo.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {rentals.map((rental) => (
            <div key={rental.id} style={{ 
              background: 'var(--color-surface)', 
              borderRadius: 'var(--border-radius)', 
              padding: 'var(--spacing-lg)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: 'var(--color-text-main)' }}>
                    {rental.car_model || 'Vehículo sin modelo'}
                  </h4>
                  <div style={{ display: 'flex', gap: '16px', color: 'var(--color-text-muted)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Shield size={14} /> 
                      Seguro: <span style={{ textTransform: 'capitalize' }}>{rental.insurance_type.replace('_', ' ')}</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', fontWeight: 600 }}>
                      Precio: {Number(rental.price || 0).toFixed(2)}€
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#e67e22', fontWeight: 600 }}>
                      <Fuel size={14} /> 
                      Gasolina: {Number(rental.gas_cost || 0).toFixed(2)}€
                    </span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleEdit(rental)} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: 'var(--color-text-main)' }}>
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(rental.id)} style={{ background: '#fff5f5', border: '1px solid #feb2b2', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: '#c53030' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: 'var(--color-bg)', padding: '16px', borderRadius: '8px' }}>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ color: 'var(--color-primary)' }}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Recogida</div>
                    <div style={{ fontWeight: 500, margin: '4px 0 2px' }}>
                       {new Date(rental.pickup_datetime).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} a las {new Date(rental.pickup_datetime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                      <MapPin size={14} /> {rental.pickup_location || 'No especificada'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ color: 'var(--color-text-muted)' }}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Devolución</div>
                    <div style={{ fontWeight: 500, margin: '4px 0 2px' }}>
                       {new Date(rental.return_datetime).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} a las {new Date(rental.return_datetime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                      <MapPin size={14} /> {rental.return_location || 'No especificada'}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          ))}
        </div>
      )}

      {trip && isModalOpen && (
        <NewRentalModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          tripId={tripId} 
          tripStartDate={trip.start_date}
          tripEndDate={trip.end_date}
          editingRental={editingRental}
          onRentalAdded={() => fetchRentals()} 
        />
      )}
    </div>
  );
}
