# Project: Hybrid GPS Tracking Portal
**Goal:** A high-performance tracking dashboard combining Traccar (Live Telemetry) and Supabase (Business Logic & Metadata).

## 🏗️ Architecture Summary
- **Frontend:** React + Vite + TypeScript.
- **GPS Engine (Traccar):** Dockerized service on `:8082`. Handles protocols and real-time positioning.
- **Backend (Supabase):** Handles user auth, vehicle metadata, and geofence logic via Edge Functions.
- **Integration:** The frontend joins data by fetching vehicle lists from Supabase and live telemetry from Traccar.

## 🚀 Current Status (as of April 2, 2026)
- ✅ **Supabase Connection:** Integrated and used for Auth and Vehicle metadata.
- ✅ **Traccar Engine:** Deployed via Docker with CORS enabled for `localhost:5173`.
- ✅ **Auth Sync:** 401 Unauthorized errors fixed by implementing parallel login. Logging into the Portal now triggers a Traccar session (`/api/session`) with `withCredentials: true`.
- ✅ **Dashboard:** Basic map display (Leaflet) with vehicle markers and live sync every 10s.

## 🛠️ Dev Guidelines for Token Efficiency
1. **Focus Files:** 
   - `frontend/src/lib/api.ts` (Traccar Client)
   - `frontend/src/pages/Dashboard.tsx` (Main View)
   - `traccar/traccar.xml` (Engine Config)
2. **Ignore:** `node_modules/`, `traccar/data/`, and `traccar/logs/` (added to `.gitignore`).
3. **Workflow:** 
   - Metadata changes -> Supabase.
   - Telemetry/Device changes -> Traccar.

## ⚠️ Known Issues / Next Steps
- Implement real-time websocket updates instead of 10s polling.
- Complete the Traccar -> Supabase webhook forwarding for history archiving.
