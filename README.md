# Hybrid GPS Portal

A production-ready starter for a GPS tracking platform using Traccar as the engine, Supabase for business logic, and React for the dashboard.

## Architecture

- **Traccar**: Handles GPS protocols, device communication, and raw position data.
- **Supabase**: Handles User Auth, Vehicle Metadata, Service Records, and Row Level Security (RLS).
- **React (Vite + TS)**: A modern dashboard for live tracking and management.

## Getting Started

### 1. Traccar Setup (Local)
```bash
docker-compose up -d
```
- Web Interface: [http://localhost:8082](http://localhost:8082)
- Default Credentials: `admin / admin`
- To add a test device: 
  1. Log in to Traccar admin.
  2. Click 'Devices' -> '+'.
  3. Set a name and a unique identifier (e.g., `123456`).
  4. Use a GPS simulator or mobile app (Traccar Client) with the same identifier and point it to your server IP on port 5055 (OsmAnd protocol).

### 2. Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com).
2. Run the SQL from `supabase/migrations/01_initial_schema.sql` in the SQL Editor.
3. Note your Project URL and Anon Key.

### 3. Frontend Setup
1. `cd frontend`
2. `cp .env.example .env`
3. Update `.env` with your Supabase credentials.
4. `npm install`
5. `npm run dev`

## Development Notes

### Vite Proxy Configuration

**Important:** In development, the frontend proxies all Traccar API calls through Vite. **Never hardcode port 8082 in frontend code.**

The Vite config (`vite.config.ts`) includes a proxy that:
- Routes `/api/*` requests to `http://localhost:8082`
- Handles WebSocket connections (`/api/socket`) for real-time updates
- Preserves session cookies with `withCredentials: true`

```typescript
// In frontend code, always use relative paths:
const response = await fetch('/api/devices');  // ✅ Correct
const response = await fetch('http://localhost:8082/api/devices');  // ❌ Wrong
```

### WebSocket Connection
The WebSocket connects to `/api/socket` which is proxied to Traccar. Features:
- Automatic reconnection with exponential backoff
- Real-time position and device status updates
- Connection status reflected in UI

## Data Flow
The dashboard fetches user vehicles from Supabase, then queries Traccar for the latest positions of those specific `traccar_device_id`s. This ensures business data (names, VINs, ownership) is kept separate from high-frequency GPS data.

## Phase 4: Webhooks (Advanced)
To receive real-time alerts in Supabase, uncomment the forwarding section in `traccar/traccar.xml` and deploy a Supabase Edge Function to handle the incoming JSON.
