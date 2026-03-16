import { X, AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', isDanger = true }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in" style={{ maxWidth: '400px', textAlign: 'center' }}>
        {/* Botón Cerrar */}
        <button onClick={onClose} style={{ position: 'absolute', top: 'var(--spacing-md)', right: 'var(--spacing-md)', color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <X size={24} />
        </button>

        {/* Icono de Alerta */}
        <div style={{ 
          margin: '0 auto var(--spacing-lg) auto',
          width: '60px', height: '60px', borderRadius: '50%',
          background: isDanger ? 'rgba(231, 76, 60, 0.1)' : 'rgba(52, 152, 219, 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isDanger ? '#e74c3c' : '#3498db'
        }}>
          <AlertTriangle size={32} />
        </div>
        
        <h2 style={{ marginBottom: 'var(--spacing-sm)', fontSize: '1.5rem' }}>{title}</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xl)', lineHeight: '1.5' }}>
          {message}
        </p>
        
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <button 
            onClick={onClose}
            className="btn-secondary"
            style={{ flex: 1, padding: '12px' }}
          >
            {cancelText}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="btn-primary"
            style={{ 
              flex: 1, 
              padding: '12px',
              background: isDanger ? '#e74c3c' : 'var(--color-primary)'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
