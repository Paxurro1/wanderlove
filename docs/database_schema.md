# Esquema de la Base de Datos

WanderLove utiliza PostgreSQL alojado en Supabase. El diseño está normalizado para gestionar viajes y todos sus componentes asociados.

## Tablas Principales

### `trips` (Viajes)
La tabla central que almacena la información básica de cada viaje.
*   `id`: UUID (Primary Key)
*   `destination`: Nombre del destino.
*   `start_date` / `end_date`: Fechas del viaje.
*   `status`: 'upcoming' (próximo) o 'past' (pasado).
*   `cover_image`: URL de la imagen de portada.
*   `user_id`: UUID del propietario (vinculado a `auth.users`).

### `places` (Lugares/Aventuras)
Destinos específicos dentro de un viaje para mostrar en el mapa.
*   `trip_id`: Relación 1:N con `trips`.
*   `lat`, `lng`: Coordenadas geográficas.
*   `visited`: Estado de visita.

### `accommodations` (Alojamientos)
Gestión de hoteles, cámpers, etc.
*   `type`: 'hotel', 'camper_paid', 'camper_free'.
*   `cost`: Coste asociado.
*   `check_in` / `check_out`: Fechas de estancia.

### `transports` (Transporte)
Vuelos, trenes, autobuses, etc.
*   `type`: 'flight', 'bus', 'train', 'ave', 'ferry', etc.
*   `origin` / `destination`: Ruta.
*   `departure_time` / `arrival_time`: Horarios.

### `airport_transfers` (Logística)
Traslados al aeropuerto, parkings y billetes.
*   `type`: 'car', 'ave', 'bus'.
*   `parking_name`, `parking_cost`, `parking_duration`.

### `expenses` (Gastos)
Control de costes del viaje.
*   `category`: Categoría del gasto.
*   `amount`: Importe.
*   `payer_id`: Quién pagó el gasto.

### `profiles` (Perfiles de Usuario)
Información adicional de los usuarios.
*   `id`: UUID (vinculado a `auth.users`).
*   `full_name`, `avatar_url`.

## Relaciones

Las tablas (`places`, `accommodations`, `transports`, `expenses`, `documents`) tienen una relación **CASCADE DELETE** con `trips`. Si se borra un viaje, se borra toda su información asociada automáticamente.

## Seguridad (RLS)

Todas las tablas tienen políticas de **Row Level Security** habilitadas:
*   **SELECT**: Los usuarios pueden ver sus propios viajes y aquellos que han sido marcados como públicos.
*   **INSERT/UPDATE/DELETE**: Solo el propietario del viaje (`user_id`) tiene permisos para modificar los datos.
