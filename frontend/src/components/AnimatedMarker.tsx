import { useEffect, useRef, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { TraccarPosition, TraccarDevice } from '../lib/api';
import { Vehicle } from '../lib/store';

interface AnimatedMarkerProps {
  vehicle: Vehicle;
  position: TraccarPosition;
  device?: TraccarDevice;
}

// Animation duration in ms
const ANIMATION_DURATION = 1000;

export function AnimatedMarker({ vehicle, position, device }: AnimatedMarkerProps) {
  const [displayPosition, setDisplayPosition] = useState<[number, number]>([
    position.latitude,
    position.longitude,
  ]);
  const prevPositionRef = useRef<[number, number]>([position.latitude, position.longitude]);
  const animationRef = useRef<number | null>(null);
  
  useEffect(() => {
    const targetLat = position.latitude;
    const targetLng = position.longitude;
    const startLat = prevPositionRef.current[0];
    const startLng = prevPositionRef.current[1];
    
    // Skip animation if positions are the same
    if (startLat === targetLat && startLng === targetLng) {
      return;
    }
    
    // Skip animation for large jumps (teleportation scenario)
    const distance = Math.sqrt(
      Math.pow(targetLat - startLat, 2) + Math.pow(targetLng - startLng, 2)
    );
    if (distance > 0.1) { // ~11km threshold
      setDisplayPosition([targetLat, targetLng]);
      prevPositionRef.current = [targetLat, targetLng];
      return;
    }
    
    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    let startTime: number | null = null;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
      
      // Easing function for smooth movement
      const easeProgress = easeOutCubic(progress);
      
      const currentLat = startLat + (targetLat - startLat) * easeProgress;
      const currentLng = startLng + (targetLng - startLng) * easeProgress;
      
      setDisplayPosition([currentLat, currentLng]);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        prevPositionRef.current = [targetLat, targetLng];
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [position.latitude, position.longitude]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const speedKmh = Math.round(position.speed * 1.852);
  const isOnline = device?.status === 'online';
  
  return (
    <Marker position={displayPosition}>
      <Popup>
        <div className="p-1 min-w-[180px]">
          <h3 className="font-bold text-base border-b mb-2 pb-1 flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
            />
            {vehicle.name}
          </h3>
          <div className="text-xs space-y-1.5">
            {vehicle.license_plate && (
              <p className="text-gray-600">{vehicle.license_plate}</p>
            )}
            <p>
              <strong>Speed:</strong> {speedKmh} km/h
            </p>
            <p>
              <strong>Status:</strong>{' '}
              <span className={isOnline ? 'text-green-600' : 'text-gray-500'}>
                {device?.status || 'unknown'}
              </span>
            </p>
            <p>
              <strong>Last Update:</strong>{' '}
              {new Date(position.fixTime).toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-400">
              {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
            </p>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// Easing function for smooth deceleration
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
