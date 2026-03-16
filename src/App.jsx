// ============================================================================
// ARCHIVO: App.jsx
// DESCRIPCIÓN: Componente Raíz de Enrutamiento (Router).
// Se encarga de decidir qué "Página" mostrar dependiendo de la URL en la que
// se encuentre el usuario (ej. /trip/1 mostrará TripDetails).
// ============================================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import TripDetails from './pages/TripDetails';
import AdventuresMap from './pages/AdventuresMap';

function App() {
  return (
    // BrowserRouter "escucha" la barra de direcciones del navegador
    <BrowserRouter>
      {/* Contenedor principal que envuelve a toda la app para dar padding y estilos base */}
      <div className="app-container">
        {/* Routes envuelve todas las posibles rutas de nuestra aplicación */}
        <Routes>
          {/* Ruta base (Homepage): Si el usuario entra a "/", muestra el Dashboard */}
          <Route path="/" element={<Dashboard />} />
          
          {/* Ruta Dinámica: El ":id" significa que cualquier cosa que vaya después 
              de /trip/ (ej. /trip/123) se capturará como una variable llamada "id".
              Luego, el componente TripDetails leerá ese ID para buscar el viaje correcto. */}
          <Route path="/trip/:id" element={<TripDetails />} />
          
          {/* Nueva ruta para el Mapa Global de Aventuras */}
          <Route path="/adventures-map" element={<AdventuresMap />} />
          
          {/* Ruta Comodín (Fallback): Si alguien intenta entrar a una URL que no 
              existe (ej. /ajustes), lo redirigimos automáticamente (Navigate) a "/" */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
