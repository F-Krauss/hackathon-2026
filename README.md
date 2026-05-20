# GoPath

GoPath es un MVP de hackathon para movilidad urbana sustentable. La plataforma permite comparar rutas por tiempo, costo y CO2, publicar viajes compartidos, solicitar lugares en carpool y consultar estadisticas de ahorro ambiental.

## Stack

- `apps/web`: frontend en React, Vite y Supabase Auth.
- `apps/api`: API en NestJS con modulos de perfiles, vehiculos, rutas, viajes, carpools, estadisticas y recompensas.
- `services/agent`: servicio FastAPI para comparacion de rutas, optimizacion y sugerencias de matches.
- `packages/shared`: tipos TypeScript compartidos entre frontend y backend.
- `supabase/migrations`: esquema de base de datos del MVP.

## Requisitos

- Node.js compatible con npm workspaces.
- npm `11.x`.
- Python `3.11+`.
- Una instancia de Supabase configurada con las migraciones del repositorio.

## Configuracion

Instala dependencias:

```bash
npm install
python3 -m venv services/agent/.venv
services/agent/.venv/bin/pip install -r services/agent/requirements.txt
```

Crea los archivos de entorno:

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
cp services/agent/.env.example services/agent/.env
```

Variables principales:

- `VITE_API_BASE_URL`: URL del backend para el frontend.
- `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`: credenciales publicas de Supabase.
- `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`: credenciales usadas por la API.
- `AGENT_SERVICE_URL`: URL del servicio FastAPI.
- `MOCK_ROUTE_OPTIMIZATION`: usa datos simulados cuando esta en `true`.

## Desarrollo

Levanta todo el monorepo:

```bash
npm run dev
```

Servicios por separado:

```bash
npm run dev:web
npm run dev:api
npm run dev:agent
```

URLs locales por defecto:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`
- Agent service: `http://localhost:8001`

## Scripts

```bash
npm run typecheck
npm run build
npm run preview:web
npm run start:api
```

## Funcionalidades

- Autenticacion por magic link con Supabase.
- Perfil de usuario con preferencias de ruta, bicicleta y vehiculo.
- Registro de vehiculos con asientos, tipo de combustible y eficiencia.
- Comparacion de rutas por rapidez, costo, emisiones y balance general.
- Publicacion de ofertas de carpool de una sola vez.
- Rutas diarias recurrentes con suscripciones de pasajeros.
- Sugerencias de matches por cercania de origen y destino.
- Historial de viajes, estadisticas de ahorro y recompensas.
- Calculo estimado de costo de gasolina, costo por persona, CO2 emitido y CO2 ahorrado.

## API

El backend expone modulos para:

- `/health`
- `/profiles`
- `/vehicles`
- `/routes`
- `/rides`
- `/carpools`
- `/daily-routes`
- `/trips`
- `/stats`
- `/rewards`

Las rutas protegidas esperan un token Bearer de Supabase.

## Base De Datos

Aplica las migraciones desde `supabase/migrations` en tu proyecto de Supabase antes de usar los flujos autenticados.

## Despliegue

- Frontend: build de Vercel con `npm run build -w @eco-carpool/web`, salida en `apps/web/dist`.
- API: Dockerfile raiz preparado para Cloud Run.
- Agent: `services/agent/Dockerfile` preparado para Cloud Run.
- Proyecto de Google Cloud usado por defecto: `hackathon-2026-496821`.
- Servicios esperados: `gopath-api` y `gopath-agent`.
