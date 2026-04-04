import { create } from 'zustand';
import { TraccarPosition, TraccarDevice } from './api';

export interface Vehicle {
  id: string;
  name: string;
  traccar_device_id: number;
  model: string;
  license_plate: string;
}

interface GPSState {
  // Data
  vehicles: Vehicle[];
  positions: Record<number, TraccarPosition>;
  devices: Record<number, TraccarDevice>;
  
  // Connection state
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  /** Short-lived message (e.g. after WebSocket reconnect) */
  connectionNotice: string | null;
  
  // Actions
  setVehicles: (vehicles: Vehicle[]) => void;
  addVehicle: (vehicle: Vehicle) => void;
  setPositions: (positions: Record<number, TraccarPosition>) => void;
  updatePosition: (position: TraccarPosition) => void;
  setDevices: (devices: Record<number, TraccarDevice>) => void;
  updateDevice: (device: TraccarDevice) => void;
  setConnectionStatus: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setConnectionNotice: (message: string | null) => void;
}

export const useGPSStore = create<GPSState>((set) => ({
  // Initial state
  vehicles: [],
  positions: {},
  devices: {},
  isConnected: false,
  isLoading: true,
  error: null,
  connectionNotice: null,
  
  // Actions
  setVehicles: (vehicles) => set({ vehicles }),

  addVehicle: (vehicle) => set((state) => ({
    vehicles: [...state.vehicles, vehicle],
  })),
  
  addVehicle: (vehicle) => set((state) => ({
    vehicles: [...state.vehicles, vehicle],
  })),
  
  setPositions: (positions) => set({ positions }),
  
  updatePosition: (position) => set((state) => ({
    positions: {
      ...state.positions,
      [position.deviceId]: position,
    },
  })),
  
  setDevices: (devices) => set({ devices }),
  
  updateDevice: (device) => set((state) => ({
    devices: {
      ...state.devices,
      [device.id]: device,
    },
  })),
  
  setConnectionStatus: (isConnected) => set({ isConnected }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),

  setConnectionNotice: (connectionNotice) => set({ connectionNotice }),
}));
