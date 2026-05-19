# Eco Carpool

Skeleton monorepo for an eco-friendly carpool web app.

## Apps

- `apps/web`: React + Vite frontend.
- `apps/api`: NestJS backend API.
- `services/routes`: Python FastAPI route estimation service.
- `packages/shared`: Shared TypeScript DTOs and response types.

## Setup

```bash
npm install
python3 -m venv services/routes/.venv
services/routes/.venv/bin/pip install -r services/routes/requirements.txt
cp .env.example .env
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
cp services/routes/.env.example services/routes/.env
```

## Development

```bash
npm run dev
```

Run services individually:

```bash
npm run dev:web
npm run dev:api
npm run dev:routes
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`
- Route service: `http://localhost:8001`

## Checks

```bash
npm run typecheck
npm run build
```
