# Arquitectura de WanderLove

WanderLove es una aplicación web moderna diseñada para la gestión integral de viajes, permitiendo a los usuarios planificar itinerarios, gestionar alojamientos, transporte, gastos y compartir sus experiencias.

## Tech Stack

*   **Frontend**: [React](https://react.dev/) (v19) con [Vite](https://vitejs.dev/) como herramienta de construcción.
*   **Routing**: [React Router](https://reactrouter.com/) (v7) para la navegación entre páginas.
*   **Backend & DB**: [Supabase](https://supabase.com/), proporcionando base de datos PostgreSQL, autenticación y almacenamiento de archivos.
*   **Mapas**: [Leaflet](https://leafletjs.com/) y `react-leaflet` para la visualización de destinos y aventuras.
*   **Estilos**: CSS puro (Vanilla CSS) organizado por componentes y archivos globales.
*   **Iconos**: [Lucide React](https://lucide.dev/).

## Estructura del Proyecto

```text
/src
  /components       # Componentes reutilizables (Modales, Tarjetas, etc.)
    /Expenses       # Gestión de gastos y presupuestos
    /Map            # Integración con mapas
    /TripDetails    # Componentes específicos de la vista de viaje
  /lib              # Lógica central y configuración
    AuthContext.jsx # Proveedor de contexto para autenticación
    supabase.js     # Cliente de configuración de Supabase
  /pages            # Vistas principales de la aplicación (Dashboard, TripDetails, etc.)
  /styles           # Archivos CSS globales y específicos
  App.jsx           # Componente raíz con el enrutamiento
  main.jsx          # Punto de entrada de la aplicación
```

## Flujo de Datos y Autenticación

1.  **Autenticación**: Gestionada a través de `AuthContext.jsx`. La aplicación utiliza las funciones nativas de Supabase Auth. Solo usuarios autenticados pueden acceder a las rutas protegidas.
2.  **Estado Global**: Se utiliza el contexto de React para el usuario y su perfil.
3.  **Base de Datos**: Las peticiones a Supabase se realizan directamente desde los componentes o páginas usando el cliente `supabase`.
4.  **Seguridad**: Implementada mediante RLS (Row Level Security) en PostgreSQL para asegurar que los usuarios solo accedan a sus propios datos o a viajes compartidos.
