import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';

export default function NewExpenseModal({ isOpen, onClose, tripId, onExpenseAdded, editingExpense }) {
  const { user } = useAuth();
  // --- ESTADO DEL FORMULARIO ---
  const [loading, setLoading] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    paid_by: user?.id || '',
    is_paid: false
  });

  // Fetch participants when modal opens
  useEffect(() => {
    if (isOpen && tripId) {
      const fetchParticipants = async () => {
        try {
          const { data, error } = await supabase
            .from('trip_participants')
            .select('profiles:user_id(id, full_name)')
            .eq('trip_id', tripId)
            .eq('status', 'accepted');
          
          if (error) throw error;
          
          const allParticipants = data ? data.map(p => p.profiles).filter(Boolean) : [];
          
          const { data: tripInfo, error: tripInfoError } = await supabase
            .from('trips')
            .select('owner_id')
            .eq('id', tripId)
            .single();
            
          if (!tripInfoError && tripInfo?.owner_id) {
            const { data: ownerProfile } = await supabase
              .from('profiles')
              .select('id, full_name')
              .eq('id', tripInfo.owner_id)
              .single();
              
            if (ownerProfile && !allParticipants.some(p => p.id === ownerProfile.id)) {
              allParticipants.push(ownerProfile);
            }
          }
          setParticipants(allParticipants);
        } catch (error) {
          console.error("Error fetching participants:", error);
        }
      };
      
      fetchParticipants();
    }
  }, [isOpen, tripId]);

  // Efecto para cargar los datos del gasto si estamos en modo edición.
  useEffect(() => {
    if (editingExpense) {
      setFormData({
        category: editingExpense.category || '',
        amount: editingExpense.amount || '',
        description: editingExpense.description || '',
        paid_by: editingExpense.paid_by || user?.id || '',
        is_paid: editingExpense.is_paid || false
      });
    } else {
      setFormData({ category: '', amount: '', description: '', paid_by: user?.id || '', is_paid: false });
    }
  }, [editingExpense, isOpen, user?.id]);

  // Si el modal no está marcado como abierto, no renderizamos nada (null).
  if (!isOpen) return null;

  // Función manejadora del envío del formulario.
  const handleSubmit = async (e) => {
    e.preventDefault(); // Evita que la página se recargue.
    
    // Validación simple: categoría y cantidad son obligatorios.
    if (!formData.category || !formData.amount) return;
    
    setLoading(true);

    try {
      const expenseData = {
        trip_id: tripId,
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description,
        paid_by: formData.paid_by || user.id,
        is_paid: formData.is_paid
      };

      let result;

      if (editingExpense) {
        // ACTUALIZAR GASTO
        result = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id)
          .select();
      } else {
        // INSERTAR NUEVO GASTO
        result = await supabase
          .from('expenses')
          .insert([expenseData])
          .select();
      }

      if (result.error) throw result.error;
      
      // Si todo sale bien, notificamos al componente padre.
      onExpenseAdded(result.data[0]);
      onClose();
    } catch (error) {
      alert('Error al procesar el gasto: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Contenedor del fondo oscuro (Overlay) con desenfoque.
    <div className="modal-overlay">
      {/* Panel blanco (Pop-up) del modal */}
      <div className="modal-content animate-fade-in" style={{ maxWidth: '400px' }}>
        {/* Botón de cierre (X) en la esquina superior derecha */}
        <button onClick={onClose} style={{ position: 'absolute', top: 'var(--spacing-md)', right: 'var(--spacing-md)', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={24} />
        </button>
        
        <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>
          {editingExpense ? 'Editar Gasto' : 'Añadir Gasto'}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {/* Selector de Categoría */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Categoría</label>
            <select 
              required
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
            >
              <option value="">Selecciona...</option>
              <option value="Vuelos/Transporte">Transporte Principal</option>
              <option value="Alojamiento">Alojamiento</option>
              <option value="Comida">Comida (Restaurantes/Súper)</option>
              <option value="Actividades">Actividades y Tours</option>
              <option value="Transporte Local">Transporte Local (Taxi/Metro)</option>
              <option value="Gasolina">Gasolina</option>
              <option value="Otros">Otros</option>
            </select>
          </div>
          
          {/* Selector de Pagador */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Pagado por</label>
            <select 
              required
              value={formData.paid_by}
              onChange={e => setFormData({...formData, paid_by: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
            >
              {participants.length === 0 ? (
                 <option value={user?.id || ''}>Cargando...</option>
              ) : (
                participants.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))
              )}
            </select>
          </div>
          
          {/* Input de Cantidad */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Cantidad (€)</label>
            <input 
              type="number" 
              step="0.01"
              required
              value={formData.amount}
              onChange={e => setFormData({...formData, amount: e.target.value})}
              placeholder="0.00"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
            />
          </div>

          {/* Input de Descripción */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Descripción / Notas</label>
            <input 
              type="text" 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Ej. Cena en pizzería del centro"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
            />
          </div>

          {/* Toggle Pagado/Pendiente */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Estado del gasto</label>
            <div
              onClick={() => setFormData({...formData, is_paid: !formData.is_paid})}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: `1px solid ${formData.is_paid ? 'rgba(56,161,105,0.5)' : 'rgba(229,62,62,0.4)'}`,
                background: formData.is_paid ? 'rgba(56,161,105,0.08)' : 'rgba(229,62,62,0.06)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                userSelect: 'none'
              }}
            >
              <div style={{
                width: '44px', height: '24px',
                borderRadius: '12px',
                background: formData.is_paid ? '#38a169' : '#e53e3e',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0
              }}>
                <div style={{
                  position: 'absolute',
                  top: '3px',
                  left: formData.is_paid ? '23px' : '3px',
                  width: '18px', height: '18px',
                  borderRadius: '50%',
                  background: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  transition: 'left 0.2s'
                }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: formData.is_paid ? '#38a169' : '#e53e3e' }}>
                {formData.is_paid ? '✅ Pagado / Liquidado' : '⏳ Pendiente de pago'}
              </span>
            </div>
          </div>

          {/* Botón de envío */}
          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 'var(--spacing-md)' }}>
            {loading ? 'Guardando...' : (editingExpense ? 'Guardar Cambios' : 'Añadir a la cuenta')}
          </button>
        </form>
      </div>
    </div>
  );
}
