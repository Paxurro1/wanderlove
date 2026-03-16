// ============================================================================
// ARCHIVO: NewTripModal.jsx
// DESCRIPCIÓN: Modal para la creación de un nuevo viaje desde el Dashboard.
// Permite introducir destino, fechas y una imagen de portada.
// ============================================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { X, UserPlus, Check } from 'lucide-react';

export default function NewTripModal({ isOpen, onClose, editingTrip }) {
  const navigate = useNavigate(); // Hook para redirigir al usuario tras crear el viaje.
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [showFriendsList, setShowFriendsList] = useState(false);
  
  // -- ESTADO DEL FORMULARIO --
  const [formData, setFormData] = useState({
    destination: '',
    start_date: '',
    end_date: '',
    cover_image: ''
  });

  // Función auxiliar para convertir formato ISO a datetime-local (YYYY-MM-DDTHH:mm)
  const formatForInput = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const tzOffset = date.getTimezoneOffset() * 60000; // offset en ms
    const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  useEffect(() => {
    if (isOpen) {
      if (editingTrip) {
        setFormData({
          destination: editingTrip.destination || '',
          start_date: formatForInput(editingTrip.start_date),
          end_date: formatForInput(editingTrip.end_date),
          cover_image: editingTrip.cover_image || ''
        });
        fetchParticipants(editingTrip.id);
      } else {
        setFormData({ destination: '', start_date: '', end_date: '', cover_image: '' });
        setSelectedFriends([]);
      }
      fetchFriends();
    }
  }, [editingTrip, isOpen]);

  const fetchFriends = async () => {
    try {
      const { data: data1 } = await supabase
        .from('friendships')
        .select('profiles:friend_id(id, full_name, email)')
        .eq('user_id', user.id)
        .eq('status', 'accepted');
      
      const { data: data2 } = await supabase
        .from('friendships')
        .select('profiles:user_id(id, full_name, email)')
        .eq('friend_id', user.id)
        .eq('status', 'accepted');

      const allFriends = [
        ...(data1?.map(f => f.profiles) || []),
        ...(data2?.map(f => f.profiles) || [])
      ];
      setFriends(allFriends);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchParticipants = async (tripId) => {
    try {
      const { data } = await supabase
        .from('trip_participants')
        .select('user_id')
        .eq('trip_id', tripId);
      if (data) setSelectedFriends(data.map(p => p.user_id));
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const toggleFriend = (friendId) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId) 
        : [...prev, friendId]
    );
  };

  // Si el modal está cerrado, no renderizamos nada.
  if (!isOpen) return null;

  // Manejador del envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tripData = {
        destination: formData.destination,
        start_date: formData.start_date,
        end_date: formData.end_date,
        cover_image: formData.cover_image || 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=1000',
        status: new Date(formData.start_date) > new Date() ? 'upcoming' : 'past',
        owner_id: user.id
      };

      let result;

      if (editingTrip) {
        // MODO EDICIÓN: Actualizamos el registro existente.
        result = await supabase
          .from('trips')
          .update(tripData)
          .eq('id', editingTrip.id)
          .select();
      } else {
        // MODO CREACIÓN: Insertamos un nuevo registro.
        result = await supabase
          .from('trips')
          .insert([tripData])
          .select();
      }

      if (result.error) throw result.error;
      const tripId = result.data[0].id;
      
      if (tripId) {
        // Update participants
        // First delete existing pending/accepted participants to simplify (keep owner out)
        await supabase.from('trip_participants').delete().eq('trip_id', tripId);
        
        if (selectedFriends.length > 0) {
          const participantsData = selectedFriends.map(friendId => ({
            trip_id: tripId,
            user_id: friendId,
            status: 'pending' // They must accept
          }));
          await supabase.from('trip_participants').insert(participantsData);
        }
      }

      // -- GEOLOCALIZACIÓN AUTOMÁTICA DEL DESTINO --
      if (!editingTrip) {
        try {
          // Buscamos las coordenadas del destino
          const geoResp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.destination)}&limit=1`);
          const geoData = await geoResp.json();
          
          if (geoData && geoData.length > 0) {
            const mainPlace = {
              trip_id: tripId,
              name: formData.destination,
              lat: parseFloat(geoData[0].lat),
              lng: parseFloat(geoData[0].lon),
              visited: tripData.status === 'past', // Si el viaje es pasado, lo marcamos como visitado por defecto
              reason: 'Destino del viaje',
              day_index: 1
            };
            
            await supabase.from('places').insert([mainPlace]);
          }
        } catch (geoError) {
          console.error('Error al geolocalizar destino:', geoError);
          // No bloqueamos la creación del viaje si falla el geocoding
        }
      }
      
      // Cerramos el modal tras el éxito.
      onClose();
      
      // Si era un viaje nuevo, redirigimos. Si era edición, nos quedamos donde estamos (el Dashboard refrescará).
      if (!editingTrip && result.data && result.data[0]) {
        navigate(`/trip/${result.data[0].id}`);
      }
    } catch (error) {
      alert('Error al procesar el viaje: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Fondo oscuro translúcido
    <div className="modal-overlay">
      {/* Contenedor principal del Modal */}
      <div className="modal-content animate-fade-in">
        <button onClick={onClose} style={{ position: 'absolute', top: 'var(--spacing-md)', right: 'var(--spacing-md)', color: 'var(--color-text-muted)', border: 'none', background: 'none', cursor: 'pointer' }}>
          <X size={24} />
        </button>
        
        <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>
          {editingTrip ? 'Editar Viaje' : 'Planear Nuevo Viaje'}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {/* Campo Destino */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Destino</label>
            <input 
              type="text" 
              required
              value={formData.destination}
              onChange={e => setFormData({...formData, destination: e.target.value})}
              placeholder="Ej. Roma, Italia"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
            />
          </div>
          
          {/* Campos de Fechas (Ida y Vuelta) */}
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Ida (Fecha y Hora)</label>
              <input 
                type="datetime-local" 
                required
                value={formData.start_date}
                onChange={e => setFormData({...formData, start_date: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Vuelta (Fecha y Hora)</label>
              <input 
                type="datetime-local" 
                required
                value={formData.end_date}
                onChange={e => setFormData({...formData, end_date: e.target.value})}
                min={formData.start_date} // No se puede volver antes de ir.
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
              />
            </div>
          </div>

          {/* Campo URL Imagen */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>URL Imagen de Portada (Opcional)</label>
            <input 
              type="url" 
              value={formData.cover_image}
              onChange={e => setFormData({...formData, cover_image: e.target.value})}
              placeholder="https://images.unsplash..."
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}
            />
          </div>

          {/* Gestión de Participantes */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Invitar Amigos 
              <button 
                type="button" 
                onClick={() => setShowFriendsList(!showFriendsList)}
                style={{ background: 'none', border: 'none', color: '#764ba2', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
              >
                {showFriendsList ? 'Ocultar' : 'Ver Amigos'}
              </button>
            </label>
            
            {showFriendsList && (
              <div style={{ 
                maxHeight: '150px', 
                overflowY: 'auto', 
                background: 'var(--color-bg)', 
                borderRadius: '8px', 
                padding: '8px',
                border: '1px solid var(--color-border)',
                marginBottom: '10px'
              }}>
                {friends.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', margin: '10px 0' }}>No tienes amigos agregados</p>
                ) : (
                  friends.map(friend => (
                    <div 
                      key={friend.id} 
                      onClick={() => toggleFriend(friend.id)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '8px',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        backgroundColor: selectedFriends.includes(friend.id) ? 'rgba(118, 75, 162, 0.1)' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                    >
                      <span style={{ fontSize: '14px', color: 'var(--color-text-main)' }}>{friend.full_name}</span>
                      {selectedFriends.includes(friend.id) ? <Check size={16} color="#48bb78" /> : <UserPlus size={16} color="#ced4da" />}
                    </div>
                  ))
                )}
              </div>
            )}
            {selectedFriends.length > 0 && !showFriendsList && (
              <p style={{ fontSize: '12px', color: '#764ba2', marginTop: '4px', fontWeight: 500 }}>
                {selectedFriends.length} amigo(s) seleccionado(s)
              </p>
            )}
          </div>

          {/* Botón de envío */}
          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 'var(--spacing-md)' }}>
            {loading ? 'Sincronizando...' : (editingTrip ? 'Guardar Cambios' : 'Crear Viaje')}
          </button>
        </form>
      </div>
    </div>
  );
}
