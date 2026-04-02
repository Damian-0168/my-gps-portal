-- 1. Create Tables
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    traccar_device_id INTEGER UNIQUE NOT NULL, -- ID from Traccar
    name TEXT NOT NULL,
    vin TEXT,
    make TEXT,
    model TEXT,
    year INTEGER,
    color TEXT,
    license_plate TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE service_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
    service_date DATE NOT NULL,
    description TEXT NOT NULL,
    cost DECIMAL(10, 2),
    mileage INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_records ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Users can only see their own vehicles
CREATE POLICY "Users can view their own vehicles" 
ON vehicles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vehicles" 
ON vehicles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vehicles" 
ON vehicles FOR UPDATE 
USING (auth.uid() = user_id);

-- Service records inherit protection via the vehicle link
CREATE POLICY "Users can view service records of their vehicles" 
ON service_records FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM vehicles 
        WHERE vehicles.id = service_records.vehicle_id 
        AND vehicles.user_id = auth.uid()
    )
);

-- 4. Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vehicles_updated_at
BEFORE UPDATE ON vehicles
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
