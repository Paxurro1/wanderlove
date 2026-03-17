// ============================================================================
// ARCHIVO: TripDetails.jsx
// DESCRIPCIÓN: Vista en detalle de un Viaje. Es el 'contenedor padre' o 
// 'hub' desde el cual gestionas Itinerario, Mapa, Gastos, Docs, etc.
// En vez de tener 5 páginas distintas, usamos "Pestañas" (Tabs) locales.
// ============================================================================

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { ArrowLeft, Map as MapIcon, DollarSign, Camera, Star, CalendarDays, Pencil, Trash2, X, Users, LogOut } from 'lucide-react';
import NewPlaceModal from '../components/Map/NewPlaceModal';
import TripMap from '../components/Map/TripMap';
import TripExpenses from '../components/Expenses/TripExpenses';
import TripDocuments from '../components/Expenses/TripDocuments';
import TripTransports from '../components/Expenses/TripTransports';
import TripAccommodations from '../components/Expenses/TripAccommodations';
import TripPhotos from '../components/Expenses/TripPhotos';
import CityRecommendations from '../components/Recommendations/CityRecommendations';
import ConfirmModal from '../components/Common/ConfirmModal';
import TripReview from '../components/Expenses/TripReview';


// Constante estática con todas las pestañas posibles y sus iconos correspondientes.
const TABS = [
  { id: 'documents', label: 'Docs', icon: CalendarDays }, 
  { id: 'itinerary', label: 'Itinerario', icon: CalendarDays },
  { id: 'transports', label: 'Viaje y Logística', icon: MapIcon }, 
  { id: 'accommodations', label: 'Alojamientos', icon: CalendarDays },
  { id: 'map', label: 'Mapa', icon: MapIcon },
  { id: 'expenses', label: 'Gastos', icon: DollarSign },
  { id: 'recommendations', label: 'Recomendaciones', icon: Star },
  { id: 'photos', label: 'Fotos', icon: Camera },
  { id: 'review', label: 'Diario', icon: Star },
];

