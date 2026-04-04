import { useEffect, useCallback, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { fetchLatestPositions, fetchDevices, TraccarPosition } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useGPSStore } from '../lib/store';
import { traccarWS } from '../lib/websocket';
import { AnimatedMarker } from '../components/AnimatedMarker';
import { AddVehicleModal } from '../components/AddVehicleModal';
import { Car, Map as MapIcon, Settings, LogOut, Wifi, WifiOff, RefreshCw, Plus } from 'lucide-react';

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

export default function Dashboard() {
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  
  const { 
    vehicles, 
    positions, 
    devices, 
    isConnected, 
    isLoading, 
    error,
    setVehicles,
    setPositions,
    setDevices,
    setLoading,
    setError
  } = useGPSStore();

  // Initial data fetch
  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch vehicles from Supabase
      const { data: supabaseVehicles, error: supabaseError } = await supabase
        .from('vehicles')
        .select('*');
      
      if (supabaseError) throw supabaseError;
      setVehicles(supabaseVehicles || []);

      // 2. Fetch initial positions and devices from Traccar
      try {
        const [posList, devList] = await Promise.all([
          fetchLatestPositions(),
          fetchDevices()
        ]);

        const posMap: Record<number, TraccarPosition> = {};
        posList.forEach(p => posMap[p.deviceId] = p);
        setPositions(posMap);

        const devMap: Record<number, typeof devList[0]> = {};
        devList.forEach(d => devMap[d.id] = d);
        setDevices(devMap);
      } catch (traccarErr) {
        console.warn('[Dashboard] Traccar fetch failed:', traccarErr);
        // Don't fail completely if Traccar is down
      }

      // 3. Connect WebSocket for real-time updates
      traccarWS.connect();

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [setVehicles, setPositions, setDevices, setLoading, setError]);

  useEffect(() => {
    fetchInitialData();

    // Cleanup WebSocket on unmount
    return () => {
      traccarWS.disconnect();
    };
  }, [fetchInitialData]);

  const handleLogout = () => {
    traccarWS.disconnect();
    supabase.auth.signOut();
  };

  const handleReconnect = () => {
    traccarWS.reconnect();
  };

  return (
    <div className="flex h-screen bg-gray-50" data-testid="dashboard">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r flex flex-col shadow-sm">
        <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            <MapIcon className="w-6 h-6" /> GPS Portal
          </h2>
          <div className="flex items-center gap-2 mt-2 text-sm">
            {isConnected ? (
              <span className="flex items-center gap-1.5 text-green-200">
                <Wifi className="w-4 h-4" /> Live
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-red-200">
                <WifiOff className="w-4 h-4" /> Offline
              </span>
            )}
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Vehicles ({vehicles.length})
            </span>
            <button
              onClick={() => setShowAddVehicle(true)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
              title="Add Vehicle"
              data-testid="add-vehicle-btn"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          {vehicles.map(v => {
            const pos = positions[v.traccar_device_id];
            const dev = devices[v.traccar_device_id];
            const isOnline = dev?.status === 'online';
            
            return (
              <div 
                key={v.id} 
                className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-all border border-transparent hover:border-blue-200 hover:shadow-sm"
                data-testid={`vehicle-card-${v.id}`}
              >
                <div className="font-medium flex items-center gap-2">
                  <Car 
                    size={18} 
                    className={isOnline ? 'text-green-500' : 'text-gray-400'} 
                  />
                  <span className="truncate">{v.name}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{v.license_plate || v.model}</div>
                <div className="text-[10px] mt-1.5 text-gray-400">
                  {pos ? (
                    <span className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`} />
                      {new Date(pos.fixTime).toLocaleTimeString()}
                    </span>
                  ) : (
                    'No position data'
                  )}
                </div>
                {pos && (
                  <div className="text-[10px] mt-1 text-blue-600 font-medium">
                    {Math.round(pos.speed * 1.852)} km/h
                  </div>
                )}
              </div>
            );
          })}
          
          {vehicles.length === 0 && !isLoading && (
            <div className="text-sm text-gray-400 italic text-center py-8">
              No vehicles added yet.
              <button 
                onClick={() => setShowAddVehicle(true)}
                className="block mx-auto mt-2 text-blue-600 hover:underline"
              >
                Add your first vehicle
              </button>
            </div>
          )}
        </nav>
        
        <div className="p-4 border-t space-y-2">
          <button 
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
            data-testid="settings-btn"
          >
            <Settings size={18} /> Settings
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
            data-testid="logout-btn"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content (Map) */}
      <main className="flex-1 relative">
        <MapContainer 
          center={[0, 0]} 
          zoom={2} 
          className="h-full w-full"
          data-testid="map-container"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {vehicles.map(v => {
            const pos = positions[v.traccar_device_id];
            if (!pos) return null;
            return (
              <AnimatedMarker
                key={v.id}
                vehicle={v}
                position={pos}
                device={devices[v.traccar_device_id]}
              />
            );
          })}
          <AutoCenter positions={Object.values(positions)} />
        </MapContainer>
        
        {/* Status Overlay */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
          {isLoading && (
            <div className="bg-white px-4 py-2 rounded-full shadow-lg text-sm font-medium flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              Loading...
            </div>
          )}
          
          {!isLoading && (
            <div 
              className={`px-4 py-2 rounded-full shadow-lg text-sm font-medium flex items-center gap-2 cursor-pointer transition-all ${
                isConnected 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
              onClick={handleReconnect}
              title="Click to reconnect"
              data-testid="connection-status"
            >
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4" />
                  Live Updates
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Reconnect
                </>
              )}
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm max-w-xs">
              {error}
            </div>
          )}
        </div>
      </main>

      {/* Add Vehicle Modal */}
      <AddVehicleModal 
        isOpen={showAddVehicle} 
        onClose={() => setShowAddVehicle(false)} 
      />
    </div>
  );
}

function AutoCenter({ positions }: { positions: TraccarPosition[] }) {
  const map = useMap();
  const hasCentered = useRef(false);
  
  useEffect(() => {
    // Only auto-center on first load with data
    if (positions.length > 0 && !hasCentered.current) {
      const bounds = L.latLngBounds(positions.map(p => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      hasCentered.current = true;
    }
  }, [positions, map]);
  
  return null;
}
