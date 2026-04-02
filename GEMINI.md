# Hybrid GPS Portal - Instructional Context

This project is a **Hybrid GPS Tracking Platform** that separates high-frequency telemetry (Traccar) from business logic and metadata (Supabase).

## Project Overview

- **Frontend:** React + Vite + TypeScript + TailwindCSS. Located in `/frontend`.
- **GPS Engine:** Traccar (latest Docker image). Handles all hardware protocols and real-time positioning.
- **Backend/DB:** Supabase. Handles authentication, vehicle metadata, and Row Level Security (RLS).
- **Communication:** The frontend joins data from both sources: fetching vehicle lists from Supabase and live positions from the Traccar API.

## Building and Running

### GPS Engine (Traccar)
- **Start:** `docker-compose up -d`
- **Configuration:** Managed via `./traccar/traccar.xml`.
- **Logs:** Persistent volume at `./traccar/logs`.
- **API/Web:** Accessible at `http://localhost:8082`.

### Frontend (React)
- **Install Dependencies:** `npm install` (inside `/frontend`)
- **Run Development Server:** `npm run dev`
- **Build for Production:** `npm run build`
- **Linting:** `npm run lint`

### Database (Supabase)
- **Schema:** Initial SQL migrations are in `./supabase/migrations/`.
- **RLS:** Row-level security is enabled on all tables; users can only see vehicles they own (linked by `user_id`).
- **Edge Functions:** A webhook template is available in `./supabase/functions/traccar-webhook/` to handle real-time position forwarding from Traccar.

## Development Conventions

- **Data Fetching:** Fetch business metadata (vehicle name, owner) from Supabase first, then use the `traccar_device_id` to fetch live telemetry from Traccar.
- **Styling:** Use TailwindCSS and Lucide-React for icons.
- **State Management:** Simple Zustand stores or React state with useEffect for data synchronization.
- **Type Safety:** Use the interfaces defined in `frontend/src/lib/api.ts` for Traccar data.
- **Environment Variables:** Always use `.env.local` or `.env` in the frontend; see `.env.example` for required keys.

## Important Directories

- `/frontend/src/lib`: Contains `api.ts` (Traccar client) and `supabase.ts` (Supabase client).
- `/frontend/src/pages`: `Dashboard.tsx` is the primary interface combining the map and vehicle list.
- `/traccar`: Local volume for Traccar configuration and persistent database/logs.
- `/supabase/migrations`: SQL scripts for setting up the database schema and RLS policies.

## Troubleshooting & Retrying

### Shell Permission Issues
If shell commands (e.g., `docker compose up -d`) fail with `execvp(3) failed: Permission denied`, it indicates an environment-level execution restriction. Once permissions are granted, simply retry the command.

### Traccar Errors
- **Registration Conflict (Unique index violation):** If you see an `org.h2.jdbc.JdbcSQLIntegrityConstraintViolationException` for an email address like `urassadamian@gmail.com`, it means the user is already in the database. Log in instead of registering.
- **Database Reset:** If you need to clear the Traccar database, stop the container and delete the contents of `./traccar/data`.
