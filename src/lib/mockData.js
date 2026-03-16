// Mock data temporarily used before Supabase connection

export const mockTrips = [
  {
    id: '1',
    destination: 'Paris, France',
    start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
    end_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'upcoming',
    cover_image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&q=80&w=1000'
  },
  {
    id: '2',
    destination: 'Kyoto, Japan',
    start_date: '2023-11-10T00:00:00Z',
    end_date: '2023-11-24T00:00:00Z',
    status: 'past',
    rating: 5,
    cover_image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=1000'
  }
];

export const mockPlaces = [
  { id: 'p1', trip_id: '1', name: 'Eiffel Tower', lat: 48.8584, lng: 2.2945, reason: 'Must see!', visited: false, day_index: 2 },
  { id: 'p2', trip_id: '1', name: 'Louvre Museum', lat: 48.8606, lng: 2.3376, reason: 'Art and culture', visited: false, day_index: 3 },
  { id: 'p3', trip_id: '1', name: 'Montmartre', lat: 48.8867, lng: 2.3431, reason: 'Views and artists', visited: false, day_index: 2 }
];

export const mockExpenses = [
  { id: 'e1', trip_id: '1', category: 'Flights', amount: 850, description: 'Round trip for two' }
];

export const mockDocuments = [
  { id: 'd1', trip_id: '1', type: 'passport', name: 'Pasaporte', status: 'ready', notes: 'Caduca en 2028' },
  { id: 'd2', trip_id: '1', type: 'health_card', name: 'Tarjeta Sanitaria Europea', status: 'needed', notes: 'Solicitar renovación' }
];

export const mockTransports = [
  { id: 't1', trip_id: '1', type: 'flight', origin: 'Madrid (MAD)', destination: 'Paris (CDG)', departure_time: '2024-10-10T08:30:00Z', arrival_time: '2024-10-10T10:45:00Z', duration_mins: 135, cost: 425 },
  { id: 't2', trip_id: '1', type: 'bus', origin: 'Paris (CDG)', destination: 'Paris Center', departure_time: '2024-10-10T11:30:00Z', arrival_time: '2024-10-10T12:30:00Z', duration_mins: 60, cost: 24 }
];

export const mockAirportTransfers = [
  { id: 'at1', trip_id: '1', type: 'car', parking_name: 'Parking Larga Estancia T4', parking_cost: 45, parking_duration: '7 días', transfer_duration_mins: 30 }
];

export const mockAccommodations = [
  { id: 'a1', trip_id: '1', type: 'hotel', name: 'Hotel Le Marais', check_in: '2024-10-10', check_out: '2024-10-14', cost: 600, rating: 0, notes: 'Cerca del metro' },
  { id: 'a2', trip_id: '1', type: 'camper_free', name: 'Versailles Parking (Free)', check_in: '2024-10-14', check_out: '2024-10-17', cost: 0, rating: 0, notes: 'Aparcamiento tranquilo, sin servicios' }
];
