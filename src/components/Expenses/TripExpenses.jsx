// ============================================================================
// ARCHIVO: TripExpenses.jsx
// DESCRIPCIÓN: Componente que gestiona la pestaña de Gastos de un viaje.
// Muestra el total acumulado y un historial detallado de cada gasto realizado.
// ============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PieChart, DollarSign, Plus, Pencil, Trash2, CheckCircle, Clock } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState([]);

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

  // Función para obtener los gastos y participantes
  const fetchExpenses = async () => {
    try {
      // 1. Fetch Expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*, profiles:paid_by(id, full_name, avatar_url)')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });
        
      if (expensesError) throw expensesError;
      setExpenses(expensesData || []);

      // 2. Fetch Participants for Balances
      const { data: participantsData, error: participantsError } = await supabase
        .from('trip_participants')
        .select('profiles:user_id(id, full_name, avatar_url)')
        .eq('trip_id', tripId)
        .eq('status', 'accepted');
        
      if (participantsError) throw participantsError;
      
      const allParticipants = participantsData ? participantsData.map(p => p.profiles).filter(Boolean) : [];
      
      // 3. Fetch Trip Owner manually to ensure they are included (for retrocompatibility with older trips)
      const { data: tripInfo, error: tripInfoError } = await supabase
        .from('trips')
        .select('owner_id')
        .eq('id', tripId)
        .single();
        
      if (!tripInfoError && tripInfo?.owner_id) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', tripInfo.owner_id)
          .single();
          
        if (ownerProfile && !allParticipants.some(p => p.id === ownerProfile.id)) {
          allParticipants.push(ownerProfile);
        }
      }
      setParticipants(allParticipants);

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

      {/* --- SECCIÓN BALANCES --- */}
      {participants.length > 0 && totalAmount > 0 && (
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h4 style={{ margin: '0 0 var(--spacing-sm) 0' }}>Balances</h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: 'var(--spacing-sm)' 
          }}>
            {(() => {
              const sharePerPerson = totalAmount / participants.length;
              
              // Map de gastos por usuario
              const paidByUser = {};
              participants.forEach(p => paidByUser[p.id] = 0);
              
              expenses.forEach(exp => {
                if (exp.paid_by && paidByUser[exp.paid_by] !== undefined) {
                  paidByUser[exp.paid_by] += Number(exp.amount) || 0;
                }
              });

              return participants.map(p => {
                const paid = paidByUser[p.id];
                const balance = paid - sharePerPerson;
                const isOwed = balance > 0;
                const isEven = Math.abs(balance) < 0.01;
                
                let textColor = 'var(--color-text-muted)';
                if (!isEven) {
                  textColor = isOwed ? '#38a169' : '#e53e3e'; // Verde si le deben, Rojo si debe
                }

                return (
                  <div key={p.id} style={{ 
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius)',
                    display: 'flex', flexDirection: 'column', gap: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img 
                        src={p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=random`} 
                        alt={p.full_name} 
                        style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <span style={{ fontWeight: 500, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.full_name.split(' ')[0]}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Pagó: {paid.toFixed(2)}€</div>
                      <div style={{ fontWeight: 'bold', color: textColor, marginTop: '2px' }}>
                        {isEven ? 'En paz' : (isOwed ? `Le deben ${balance.toFixed(2)}€` : `Debe ${Math.abs(balance).toFixed(2)}€`)}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Lista/Historial de gastos individuales */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        <h4 style={{ margin: 'var(--spacing-md) 0 var(--spacing-sm) 0' }}>Historial</h4>
        {expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--color-text-muted)' }}>
            No hay gastos registrados todavía.
          </div>
        ) : (
          expenses.map(exp => {
            const isPaid = exp.is_paid;
            return (
              <div key={exp.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: 'var(--spacing-md)',
                background: isPaid ? 'rgba(56,161,105,0.06)' : 'rgba(229,62,62,0.06)',
                borderRadius: 'var(--border-radius)',
                border: `1px solid ${isPaid ? 'rgba(56,161,105,0.35)' : 'rgba(229,62,62,0.35)'}`,
                transition: 'all 0.2s'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                    {isPaid
                      ? <CheckCircle size={14} color="#38a169" />
                      : <Clock size={14} color="#e53e3e" />}
                    <span>{exp.category}</span>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                      background: isPaid ? 'rgba(56,161,105,0.15)' : 'rgba(229,62,62,0.15)',
                      color: isPaid ? '#38a169' : '#e53e3e'
                    }}>
                      {isPaid ? 'Pagado' : 'Pendiente'}
                    </span>
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '2px' }}>{exp.description}</div>
                  {exp.profiles && (
                    <div style={{ 
                      display: 'flex', alignItems: 'center', gap: '4px', 
                      fontSize: '0.75rem', color: 'var(--color-text-muted)', 
                      marginTop: '4px', background: 'var(--color-bg)',
                      padding: '2px 8px', borderRadius: '10px', width: 'fit-content'
                    }}>
                      {exp.profiles.avatar_url && (
                        <img src={exp.profiles.avatar_url} alt="" style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'cover' }} />
                      )}
                      Pagado por <span style={{ fontWeight: 600 }}>{exp.profiles.full_name?.split(' ')[0]}</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: isPaid ? '#38a169' : '#e53e3e' }}>
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
            );
          })
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
