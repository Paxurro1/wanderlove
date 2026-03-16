// ============================================================================
// ARCHIVO: TripExpenses.jsx
// DESCRIPCIÓN: Componente que gestiona la pestaña de Gastos de un viaje.
// Muestra el total acumulado y un historial detallado de cada gasto realizado.
// ============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PieChart, DollarSign, Plus, Pencil, Trash2 } from 'lucide-react';
import NewExpenseModal from './NewExpenseModal';
import ConfirmModal from '../Common/ConfirmModal';

export default function TripExpenses({ tripId }) {
  // --- ESTADOS LOCALes ---
  // expenses: Lista de gastos asociados a este viaje.
  const [expenses, setExpenses] = useState([]);
  // isModalOpen: Controla la visibilidad del modal para añadir un nuevo gasto.
  const [isModalOpen, setIsModalOpen] = useState(false);
  // editingExpense: Gasto que se está editando actualmente.
  const [editingExpense, setEditingExpense] = useState(null);
  // loading: Estado de carga mientras se obtienen los datos de Supabase.
  const [loading, setLoading] = useState(true);

  // Estado para el modal de confirmación de borrado
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    id: null,
    description: ''
  });

  // --- EFECTOS ---
  // Se ejecuta al montar el componente o cuando cambia el tripId.
  useEffect(() => {
    fetchExpenses();
  }, [tripId]);

  // Función para obtener los gastos desde la base de datos de Supabase.
  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false }); // Los más nuevos primero.
        
      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error al obtener gastos:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Función manejadora que se llama cuando el modal inserta o edita un gasto con éxito.
  const handleExpenseAdded = () => {
    fetchExpenses(); // Recargamos la lista completa para asegurar coherencia.
  };

  // Función que abre el modal de confirmación.
  const handleDeleteExpense = (id, description) => {
    setConfirmModal({
      isOpen: true,
      id,
      description
    });
  };

  // Función que ejecuta el borrado real tras confirmar.
  const executeDeleteExpense = async () => {
    const { id, description } = confirmModal;
    if (!id) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      alert('Error al borrar el gasto: ' + error.message);
    } finally {
      setLoading(false);
      setConfirmModal({ isOpen: false, id: null, description: '' });
    }
  };

  // Cálculo del total acumulado sumando todos los importes de la lista de gastos.
  const totalAmount = expenses.reduce((sum, exp) => {
    const val = Number(exp.amount);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  return (
    <div className="glass-panel" style={{ padding: 'var(--spacing-xl)' }}>
      {/* Cabecera de la sección con título y botón de añadir */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <PieChart size={24} color="var(--color-primary)" /> Finanzas del Viaje
          </h3>
          <p style={{ color: 'var(--color-text-muted)', margin: 'var(--spacing-xs) 0 0 0' }}>Lleva un control de lo que gastáis.</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => {
            setEditingExpense(null);
            setIsModalOpen(true);
          }}
          style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: '0.9rem' }}
        >
          <Plus size={16} /> Añadir Gasto
        </button>
      </div>

      {/* Tarjeta resumen del Gasto Total */}
      <div style={{ 
        background: 'linear-gradient(135deg, var(--color-surface), var(--color-bg))',
        padding: 'var(--spacing-lg)',
        borderRadius: 'var(--border-radius-lg)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-lg)',
        marginBottom: 'var(--spacing-xl)'
      }}>
        <div style={{ 
          background: 'rgba(78, 205, 196, 0.2)', 
          padding: '20px', 
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <DollarSign size={32} color="var(--color-secondary)" />
        </div>
        <div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>Gasto Total</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>
            {totalAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
          </div>
        </div>
      </div>

      {/* Lista/Historial de gastos individuales */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        <h4 style={{ margin: 'var(--spacing-md) 0 var(--spacing-sm) 0' }}>Historial</h4>
        {expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--color-text-muted)' }}>
            No hay gastos registrados todavía.
          </div>
        ) : (
          expenses.map(exp => (
            <div key={exp.id} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: 'var(--spacing-md)',
              background: 'var(--color-surface)',
              borderRadius: 'var(--border-radius)',
              border: '1px solid var(--color-border)'
            }}>
              <div>
                <div style={{ fontWeight: 600 }}>{exp.category}</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{exp.description}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                    {(Number(exp.amount) || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button 
                      onClick={() => {
                        setEditingExpense(exp);
                        setIsModalOpen(true);
                      }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '2px' }}
                      title="Editar gasto"
                    >
                      <Pencil size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteExpense(exp.id, exp.description)}
                      style={{ background: 'transparent', border: 'none', color: 'rgba(231, 76, 60, 0.6)', cursor: 'pointer', padding: '2px' }}
                      title="Borrar gasto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Componente Modal para añadir o editar gastos */}
      <NewExpenseModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        tripId={tripId}
        onExpenseAdded={handleExpenseAdded}
        editingExpense={editingExpense}
      />

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={executeDeleteExpense}
        title="¿Borrar este gasto?"
        message={`¿Estás seguro de que quieres eliminar "${confirmModal.description}" de vuestra cuenta?`}
        confirmText="Sí, borrar"
        cancelText="No, dejarlo"
      />
    </div>
  );
}
