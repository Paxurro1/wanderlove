// ============================================================================
// ARCHIVO: main.jsx
// DESCRIPCIÓN: Punto de entrada principal de la aplicación React.
// Aquí es donde "nace" la app y se inyecta en el archivo index.html.
// ============================================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
// Importamos los estilos globales. Al hacerlo aquí, se aplican a toda la app.
import './styles/global.css';

// createRoot encuentra el elemento con id="root" en el HTML y "dibuja" (renderiza)
// nuestra aplicación <App /> dentro de él.
// <StrictMode> ayuda a detectar posibles problemas de código en desarrollo.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
