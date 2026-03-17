// ============================================================================
// ARCHIVO: TripPhotos.jsx
// DESCRIPCIÓN: Galería de fotos del viaje con subida real a Supabase Storage.
// Permite subir imágenes desde el dispositivo y añadir una descripción.
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { Upload, Trash2, Camera, X, Loader } from 'lucide-react';

export default function TripPhotos({ tripId }) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchPhotos();
  }, [tripId]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trip_photos')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error cargando fotos:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!previewFile) return;
    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = previewFile.name.split('.').pop();
      const filePath = `${user.id}/${tripId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('trip_photos')
        .upload(filePath, previewFile, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('trip_photos')
        .getPublicUrl(filePath);

      // Save record in trip_photos table
      const { error: dbError } = await supabase
        .from('trip_photos')
        .insert([{
          trip_id: tripId,
          url: urlData.publicUrl,
          caption: caption.trim() || null,
          uploaded_by: user.id
        }]);

      if (dbError) throw dbError;

      // Reset and refresh
      setPreviewFile(null);
      setPreviewUrl(null);
      setCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchPhotos();
    } catch (error) {
      alert('Error al subir la foto: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photo) => {
    if (!window.confirm('¿Borrar esta foto?')) return;
    try {
      // Extract storage path from URL
      const url = new URL(photo.url);
      const pathStart = url.pathname.indexOf('/trip_photos/') + '/trip_photos/'.length;
      const storagePath = url.pathname.slice(pathStart);

      await supabase.storage.from('trip_photos').remove([storagePath]);
      await supabase.from('trip_photos').delete().eq('id', photo.id);
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
    } catch (error) {
      alert('Error al borrar la foto: ' + error.message);
    }
  };

  const cancelPreview = () => {
    setPreviewFile(null);
    setPreviewUrl(null);
    setCaption('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="glass-panel" style={{ padding: 'var(--spacing-xl)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Camera size={24} color="var(--color-primary)" /> Nuestros Recuerdos
        </h3>
        <button
          className="btn-primary"
          onClick={() => fileInputRef.current?.click()}
          style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: '0.9rem' }}
        >
          <Upload size={16} /> Subir Foto
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </div>

      {/* Upload Preview Panel */}
      {previewUrl && (
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--border-radius)', padding: 'var(--spacing-md)',
          marginBottom: 'var(--spacing-lg)',
          display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-start'
        }}>
          <img
            src={previewUrl}
            alt="Preview"
            style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Añadir una descripción (opcional)..."
              value={caption}
              onChange={e => setCaption(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                border: '1px solid var(--color-border)', background: 'var(--color-bg)',
                color: 'var(--color-text-main)', marginBottom: '10px', boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-primary"
                onClick={handleUpload}
                disabled={uploading}
                style={{ padding: '8px 20px', fontSize: '0.9rem' }}
              >
                {uploading ? <><Loader size={14} className="spin" /> Subiendo...</> : 'Confirmar'}
              </button>
              <button
                onClick={cancelPreview}
                style={{
                  background: 'transparent', border: '1px solid var(--color-border)',
                  color: 'var(--color-text-muted)', padding: '8px 16px', borderRadius: 'var(--border-radius-full)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem'
                }}
              >
                <X size={14} /> Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--color-text-muted)' }}>
          Cargando fotos...
        </div>
      ) : photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)', color: 'var(--color-text-muted)' }}>
          <Camera size={48} style={{ opacity: 0.3, marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
          <p>Aún no hay fotos. ¡Sube el primer recuerdo!</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 'var(--spacing-sm)'
        }}>
          {photos.map(photo => (
            <div key={photo.id} style={{ position: 'relative', group: 'true' }}>
              <img
                src={photo.url}
                alt={photo.caption || 'Foto del viaje'}
                onClick={() => setLightbox(photo)}
                style={{
                  width: '100%', height: '180px', objectFit: 'cover',
                  borderRadius: 'var(--border-radius)', cursor: 'pointer',
                  transition: 'transform 0.2s',
                  display: 'block'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              />
              {photo.caption && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                  color: 'white', padding: '20px 8px 6px',
                  borderRadius: '0 0 var(--border-radius) var(--border-radius)',
                  fontSize: '0.8rem', pointerEvents: 'none'
                }}>
                  {photo.caption}
                </div>
              )}
              {photo.uploaded_by === user?.id && (
                <button
                  onClick={() => handleDelete(photo)}
                  style={{
                    position: 'absolute', top: '6px', right: '6px',
                    background: 'rgba(231,76,60,0.8)', border: 'none',
                    color: 'white', borderRadius: '50%', width: '28px', height: '28px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', opacity: 0,
                    transition: 'opacity 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.opacity = '1'}
                  onMouseOut={e => e.currentTarget.style.opacity = '0'}
                  title="Borrar foto"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, cursor: 'zoom-out', padding: '20px'
          }}
        >
          <img
            src={lightbox.url}
            alt={lightbox.caption || ''}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }}
            onClick={e => e.stopPropagation()}
          />
          {lightbox.caption && (
            <div style={{
              position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.7)', color: 'white', padding: '8px 20px',
              borderRadius: '20px', fontSize: '0.9rem', maxWidth: '80vw', textAlign: 'center'
            }}>
              {lightbox.caption}
            </div>
          )}
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: '20px', right: '20px',
              background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
              width: '40px', height: '40px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '1.2rem'
            }}
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
