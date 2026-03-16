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
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Friends from './pages/Friends';
import ResetPassword from './pages/ResetPassword';
import { AuthProvider, useAuth } from './lib/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="loading-screen">Cargando...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/trip/:id" element={<ProtectedRoute><TripDetails /></ProtectedRoute>} />
            <Route path="/adventures-map" element={<ProtectedRoute><AdventuresMap /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
