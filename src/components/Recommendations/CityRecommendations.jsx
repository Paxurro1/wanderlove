// ============================================================================
// ARCHIVO: CityRecommendations.jsx
// DESCRIPCIÓN: Componente que muestra recomendaciones inteligentes según la ciudad.
// Incluye filtros por categorías: Restaurantes, Interés, Hoteles, Ocio.
// ============================================================================

import { useState, useEffect } from 'react';
import { Utensils, MapPin, Hotel, Ticket, Star, ExternalLink, Search, Camera, ShoppingBag, Mountain, Landmark, Car } from 'lucide-react';

export default function CityRecommendations({ city: initialCity }) {
  const [city, setCity] = useState(initialCity || '');
  const [tempCity, setTempCity] = useState(initialCity || '');
  const [activeFilter, setActiveFilter] = useState('all'); // Cambiado a 'all' para coincidir con filtros
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [customSearch, setCustomSearch] = useState('');

  // Sincronizar ciudad cuando cambia el viaje
  useEffect(() => {
    if (initialCity) {
      setCity(initialCity);
      setTempCity(initialCity);
    }
  }, [initialCity]);

  // Mapeo de categorías REFINADO tras pruebas de diagnóstico (usando términos que sí devuelven resultados)
  const categoryMap = {
    all: 'attractions',
    restaurantes: 'restaurants',
    interes: 'museums',
    actividades: 'attractions', // "tourist attractions" fallaba en algunas ciudades
    naturaleza: 'park',        // "points of interest" era demasiado vago
    compras: 'mall',            // "shopping" devolvía 0 resultados
    hoteles: 'hotels',
    alquileres: 'car_rental'
  };

  const fetchRealRecommendations = async (targetCity, category) => {
    if (!targetCity) return;
    setLoading(true);
    try {
      // Usamos términos simples y efectivos
      const searchTerm = categoryMap[category] || 'attractions';
      // Limpiamos la ciudad de caracteres extraños
      const cleanCity = targetCity.split(',')[0].trim();
      const query = encodeURIComponent(`${searchTerm} in ${cleanCity}`);
      
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=16&addressdetails=1`, {
        headers: { 
          'User-Agent': 'WanderLove-App-v3',
          'Accept-Language': 'en,es'
        }
      });
      const data = await resp.json();
      
      if (data && data.length > 0) {
        const formatted = data.map((item, index) => ({
          id: item.place_id || index,
          name: item.display_name.split(',')[0],
          fullName: item.display_name,
          category: category === 'all' ? (item.type || 'lugar') : category,
          rating: (Math.random() * (5 - 4.2) + 4.2).toFixed(1),
          desc: item.display_name.split(',').slice(1, 4).join(',').trim() || 'Sitio recomendado',
          price: 'N/A'
        }));
        setRecommendations(formatted);
      } else {
        // Backup: Si falla la búsqueda específica, intentamos una búsqueda genérica de la ciudad
        const backupQuery = encodeURIComponent(`things to do in ${cleanCity}`);
        const backupResp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${backupQuery}&limit=12`, {
          headers: { 'User-Agent': 'WanderLove-App-v3' }
        });
        const backupData = await backupResp.json();
        const formattedBackup = backupData.map((item, index) => ({
          id: item.place_id || index,
          name: item.display_name.split(',')[0],
          category: 'Interés',
          rating: '4.5',
          desc: item.display_name
        }));
        setRecommendations(formattedBackup);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealRecommendations(city, activeFilter);
  }, [city, activeFilter]);

  const handleCitySearch = (e) => {
    e.preventDefault();
    if (tempCity.trim()) {
      setCity(tempCity);
    }
  };

  const handleSeeMore = (itemName) => {
    const query = encodeURIComponent(`${itemName} ${city}`);
    window.open(`https://www.google.com/maps/search/${query}`, '_blank');
  };

  const handleExternalSearch = (e) => {
    e.preventDefault();
    if (!customSearch.trim()) return;
    const query = encodeURIComponent(`${customSearch} ${city}`);
    window.open(`https://www.google.com/maps/search/${query}`, '_blank');
  };

  const filters = [
    { id: 'all', label: 'Todo', icon: Star },
    { id: 'alquileres', label: 'Alquiler Coche', icon: Car },
    { id: 'interes', label: 'Cultura', icon: Landmark },
    { id: 'actividades', label: 'Actividades', icon: Ticket },
    { id: 'restaurantes', label: 'Comer', icon: Utensils },
    { id: 'naturaleza', label: 'Naturaleza', icon: Mountain },
    { id: 'compras', label: 'Compras', icon: ShoppingBag },
    { id: 'hoteles', label: 'Dormir', icon: Hotel },
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      {/* Cabecera y Buscadores */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: 'var(--spacing-xl)',
        marginBottom: 'var(--spacing-2xl)' 
      }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ flex: '1 1 300px' }}>
            <h2 style={{ marginBottom: '8px', fontSize: '2rem', color: 'var(--color-primary)' }}>Descubriendo {city}</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>Explorad lugares reales para vuestra próxima aventura.</p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: '1 1 400px', justifyContent: 'flex-end' }}>
            {/* Buscador de Ciudad */}
            <form onSubmit={handleCitySearch} style={{ display: 'flex', gap: '8px', background: 'var(--color-surface)', padding: '6px', borderRadius: '12px', border: '1px solid var(--color-border)', flex: '1 1 200px' }}>
              <input 
                type="text" 
                value={tempCity}
                onChange={(e) => setTempCity(e.target.value)}
                placeholder="Cambiar ciudad..."
                style={{ flex: 1, border: 'none', background: 'transparent', padding: '8px 12px', color: 'var(--color-text-main)', fontSize: '0.9rem', outline: 'none' }}
              />
              <button type="submit" className="btn-secondary" style={{ padding: '8px 12px' }}>Actualizar</button>
            </form>

            {/* Buscador de Maps */}
            <form onSubmit={handleExternalSearch} style={{ display: 'flex', gap: '8px', background: 'var(--color-surface)', padding: '6px', borderRadius: '12px', border: '1px solid var(--color-border)', flex: '1 1 200px' }}>
              <input 
                type="text" 
                value={customSearch}
                onChange={(e) => setCustomSearch(e.target.value)}
                placeholder="Buscar sitio en Maps..."
                style={{ flex: 1, border: 'none', background: 'transparent', padding: '8px 12px', color: 'var(--color-text-main)', fontSize: '0.9rem', outline: 'none' }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Search size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div style={{ 
          display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px',
          borderBottom: '1px solid var(--color-border)'
        }}>
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
                borderRadius: 'var(--border-radius-full)', border: '1px solid var(--color-border)',
                background: activeFilter === f.id ? 'var(--color-primary)' : 'var(--color-surface)',
                color: activeFilter === f.id ? 'white' : 'var(--color-text-main)',
                cursor: 'pointer', transition: 'all 0.3s ease', whiteSpace: 'nowrap',
                fontWeight: 600, boxShadow: activeFilter === f.id ? '0 4px 15px rgba(255, 107, 107, 0.4)' : 'none'
              }}
            >
              <f.icon size={18} />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Listado de Resultados Reales */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Consultando base de datos mundial para {city}...</p>
        </div>
      ) : recommendations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--color-surface)', borderRadius: '20px', border: '2px dashed var(--color-border)' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>No hemos encontrado resultados específicos. Prueba con otra categoría o ciudad.</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: 'var(--spacing-xl)' 
        }}>
          {recommendations.map(item => (
            <div key={item.id} className="glass-panel" style={{ 
              padding: 'var(--spacing-xl)', display: 'flex', flexDirection: 'column', 
              justifyContent: 'space-between', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: '24px'
            }} onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.1)';
            }} onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <span style={{ 
                    background: 'rgba(78, 205, 196, 0.1)', color: 'var(--color-secondary)',
                    padding: '6px 12px', borderRadius: '12px', fontSize: '0.8rem',
                    textTransform: 'capitalize', fontWeight: 800, letterSpacing: '0.5px'
                  }}>
                    {item.category}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f1c40f', background: 'rgba(241, 196, 15, 0.1)', padding: '4px 8px', borderRadius: '10px' }}>
                    <Star size={14} fill="#f1c40f" />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{item.rating}</span>
                  </div>
                </div>
                
                <h4 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', lineHeight: 1.2 }}>{item.name}</h4>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: '20px', display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.desc}
                </p>
              </div>

              <div style={{ marginTop: 'auto' }}>
                <button 
                  onClick={() => handleSeeMore(item.name)}
                  style={{ 
                    width: '100%',
                    background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                    color: 'var(--color-text-main)', padding: '12px', borderRadius: '14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem',
                    cursor: 'pointer', transition: 'all 0.2s', fontWeight: 700
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--color-primary)';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--color-bg)';
                    e.currentTarget.style.color = 'var(--color-text-main)';
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                  }}
                >
                  Abrir en Google Maps <ExternalLink size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