export default function TripDetails() {
  // useParams() lee la URL. Si la URL es /trip/5, extrae id="5"
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // -- ESTADOS (State) --
  const [trip, setTrip] = useState(null); // Objeto con la info general del viaje (destino, portada)
  const [places, setPlaces] = useState([]); // Lugares/Actividades del itinerario
  const [participants, setParticipants] = useState([]); // Participantes del viaje
  const [activeTab, setActiveTab] = useState('itinerary'); // Pestaña actualmente visible
  const [loading, setLoading] = useState(true); // Controla el estado "Cargando..."
  const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false); // Pop-up de nuevo lugar
  const [editingPlace, setEditingPlace] = useState(null); // Lugar que se está editando
  const [modalTitle, setModalTitle] = useState('Añadir al Itinerario');

  // Estado para el modal de confirmación de borrado
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    placeId: null,
    placeName: ''
  });

  // -- EFECTOS --
  useEffect(() => {
    fetchTripAndData();
  }, [id]);

  // Carga los datos esenciales (El viaje y sus lugares) al entrar en la página
  const fetchTripAndData = async () => {
    try {
      setLoading(true);
      // 1. Fetch trip: Obtenemos el viaje cuyo ID coincide con la URL '.eq('id', id)'
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .single(); // '.single()' indica que esperamos 1 solo resultado (no un array)
        
      if (tripError) throw tripError;
      setTrip(tripData);

      // 2. Fetch places: Obtenemos el itinerario asociado a este ID
      const { data: placeData, error: placeError } = await supabase
        .from('places')
        .select('*')
        .eq('trip_id', id)
        .order('day_index', { ascending: true });
        
      if (!placeError && placeData) {
        setPlaces(placeData);
      }

      // 3. Fetch participants (accepted)
      const { data: participantData, error: participantError } = await supabase
        .from('trip_participants')
        .select('user_id, status, profiles:user_id(id, full_name, email, avatar_url)')
        .eq('trip_id', id)
        .eq('status', 'accepted');
      
      if (participantError) {
        console.warn('Participants fetch error (may be RLS):', participantError.message);
      }

      // 4. Fetch owner profile to ensure owner always appears even for old trips
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('id', tripData.owner_id)
        .single();

      const acceptedParticipants = participantData || [];
      const ownerAlreadyIncluded = acceptedParticipants.some(p => p.user_id === tripData.owner_id);
      
      // If owner is not in the accepted participants list (old trips), add them
      if (!ownerAlreadyIncluded && ownerProfile) {
        acceptedParticipants.unshift({
          user_id: tripData.owner_id,
          status: 'accepted',
          profiles: ownerProfile
        });
      }

      setParticipants(acceptedParticipants);

    } catch (error) {
      console.error('Error fetching trip data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Callback del Modal: Cuando se crea o edita un lugar, se actualiza visualmente.
  const handlePlaceAdded = () => {
    fetchTripAndData(); // Recargamos todo para asegurar el orden correcto de los días.
  };

  // Función que abre el modal de confirmación en lugar de usar window.confirm.
  const handleDeletePlace = (placeId, placeName) => {
    setConfirmModal({
      isOpen: true,
      placeId,
      placeName
    });
  };

  // Función que ejecuta el borrado real tras confirmar.
  const executeDeletePlace = async () => {
    const { placeId, placeName } = confirmModal;
    if (!placeId) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('places')
        .delete()
        .eq('id', placeId);
        
      if (error) throw error;
      setPlaces(places.filter(p => p.id !== placeId));
    } catch (error) {
      alert('Error al borrar el lugar: ' + error.message);
    } finally {
      setLoading(false);
      setConfirmModal({ isOpen: false, placeId: null, placeName: '' });
    }
  };

  const handleLeaveTrip = async () => {
    if (!window.confirm('¿Seguro que quieres salir de este viaje? Perderás el acceso.')) return;
    try {
      const { error } = await supabase
        .from('trip_participants')
        .delete()
        .eq('trip_id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      navigate('/');
    } catch (error) {
      alert('Error al salir del viaje: ' + error.message);
    }
  };

  // Vistas de "Cargando" o "Error" precoces. (Early returns)
  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '100px', textAlign: 'center' }}>
        <h2>Cargando viaje...</h2>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="container" style={{ paddingTop: '100px', textAlign: 'center' }}>
        <h2>Viaje no encontrado</h2>
        <Link to="/" className="btn-primary" style={{ display: 'inline-block', marginTop: '20px' }}>Volver al inicio</Link>
      </div>
    );
  }

  // -- RENDERIZADOR MAGNÉTICO DE PESTAÑAS --
  // Esta función decide QUÉ componente inferior dibujar basado en activeTab
  const renderTabContent = () => {
    // A los componentes "hijo" (TripDocuments, TripExpenses, etc) les 
    // pasamos 'trip.id' como Prop (parámetro). Así ellos mismos pueden
    // descargar (fetch) solo la parte de su tabla en Supabase.
    switch (activeTab) {
      case 'documents':
        return <TripDocuments tripId={trip.id} />;
      case 'transports':
        return <TripTransports tripId={trip.id} />;
      case 'accommodations':
        return <TripAccommodations tripId={trip.id} />;
      case 'map':
        return <TripMap tripId={trip.id} onAddPlace={() => {
          setModalTitle('Añadir Lugar');
          setEditingPlace(null);
          setIsPlaceModalOpen(true);
        }} />;
      case 'expenses':
        return <TripExpenses tripId={trip.id} />;
      case 'itinerary': {
        // En el caso del Itinerario, lo renderizamos de forma nativa aquí en lugar de un hijo externo
        // 1. Agrupar los lugares por su 'Día' (.day_index).
        const placesGrouped = places.reduce((acc, place) => {
          const day = place.day_index || 1;
          if (!acc[day]) acc[day] = [];
          acc[day].push(place);
          return acc;
        }, {});

        const sortedDays = Object.keys(placesGrouped).sort((a,b) => Number(a) - Number(b));

        return (
          <div className="glass-panel" style={{ padding: 'var(--spacing-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xl)' }}>
              <h3>Itinerario por Días</h3>
              <button 
                className="btn-primary" 
                onClick={() => {
                  setModalTitle('Añadir al Itinerario');
                  setEditingPlace(null);
                  setIsPlaceModalOpen(true);
                }}
                style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: '0.9rem' }}
              >
                + Añadir Plan
              </button>
            </div>
            
            {sortedDays.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>No has añadido lugares a tu itinerario.</p>
            ) : (
              <div style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: 'var(--spacing-lg)' }}>
                {sortedDays.map(dayStr => (
                  <div key={dayStr} style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <div style={{ position: 'relative', marginBottom: 'var(--spacing-md)' }}>
                      <div style={{ position: 'absolute', left: '-33px', top: '0', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--color-primary)', border: '3px solid var(--color-surface)' }}></div>
                      <h4 style={{ margin: 0 }}>Día {dayStr}</h4>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                      {placesGrouped[dayStr].map(place => (
                        <div key={place.id} style={{ 
                          background: 'var(--color-surface)', padding: 'var(--spacing-md)', 
                          borderRadius: 'var(--border-radius)', border: '1px solid var(--color-border)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{place.name}</div>
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{place.reason}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <button 
                              onClick={() => {
                                setEditingPlace(place);
                                setIsPlaceModalOpen(true);
                              }}
                              style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}
                              title="Editar"
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeletePlace(place.id, place.name)}
                              style={{ background: 'transparent', border: 'none', color: 'rgba(231, 76, 60, 0.6)', cursor: 'pointer', padding: '4px' }}
                              title="Borrar"
                            >
                              <Trash2 size={16} />
                            </button>
                            <button 
                              onClick={async () => {
                                const newVisited = !place.visited;
                                const { error } = await supabase
                                  .from('places')
                                  .update({ visited: newVisited })
                                  .eq('id', place.id);
                                if (!error) fetchTripAndData(); // Recargar datos para refrescar la UI
                              }}
                              style={{ 
                                background: place.visited ? 'var(--color-success)' : 'transparent',
                                color: place.visited ? 'white' : 'var(--color-text-muted)',
                                border: `1px solid ${place.visited ? 'var(--color-success)' : 'var(--color-border)'}`,
                                padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontWeight: 600
                              }}
                            >
                              {place.visited ? 'Visitado ✓' : 'Marcar visitado'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
      case 'photos':
        return <TripPhotos tripId={trip.id} />;
      case 'review':
        return <TripReview trip={trip} onUpdate={(updatedTrip) => setTrip(updatedTrip)} />;
      case 'recommendations':
        return <CityRecommendations city={trip.destination} />;
      default:
        return null;
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Cabecera (Hero) del Viaje con foto de portada dinámica superpuesta */}
      <header style={{ 
        position: 'relative', 
        height: '350px',
        objectFit: 'cover',
        // Imagen inyectada por URL directa, con un gradiente negro para asegurar que el texto blanco sea legible
        background: `linear-gradient(to bottom, rgba(0,0,0,0.1), var(--color-bg)), url(${trip.cover_image}) center/cover no-repeat`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 'var(--spacing-2xl)',
        color: 'white'
      }}>
        <div className="container" style={{ padding: 0 }}>
          <Link to="/" style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '8px', 
            color: 'white', marginBottom: 'var(--spacing-xl)',
            background: 'rgba(0,0,0,0.3)', padding: '8px 16px', borderRadius: '30px',
            backdropFilter: 'blur(10px)'
          }}>
            <ArrowLeft size={18} /> Volver
          </Link>
          <h1 style={{ fontSize: '3.5rem', marginBottom: 'var(--spacing-xs)', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
            {trip.destination}
          </h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.9, textShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>
            {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
          </p>

          {/* Participants row */}
          {participants.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'var(--spacing-md)', flexWrap: 'wrap' }}>
              <Users size={16} />
              {participants.map(p => (
                <span key={p.user_id} style={{
                  background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)',
                  padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 500
                }}>
                  {p.profiles?.full_name || p.profiles?.email || 'Participante'}
                </span>
              ))}
            </div>
          )}

          {/* Leave trip button (only for non-owners) */}
          {trip.owner_id !== user?.id && (
            <button
              onClick={handleLeaveTrip}
              style={{
                marginTop: 'var(--spacing-md)',
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'rgba(231,76,60,0.4)', border: '1px solid rgba(231,76,60,0.6)',
                color: 'white', padding: '8px 16px', borderRadius: '30px',
                cursor: 'pointer', backdropFilter: 'blur(5px)', fontSize: '0.9rem'
              }}
            >
              <LogOut size={16} /> Salir del viaje
            </button>
          )}
        </div>
      </header>

      {/* Menú de Navegación de Pestañas (Tabs) */}
      <div className="container" style={{ marginTop: '-40px', position: 'relative', zIndex: 10 }}>
        <div className="glass-panel" style={{ 
          display: 'flex', 
          overflowX: 'auto', // Permite scroll horizontal en móviles sin romper diseño
          padding: 'var(--spacing-sm)',
          gap: 'var(--spacing-sm)',
          marginBottom: 'var(--spacing-xl)'
        }}>
          {/* Mapea dinámicamente cada botón del array 'TABS'. 
              El que coincida con 'activeTab' se pinta con color primario. */}
          {TABS.map(tab => (
            <button
               // ... estilos intactos para el botón
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '12px 24px',
                borderRadius: 'var(--border-radius-full)',
                background: activeTab === tab.id ? 'var(--color-primary)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'var(--color-text-main)',
                fontWeight: activeTab === tab.id ? 600 : 500,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Zona Inferior: Llamada a renderTabContent() que escupe el HTML correspondiente a la Pestaña Activa */}
        <main style={{ paddingBottom: 'var(--spacing-2xl)' }}>
          {renderTabContent()}
        </main>
      </div>
      
      <NewPlaceModal 
        isOpen={isPlaceModalOpen} 
        onClose={() => setIsPlaceModalOpen(false)} 
        tripId={trip.id}
        onPlaceAdded={handlePlaceAdded}
        editingPlace={editingPlace}
        modalTitle={modalTitle}
      />

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={executeDeletePlace}
        title="¿Eliminar de tu itinerario?"
        message={`¿Estás seguro de que quieres quitar "${confirmModal.placeName}" de tus planes?`}
        confirmText="Sí, eliminar"
        cancelText="No, dejarlo"
      />
    </div>
  );
}
