// ============================================================================
// ARCHIVO: TripAccommodations.jsx
// DESCRIPCIÓN: Pestaña para gestionar dónde dormir (Hoteles, Áreas Camper, etc).
// Muestra una lista cronológica de estancias con sus detalles y valoraciones.
// ============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Bed, Home, Tent, Plus, Pencil, Trash2, MapPin, Calendar, Star, X } from 'lucide-react';
import NewAccommodationModal from './NewAccommodationModal';
import ConfirmModal from '../Common/ConfirmModal';

// Función auxiliar para asignar un icono visual según el tipo de alojamiento.
const getIconForType = (type) => {
  switch (type) {
    case 'hotel': return <Bed size={20} />;
    case 'camper_paid': return <Tent size={20} />;
    case 'camper_free': return <Home size={20} />;
    default: return <Bed size={20} />;
  }
};

// Función auxiliar para obtener el texto (label) legible de cada tipo.
const getLabelForType = (type) => {
  switch (type) {
    case 'hotel': return 'Hotel/Apartamento';
    case 'camper_paid': return 'Área Camper (De pago)';
    case 'camper_free': return 'Área Camper (Gratis)';
    default: return 'Alojamiento';
  }
};

export default function TripAccommodations({ tripId, tripStartDate, tripEndDate, isReadOnly, hidePrices }) {
  // -- ESTADOS LOCALES --
  const [accommodations, setAccommodations] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccommodation, setEditingAccommodation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estado para el modal de confirmación de borrado
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    id: null,
    name: ''
  });

  // Cargar datos al montar el componente.
  useEffect(() => {
    fetchAccommodations();
  }, [tripId]);

  // Consulta a Supabase para obtener las estancias ordenadas por fecha de entrada (check-in).
  const fetchAccommodations = async () => {
    try {
      const { data, error } = await supabase
        .from('accommodations')
        .select('*')
        .eq('trip_id', tripId)
        .order('check_in', { ascending: true });
        
      if (error) throw error;
      setAccommodations(data || []);
    } catch (error) {
      console.error('Error al obtener alojamientos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manejador para actualizar la lista local cuando se añade o edita un alojamiento.
  const handleAccommodationAdded = () => {
    fetchAccommodations(); // Recargamos para mantener orden cronológico.
  };

  // Función que abre el modal de confirmación.
  const handleDeleteAccommodation = (id, name) => {
    setConfirmModal({
      isOpen: true,
      id,
      name
    });
  };

  // Función que ejecuta el borrado real tras confirmar.
  const executeDeleteAccommodation = async () => {
    const { id, name } = confirmModal;
    if (!id) return;

    try {
      setLoading(true);
      // Also delete linked expenses
      await supabase.from('expenses').delete().eq('reference_id', id);
      const { error } = await supabase
        .from('accommodations')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      setAccommodations(prev => prev.filter(acc => acc.id !== id));
    } catch (error) {
      alert('Error al borrar el alojamiento: ' + error.message);
    } finally {
      setLoading(false);
      setConfirmModal({ isOpen: false, id: null, name: '' });
    }
  };

  // Sumatorio opcional (aunque no se usa visualmente en esta versión, puede ser útil).
  const totalCost = accommodations.reduce((sum, acc) => sum + Number(acc.cost), 0);

  return (
    <div className="glass-panel" style={{ padding: 'var(--spacing-xl)' }}>
      {/* Cabecera de Sección */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Bed size={24} color="var(--color-primary)" /> Dónde vamos a dormir
          </h3>
          <p style={{ color: 'var(--color-text-muted)', margin: 'var(--spacing-xs) 0 0 0' }}>Hoteles, Campings y zonas de pernocta libre.</p>
        </div>
        {!isReadOnly && (
          <button 
            className="btn-primary" 
            onClick={() => {
              setEditingAccommodation(null);
              setIsModalOpen(true);
            }}
            style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: '0.9rem' }}
          >
            <Plus size={16} /> Añadir Alojamiento
          </button>
        )}
      </div>

      {/* Lista de cards de alojamientos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        {accommodations.length === 0 && !loading ? (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--spacing-xl)' }}>No has añadido dónde vais a dormir todavía.</p>
        ) : accommodations.map(acc => (
          <div key={acc.id} style={{ 
            background: 'var(--color-surface)', padding: 'var(--spacing-lg)', 
            borderRadius: 'var(--border-radius)', border: '1px solid var(--color-border)',
            display: 'flex', gap: 'var(--spacing-lg)', position: 'relative'
          }}>
            {/* Icono lateral con color condicional si es gratuito o de pago */}
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '12px', 
              background: acc.type === 'camper_free' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(255, 107, 107, 0.1)', 
              color: acc.type === 'camper_free' ? 'var(--color-success)' : 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              {getIconForType(acc.type)}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <h4 style={{ margin: 0, fontSize: '1.2rem' }}>{acc.name}</h4>
                {/* Visualización del coste o etiqueta de Gratis */}
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'right' }}>
                  {!hidePrices && Number(acc.cost).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                  {acc.type === 'camper_free' && <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 'normal' }}>Gratis</div>}
                </div>
              </div>
              
              <div style={{ color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                {getLabelForType(acc.type)}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 'var(--spacing-sm)' }}>
                {/* Rango de fechas de estancia */}
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={14} /> 
                  {new Date(acc.check_in).toLocaleDateString([], {day:'2-digit', month: 'short'})} 
                  {' → '}
                  {new Date(acc.check_out).toLocaleDateString([], {day:'2-digit', month: 'short'})}
                </span>

                {/* Horas de entrada/salida extraídas del datetime */}
                {(() => {
                  const inTime = acc.check_in ? new Date(acc.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : null;
                  const outTime = acc.check_out ? new Date(acc.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : null;
                  // Only show if time is not midnight (00:00) — means user actually set a time
                  const showIn = inTime && inTime !== '00:00';
                  const showOut = outTime && outTime !== '00:00';
                  if (!showIn && !showOut) return null;
                  return (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      🕐
                      {showIn && <span>Entrada: <strong>{inTime}</strong></span>}
                      {showIn && showOut && <span style={{ margin: '0 4px' }}>·</span>}
                      {showOut && <span>Salida: <strong>{outTime}</strong></span>}
                    </span>
                  );
                })()}
                
                {/* Notas/Ubicación */}
                {acc.notes && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} /> {acc.notes}
                  </span>
                )}
              </div>

              {/* Valoración por estrellas (si la hay) */}
              {acc.rating > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f1c40f', fontSize: '0.9rem' }}>
                  <Star size={14} fill="#f1c40f" /> {acc.rating}/5
                </div>
              )}

              {/* Botones de acción (Editar/Borrar) */}
              {!isReadOnly && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                  <button 
                    onClick={() => {
                      setEditingAccommodation(acc);
                      setIsModalOpen(true);
                    }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}
                    title="Editar"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteAccommodation(acc.id, acc.name)}
                    style={{ background: 'transparent', border: 'none', color: 'rgba(231, 76, 60, 0.6)', cursor: 'pointer', padding: '4px' }}
                    title="Borrar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Modal para añadir nuevos registros */}
      <NewAccommodationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        tripId={tripId}
        tripStartDate={tripStartDate}
        tripEndDate={tripEndDate}
        onAccommodationAdded={handleAccommodationAdded}
        editingAccommodation={editingAccommodation}
      />

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={executeDeleteAccommodation}
        title="¿Borrar alojamiento?"
        message={`¿Estás seguro de que quieres eliminar "${confirmModal.name}" de vuestro viaje?`}
        confirmText="Sí, borrar"
        cancelText="No, dejarlo"
      />
    </div>
  );
}
