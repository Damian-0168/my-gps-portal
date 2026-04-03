-- Position history table for archived GPS data from Traccar
CREATE TABLE IF NOT EXISTS position_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    traccar_device_id INTEGER NOT NULL,
    traccar_position_id BIGINT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    altitude DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    course DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    address TEXT,
    attributes JSONB,
    fix_time TIMESTAMPTZ NOT NULL,
    server_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geofence events table
CREATE TABLE IF NOT EXISTS geofence_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    traccar_device_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    geofence_id INTEGER,
    geofence_name TEXT,
    event_time TIMESTAMPTZ NOT NULL,
    position_latitude DOUBLE PRECISION,
    position_longitude DOUBLE PRECISION,
    attributes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_position_history_vehicle_time 
ON position_history(vehicle_id, fix_time DESC);

CREATE INDEX IF NOT EXISTS idx_position_history_device_time 
ON position_history(traccar_device_id, fix_time DESC);

CREATE INDEX IF NOT EXISTS idx_geofence_events_vehicle_time 
ON geofence_events(vehicle_id, event_time DESC);

-- Enable RLS
ALTER TABLE position_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for position_history
CREATE POLICY "Users can view position history of their vehicles" 
ON position_history FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM vehicles 
        WHERE vehicles.id = position_history.vehicle_id 
        AND vehicles.user_id = auth.uid()
    )
);

-- Allow service role to insert (for webhooks)
CREATE POLICY "Service role can insert position history" 
ON position_history FOR INSERT 
WITH CHECK (true);

-- RLS Policies for geofence_events
CREATE POLICY "Users can view geofence events of their vehicles" 
ON geofence_events FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM vehicles 
        WHERE vehicles.id = geofence_events.vehicle_id 
        AND vehicles.user_id = auth.uid()
    )
);

CREATE POLICY "Service role can insert geofence events" 
ON geofence_events FOR INSERT 
WITH CHECK (true);
