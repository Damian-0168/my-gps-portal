import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { fetchLatestPositions, fetchDevices, TraccarPosition, TraccarDevice } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Car, Map as MapIcon, Settings, LogOut } from 'lucide-react';

// Fix for default marker icons in Leaflet + React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface Vehicle {
  id: string;
  name: string;
  traccar_device_id: number;
  model: string;
  license_plate: string;
}

export default function Dashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [positions, setPositions] = useState<Record<number, TraccarPosition>>({});
  const [devices, setDevices] = useState<Record<number, TraccarDevice>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch vehicles from Supabase
        const { data: supabaseVehicles, error } = await supabase
          .from('vehicles')
          .select('*');
        
        if (error) throw error;
        setVehicles(supabaseVehicles || []);

        // 2. Fetch positions and devices from Traccar
        const [posList, devList] = await Promise.all([
          fetchLatestPositions(),
          fetchDevices()
        ]);

        const posMap: Record<number, TraccarPosition> = {};
        posList.forEach(p => posMap[p.deviceId] = p);
        setPositions(posMap);

        const devMap: Record<number, TraccarDevice> = {};
        devList.forEach(d => devMap[d.id] = d);
        setDevices(devMap);

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => supabase.auth.signOut();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MapIcon className="text-blue-600" /> GPS Portal
          </h2>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Vehicles</div>
          {vehicles.map(v => (
            <div key={v.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors border border-transparent hover:border-blue-200">
              <div className="font-medium flex items-center gap-2">
                <Car size={16} className={devices[v.traccar_device_id]?.status === 'online' ? 'text-green-500' : 'text-gray-400'} />
                {v.name}
              </div>
              <div className="text-xs text-gray-500">{v.license_plate || v.model}</div>
              <div className="text-[10px] mt-1 text-gray-400">
                {positions[v.traccar_device_id] ? 
                  `Last seen: ${new Date(positions[v.traccar_device_id].fixTime).toLocaleTimeString()}` : 
                  'No position data'}
              </div>
            </div>
          ))}
          {vehicles.length === 0 && !loading && (
            <div className="text-sm text-gray-400 italic">No vehicles added yet.</div>
          )}
        </nav>
        <div className="p-4 border-t space-y-2">
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">
            <Settings size={18} /> Settings
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content (Map) */}
      <main className="flex-1 relative">
        <MapContainer center={[0, 0]} zoom={2} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {vehicles.map(v => {
            const pos = positions[v.traccar_device_id];
            if (!pos) return null;
            return (
              <Marker key={v.id} position={[pos.latitude, pos.longitude]}>
                <Popup>
                  <div className="p-1">
                    <h3 className="font-bold border-b mb-2 pb-1">{v.name}</h3>
                    <div className="text-xs space-y-1">
                      <p><strong>Speed:</strong> {Math.round(pos.speed * 1.852)} km/h</p>
                      <p><strong>Status:</strong> {devices[v.traccar_device_id]?.status || 'unknown'}</p>
                      <p><strong>Last Update:</strong> {new Date(pos.fixTime).toLocaleString()}</p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
          <AutoCenter positions={Object.values(positions)} />
        </MapContainer>
        
        {loading && (
          <div className="absolute top-4 right-4 bg-white px-4 py-2 rounded-full shadow-lg text-sm font-medium z-[1000] flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            Syncing Live Data...
          </div>
        )}
      </main>
    </div>
  );
}

function AutoCenter({ positions }: { positions: TraccarPosition[] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [positions.length === 0]); // Only center on first load with data
  return null;
}
