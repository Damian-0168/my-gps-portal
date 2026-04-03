# Project: Hybrid GPS Tracking Portal
**Goal:** A high-performance tracking dashboard combining Traccar (Live Telemetry) and Supabase (Business Logic & Metadata).

## Architecture Summary
- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **GPS Engine (Traccar):** Dockerized service on `:8082`. Handles protocols and real-time positioning.
- **Backend (Supabase):** Handles user auth, vehicle metadata, position history, and geofence events via Edge Functions.
- **Integration:** The frontend joins data by fetching vehicle lists from Supabase and live telemetry from Traccar via WebSocket.

## Current Status (as of April 3, 2026)

### Phase 1: Foundation
- ✅ **Supabase Connection:** Integrated with proper credentials
- ✅ **Traccar Engine:** Deployed via Docker with CORS enabled
- ✅ **Auth Sync:** Parallel login to both Supabase and Traccar
- ✅ **Vite Configuration:** Fixed `allowedHosts`, `tsconfig.node.json`, and `postcss.config.js`

### Phase 2: Real-time (WebSockets)
- ✅ **Zustand Store:** Global state management for vehicles, positions, devices
- ✅ **WebSocket Service:** Auto-reconnect with exponential backoff
- ✅ **Smooth Marker Animation:** CSS animation with easing for fluid marker movement
- ✅ **Connection Status UI:** Live/Offline indicator with reconnect button

### Phase 3: Data Pipeline (Webhooks)
- ✅ **Position History Table:** Schema created in `migrations/20260403000000_position_history.sql`
- ✅ **Geofence Events Table:** Schema for storing geofence enter/exit events
- ✅ **Edge Function:** Complete `traccar-webhook` function for receiving Traccar events
- ⏳ **Webhook Activation:** Requires uncommenting config in `traccar.xml` (see instructions below)

## Key Files

### Frontend
- `frontend/src/lib/store.ts` - Zustand global state
- `frontend/src/lib/websocket.ts` - Traccar WebSocket client with auto-reconnect
- `frontend/src/components/AnimatedMarker.tsx` - Smooth animated map markers
- `frontend/src/pages/Dashboard.tsx` - Main dashboard with real-time updates
- `frontend/src/lib/api.ts` - Traccar REST API client

### Backend (Supabase)
- `supabase/migrations/20260401000000_initial_schema.sql` - Vehicles, service records
- `supabase/migrations/20260403000000_position_history.sql` - Position history, geofence events
- `supabase/functions/traccar-webhook/index.ts` - Webhook handler for Traccar events

### Traccar
- `traccar/traccar.xml` - Engine configuration with webhook setup instructions

## Enabling Webhook Forwarding

To activate the Traccar → Supabase webhook pipeline:

1. **Deploy the Edge Function:**
   ```bash
   cd supabase
   supabase functions deploy traccar-webhook
   ```

2. **Update `traccar/traccar.xml`:**
   Uncomment and configure:
   ```xml
   <entry key='event.forward.enable'>true</entry>
   <entry key='event.forward.url'>https://vxabocjympwjqjymvjzz.supabase.co/functions/v1/traccar-webhook</entry>
   <entry key='event.forward.header'>Authorization: Bearer YOUR_SUPABASE_ANON_KEY</entry>
   <entry key='event.forward.json'>true</entry>
   ```

3. **Restart Traccar:**
   ```bash
   docker-compose restart traccar
   ```

## Dev Guidelines for Token Efficiency
1. **Focus Files:** 
   - `frontend/src/lib/api.ts` (Traccar Client)
   - `frontend/src/lib/store.ts` (Global State)
   - `frontend/src/lib/websocket.ts` (WebSocket)
   - `frontend/src/pages/Dashboard.tsx` (Main View)
   - `traccar/traccar.xml` (Engine Config)
2. **Ignore:** `node_modules/`, `traccar/data/`, and `traccar/logs/` (added to `.gitignore`).
3. **Workflow:** 
   - Metadata changes → Supabase
   - Telemetry/Device changes → Traccar

## Next Steps / Backlog
- [ ] Position history playback UI (show vehicle trail on map)
- [ ] Geofence management UI (create/edit/delete geofences)
- [ ] Alerts/notifications for geofence events
- [ ] Vehicle management CRUD in the portal
- [ ] Analytics dashboard (distance traveled, speed averages)
