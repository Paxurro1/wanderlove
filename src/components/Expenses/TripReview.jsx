// ============================================================================
// ARCHIVO: TripReview.jsx
// DESCRIPCIÓN: Pestaña de "Diario del Viaje". Permite valorar el viaje con
// estrellas y escribir qué repetiríais y qué evitaríais.
// Los datos se guardan en la tabla 'trips' de Supabase.
// ============================================================================

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Star, ThumbsUp, ThumbsDown, Save, Edit3 } from 'lucide-react';

export default function TripReview({ trip, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    rating: trip.rating || 0,
    review_good: trip.review_good || '',
    review_bad: trip.review_bad || ''
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trips')
        .update({
          rating: formData.rating,
          review_good: formData.review_good,
          review_bad: formData.review_bad
        })
        .eq('id', trip.id)
        .select()
        .single();

      if (error) throw error;
      onUpdate(data); // Actualizamos el estado del padre
      setEditing(false);
    } catch (error) {
      alert('Error al guardar el diario: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const StarRating = () => (
    <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--spacing-lg)' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => editing && setFormData({ ...formData, rating: n })}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: editing ? 'pointer' : 'default',
            fontSize: '2.5rem',
            color: n <= formData.rating ? '#f1c40f' : 'var(--color-border)',
            transition: 'all 0.2s',
            padding: '0 2px'
          }}
        >
          ★
        </button>
      ))}
    </div>
  );

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: 'var(--spacing-xl)' }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <div>
          <h3 style={{ margin: 0 }}>Diario del Viaje</h3>
          <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
            Vuestros recuerdos e impresiones del viaje.
          </p>
        </div>
        <button
          onClick={() => editing ? handleSave() : setEditing(true)}
          className="btn-primary"
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
        >
          {loading ? 'Guardando...' : editing
            ? <><Save size={16} /> Guardar</>
            : <><Edit3 size={16} /> Editar</>
          }
        </button>
      </div>

      {/* Valoración con estrellas */}
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '12px', fontSize: '1rem' }}>
          ¿Cuántas estrellas le dais?
        </label>
        <StarRating />
        {!editing && formData.rating === 0 && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Haz clic en "Editar" para valorar este viaje.
          </p>
        )}
      </div>

      {/* Sección positiva / negativa */}
      <div style={{ display: 'flex', gap: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
        {/* Lo que repetiríais */}
        <div style={{
          flex: '1 1 300px',
          background: 'rgba(46, 204, 113, 0.08)',
          padding: 'var(--spacing-lg)',
          borderRadius: 'var(--border-radius)',
          borderLeft: '4px solid var(--color-success)'
        }}>
          <h4 style={{ color: 'var(--color-success)', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ThumbsUp size={18} /> Lo que repetiríamos
          </h4>
          {editing ? (
            <textarea
              value={formData.review_good}
              onChange={e => setFormData({ ...formData, review_good: e.target.value })}
              placeholder="Ej. La cena en el barrio antiguo fue increíble, el paisaje desde el mirador..."
              style={{
                width: '100%', minHeight: '120px', resize: 'vertical',
                padding: '12px', borderRadius: '8px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                color: 'var(--color-text-main)',
                fontSize: '0.95rem', fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          ) : (
            <p style={{ color: 'var(--color-text-main)', whiteSpace: 'pre-wrap', minHeight: '60px' }}>
              {formData.review_good || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Todavía no hay notas positivas. Haz clic en "Editar" para añadir.</span>}
            </p>
          )}
        </div>

        {/* Lo que evitaríais */}
        <div style={{
          flex: '1 1 300px',
          background: 'rgba(231, 76, 60, 0.08)',
          padding: 'var(--spacing-lg)',
          borderRadius: 'var(--border-radius)',
          borderLeft: '4px solid var(--color-error)'
        }}>
          <h4 style={{ color: 'var(--color-error)', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ThumbsDown size={18} /> Lo que evitaríamos
          </h4>
          {editing ? (
            <textarea
              value={formData.review_bad}
              onChange={e => setFormData({ ...formData, review_bad: e.target.value })}
              placeholder="Ej. El hotel estaba lejos del centro, las colas en el museo eran largas..."
              style={{
                width: '100%', minHeight: '120px', resize: 'vertical',
                padding: '12px', borderRadius: '8px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                color: 'var(--color-text-main)',
                fontSize: '0.95rem', fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          ) : (
            <p style={{ color: 'var(--color-text-main)', whiteSpace: 'pre-wrap', minHeight: '60px' }}>
              {formData.review_bad || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Todavía no hay notas negativas. Haz clic en "Editar" para añadir.</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
