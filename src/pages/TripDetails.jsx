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
import { ArrowLeft, Map as MapIcon, DollarSign, Camera, Star, CalendarDays, Pencil, Trash2, X, Users, LogOut, ChevronUp, ChevronDown, Car, Globe, Lock, Copy } from 'lucide-react';
import NewPlaceModal from '../components/Map/NewPlaceModal';
import TripMap from '../components/Map/TripMap';
import TripExpenses from '../components/Expenses/TripExpenses';
import TripDocuments from '../components/Expenses/TripDocuments';
import TripTransports from '../components/Expenses/TripTransports';
import TripAccommodations from '../components/Expenses/TripAccommodations';
import TripRentals from '../components/Expenses/TripRentals';
import TripPhotos from '../components/Expenses/TripPhotos';
import CityRecommendations from '../components/Recommendations/CityRecommendations';
import ConfirmModal from '../components/Common/ConfirmModal';
import TripReview from '../components/Expenses/TripReview';
import TripDayOverview from '../components/Expenses/TripDayOverview';


// Constante estática con todas las pestañas posibles y sus iconos correspondientes.
const TABS = [
  { id: 'overview', label: 'Resumen', icon: CalendarDays },
  { id: 'documents', label: 'Docs', icon: CalendarDays }, 
  { id: 'itinerary', label: 'Itinerario', icon: CalendarDays },
  { id: 'transports', label: 'Viaje y Logística', icon: MapIcon }, 
  { id: 'accommodations', label: 'Alojamientos', icon: CalendarDays },
  { id: 'rentals', label: 'Alquileres', icon: Car },
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
  const [activeTab, setActiveTab] = useState('overview'); // Pestaña actualmente visible (overview por defecto)
  const [loading, setLoading] = useState(true); // Controla el estado "Cargando..."
  const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false); // Pop-up de nuevo lugar
  const [editingPlace, setEditingPlace] = useState(null); // Lugar que se está editando
  const [modalTitle, setModalTitle] = useState('Añadir al Itinerario');
  const [isReadOnly, setIsReadOnly] = useState(false); // Modo solo lectura (viaje público, no participante)

  // Estado para el modal de confirmación de borrado
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, placeId: null, placeName: '' });

  // -- EFECTOS --
  useEffect(() => {
    fetchTripAndData();
  }, [id]);

  /**
   * Carga masiva de datos del viaje:
   * 1. Obtiene la info básica del viaje.
   * 2. Obtiene los lugares del itinerario.
   * 3. Obtiene los participantes aceptados.
   * 4. Valida permisos: Si el usuario no es dueño ni participante, pero el viaje es público,
   *    se activa el 'isReadOnly' (Solo lectura). Si es privado, se redirige al Dashboard.
   */
  const fetchTripAndData = async () => {
    try {
      setLoading(true);
      // 1. Obtener datos del viaje
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .single();
        
      if (tripError) throw tripError;
      setTrip(tripData);

      // 2. Obtener lugares/aventuras del itinerario
      const { data: placeData, error: placeError } = await supabase
        .from('places')
        .select('*')
        .eq('trip_id', id)
        .order('day_index', { ascending: true });
        
      if (!placeError && placeData) {
        setPlaces(placeData);
      }

      // 3. Obtener participantes que han aceptado la invitación
      const { data: participantData, error: participantError } = await supabase
        .from('trip_participants')
        .select('user_id, status, profiles:user_id(id, full_name, email, avatar_url)')
        .eq('trip_id', id)
        .eq('status', 'accepted');
      
      if (participantError) {
        console.warn('Error cargando participantes:', participantError.message);
      }

      // 4. Obtener el perfil del dueño (aseguramos que aparezca siempre)
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('id', tripData.owner_id)
        .single();

      const acceptedParticipants = participantData || [];
      const ownerAlreadyIncluded = acceptedParticipants.some(p => p.user_id === tripData.owner_id);
      
      if (!ownerAlreadyIncluded && ownerProfile) {
        acceptedParticipants.unshift({
          user_id: tripData.owner_id,
          status: 'accepted',
          profiles: ownerProfile
        });
      }

      setParticipants(acceptedParticipants);

      // 5. DETERMINAR PERMISOS (Lógica de acceso)
      const isOwner = tripData.owner_id === user?.id;
      const isParticipant = acceptedParticipants.some(p => p.user_id === user?.id);
      
      if (!isOwner && !isParticipant) {
        if (tripData.is_public) {
          setIsReadOnly(true); // El usuario no "pertenece" al viaje pero puede verlo (es público)
        } else {
          // El viaje es privado y el usuario no tiene acceso: Redirigir fuera
          navigate('/');
          return;
        }
      } else {
        setIsReadOnly(false); // Es dueño o participante: Acceso total
      }

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

  /**
   * Copia el viaje público como plantilla propia.
   * Copia: datos del viaje + places del itinerario + docs/gastos si son públicos.
   * NO copia: participantes, fotos.
   */
  const copyTripAsTemplate = async () => {
    if (!window.confirm('Se creará una copia de este viaje en tu cuenta (sin participantes ni fotos). ¿Continuar?')) return;
    try {
      // 1. Crear nuevo viaje
      const { data: newTrip, error: tripErr } = await supabase
        .from('trips')
        .insert([{
          owner_id: user.id,
          destination: trip.destination,
          start_date: trip.start_date,
          end_date: trip.end_date,
          cover_image: trip.cover_image,
          status: new Date(trip.start_date) > new Date() ? 'upcoming' : 'past',
          is_public: false // Por defecto privado
        }])
        .select()
        .single();
      if (tripErr) throw tripErr;

      // 2. Copiar itinerario (places)
      const { data: srcPlaces } = await supabase.from('places').select('*').eq('trip_id', trip.id);
      if (srcPlaces && srcPlaces.length > 0) {
        const newPlaces = srcPlaces.map(({ id, trip_id, ...rest }) => ({ ...rest, trip_id: newTrip.id }));
        await supabase.from('places').insert(newPlaces);
      }

      // 3. Copiar alojamientos (si existen)
      const { data: srcAccoms } = await supabase.from('accommodations').select('*').eq('trip_id', trip.id);
      if (srcAccoms && srcAccoms.length > 0) {
        const newAccoms = srcAccoms.map(({ id, trip_id, ...rest }) => ({ ...rest, trip_id: newTrip.id }));
        await supabase.from('accommodations').insert(newAccoms);
      }

      // 4. Copiar transports y traslados
      const { data: srcTransports } = await supabase.from('transports').select('*').eq('trip_id', trip.id);
      if (srcTransports && srcTransports.length > 0) {
        const newTransports = srcTransports.map(({ id, trip_id, ...rest }) => ({ ...rest, trip_id: newTrip.id }));
        await supabase.from('transports').insert(newTransports);
      }
      const { data: srcTransfers } = await supabase.from('airport_transfers').select('*').eq('trip_id', trip.id);
      if (srcTransfers && srcTransfers.length > 0) {
        const newTransfers = srcTransfers.map(({ id, trip_id, ...rest }) => ({ ...rest, trip_id: newTrip.id }));
        await supabase.from('airport_transfers').insert(newTransfers);
      }

      // 5. Copiar documentos SOLO si son públicos
      if (trip.documents_public) {
        const { data: srcDocs } = await supabase.from('documents').select('*').eq('trip_id', trip.id);
        if (srcDocs && srcDocs.length > 0) {
          const newDocs = srcDocs.map(({ id, trip_id, ...rest }) => ({ ...rest, trip_id: newTrip.id }));
          await supabase.from('documents').insert(newDocs);
        }
      }

      // 6. Copiar gastos SOLO si son públicos
      if (trip.expenses_public) {
        const { data: srcExpenses } = await supabase.from('expenses').select('*').eq('trip_id', trip.id);
        if (srcExpenses && srcExpenses.length > 0) {
          const newExpenses = srcExpenses.map(({ id, trip_id, ...rest }) => ({ ...rest, trip_id: newTrip.id }));
          await supabase.from('expenses').insert(newExpenses);
        }
      }

      // Navegar al nuevo viaje
      navigate(`/trip/${newTrip.id}`);
    } catch (error) {
      alert('Error al copiar el viaje: ' + error.message);
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
    const hidePrices = isReadOnly && !(trip?.expenses_public);

    switch (activeTab) {
      case 'overview':
        return <TripDayOverview trip={trip} />;
      case 'documents':
        return <TripDocuments tripId={trip.id} isReadOnly={isReadOnly} />;
      case 'transports':
        return <TripTransports tripId={trip.id} isReadOnly={isReadOnly} hidePrices={hidePrices} />;
      case 'accommodations':
        return <TripAccommodations tripId={trip.id} tripStartDate={trip.start_date} tripEndDate={trip.end_date} isReadOnly={isReadOnly} hidePrices={hidePrices} />;
      case 'rentals':
        return <TripRentals tripId={trip.id} trip={trip} isReadOnly={isReadOnly} hidePrices={hidePrices} />;
      case 'map':
        return <TripMap tripId={trip.id} isReadOnly={isReadOnly} onAddPlace={() => {
          setModalTitle('Añadir Lugar');
          setEditingPlace(null);
          setIsPlaceModalOpen(true);
        }} />;
      case 'expenses':
        return <TripExpenses tripId={trip.id} isReadOnly={isReadOnly} />;
      case 'itinerary': {
        // En el caso del Itinerario, lo renderizamos de forma nativa aquí en lugar de un hijo externo
        // 1. Agrupar los lugares por su 'Día' (.day_index).
        const placesGrouped = places.reduce((acc, place) => {
          const day = place.day_index || 1;
          if (!acc[day]) acc[day] = [];
          acc[day].push(place);
          return acc;
        }, {});

        // Sort places loosely by 'order_index' if it existed, or just keep them as they are
        Object.keys(placesGrouped).forEach(day => {
          placesGrouped[day].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        });

        const sortedDays = Object.keys(placesGrouped).sort((a,b) => Number(a) - Number(b));

        /**
         * Lógica de reordenamiento de lugares (Arrastrar arriba/abajo):
         * 1. Calcula la nueva posición del elemento.
         * 2. Si se mueve al límite de un día, salta al día anterior o siguiente automáticamente.
         * 3. Realiza una actualización "optimista" en el estado local (React) para respuesta inmediata.
         * 4. Sincroniza con Supabase mediante 'upsert' de los nuevos índices.
         */
        const movePlace = async (place, direction) => {
          const currentDayId = parseInt(place.day_index || 1, 10);
          const currentDayItems = [...(placesGrouped[currentDayId] || [])];
          const currentIndex = currentDayItems.findIndex(p => p.id === place.id);
          
          let updates = [];
          let newAllPlaces = [...places];

          if (direction === 'up') {
            if (currentIndex > 0) {
              // Mover hacia arriba dentro del mismo día
              const temp = currentDayItems[currentIndex - 1];
              currentDayItems[currentIndex - 1] = currentDayItems[currentIndex];
              currentDayItems[currentIndex] = temp;
              
              const updatedItems = currentDayItems.map((p, idx) => ({ ...p, order_index: idx }));
              updates = updatedItems;
              
              newAllPlaces = places.map(p => {
                const up = updatedItems.find(u => u.id === p.id);
                return up ? up : p;
              });
            } else {
              // Mover al día anterior
              const prevDayId = currentDayId - 1;
              if (prevDayId >= 1) {
                const prevDayItems = [...(placesGrouped[prevDayId] || [])];
                currentDayItems.splice(currentIndex, 1);
                
                const movedPlace = { ...place, day_index: prevDayId };
                prevDayItems.push(movedPlace); // Lo ponemos al final del día anterior
                
                const updatedPrevDay = prevDayItems.map((p, idx) => ({ ...p, order_index: idx }));
                const updatedCurrentDay = currentDayItems.map((p, idx) => ({ ...p, order_index: idx }));
                
                updates = [...updatedPrevDay, ...updatedCurrentDay];
                
                newAllPlaces = places.map(p => {
                  const up = updates.find(u => u.id === p.id);
                  return up ? up : p;
                });
              } else {
                return; // Ya estamos en el tope del Día 1
              }
            }
          } else if (direction === 'down') {
            if (currentIndex < currentDayItems.length - 1) {
              // Mover hacia abajo dentro del mismo día
              const temp = currentDayItems[currentIndex + 1];
              currentDayItems[currentIndex + 1] = currentDayItems[currentIndex];
              currentDayItems[currentIndex] = temp;
              
              const updatedItems = currentDayItems.map((p, idx) => ({ ...p, order_index: idx }));
              updates = updatedItems;
              
              newAllPlaces = places.map(p => {
                const up = updatedItems.find(u => u.id === p.id);
                return up ? up : p;
              });
            } else {
              // Mover al día siguiente
              const nextDayId = currentDayId + 1;
              const start = new Date(trip.start_date);
              const end = new Date(trip.end_date);
              const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
              
              if (nextDayId <= totalDays) {
                const nextDayItems = [...(placesGrouped[nextDayId] || [])];
                currentDayItems.splice(currentIndex, 1);
                
                const movedPlace = { ...place, day_index: nextDayId };
                movedPlace.order_index = 0;
                nextDayItems.unshift(movedPlace); // Lo ponemos al principio del día siguiente
                
                const updatedNextDay = nextDayItems.map((p, idx) => ({ ...p, order_index: idx }));
                const updatedCurrentDay = currentDayItems.map((p, idx) => ({ ...p, order_index: idx }));
                
                updates = [...updatedNextDay, ...updatedCurrentDay];
                
                newAllPlaces = places.map(p => {
                  const up = updates.find(u => u.id === p.id);
                  return up ? up : p;
                });
              } else {
                return; // Ya es el último día del viaje
              }
            }
          }

          // Actualización optimista de la UI
          setPlaces(newAllPlaces);

          // Sincronización asíncrona con la DB
          try {
            const dbUpdates = updates.map(p => ({
              id: p.id,
              trip_id: p.trip_id,
              name: p.name,
              reason: p.reason,
              lat: p.lat,
              lng: p.lng,
              visited: p.visited,
              day_index: p.day_index,
              order_index: p.order_index
            }));
            const { error } = await supabase.from('places').upsert(dbUpdates);
            if (error) throw error;
          } catch (error) {
            console.error('Error guardando el nuevo orden:', error);
            fetchTripAndData(); // Si falla, revertimos al estado de la DB
          }
        };

        return (
          <div className="glass-panel" style={{ padding: 'var(--spacing-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xl)' }}>
              <h3>Itinerario por Días</h3>
              {!isReadOnly && (
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
              )}
            </div>
            
            {sortedDays.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>No has añadido lugares a tu itinerario.</p>
            ) : (
              <div style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: 'var(--spacing-lg)' }}>
                {sortedDays.map(dayStr => (
                  <div 
                    key={dayStr} 
                    style={{ 
                      marginBottom: 'var(--spacing-xl)',
                      minHeight: '80px'
                    }}
                  >
                    <div style={{ position: 'relative', marginBottom: 'var(--spacing-md)' }}>
                      <div style={{ position: 'absolute', left: '-33px', top: '0', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--color-primary)', border: '3px solid var(--color-surface)' }}></div>
                      <h4 style={{ margin: 0 }}>
                        Día {dayStr}
                        {trip.start_date && (() => {
                          const d = new Date(trip.start_date);
                          d.setDate(d.getDate() + parseInt(dayStr) - 1);
                          return (
                            <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '0.9rem', marginLeft: '8px' }}>
                              – {d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}
                            </span>
                          );
                        })()}
                      </h4>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                      {placesGrouped[dayStr].map((place, index) => (
                        <div 
                          key={place.id} 
                          data-place-id={place.id}
                          style={{ 
                            background: 'var(--color-surface)', padding: 'var(--spacing-md)', 
                            borderRadius: 'var(--border-radius)', border: '1px solid var(--color-border)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {place.activity_time && <span style={{ color: 'var(--color-primary)', fontSize: '0.9rem', background: 'rgba(118,75,162,0.1)', padding: '2px 8px', borderRadius: '12px' }}>{place.activity_time}</span>}
                              {place.name}
                            </div>
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{place.reason}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {!isReadOnly && (
                              <>
                                <div style={{ display: 'flex', flexDirection: 'column', marginRight: '4px' }}>
                                  <button 
                                    onClick={() => movePlace(place, 'up')}
                                    disabled={place.day_index === 1 && index === 0}
                                    style={{ background: 'transparent', border: 'none', padding: '0', color: (place.day_index === 1 && index === 0) ? 'rgba(0,0,0,0.1)' : 'var(--color-text-muted)', cursor: (place.day_index === 1 && index === 0) ? 'default' : 'pointer' }}
                                    title="Subir"
                                  >
                                    <ChevronUp size={18} />
                                  </button>
                                  <button 
                                    onClick={() => movePlace(place, 'down')}
                                    disabled={(() => {
                                      const start = new Date(trip.start_date);
                                      const end = new Date(trip.end_date);
                                      const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
                                      return place.day_index === totalDays && index === placesGrouped[dayStr].length - 1;
                                    })()}
                                    style={{ background: 'transparent', border: 'none', padding: '0', color: (() => {
                                      const start = new Date(trip.start_date);
                                      const end = new Date(trip.end_date);
                                      const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
                                      return (place.day_index === totalDays && index === placesGrouped[dayStr].length - 1) ? 'rgba(0,0,0,0.1)' : 'var(--color-text-muted)';
                                    })(), cursor: (() => {
                                      const start = new Date(trip.start_date);
                                      const end = new Date(trip.end_date);
                                      const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
                                      return (place.day_index === totalDays && index === placesGrouped[dayStr].length - 1) ? 'default' : 'pointer';
                                    })(), marginTop: '-4px' }}
                                    title="Bajar"
                                  >
                                    <ChevronDown size={18} />
                                  </button>
                                </div>
                                
                                <div style={{ width: '1px', height: '24px', background: 'var(--color-border)', margin: '0 4px' }}></div>
                                
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
                                    if (!error) fetchTripAndData();
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
                              </>
                            )}
                            {isReadOnly && place.visited && (
                              <span style={{
                                background: 'var(--color-success)', color: 'white',
                                padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600
                              }}>Visitado ✓</span>
                            )}
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
        return <TripPhotos tripId={trip.id} isReadOnly={isReadOnly} />;
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
      {/* 
        CABECERA (Hero) del Viaje:
        - Muestra la imagen de portada con un degradado para legibilidad.
        - Botón de retorno al Dashboard.
        - Insignias de Privacidad (Público/Privado) y estado de Lectura.
        - Lista de avatares/nombres de los participantes.
      */}
      <header style={{ 
        position: 'relative', 
        height: '350px',
        objectFit: 'cover',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: 'var(--spacing-xs)' }}>
            <h1 style={{ fontSize: '3.5rem', margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
              {trip.destination}
            </h1>
            {/* Public/private badge */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: trip.is_public ? 'rgba(118,75,162,0.7)' : 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(5px)',
              color: 'white', fontSize: '0.8rem', fontWeight: 700,
              padding: '4px 12px', borderRadius: '20px',
              letterSpacing: '0.3px'
            }}>
              {trip.is_public ? <Globe size={12} /> : <Lock size={12} />}
              {trip.is_public ? 'Público' : 'Privado'}
            </span>
            {isReadOnly && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: 'rgba(255,193,7,0.25)',
                border: '1px solid rgba(255,193,7,0.5)',
                color: '#ffd700', fontSize: '0.8rem', fontWeight: 700,
                padding: '4px 12px', borderRadius: '20px'
              }}>
                👁️ Solo lectura
              </span>
            )}
          </div>
          <p style={{ fontSize: '1.2rem', opacity: 0.9, textShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>
            {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
          </p>

          {/* Participants row */}
          {!isReadOnly && participants.length > 0 && (
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

          {/* Copy trip button: visible on any public trip not owned by the current user */}
          {trip.is_public && trip.owner_id !== user?.id && (
            <button
              onClick={copyTripAsTemplate}
              style={{
                marginTop: 'var(--spacing-md)',
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'rgba(118,75,162,0.35)', border: '1px solid rgba(118,75,162,0.6)',
                color: 'white', padding: '8px 16px', borderRadius: '30px',
                cursor: 'pointer', backdropFilter: 'blur(5px)', fontSize: '0.9rem'
              }}
            >
              <Copy size={16} /> Copiar como plantilla
            </button>
          )}

          {/* Leave trip button (only for non-owners who ARE participants) */}
          {trip.owner_id !== user?.id && !isReadOnly && (
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

      {/* 
        MENÚ DE NAVEGACIÓN (Tabs):
        - Permite cambiar entre Itinerario, Mapa, Gastos, etc.
        - Filtra pestañas privadas (Docs, Fotos, Gastos) si el visitante no tiene permiso.
      */}
      <div className="container" style={{ marginTop: '-40px', position: 'relative', zIndex: 10 }}>
        <div className="glass-panel" style={{ 
          display: 'flex', 
          overflowX: 'auto', // Scroll horizontal para móviles
          padding: 'var(--spacing-sm)',
          gap: 'var(--spacing-sm)',
          marginBottom: 'var(--spacing-xl)'
        }}>
          {TABS.filter(tab => {
            if (isReadOnly && !trip?.expenses_public && tab.id === 'expenses') return false;
            if (isReadOnly && !trip?.documents_public && tab.id === 'documents') return false;
            if (isReadOnly && !trip?.photos_public && tab.id === 'photos') return false;
            return true;
          }).map(tab => (
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
      
      {!isReadOnly && (
        <NewPlaceModal 
          isOpen={isPlaceModalOpen} 
          onClose={() => setIsPlaceModalOpen(false)} 
          tripId={trip.id}
          tripStartDate={trip.start_date}
          tripEndDate={trip.end_date}
          onPlaceAdded={handlePlaceAdded}
          editingPlace={editingPlace}
          modalTitle={modalTitle}
        />
      )}

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
