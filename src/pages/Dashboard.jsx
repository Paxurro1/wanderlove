// ============================================================================
// ARCHIVO: Dashboard.jsx
// DESCRIPCIÓN: Pantalla Principal de la aplicación (Home).
// Muestra el temporizador para el viaje más próximo, y una galería (grid)
// con el historial de todos los viajes. También incluye el botón de "Nuevo Viaje".
// ============================================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plane, Calendar, Plus, X, Globe, Users, User } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import NewTripModal from '../components/NewTripModal';
import ConfirmModal from '../components/Common/ConfirmModal';

export default function Dashboard() {
  const { user, profile } = useAuth();
  // --- ESTADOS LOCALES (Hooks de React) ---
  // trips: Almacena el array de todos los viajes obtenidos de la base de datos.
  const [trips, setTrips] = useState([]);
  
  // upcomingTrip: Guarda específicamente el objeto del "próximo" viaje a realizar.
  const [upcomingTrip, setUpcomingTrip] = useState(null);
  
  // timeLeft: String que guarda el texto de la cuenta atrás (ej. "4d 12h").
  const [timeLeft, setTimeLeft] = useState('');
  
  // isModalOpen: Booleano que controla si el formulario de "Nuevo Viaje" está visible (true) o no (false).
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // editingTrip: Si estamos editando un viaje, guardamos aquí el objeto completo.
  const [editingTrip, setEditingTrip] = useState(null);
  
  // loading: Booleano para saber si todavía estamos esperando datos de Supabase.
  const [loading, setLoading] = useState(true);

  // confirmModal: Controla el modal de confirmación de borrado.
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    tripId: null,
    destination: ''
  });

  // Notification counts
  const [pendingFriends, setPendingFriends] = useState(0);
  const [pendingInvites, setPendingInvites] = useState(0);
  // Participants per trip: { [tripId]: [{full_name, email}] }
  const [tripParticipants, setTripParticipants] = useState({});

  // --- EFECTOS (Lifecycle hooks) ---
  // Este useEffect se ejecuta cuando el componente carga por primera vez, 
  // y también cada vez que el "isModalOpen" cambie.
  // ¿Por qué? Porque si cerramos el modal, quizás hemos añadido un viaje nuevo y hay que refrescar la lista.
  useEffect(() => {
    fetchTrips();
    fetchNotifications();
  }, [isModalOpen]);

  const fetchNotifications = async () => {
    if (!user) return;
    // Pending friend requests
    const { count: fc } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('friend_id', user.id)
      .eq('status', 'pending');
    setPendingFriends(fc || 0);

    // Pending trip invites
    const { count: ic } = await supabase
      .from('trip_participants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending');
    setPendingInvites(ic || 0);
  };

  // Función asíncrona para obtener los viajes de Supabase
  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('start_date', { ascending: true });
        
      if (error) throw error;
      
      const sortedTrips = data || [];
      setTrips(sortedTrips);
      
      const next = sortedTrips.find(t => new Date(t.start_date) > new Date());
      setUpcomingTrip(next);

      // Fetch participants for all trips
      if (sortedTrips.length > 0) {
        const tripIds = sortedTrips.map(t => t.id);
        const { data: pData } = await supabase
          .from('trip_participants')
          .select('trip_id, status, profiles:user_id(full_name, email)')
          .in('trip_id', tripIds)
          .eq('status', 'accepted');
        
        if (pData) {
          const byTrip = {};
          pData.forEach(p => {
            if (!byTrip[p.trip_id]) byTrip[p.trip_id] = [];
            byTrip[p.trip_id].push(p.profiles);
          });
          setTripParticipants(byTrip);
        }
      }
    } catch (error) {
      console.error('Error fetching trips:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Función que abre el modal de confirmación en lugar de usar window.confirm.
  const handleDeleteTrip = (id, destination) => {
    setConfirmModal({
      isOpen: true,
      tripId: id,
      destination: destination
    });
  };

  // Función que ejecuta el borrado real tras confirmar en el modal.
  const executeDeleteTrip = async () => {
    const { tripId, destination } = confirmModal;
    if (!tripId) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);
        
      if (error) throw error;
      
      console.log('Viaje borrado con éxito:', destination);
      // Refrescamos la lista local tras borrarlo.
      await fetchTrips();
    } catch (error) {
      console.error('Error al borrar viaje:', error);
      alert('Error al borrar el viaje: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
      setConfirmModal({ isOpen: false, tripId: null, destination: '' });
    }
  };

  // Efecto secundario: Calcular y actualizar la cuenta atrás del viaje en curso.
  useEffect(() => {
    // Si no hay un viaje próximo, no hacemos nada.
    if (!upcomingTrip) return;

    const calculateTimeLeft = () => {
      // Restamos a la fecha del viaje, la fecha actual. Nos da la diferencia en milisegundos.
      const difference = new Date(upcomingTrip.start_date) - new Date();
      if (difference > 0) {
        // Convertimos esos milisegundos a días y a horas mediante matemáticas puras
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / (1000 * 60)) % 60);
        
        let timeStr = '';
        if (days > 0) timeStr += `${days}d `;
        timeStr += `${hours}h ${minutes}m`;
        setTimeLeft(timeStr);
      } else {
        // Si la diferencia es <= 0, significa que el viaje ya ha empezado.
        setTimeLeft('¡Estáis viajando!');
      }
    };

    calculateTimeLeft(); // La calculamos la primera vez inmediatamente
    const timer = setInterval(calculateTimeLeft, 1000 * 60); // Repetimos el cálculo cada minuto
    
    // Función de "limpieza" (cleanup) que se ejecuta al salir del componente, vital para no dejar procesos colgando en memoria
    return () => clearInterval(timer);
  }, [upcomingTrip]); // Se vuelve a ejecutar sólamente si "upcomingTrip" cambia
  // --- RENDERIZADO VISUAL (JSX) ---
  return (
    <div className="container animate-fade-in" style={{ paddingTop: 'var(--spacing-2xl)', paddingBottom: 'var(--spacing-2xl)' }}>
      {/* Cabecera Principal */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: 'var(--spacing-xs)' }}>WanderLove</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem' }}>
            Nuestras aventuras, recuerdos y planes.
          </p>
        </div>
        {/* Botones de Cabecera */}
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <Link to="/adventures-map">
            <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: 'var(--spacing-sm) var(--spacing-md)' }}>
              <Globe size={18} /> Mapa
            </button>
          </Link>

          <Link to="/friends" style={{ position: 'relative' }}>
            <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: 'var(--spacing-sm) var(--spacing-md)' }}>
              <Users size={18} /> Amigos
              {pendingFriends > 0 && (
                <span style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  background: 'var(--color-primary)', color: 'white',
                  borderRadius: '50%', width: '18px', height: '18px',
                  fontSize: '0.7rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>{pendingFriends}</span>
              )}
            </button>
          </Link>

          <Link to="/profile" style={{ position: 'relative' }}>
            <button className="btn-secondary" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '40px', 
              height: '40px', 
              padding: '0',
              borderRadius: '50%',
              background: 'var(--color-bg-panel)',
              border: '1px solid var(--color-border)'
            }} title="Mi Perfil">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
              ) : (
                <User size={20} />
              )}
            </button>
            {pendingInvites > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px',
                background: '#e74c3c', color: 'white',
                borderRadius: '50%', width: '18px', height: '18px',
                fontSize: '0.7rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none'
              }}>{pendingInvites}</span>
            )}
          </Link>
          
          {/* Al hacer clic en este botón, isModalOpen pasa a 'true' y se muestra el pop-up inferior */}
          <button className="btn-primary" onClick={() => {
            setEditingTrip(null); // Nos aseguramos de que no estamos editando si pulsamos "Nuevo"
            setIsModalOpen(true);
          }}>
            <Plus size={20} /> Nuevo Viaje
          </button>
        </div>
      </header>

      {/* Hero: Sección superior para la Cuenta Atrás */}
      {/* {upcomingTrip ? (...) : (...)} es un condicional ternario en React: si hay viaje haz lo primero, sino lo segundo */}
      {upcomingTrip ? (
        <section className="glass-panel" style={{ 
          padding: 'var(--spacing-2xl)', 
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 'var(--spacing-2xl)',
          color: 'white',
          background: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.6)), url(${upcomingTrip.cover_image}) center/cover no-repeat`
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 500, opacity: 0.9 }}>Próximo destino</h2>
          <div style={{ fontSize: '4.5rem', fontWeight: 'bold', margin: 'var(--spacing-sm) 0', textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            {upcomingTrip.destination}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--color-secondary)' }}>
            {timeLeft}
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: 'var(--spacing-lg)' }}>
            <Link to={`/trip/${upcomingTrip.id}`}>
              <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.3)' }}>
                Ver detalles <Plane size={18} />
              </button>
            </Link>
            <button 
              className="btn-primary" 
              onClick={() => {
                setEditingTrip(upcomingTrip);
                setIsModalOpen(true);
              }}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: 'var(--spacing-sm) var(--spacing-md)' }}
            >
              Editar
            </button>
            {upcomingTrip.owner_id === user?.id && (
              <button 
                className="btn-primary" 
                onClick={() => handleDeleteTrip(upcomingTrip.id, upcomingTrip.destination)}
                style={{ background: 'rgba(231, 76, 60, 0.4)', border: 'none', padding: 'var(--spacing-sm) var(--spacing-md)' }}
              >
                Borrar
              </button>
            )}
          </div>
        </section>
      ) : (
        // Pantalla vacía (Empty State) si no hay viajes planeados.
        <section className="glass-panel" style={{ padding: 'var(--spacing-xl)', textAlign: 'center', marginBottom: 'var(--spacing-2xl)' }}>
          <h2>No hay viajes planeados 😢</h2>
          <p>¿A dónde vamos la próxima vez?</p>
        </section>
      )}

      {/* Sección Inferior: Diario/Galería de Viajes Pasados e Históricos */}
      <section>
        <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.8rem' }}>Diario de Viajes</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-lg)' }}>
          
          {/* Aquí recorremos (map) el array de trips. 
              Excluimos (filter) el viaje actual/futuro, para solo mostrar los pasados u otros secundarios. */}
          {trips.filter(t => t !== upcomingTrip).map(trip => (
            <div key={trip.id} className="glass-panel" style={{ 
              position: 'relative',
              display: 'block', 
              overflow: 'hidden',
              transition: 'transform var(--transition-normal)'
            }}>
              {/* Edit for all, Delete only for owner */}
              <div style={{ position: 'absolute', top: 'var(--spacing-sm)', right: 'var(--spacing-sm)', display: 'flex', gap: '8px', zIndex: 10 }}>
                <button 
                  onClick={() => {
                    setEditingTrip(trip);
                    setIsModalOpen(true);
                  }}
                  style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)', border: 'none', padding: '6px', borderRadius: '50%', color: 'white', cursor: 'pointer' }}
                  title="Editar"
                >
                  <Calendar size={14} />
                </button>
                {trip.owner_id === user?.id && (
                  <button 
                    onClick={() => handleDeleteTrip(trip.id, trip.destination)}
                    style={{ background: 'rgba(231, 76, 60, 0.3)', backdropFilter: 'blur(5px)', border: 'none', padding: '6px', borderRadius: '50%', color: 'white', cursor: 'pointer' }}
                    title="Borrar"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <Link to={`/trip/${trip.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ height: '160px', background: `url(${trip.cover_image}) center/cover` }}></div>
                <div style={{ padding: 'var(--spacing-md)' }}>
                  <h4 style={{ fontSize: '1.3rem', marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-main)' }}>{trip.destination}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    <Calendar size={14} />
                    <span>{new Date(trip.start_date).toLocaleDateString()}</span>
                  </div>
                  {trip.rating && (
                    <div style={{ marginTop: 'var(--spacing-sm)', color: '#f1c40f' }}>
                      {'★'.repeat(trip.rating)}
                      {'☆'.repeat(5 - trip.rating)}
                    </div>
                  )}
                  {/* Participant tags */}
                  {tripParticipants[trip.id]?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                      <Users size={12} style={{ color: 'var(--color-text-muted)', marginTop: '2px' }} />
                      {tripParticipants[trip.id].map((p, i) => (
                        <span key={i} style={{
                          fontSize: '0.75rem', padding: '2px 8px',
                          background: 'var(--color-surface)', borderRadius: '20px',
                          color: 'var(--color-text-muted)', border: '1px solid var(--color-border)'
                        }}>
                          {p?.full_name || p?.email?.split('@')[0]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            </div>
          ))}
          {trips.length === 0 && !loading && (
             <div style={{ gridColumn: '1 / -1', padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
               Aún no hay viajes pasados. ¡Empieza a planear!
             </div>
          )}
        </div>
      </section>
      
      <NewTripModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        editingTrip={editingTrip}
      />

      {/* Modal de Confirmación de Borrado */}
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={executeDeleteTrip}
        title="¿Borrar este viaje?"
        message={`Estás a punto de eliminar vuestro viaje a ${confirmModal.destination}. Se perderán todos los planes, gastos y recuerdos asociados. Esta acción no se puede deshacer.`}
        confirmText="Sí, borrar viaje"
        cancelText="No, mantenerlo"
      />
    </div>
  );
}
