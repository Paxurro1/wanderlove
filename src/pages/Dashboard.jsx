// ============================================================================
// ARCHIVO: Dashboard.jsx
// DESCRIPCIÓN: Panel principal de la aplicación.
// Muestra un resumen de los viajes actuales, próximos y pasados.
// Permite buscar viajes públicos de otros usuarios.
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plane, Calendar, Plus, X, Globe, Users, User, Lock, Search } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import NewTripModal from '../components/NewTripModal';
import ConfirmModal from '../components/Common/ConfirmModal';

export default function Dashboard() {
  // Datos del usuario y perfil desde el contexto de autenticación
  const { user, profile } = useAuth();
  
  // Estados para gestionar las listas de viajes
  const [trips, setTrips] = useState([]);           // Todos los viajes vinculados al usuario
  const [upcomingTrip, setUpcomingTrip] = useState(null); // El próximo viaje más cercano
  const [ongoingTrips, setOngoingTrips] = useState([]);   // Viajes que están ocurriendo ahora mismo
  const [timeLeft, setTimeLeft] = useState('');     // Texto de la cuenta atrás para el próximo viaje
  
  // Estados de control de la interfaz (modales, carga, confirmaciones)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, tripId: null, destination: '' });
  
  // Notificaciones y participantes
  const [pendingFriends, setPendingFriends] = useState(0);       // Solicitudes de amistad pendientes
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0); // Invitaciones a viajes pendientes
  const [tripParticipants, setTripParticipants] = useState({});   // Mapa de participantes por ID de viaje

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Efecto inicial: Cargar viajes y notificaciones al montar el componente
  // También se dispara cuando se cierra el modal de creación para refrescar la lista.
  useEffect(() => {
    fetchTrips();
    fetchNotifications();
  }, [isModalOpen]);

  /**
   * Obtiene el recuento de solicitudes de amistad e invitaciones pendientes
   * para mostrar insignias (badges) en los botones superiores.
   */
  const fetchNotifications = async () => {
    if (!user) return;
    const { count: fc } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('friend_id', user.id)
      .eq('status', 'pending');
    setPendingFriends(fc || 0);

    const { count: ic } = await supabase
      .from('trip_participants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending');
    setPendingInvitesCount(ic || 0);
  };

  /**
   * Proceso de carga de viajes complejo:
   * 1. Obtiene viajes donde el usuario es dueño.
   * 2. Obtiene viajes donde el usuario es participante aceptado.
   * 3. Combina y ordena por fecha de inicio.
   * 4. Identifica viajes "En Curso" y el "Próximo" para el Hero.
   * 5. Carga perfiles de todos los participantes para mostrar sus nombres en las tarjetas.
   */
  const fetchTrips = async () => {
    try {
      const now = new Date().toISOString();

      // Consultamos viajes propiedad del usuario
      const { data: ownedData, error: ownedError } = await supabase
        .from('trips')
        .select('*')
        .eq('owner_id', user.id)
        .order('start_date', { ascending: true });

      if (ownedError) throw ownedError;

      // Consultamos viajes donde el usuario ha aceptado una invitación
      const { data: participantData, error: participantError } = await supabase
        .from('trip_participants')
        .select('trip_id, trips(*)')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (participantError) throw participantError;

      const ownedIds = new Set((ownedData || []).map(t => t.id));
      const acceptedTrips = (participantData || [])
        .map(p => p.trips)
        .filter(t => t && !ownedIds.has(t.id));

      // Mezclamos y ordenamos cronológicamente
      const allTrips = [...(ownedData || []), ...acceptedTrips]
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

      setTrips(allTrips);

      const nowDate = new Date();
      // Filtramos viajes "En Curso": Hoy está entre fecha inicio y fin
      const ongoing = allTrips.filter(t =>
        new Date(t.start_date) <= nowDate && new Date(t.end_date) >= nowDate
      );
      setOngoingTrips(ongoing);

      // Siguiente viaje: El primero en el futuro que no esté ocurriendo ya
      const next = allTrips.find(t => new Date(t.start_date) > nowDate);
      setUpcomingTrip(next);

      // Si hay viajes, buscamos quién más participa en cada uno para las tarjetas
      if (allTrips.length > 0) {
        const tripIds = allTrips.map(t => t.id);
        const { data: pData } = await supabase
          .from('trip_participants')
          .select('trip_id, user_id, profiles:user_id(id, full_name, email)')
          .in('trip_id', tripIds)
          .eq('status', 'accepted');

        const ownerIds = [...new Set(allTrips.map(t => t.owner_id))];
        const { data: ownerProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', ownerIds);

        const ownerMap = {};
        (ownerProfiles || []).forEach(p => { ownerMap[p.id] = p; });

        if (pData) {
          const byTrip = {};
          pData.forEach(p => {
            if (!byTrip[p.trip_id]) byTrip[p.trip_id] = [];
            byTrip[p.trip_id].push(p.profiles);
          });

          // Aseguramos que el dueño también aparezca en la lista de participantes si no está
          allTrips.forEach(trip => {
            if (!byTrip[trip.id]) byTrip[trip.id] = [];
            const alreadyHasOwner = byTrip[trip.id].some(p => p?.id === trip.owner_id);
            if (!alreadyHasOwner && ownerMap[trip.owner_id]) {
              byTrip[trip.id].unshift(ownerMap[trip.owner_id]);
            }
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

  /**
   * Lógica de búsqueda de viajes públicos:
   * 1. Busca coincidencias por nombre de destino.
   * 2. Busca paradas (places/aventuras) que coincidan y obtiene sus viajes relacionados.
   * 3. Filtra solo aquellos que son públicos (`is_public: true`).
   * 4. Deduplica resultados y actualiza el estado.
   */
  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      // 1. Buscamos por destino (ej: "Londres")
      const { data: byDest } = await supabase
        .from('trips')
        .select('*')
        .eq('is_public', true)
        .neq('owner_id', user.id)
        .ilike('destination', `%${q}%`);

      // 2. Buscamos por paradas intermedias (ej: "Big Ben")
      const { data: byPlaces } = await supabase
        .from('places')
        .select('trip_id')
        .ilike('name', `%${q}%`);

      const placesTripIds = [...new Set((byPlaces || []).map(p => p.trip_id))];

      let byStops = [];
      if (placesTripIds.length > 0) {
        const { data: stopTrips } = await supabase
          .from('trips')
          .select('*')
          .eq('is_public', true)
          .neq('owner_id', user.id)
          .in('id', placesTripIds);
        byStops = stopTrips || [];
      }

      // Combinar ambos resultados y eliminar duplicados por ID
      const seen = new Set();
      const merged = [...(byDest || []), ...byStops].filter(t => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });

      setSearchResults(merged);
    } catch (err) {
      console.error('Error buscando viajes:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };
  // ────────────────────────────────────────────────────────────────────────────

  // Muestra el modal de confirmación antes de borrar
  const handleDeleteTrip = (id, destination) => {
    setConfirmModal({ isOpen: true, tripId: id, destination });
  };

  /**
   * Ejecuta el borrado real en la base de datos de Supabase.
   * Gracias al CASCADE DELETE configurado en Postgres, se borrarán automáticamente
   * todos los gastos, alojamientos y documentos vinculados.
   */
  const executeDeleteTrip = async () => {
    const { tripId } = confirmModal;
    if (!tripId) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('trips').delete().eq('id', tripId);
      if (error) throw error;
      await fetchTrips();
    } catch (error) {
      alert('Error al borrar el viaje: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
      setConfirmModal({ isOpen: false, tripId: null, destination: '' });
    }
  };

  // Efecto para la cuenta atrás del próximo viaje.
  // Se actualiza cada minuto.
  useEffect(() => {
    if (!upcomingTrip) return;
    const calculateTimeLeft = () => {
      const difference = new Date(upcomingTrip.start_date) - new Date();
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / (1000 * 60)) % 60);
        let timeStr = '';
        if (days > 0) timeStr += `${days}d `;
        timeStr += `${hours}h ${minutes}m`;
        setTimeLeft(timeStr);
      } else {
        setTimeLeft('¡Estáis viajando!');
      }
    };
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000 * 60); // Actualizar cada minuto
    return () => clearInterval(timer);
  }, [upcomingTrip]);

  // Lógica de filtrado de viajes para las distintas secciones de la UI
  const now = new Date();
  const pastTrips = trips
    .filter(t => new Date(t.end_date) < now)
    .sort((a, b) => new Date(b.end_date) - new Date(a.end_date)); // Los más recientes primero
  const futureTrips = trips.filter(t => new Date(t.start_date) > now && t !== upcomingTrip);

  /**
   * Componente interno: Tarjeta de Viaje (TripCard)
   * Renderiza la información de un viaje, incluyendo su estado (público/privado),
   * imagen de portada y participantes.
   */
  const TripCard = ({ trip, isOwner, readOnly = false }) => {
    const isOngoing = new Date(trip.start_date) <= now && new Date(trip.end_date) >= now;
    return (
      <div className="glass-panel" style={{
        position: 'relative',
        display: 'block',
        overflow: 'hidden',
        transition: 'transform var(--transition-normal)',
        border: isOngoing ? '2px solid rgba(118,75,162,0.6)' : undefined
      }}>
        {/* Badges top-right */}
        <div style={{ position: 'absolute', top: 'var(--spacing-sm)', right: 'var(--spacing-sm)', display: 'flex', gap: '8px', zIndex: 10 }}>
          {/* Public/private badge */}
          <span style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: trip.is_public ? 'rgba(118,75,162,0.7)' : 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(5px)',
            color: 'white', fontSize: '0.7rem', fontWeight: 600,
            padding: '3px 8px', borderRadius: '20px'
          }}>
            {trip.is_public ? <Globe size={10} /> : <Lock size={10} />}
            {trip.is_public ? 'Público' : 'Privado'}
          </span>

          {!readOnly && (
            <>
              <button
                onClick={() => { setEditingTrip(trip); setIsModalOpen(true); }}
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
            </>
          )}
        </div>

        <Link to={`/trip/${trip.id}`} style={{ textDecoration: 'none' }}>
          <div style={{ height: '160px', background: `url(${trip.cover_image}) center/cover` }}>
            {isOngoing && (
              <div style={{
                position: 'absolute', top: '8px', left: '8px',
                background: 'linear-gradient(135deg,#764ba2,#667eea)',
                color: 'white', fontSize: '0.7rem', fontWeight: 700,
                padding: '3px 10px', borderRadius: '20px',
                display: 'flex', alignItems: 'center', gap: '5px',
                boxShadow: '0 2px 8px rgba(118,75,162,0.5)',
                animation: 'pulse 2s infinite'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7fff7f', display: 'inline-block' }} />
                ¡En ruta!
              </div>
            )}
          </div>
          <div style={{ padding: 'var(--spacing-md)' }}>
            <h4 style={{ fontSize: '1.3rem', marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-main)' }}>{trip.destination}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              <Calendar size={14} />
              <span>{new Date(trip.start_date).toLocaleDateString()} — {new Date(trip.end_date).toLocaleDateString()}</span>
            </div>
            {trip.rating && (
              <div style={{ marginTop: 'var(--spacing-sm)', color: '#f1c40f' }}>
                {'★'.repeat(trip.rating)}{'☆'.repeat(5 - trip.rating)}
              </div>
            )}
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
    );
  };

  // ── SEARCH RESULT CARD (read-only, no edit controls) ────────────────────────
  const SearchResultCard = ({ trip }) => (
    <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', transition: 'transform var(--transition-normal)' }}>
      <div style={{ position: 'absolute', top: 'var(--spacing-sm)', right: 'var(--spacing-sm)', zIndex: 10 }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          background: 'rgba(118,75,162,0.7)', backdropFilter: 'blur(5px)',
          color: 'white', fontSize: '0.7rem', fontWeight: 600,
          padding: '3px 8px', borderRadius: '20px'
        }}>
          <Globe size={10} /> Público
        </span>
      </div>
      <Link to={`/trip/${trip.id}`} style={{ textDecoration: 'none' }}>
        <div style={{ height: '140px', background: `url(${trip.cover_image}) center/cover` }} />
        <div style={{ padding: 'var(--spacing-md)' }}>
          <h4 style={{ fontSize: '1.2rem', marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-main)' }}>{trip.destination}</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            <Calendar size={13} />
            <span>{new Date(trip.start_date).toLocaleDateString()} — {new Date(trip.end_date).toLocaleDateString()}</span>
          </div>
        </div>
      </Link>
    </div>
  );

  return (
    <div className="container animate-fade-in" style={{ paddingTop: 'var(--spacing-2xl)', paddingBottom: 'var(--spacing-2xl)' }}>
      {/* Cabecera Principal */}
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-lg)', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <div style={{ flex: '1 1 250px' }}>
          <h1 className="text-gradient" style={{ fontSize: 'clamp(2.5rem, 8vw, 3.5rem)', margin: '0 0 var(--spacing-xs) 0', lineHeight: 1.1 }}>WanderLove</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'clamp(1rem, 4vw, 1.2rem)' }}>
            Nuestras aventuras, recuerdos y planes.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', flex: '1 1 auto' }}>
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
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '40px', height: '40px', padding: '0',
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
            {pendingInvitesCount > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px',
                background: '#e74c3c', color: 'white',
                borderRadius: '50%', width: '18px', height: '18px',
                fontSize: '0.7rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none'
              }}>{pendingInvitesCount}</span>
            )}
          </Link>

          <button className="btn-primary" onClick={() => {
            setEditingTrip(null);
            setIsModalOpen(true);
          }}>
            <Plus size={20} /> Nuevo Viaje
          </button>
        </div>
      </header>

      {/* ── BUSCADOR DE VIAJES PÚBLICOS ── */}
      <section className="glass-panel" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-2xl)' }}>
        <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={18} style={{ color: 'var(--color-primary)' }} />
          Descubrir Viajes
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Buscar por país, ciudad o región... ej: Manchester, Reino Unido"
            style={{
              flex: '1 1 260px',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text-main)',
              fontSize: '0.95rem'
            }}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="btn-primary"
            style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Search size={16} />
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>
          {hasSearched && (
            <button
              onClick={clearSearch}
              className="btn-secondary"
              style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <X size={14} /> Limpiar
            </button>
          )}
        </div>

        {hasSearched && (
          <div style={{ marginTop: 'var(--spacing-lg)' }}>
            {searchResults.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--spacing-md)' }}>
                No se encontraron viajes públicos para <strong>"{searchQuery}"</strong>
              </p>
            ) : (
              <>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 'var(--spacing-md)' }}>
                  {searchResults.length} viaje{searchResults.length !== 1 ? 's' : ''} encontrado{searchResults.length !== 1 ? 's' : ''} para <strong>"{searchQuery}"</strong>
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-lg)' }}>
                  {searchResults.map(trip => <SearchResultCard key={trip.id} trip={trip} />)}
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* ── SECCIÓN: VIAJE EN CURSO (HERO prominente) ── */}
      {ongoingTrips.length > 0 && (
        <section style={{ marginBottom: 'var(--spacing-2xl)' }}>
          <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.8rem' }}>🌍 Viaje Actual</h3>
          {ongoingTrips.map(trip => (
            <div key={trip.id} className="glass-panel" style={{
              padding: 'var(--spacing-2xl)',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              color: 'white',
              background: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.6)), url(${trip.cover_image}) center/cover no-repeat`,
              border: '2px solid rgba(118,75,162,0.7)'
            }}>
              {/* Animated ¡EN RUTA! banner */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'linear-gradient(135deg,#764ba2,#667eea)',
                color: 'white', fontWeight: 800, fontSize: '0.9rem',
                padding: '6px 18px', borderRadius: '30px',
                marginBottom: 'var(--spacing-md)',
                boxShadow: '0 4px 15px rgba(118,75,162,0.5)',
                letterSpacing: '1px'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7fff7f', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                ¡VIAJE EN CURSO!
              </div>
              <div style={{ fontSize: '4rem', fontWeight: 'bold', margin: 'var(--spacing-sm) 0', textShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
                {trip.destination}
              </div>
              <div style={{ fontSize: '1.1rem', opacity: 0.85, marginBottom: 'var(--spacing-md)' }}>
                {new Date(trip.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })} — {new Date(trip.end_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
              {tripParticipants[trip.id]?.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: 'var(--spacing-lg)' }}>
                  <Users size={16} style={{ marginTop: '3px' }} />
                  {tripParticipants[trip.id].map((p, i) => (
                    <span key={i} style={{
                      background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)',
                      padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 500
                    }}>
                      {p?.full_name || p?.email?.split('@')[0]}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <Link to={`/trip/${trip.id}`}>
                  <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.4)' }}>
                    Ver detalles <Plane size={18} />
                  </button>
                </Link>
                <button
                  className="btn-primary"
                  onClick={() => { setEditingTrip(trip); setIsModalOpen(true); }}
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: 'var(--spacing-sm) var(--spacing-md)' }}
                >
                  Editar
                </button>
                {trip.owner_id === user?.id && (
                  <button
                    className="btn-primary"
                    onClick={() => handleDeleteTrip(trip.id, trip.destination)}
                    style={{ background: 'rgba(231,76,60,0.4)', border: 'none', padding: 'var(--spacing-sm) var(--spacing-md)' }}
                  >
                    Borrar
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* SECCIÓN 1: Próximo Viaje */}
      {upcomingTrip ? (
        <section style={{ marginBottom: 'var(--spacing-2xl)' }}>
          <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.8rem' }}>🚀 Próximo Destino</h3>
          <div className="glass-panel" style={{
            padding: 'var(--spacing-2xl)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            color: 'white',
            background: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.6)), url(${upcomingTrip.cover_image}) center/cover no-repeat`
          }}>
            <div style={{ fontSize: '4.5rem', fontWeight: 'bold', margin: 'var(--spacing-sm) 0', textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
              {upcomingTrip.destination}
            </div>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--color-secondary)' }}>
            {timeLeft}
          </div>
          {tripParticipants[upcomingTrip.id]?.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px', marginTop: 'var(--spacing-md)' }}>
              <Users size={16} style={{ marginTop: '3px' }} />
              {tripParticipants[upcomingTrip.id].map((p, i) => (
                <span key={i} style={{
                  background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)',
                  padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 500
                }}>
                  {p?.full_name || p?.email?.split('@')[0]}
                </span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: 'var(--spacing-lg)' }}>
            <Link to={`/trip/${upcomingTrip.id}`}>
              <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.3)' }}>
                Ver detalles <Plane size={18} />
              </button>
            </Link>
            <button
              className="btn-primary"
              onClick={() => { setEditingTrip(upcomingTrip); setIsModalOpen(true); }}
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
          </div>
        </section>
      ) : ongoingTrips.length === 0 && (
        <section className="glass-panel" style={{ padding: 'var(--spacing-xl)', textAlign: 'center', marginBottom: 'var(--spacing-2xl)' }}>
          <h2>No hay viajes planeados 😢</h2>
          <p>¿A dónde vamos la próxima vez?</p>
        </section>
      )}

      {/* SECCIÓN 2: Próximos Viajes (futuros excepto el inmediato) */}
      {futureTrips.length > 0 && (
        <section style={{ marginBottom: 'var(--spacing-2xl)' }}>
          <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.8rem' }}>✈️ Próximas Aventuras</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-lg)' }}>
            {futureTrips.map(trip => <TripCard key={trip.id} trip={trip} />)}
          </div>
        </section>
      )}

      {/* SECCIÓN 3: Viajes Anteriores */}
      <section>
        <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.8rem' }}>📖 Diario de Viajes</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-lg)' }}>
          {pastTrips.map(trip => <TripCard key={trip.id} trip={trip} />)}
          {pastTrips.length === 0 && !loading && (
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={executeDeleteTrip}
        title="¿Borrar este viaje?"
        message={`Estás a punto de eliminar vuestro viaje a ${confirmModal.destination}. Se perderán todos los planes, gastos y recuerdos asociados. Esta acción no se puede deshacer.`}
        confirmText="Sí, borrar viaje"
        cancelText="No, mantenerlo"
      />

      {/* Copyright footer */}
      <footer style={{
        marginTop: 'var(--spacing-2xl)',
        paddingTop: 'var(--spacing-lg)',
        borderTop: '1px solid var(--color-border)',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
        fontSize: '0.8rem'
      }}>
        <p style={{ margin: 0 }}>
          © {new Date().getFullYear()} WanderLove — Álvaro Santos Martín-Nieto. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
