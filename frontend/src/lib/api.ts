import axios from 'axios';

const TRACCAR_BASE_URL = import.meta.env.VITE_TRACCAR_BASE_URL || 'http://localhost:8082';
const TRACCAR_API_URL = `${TRACCAR_BASE_URL}/api`;

export const traccarApi = axios.create({
  baseURL: TRACCAR_API_URL,
  withCredentials: true, // Crucial for session cookies
});

export interface TraccarPosition {
  id: number;
  deviceId: number;
  protocol: string;
  serverTime: string;
  deviceTime: string;
  fixTime: string;
  outdated: boolean;
  valid: boolean;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  course: number;
  address: string | null;
  attributes: Record<string, any>;
}

export interface TraccarDevice {
  id: number;
  name: string;
  uniqueId: string;
  status: string;
  lastUpdate: string;
  positionId: number;
  groupId: number;
  phone: string | null;
  model: string | null;
  contact: string | null;
  category: string | null;
  disabled: boolean;
  attributes: Record<string, any>;
}

export const traccarLogin = async (email: string, password: string): Promise<any> => {
  const params = new URLSearchParams();
  params.append('email', email);
  params.append('password', password);
  
  const response = await traccarApi.post('/session', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return response.data;
};

export const fetchLatestPositions = async (): Promise<TraccarPosition[]> => {
  const response = await traccarApi.get<TraccarPosition[]>('/positions');
  return response.data;
};

export const fetchDevices = async (): Promise<TraccarDevice[]> => {
  const response = await traccarApi.get<TraccarDevice[]>('/devices');
  return response.data;
};
