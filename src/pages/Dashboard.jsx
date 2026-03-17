import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plane, Calendar, Plus, X, Globe, Users, User } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import NewTripModal from '../components/NewTripModal';
import ConfirmModal from '../components/Common/ConfirmModal';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [trips, setTrips] = useState([]);
  const [upcomingTrip, setUpcomingTrip] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, tripId: null, destination: '' });
  const [pendingFriends, setPendingFriends] = useState(0);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  const [tripParticipants, setTripParticipants] = useState({});

  useEffect(() => {
    fetchTrips();
    fetchNotifications();
  }, [isModalOpen]);

  const fetchNotifications = async () => {
    if (!user) return;
    const { count: fc } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('friend_id', user.id)
      .eq('status', 'pending');
    setPendingFriends(fc || 0);

    // Count pending trip invites for badge on profile icon
    const { count: ic } = await supabase
      .from('trip_participants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending');
    setPendingInvitesCount(ic || 0);
  };

  const fetchTrips = async () => {
    try {
      const now = new Date().toISOString();

      // 1. Fetch trips owned by the user
      const { data: ownedData, error: ownedError } = await supabase
        .from('trips')
        .select('*')
        .eq('owner_id', user.id)
        .order('start_date', { ascending: true });

      if (ownedError) throw ownedError;

      // 2. Fetch trips where user is an accepted participant (not owner)
      const { data: participantData, error: participantError } = await supabase
        .from('trip_participants')
        .select('trip_id, trips(*)')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (participantError) throw participantError;

      // Combine owned + accepted trips, avoiding duplicates
      const ownedIds = new Set((ownedData || []).map(t => t.id));
      const acceptedTrips = (participantData || [])
        .map(p => p.trips)
        .filter(t => t && !ownedIds.has(t.id));

      const allTrips = [...(ownedData || []), ...acceptedTrips]
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

      setTrips(allTrips);

      const next = allTrips.find(t => new Date(t.start_date) > new Date());
      setUpcomingTrip(next);

      // Fetch participants for all trips (accepted) + owner profiles
      if (allTrips.length > 0) {
        const tripIds = allTrips.map(t => t.id);
        const { data: pData } = await supabase
          .from('trip_participants')
          .select('trip_id, user_id, profiles:user_id(id, full_name, email)')
          .in('trip_id', tripIds)
          .eq('status', 'accepted');

        // Fetch owner profiles for trips where owner may not be in trip_participants
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

          // Ensure owner always appears first in each trip
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

  const handleDeleteTrip = (id, destination) => {
    setConfirmModal({ isOpen: true, tripId: id, destination });
  };

  const executeDeleteTrip = async () => {
    const { tripId, destination } = confirmModal;
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
    const timer = setInterval(calculateTimeLeft, 1000 * 60);
    return () => clearInterval(timer);
  }, [upcomingTrip]);

  const now = new Date();
  // Past trips: end_date < now
  const pastTrips = trips.filter(t => new Date(t.end_date) < now);
  // Future trips: start_date > now (excluding the very next one)
  const futureTrips = trips.filter(t => new Date(t.start_date) > now && t !== upcomingTrip);

  const TripCard = ({ trip, isOwner }) => (
    <div className="glass-panel" style={{
      position: 'relative',
      display: 'block',
      overflow: 'hidden',
      transition: 'transform var(--transition-normal)'
    }}>
      <div style={{ position: 'absolute', top: 'var(--spacing-sm)', right: 'var(--spacing-sm)', display: 'flex', gap: '8px', zIndex: 10 }}>
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


      {/* SECCIÓN 1: Próximo Viaje */}
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
          {/* Participantes */}
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
        </section>
      ) : (
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
    </div>
  );
}
