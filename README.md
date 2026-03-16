# ✈️ WanderLove

**Tu compañero de viaje definitivo.** WanderLove es una aplicación web para planificar, gestionar y recordar tus aventuras en pareja o con amigos. Desde el itinerario día a día hasta el control de gastos, todo en un solo lugar con un diseño premium.

---

## 🌟 Características (v1.0)

- 🗓️ **Dashboard** con viajes próximos, cuenta atrás en tiempo real y viajes pasados
- 🗺️ **Mapa interactivo** por viaje con marcadores de lugares y estado "visitado"
- 🌍 **Mapa global** de todas tus aventuras visitadas
- 📋 **Itinerario diario** con planificación por días y marcado de visitas
- ✍️ **Diario del viaje** con valoración por estrellas y notas libres
- 🚀 **Logística completa**: vuelos, AVE, bus, ferry, coche
- 🚌 **Traslados al aeropuerto** con parking y coste del billete
- 🏨 **Alojamientos**: hotel, camper de pago, área libre
- 💰 **Control de gastos** con sincronización automática desde logística y alojamiento
- 📄 **Documentación de viaje** (checklist: pasaporte, visado, seguro, ESTA...)
- ⭐ **Recomendaciones en tiempo real** por ciudad vía OpenStreetMap
- 📷 **Galería de fotos** del viaje

---

## 🛠️ Stack Tecnológico

| Tecnología | Uso |
|---|---|
| React 19 + Vite | Frontend |
| Vanilla CSS | Estilos (sistema de diseño propio) |
| Supabase | Base de datos + Storage |
| Leaflet + React-Leaflet | Mapas interactivos |
| Lucide React | Iconografía |
| OpenStreetMap (Nominatim) | Recomendaciones de ciudades |
| Vercel | Despliegue |

---

## 🚀 Instalación Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/Paxurro1/wanderlove.git
cd wanderlove
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copia el archivo de ejemplo y rellena tus claves de Supabase:

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```env
VITE_SUPABASE_URL=https://tuproyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anon_aqui
```

> ⚠️ **IMPORTANTE**: Nunca compartas ni subas `.env.local` a ningún repositorio.

### 4. Inicializar la base de datos

Ejecuta el archivo `supabase_setup.sql` en el **SQL Editor** de tu panel de Supabase.

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

---

## 🔒 Seguridad

- Las credenciales de Supabase se gestionan exclusivamente a través de variables de entorno.
- El archivo `.env.local` está en `.gitignore` y nunca se sube al repositorio.
- En producción (Vercel), las variables se configuran en el **panel de Vercel → Settings → Environment Variables**.
- Se usa la **anon key** de Supabase (clave pública de solo lectura restringida por Row Level Security).

---

## 📦 Build de Producción

```bash
npm run build
```

El directorio `dist/` contiene los archivos listos para desplegar.

---

## 🗃️ Estructura del Proyecto

```
wanderlove/
├── src/
│   ├── components/
│   │   ├── Common/          # Modales reutilizables
│   │   ├── Expenses/        # Gastos, Transportes, Alojamientos, Docs, Review
│   │   ├── Map/             # Mapa del viaje
│   │   └── Recommendations/ # Recomendaciones por ciudad
│   ├── lib/
│   │   └── supabase.js      # Cliente de Supabase
│   └── pages/
│       ├── Dashboard.jsx    # Página principal
│       ├── TripDetails.jsx  # Vista del viaje (hub de pestañas)
│       └── AdventuresMap.jsx # Mapa global de aventuras
├── supabase_setup.sql       # Schema de la base de datos
├── .env.example             # Plantilla de variables de entorno
└── .gitignore
```

---

## 📝 Changelog

### v1.0 — Lanzamiento Inicial (Marzo 2026)

- ✅ Dashboard con viajes próximos y pasados
- ✅ Mapa por viaje con Leaflet
- ✅ Mapa global de aventuras
- ✅ Itinerario diario con marcado "visitado"
- ✅ Diario del viaje editable con estrellas
- ✅ Logística: vuelos, AVE, bus, ferry, coche
- ✅ Traslados al aeropuerto + parking
- ✅ Alojamientos: hotel, camper, área libre
- ✅ Gastos con sincronización automática de transporte y alojamiento
- ✅ Documentación checklist del viaje
- ✅ Recomendaciones en tiempo real por ciudad (Nominatim)
- ✅ Galería de fotos

---

*Hecho con ❤️ para los viajeros más aventureros.*
