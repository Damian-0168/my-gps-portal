# Hybrid GPS Tracking Portal - PRD

## Original Problem Statement
Build a high-performance GPS tracking dashboard combining:
- **Traccar** for live telemetry and real-time positioning
- **Supabase** for business logic, user auth, and metadata storage

### User Requirements (April 3, 2026)
1. **Phase 1 - Foundation**: Fix Supabase credentials and get frontend running
2. **Phase 2 - Real-time**: Replace 10s polling with WebSocket updates, smooth marker animation, Zustand state
3. **Phase 3 - Data Pipeline**: Complete Traccar→Supabase webhook forwarding for history archiving

## Architecture

### Tech Stack
- **Frontend**: React 18 + Vite 5 + TypeScript + Tailwind CSS
- **State Management**: Zustand
- **Maps**: Leaflet + react-leaflet
- **GPS Engine**: Traccar (Docker) on port 8082
- **Backend**: Supabase (Auth, Database, Edge Functions)

### Data Flow
```
GPS Device → Traccar (8082) → WebSocket → Frontend (3000)
                           ↓
                    Webhook → Supabase Edge Function → position_history table
```

## User Personas

### Fleet Manager
- Monitor multiple vehicles in real-time
- View position history and analytics
- Set up geofence alerts

### Driver
- Check vehicle status
- View service records

## Core Requirements (Static)

### Authentication
- [x] Supabase Auth integration
- [x] Parallel login to Traccar for session cookies
- [ ] Password reset flow
- [ ] Role-based access (admin/user)

### Real-time Tracking
- [x] WebSocket connection to Traccar
- [x] Auto-reconnect with exponential backoff
- [x] Smooth marker animation (no jumping)
- [x] Connection status indicator

### Data Storage
- [x] Vehicle metadata in Supabase
- [x] Position history schema
- [x] Geofence events schema
- [x] Webhook Edge Function

## What's Been Implemented

### April 3, 2026
- ✅ Fixed Vite configuration (allowedHosts, tsconfig.node.json, postcss.config.js)
- ✅ Updated Supabase credentials in .env
- ✅ Created Zustand store for global state management
- ✅ Implemented WebSocket service with auto-reconnect
- ✅ Created AnimatedMarker component with smooth CSS transitions
- ✅ Updated Dashboard with real-time updates and connection status
- ✅ Created position_history and geofence_events database schema
- ✅ Implemented traccar-webhook Edge Function
- ✅ Updated traccar.xml with webhook configuration instructions
- ✅ Added TypeScript type declarations (vite-env.d.ts)

### April 3, 2026 (Bug Fix)
- ✅ Fixed Traccar connection failed error with smart login
- ✅ Added auto-registration logic for Traccar users
- ✅ Implemented parseTraccarError for better error classification
- ✅ Added traccarSmartLogin with fallback to auto-register
- ✅ Updated Auth.tsx with improved UX (loading states, error messages)
- ✅ Fixed CORS config in traccar.xml with explicit preview URL

### April 4, 2026 (WebSocket & Add Vehicle Fix)
- ✅ Added Vite proxy configuration for /api with WebSocket support (ws: true)
- ✅ Changed API from hardcoded localhost:8082 to relative /api paths
- ✅ Updated WebSocket to use buildWebSocketUrl() for proxy compatibility
- ✅ Added traccarCreateDevice function for device registration
- ✅ Created AddVehicleModal component with Traccar + Supabase integration
- ✅ Added addVehicle action to Zustand store
- ✅ Updated Dashboard with Add Vehicle button (+)
- ✅ Updated README with Vite proxy documentation

## Prioritized Backlog

### P0 (Critical)
- [x] Frontend loads correctly
- [x] Auth flow works
- [x] Real-time WebSocket updates

### P1 (High Priority)
- [ ] Enable webhook in traccar.xml with real credentials
- [ ] Deploy Supabase Edge Function
- [ ] Test full data pipeline

### P2 (Medium Priority)
- [ ] Position history playback UI
- [ ] Vehicle management CRUD
- [ ] Geofence management UI

### P3 (Low Priority)
- [ ] Analytics dashboard
- [ ] Mobile responsiveness improvements
- [ ] Dark mode theme

## Next Tasks
1. Deploy Supabase Edge Function: `supabase functions deploy traccar-webhook`
2. Enable webhook forwarding in traccar.xml
3. Add test user and vehicle in Supabase
4. Test full end-to-end flow with real GPS device
