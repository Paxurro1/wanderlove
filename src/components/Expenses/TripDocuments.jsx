// ============================================================================
// ARCHIVO: TripDocuments.jsx
// DESCRIPCIÓN: Pestaña de Control de Documentos (Checklist).
// Permite gestionar qué documentos están listos y visualizar el progreso general.
// ============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, CheckCircle2, Circle, Plus, AlertCircle, X } from 'lucide-react';
import NewDocumentModal from './NewDocumentModal';
import ConfirmModal from '../Common/ConfirmModal';

export default function TripDocuments({ tripId }) {
  // -- ESTADOS LOCALES --
  const [documents, setDocuments] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estado para el modal de confirmación de borrado
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    id: null,
    name: ''
  });

  useEffect(() => {
    fetchDocuments();
  }, [tripId]);

  // Consulta para obtener la lista de documentos asociados al viaje.
  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error al obtener documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Añadir o editar el documento en la lista local.
  const handleDocumentAdded = () => {
    fetchDocuments();
  };

  // Función que abre el modal de confirmación.
  const handleDeleteDocument = (id, name) => {
    setConfirmModal({
      isOpen: true,
      id,
      name
    });
  };

  // Función que ejecuta el borrado real tras confirmar en el modal.
  const executeDeleteDocument = async () => {
    const { id, name } = confirmModal;
    if (!id) return;

    try {
      setLoading(true);
      // Also delete linked expenses first
      await supabase.from('expenses').delete().eq('reference_id', id);
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      setDocuments(prev => prev.filter(doc => doc.id !== id));
    } catch (error) {
      alert('Error al borrar el documento: ' + error.message);
    } finally {
      setLoading(false);
      setConfirmModal({ isOpen: false, id: null, name: '' });
    }
  };

  // Función para alternar el estado del documento directamente desde la lista.
  const toggleDocumentStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'ready' ? 'pending' : 'ready';
    try {
      const { error } = await supabase
        .from('documents')
        .update({ status: newStatus })
        .eq('id', id);
        
      if (error) throw error;
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    }
  };

  // Lógica de cálculo para la barra de progreso
  const readyDocs = documents.filter(d => d.status === 'ready').length;
  const progress = documents.length > 0 ? (readyDocs / documents.length) * 100 : 0;

  return (
    <div className="glass-panel" style={{ padding: 'var(--spacing-xl)' }}>
      {/* Cabecera de la sección de documentos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <FileText size={24} color="var(--color-primary)" /> Documentación Requerida
          </h3>
          <p style={{ color: 'var(--color-text-muted)', margin: 'var(--spacing-xs) 0 0 0' }}>Controla qué papeles necesitáis para viajar.</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => {
            setEditingDocument(null);
            setIsModalOpen(true);
          }}
          style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: '0.9rem' }}
        >
          <Plus size={16} /> Añadir Doc
        </button>
      </div>

      {/* Visualización de la Barra de Progreso */}
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)', fontSize: '0.9rem' }}>
          <span>Progreso de preparación</span>
          <span>{readyDocs} de {documents.length} listos</span>
        </div>
        <div style={{ height: '10px', background: 'var(--color-border)', borderRadius: '5px', overflow: 'hidden' }}>
          {/* La barra verde crece según el porcentaje de documentos en estado 'ready' */}
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--color-success)', transition: 'width 0.5s ease-out' }}></div>
        </div>
      </div>

      {/* Lista de documentos estilo Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {documents.length === 0 && !loading ? (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--spacing-md)' }}>No hay documentos en la lista.</p>
        ) : documents.map(doc => (
          <div key={doc.id} style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: 'var(--spacing-md)',
            // Fondo ligeramente verdoso si está listo
            background: doc.status === 'ready' ? 'rgba(46, 204, 113, 0.05)' : 'var(--color-surface)',
            borderRadius: 'var(--border-radius)',
            border: `1px solid ${doc.status === 'ready' ? 'rgba(46, 204, 113, 0.3)' : 'var(--color-border)'}`,
            transition: 'all 0.2s'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
              {/* Icono de estado (Check o Círculo vacío) */}
               <button 
                onClick={() => toggleDocumentStatus(doc.id, doc.status)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: doc.status === 'ready' ? 'var(--color-success)' : 'var(--color-text-muted)' }}
              >
                {doc.status === 'ready' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
              </button>
              <div>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {doc.name} 
                  {/* Icono de alerta roja si falta por preparar */}
                  {doc.status !== 'ready' && <AlertCircle size={14} color="var(--color-error)" />}
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{doc.notes}</div>
              </div>
            </div>
            {/* Acciones laterales (Editar/Borrar) */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ 
                padding: '4px 12px', 
                borderRadius: '20px', 
                fontSize: '0.8rem',
                fontWeight: 600,
                background: doc.status === 'ready' ? 'var(--color-success)' : 'var(--color-error)',
                color: 'white'
              }}>
                {doc.status === 'ready' ? 'Listo' : 'Pendiente'}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  onClick={() => {
                    setEditingDocument(doc);
                    setIsModalOpen(true);
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}
                >
                  <FileText size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteDocument(doc.id, doc.name)}
                  style={{ background: 'transparent', border: 'none', color: 'rgba(231, 76, 60, 0.6)', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal para añadir nuevos documentos a la lista */}
      <NewDocumentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        tripId={tripId}
        onDocumentAdded={handleDocumentAdded}
        editingDocument={editingDocument}
      />

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={executeDeleteDocument}
        title="¿Borrar documento?"
        message={`¿Estás seguro de que quieres eliminar "${confirmModal.name}"?`}
        confirmText="Sí, borrar"
        cancelText="No, dejarlo"
      />
    </div>
  );
}
