// ============================================================================
// ARCHIVO: TripDayOverview.jsx
// DESCRIPCIÓN: Vista resumen día a día del viaje. Solo lectura.
// Muestra alojamientos activos, vuelos, traslados (día 1) y actividades del
// itinerario por cada día, con detección de conflictos de horario.
// ============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Bed, Plane, Car, MapPin, Clock, AlertTriangle, ChevronDown, ChevronUp, CheckCircle, LogIn, LogOut, Key } from 'lucide-react';

// ── Auxiliares de formato ──────────────────────────────────────────────────
const fmtTime = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch { return null; }
};

const fmtDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  } catch { return ''; }
};

// Convierte "HH:mm" a minutos desde medianoche para comparar
const timeToMins = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// Comprueba si dos actividades tienen conflicto de hora (asume ~60 min c/u si no hay fin)
const hasTimeConflict = (timeA, timeB) => {
  const a = timeToMins(timeA);
  const b = timeToMins(timeB);
  if (a === null || b === null) return false;
  return Math.abs(a - b) < 60;
};

// ── Componente principal ───────────────────────────────────────────────────
export default function TripDayOverview({ trip }) {
  const [places, setPlaces] = useState([]);
  const [accommodations, setAccommodations] = useState([]);
  const [transports, setTransports] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState({});

  useEffect(() => {
    if (trip?.id) fetchAll();
  }, [trip?.id]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [placesRes, accomsRes, transRes, transfersRes, rentalsRes] = await Promise.all([
        supabase.from('places').select('*').eq('trip_id', trip.id).order('day_index').order('order_index'),
        supabase.from('accommodations').select('*').eq('trip_id', trip.id).order('check_in'),
        supabase.from('transports').select('*').eq('trip_id', trip.id).order('departure_time'),
        supabase.from('airport_transfers').select('*').eq('trip_id', trip.id).order('departure_time'),
        supabase.from('trip_rentals').select('*').eq('trip_id', trip.id).order('pickup_datetime')
      ]);
      setPlaces(placesRes.data || []);
      setAccommodations(accomsRes.data || []);
      setTransports(transRes.data || []);
      setTransfers(transfersRes.data || []);
      setRentals(rentalsRes.data || []);
    } catch (err) {
      console.error('Error cargando resumen del viaje:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Cargando resumen del viaje...</p>
      </div>
    );
  }

  // -- Construir array de días del viaje --
  const start = new Date(trip.start_date);
  const end = new Date(trip.end_date);
  const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
  const days = Array.from({ length: totalDays }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return { dayIndex: i + 1, date };
  });

  // Agrupar actividades por día
  const placesByDay = {};
  places.forEach(p => {
    const d = p.day_index || 1;
    if (!placesByDay[d]) placesByDay[d] = [];
    placesByDay[d].push(p);
  });

  // Helper: obtener alojamiento activo para una fecha dada
  const getActiveAccommodation = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return accommodations.find(acc => {
      if (!acc.check_in || !acc.check_out) return false;
      const checkIn = new Date(acc.check_in).toISOString().split('T')[0];
      const checkOut = new Date(acc.check_out).toISOString().split('T')[0];
      return dateStr >= checkIn && dateStr < checkOut;
    });
  };

  // Helper: vuelos que salen o llegan en una fecha (con corrección de llegada)
  const getFlightsForDay = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return transports.filter(t => {
      const depDate = t.departure_time ? new Date(t.departure_time).toISOString().split('T')[0] : null;
      const arrDate = t.arrival_time ? new Date(t.arrival_time).toISOString().split('T')[0] : null;
      return depDate === dateStr || arrDate === dateStr;
    });
  };

  // Para la llegada de un vuelo: si es después de las 12:00 del día siguiente, mostrar en ese día
  const getArrivalsFromPrevDay = (date) => {
    const prevDate = new Date(date);
    prevDate.setDate(date.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];
    return transports.filter(t => {
      if (!t.arrival_time) return false;
      const arrDate = new Date(t.arrival_time);
      const arrDateStr = arrDate.toISOString().split('T')[0];
      const depDateStr = t.departure_time ? new Date(t.departure_time).toISOString().split('T')[0] : null;
      // Llegada es en este día (date) pero salida fue el día anterior
      return arrDateStr === date.toISOString().split('T')[0] && depDateStr === prevDateStr;
    });
  };

  const toggleDay = (dayIdx) => {
    setExpandedDays(prev => ({ ...prev, [dayIdx]: !prev[dayIdx] }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <div className="glass-panel" style={{ padding: 'var(--spacing-md) var(--spacing-xl)', marginBottom: 'var(--spacing-md)' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          📅 Resumen Día a Día
          <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>
            {fmtDate(trip.start_date)} — {fmtDate(trip.end_date)} · {totalDays} días
          </span>
        </h3>
      </div>

      {days.map(({ dayIndex, date }) => {
        const dayActivities = (placesByDay[dayIndex] || []).sort((a, b) => {
          const ta = timeToMins(a.activity_time);
          const tb = timeToMins(b.activity_time);
          if (ta === null && tb === null) return (a.order_index || 0) - (b.order_index || 0);
          if (ta === null) return 1;
          if (tb === null) return -1;
          return ta - tb;
        });

        const activeAccom = getActiveAccommodation(date);
        const checkInToday = activeAccom && new Date(activeAccom.check_in).toISOString().split('T')[0] === date.toISOString().split('T')[0];
        
        // Check out: próximo alojamiento que hace check-out hoy
        const checkOutAccom = accommodations.find(acc => {
          if (!acc.check_out) return false;
          return new Date(acc.check_out).toISOString().split('T')[0] === date.toISOString().split('T')[0];
        });

        const dayFlights = getFlightsForDay(date);
        const prevDayArrivals = getArrivalsFromPrevDay(date);
        const dayTransfers = dayIndex === 1 ? transfers : [];

        // Alquileres activos este día (en periodo de alquiler)
        const dayRentals = rentals.filter(r => {
          if (!r.pickup_datetime) return false;
          const pickupDate = new Date(r.pickup_datetime);
          const returnDate = r.return_datetime ? new Date(r.return_datetime) : null;
          const dayStart = new Date(date); dayStart.setHours(0,0,0,0);
          const dayEnd = new Date(date); dayEnd.setHours(23,59,59,999);
          return pickupDate <= dayEnd && (!returnDate || returnDate >= dayStart);
        });

        const hasContent = dayActivities.length > 0 || activeAccom || checkOutAccom || dayFlights.length > 0 || prevDayArrivals.length > 0 || dayTransfers.length > 0 || dayRentals.length > 0;

        // Detección de conflictos de horario
        const conflicts = [];
        for (let i = 0; i < dayActivities.length - 1; i++) {
          if (dayActivities[i].activity_time && dayActivities[i + 1].activity_time) {
            if (hasTimeConflict(dayActivities[i].activity_time, dayActivities[i + 1].activity_time)) {
              conflicts.push(i);
            }
          }
        }

        const isExpanded = expandedDays[dayIndex] !== false; // Expandido por defecto

        return (
          <div
            key={dayIndex}
            className="glass-panel"
            style={{ padding: 0, overflow: 'hidden', opacity: hasContent ? 1 : 0.6 }}
          >
            {/* Cabecera del día */}
            <button
              onClick={() => toggleDay(dayIndex)}
              style={{
                width: '100%', padding: 'var(--spacing-md) var(--spacing-xl)',
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: isExpanded && hasContent ? '1px solid var(--color-border)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'var(--color-primary)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.9rem', flexShrink: 0
                }}>
                  {dayIndex}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
                    {date.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' })}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '2px' }}>
                    {dayActivities.length > 0 && <span>📍 {dayActivities.length} {dayActivities.length === 1 ? 'actividad' : 'actividades'}</span>}
                    {(activeAccom || checkOutAccom) && <span>🏨 {activeAccom?.name || checkOutAccom?.name}</span>}
                    {dayFlights.length > 0 && <span>✈️ {dayFlights.length} {dayFlights.length === 1 ? 'vuelo' : 'vuelos'}</span>}
                    {dayRentals.length > 0 && <span>🚗 Alquiler: {dayRentals[0].car_model}</span>}
                    {conflicts.length > 0 && <span style={{ color: '#e67e22' }}>⚠️ Conflicto de horario</span>}
                  </div>
                </div>
              </div>
              <div style={{ color: 'var(--color-text-muted)' }}>
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </button>

            {/* Contenido expandido del día */}
            {isExpanded && hasContent && (
              <div style={{ padding: 'var(--spacing-lg) var(--spacing-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>

                {/* ── TRASLADOS DEL DÍA 1 ── */}
                {dayTransfers.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                      TRASLADO AL AEROPUERTO
                    </div>
                    {dayTransfers.map(t => (
                      <div key={t.id} style={{
                        background: 'rgba(118,75,162,0.07)', borderRadius: '8px',
                        padding: '10px 14px', marginBottom: '6px',
                        border: '1px solid rgba(118,75,162,0.2)',
                        display: 'flex', alignItems: 'flex-start', gap: '10px'
                      }}>
                        <Car size={16} color="var(--color-primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {t.type === 'car' ? 'Coche' : t.type === 'bus' ? 'Autobús' : 'AVE/Tren'}
                            {t.departure_time && <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '8px', fontSize: '0.9rem' }}>
                              Salida: {fmtTime(t.departure_time)}
                            </span>}
                          </div>
                          {t.transfer_duration_mins && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>⏱ {t.transfer_duration_mins} min al aeropuerto</div>}
                          {t.parking_name && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>🅿️ Parking: {t.parking_name}{t.parking_duration ? ` · ${t.parking_duration} días` : ''}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── LLEGADAS DEL DÍA ANTERIOR ── */}
                {prevDayArrivals.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3498db', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                      LLEGADA (VUELO DEL DÍA ANTERIOR)
                    </div>
                    {prevDayArrivals.map(t => (
                      <div key={t.id} style={{
                        background: 'rgba(52,152,219,0.08)', borderRadius: '8px',
                        padding: '10px 14px', border: '1px solid rgba(52,152,219,0.2)',
                        display: 'flex', alignItems: 'center', gap: '10px'
                      }}>
                        <Plane size={16} color="#3498db" />
                        <div>
                          <div style={{ fontWeight: 600 }}>{t.origin} → {t.destination}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                            Llegada: {fmtTime(t.arrival_time)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── VUELOS DEL DÍA ── */}
                {dayFlights.filter(t => {
                  // Excluir los que ya se muestran como "llegada del día anterior"
                  return !(prevDayArrivals.find(pa => pa.id === t.id));
                }).length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                      VUELOS / TRAYECTOS
                    </div>
                    {dayFlights.filter(t => !prevDayArrivals.find(pa => pa.id === t.id)).map(t => {
                      const depDate = t.departure_time ? new Date(t.departure_time).toISOString().split('T')[0] : null;
                      const dateStr = date.toISOString().split('T')[0];
                      const isDeparture = depDate === dateStr;
                      return (
                        <div key={t.id} style={{
                          background: 'rgba(118,75,162,0.07)', borderRadius: '8px',
                          padding: '12px 14px', marginBottom: '6px',
                          border: '1px solid rgba(118,75,162,0.2)',
                          display: 'flex', alignItems: 'flex-start', gap: '12px'
                        }}>
                          <Plane size={18} color="var(--color-primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{t.origin} → {t.destination}</div>
                            <div style={{ display: 'flex', gap: '16px', marginTop: '4px', fontSize: '0.875rem', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
                              {t.departure_time && <span>🛫 Salida: <strong>{fmtTime(t.departure_time)}</strong></span>}
                              {t.arrival_time && <span>🛬 Llegada: <strong>{fmtTime(t.arrival_time)}</strong></span>}
                              {t.notes && <span>📝 {t.notes}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── ALOJAMIENTO ACTIVO ── */}
                {(activeAccom || checkOutAccom) && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e67e22', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                      ALOJAMIENTO
                    </div>
                    {/* Check-out (si hoy es el día de salida) */}
                    {checkOutAccom && (
                      <div style={{
                        background: 'rgba(231,76,60,0.08)', borderRadius: '8px',
                        padding: '10px 14px', marginBottom: '6px',
                        border: '1px solid rgba(231,76,60,0.2)',
                        display: 'flex', alignItems: 'center', gap: '10px'
                      }}>
                        <LogOut size={16} color="#e74c3c" />
                        <div>
                          <div style={{ fontWeight: 600 }}>{checkOutAccom.name}
                            <span style={{ marginLeft: '8px', fontSize: '0.75rem', background: '#e74c3c', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>Check-out</span>
                          </div>
                          {fmtTime(checkOutAccom.check_out) && fmtTime(checkOutAccom.check_out) !== '00:00' && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Salida: {fmtTime(checkOutAccom.check_out)}</div>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Alojamiento activo (noche de hoy) */}
                    {activeAccom && (
                      <div style={{
                        background: 'rgba(46,204,113,0.08)', borderRadius: '8px',
                        padding: '10px 14px',
                        border: '1px solid rgba(46,204,113,0.2)',
                        display: 'flex', alignItems: 'center', gap: '10px'
                      }}>
                        <Bed size={16} color="#27ae60" />
                        <div>
                          <div style={{ fontWeight: 600 }}>{activeAccom.name}
                            {checkInToday && (
                              <span style={{ marginLeft: '8px', fontSize: '0.75rem', background: '#27ae60', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>Check-in</span>
                            )}
                          </div>
                          {checkInToday && fmtTime(activeAccom.check_in) && fmtTime(activeAccom.check_in) !== '00:00' && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Entrada: {fmtTime(activeAccom.check_in)}</div>
                          )}
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                            hasta el {fmtDate(activeAccom.check_out)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── ALQUILERES DE COCHE ── */}
                {dayRentals.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#27ae60', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                      ALQUILER DE COCHE
                    </div>
                    {dayRentals.map(r => {
                      const isPickupDay = new Date(r.pickup_datetime).toISOString().split('T')[0] === date.toISOString().split('T')[0];
                      const isReturnDay = r.return_datetime && new Date(r.return_datetime).toISOString().split('T')[0] === date.toISOString().split('T')[0];
                      return (
                        <div key={r.id} style={{ background: 'rgba(46,204,113,0.08)', borderRadius: '8px', padding: '10px 14px', marginBottom: '6px', border: '1px solid rgba(46,204,113,0.2)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <Key size={16} color="#27ae60" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 600 }}>
                              {r.car_model}
                              {isPickupDay && <span style={{ marginLeft: '8px', fontSize: '0.75rem', background: '#27ae60', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>Recogida</span>}
                              {isReturnDay && !isPickupDay && <span style={{ marginLeft: '8px', fontSize: '0.75rem', background: '#e74c3c', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>Devolución</span>}
                            </div>
                            {isPickupDay && r.pickup_location && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>📍 Recogida: {r.pickup_location} · {fmtTime(r.pickup_datetime)}</div>}
                            {isReturnDay && r.return_location && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>📍 Devolución: {r.return_location} · {fmtTime(r.return_datetime)}</div>}
                            {!isPickupDay && !isReturnDay && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>🚗 En uso hasta el {fmtDate(r.return_datetime)}</div>}
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Seguro: {r.insurance_type || 'básico'}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── ACTIVIDADES DEL DÍA ── */}
                {dayActivities.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                      ITINERARIO DEL DÍA
                    </div>
                    <div style={{ borderLeft: '2px solid var(--color-primary)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {dayActivities.map((place, idx) => {
                        const isConflict = conflicts.includes(idx) || conflicts.includes(idx - 1);
                        return (
                          <div key={place.id} style={{
                            background: isConflict ? 'rgba(230,126,34,0.07)' : 'var(--color-surface)',
                            borderRadius: '8px', padding: '10px 14px',
                            border: `1px solid ${isConflict ? 'rgba(230,126,34,0.3)' : 'var(--color-border)'}`,
                            display: 'flex', alignItems: 'flex-start', gap: '10px'
                          }}>
                            <MapPin size={14} color="var(--color-primary)" style={{ marginTop: '4px', flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                {place.activity_time && (
                                  <span style={{
                                    color: 'var(--color-primary)', fontWeight: 700,
                                    fontSize: '0.875rem', background: 'rgba(118,75,162,0.1)',
                                    padding: '2px 8px', borderRadius: '12px'
                                  }}>
                                    {place.activity_time}
                                  </span>
                                )}
                                <span style={{ fontWeight: 600 }}>{place.name}</span>
                                {place.visited && (
                                  <CheckCircle size={14} color="#27ae60" />
                                )}
                                {isConflict && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#e67e22', fontSize: '0.8rem' }}>
                                    <AlertTriangle size={12} /> Conflicto
                                  </span>
                                )}
                              </div>
                              {place.reason && (
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>{place.reason}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!hasContent && (
                  <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', margin: 0, fontSize: '0.9rem' }}>
                    Sin planes para este día
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
