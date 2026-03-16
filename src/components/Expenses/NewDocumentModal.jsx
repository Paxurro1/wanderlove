// ============================================================================
// ARCHIVO: NewDocumentModal.jsx
// DESCRIPCIÓN: Formulario modal para añadir un nuevo documento a la lista de control.
// Permite definir nombre, tipo de documento y su estado inicial (Pendiente/Listo).
// ============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';

export default function NewDocumentModal({ isOpen, onClose, tripId, onDocumentAdded, editingDocument }) {
  const [loading, setLoading] = useState(false);
  
  // -- ESTADO INICIAL DEL FORMULARIO --
  const [formData, setFormData] = useState({
    name: '',            // Ej: "Seguro de viaje"
    type: 'passport',     // Categoría del documento
    status: 'needed',    // 'needed' (pendiente) o 'ready' (listo)
    notes: '',             // Observaciones adicionales
    cost: ''              // Nuevo campo: Coste del documento
  });

  // Efecto para cargar los datos si estamos editando.
  useEffect(() => {
    if (editingDocument) {
      setFormData({
        name: editingDocument.name || '',
        type: editingDocument.type || 'passport',
        status: editingDocument.status || 'needed',
        notes: editingDocument.notes || '',
        cost: editingDocument.cost || ''
      });
    } else {
      setFormData({ name: '', type: 'passport', status: 'needed', notes: '', cost: '' });
    }
  }, [editingDocument, isOpen]);

  if (!isOpen) return null;

  // Manejador del envío de datos a la tabla 'documents' de Supabase
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return; // El nombre es obligatorio
    
    setLoading(true);

    try {
      const documentData = {
        trip_id: tripId,
        name: formData.name,
        type: formData.type,
        status: formData.status,
        notes: formData.notes
      };

      let result;

      if (editingDocument) {
        // ACTUALIZAR DOCUMENTO
        result = await supabase
          .from('documents')
          .update(documentData)
          .eq('id', editingDocument.id)
          .select();
      } else {
        // INSERTAR NUEVO DOCUMENTO
        result = await supabase
          .from('documents')
          .insert([documentData])
          .select();
      }

      if (result.error) throw result.error;
      
      // -- SINCRONIZACIÓN CON GASTOS --
      if (formData.cost && parseFloat(formData.cost) > 0) {
        const expenseData = {
          trip_id: tripId,
          description: `Documento: ${formData.name}`,
          amount: parseFloat(formData.cost),
          category: 'Documentación'
        };
        await supabase.from('expenses').insert([expenseData]);
      }

      // Actualizamos la lista en el componente padre
      onDocumentAdded(result.data[0]);
      onClose(); // Cerramos el modal
    } catch (error) {
      alert('Error al procesar el documento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 'var(--spacing-md)'
    }}>
      {/* Contenedor del Modal */}
      <div className="glass-panel animate-fade-in" style={{ 
        background: 'var(--color-surface)', width: '100%', maxWidth: '400px', 
        padding: 'var(--spacing-xl)', position: 'relative'
      }}>
        {/* Botón de cierre (X) */}
        <button onClick={onClose} style={{ position: 'absolute', top: 'var(--spacing-md)', right: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>
          <X size={24} />
        </button>
        
        <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>
          {editingDocument ? 'Editar Documento' : 'Añadir Documento'}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          
          {/* Nombre del documento */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Documento</label>
            <input 
              type="text" required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Ej. Pasaporte, Visado, DNI..."
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            {/* Selector de Tipo de documento */}
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Tipo</label>
              <select 
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              >
                <option value="passport">ID / Pasaporte</option>
                <option value="visa">Visado / ESTA</option>
                <option value="health_card">Salud / Seguro</option>
                <option value="ticket">Entradas / Billetes</option>
                <option value="other">Otro</option>
              </select>
            </div>
            {/* Selector de Estado inicial */}
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Estado</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              >
                <option value="needed">Pendiente</option>
                <option value="ready">Listo ✓</option>
              </select>
            </div>
          </div>

          {/* Campo de notas (opcional) */}
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Notas</label>
              <input 
                type="text" 
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                placeholder="Ej. Caduca en 2028..."
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Coste (€)</label>
              <input 
                type="number" step="0.01"
                value={formData.cost}
                onChange={e => setFormData({...formData, cost: e.target.value})}
                placeholder="0.00"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
          </div>

          {/* Botón de acción */}
          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 'var(--spacing-md)' }}>
            {loading ? 'Guardando...' : (editingDocument ? 'Guardar Cambios' : 'Añadir Requisito')}
          </button>
        </form>
      </div>
    </div>
  );
}
