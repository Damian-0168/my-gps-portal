import axios, { AxiosError } from 'axios';

// In development, Vite proxies /api to Traccar. In production, use env var.
const TRACCAR_API_URL = '/api';

// Admin credentials for user registration (should be in env in production)
const TRACCAR_ADMIN_EMAIL = import.meta.env.VITE_TRACCAR_USERNAME || 'admin';
const TRACCAR_ADMIN_PASSWORD = import.meta.env.VITE_TRACCAR_PASSWORD || 'admin';

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

export interface TraccarUser {
  id: number;
  name: string;
  email: string;
  administrator: boolean;
  disabled: boolean;
}

export interface TraccarLoginError {
  type: 'unauthorized' | 'cors' | 'network' | 'unknown';
  message: string;
  status?: number;
}

/**
 * Parse Traccar error to determine the type
 */
export const parseTraccarError = (error: any): TraccarLoginError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    // Network error (CORS or connectivity)
    if (!axiosError.response) {
      // Check if it's likely a CORS issue
      if (axiosError.message.includes('Network Error') || axiosError.code === 'ERR_NETWORK') {
        return {
          type: 'cors',
          message: 'CORS or network error - Traccar server may not be accessible',
        };
      }
      return {
        type: 'network',
        message: 'Cannot reach Traccar server',
      };
    }
    
    // 401 Unauthorized - wrong credentials
    if (axiosError.response.status === 401) {
      return {
        type: 'unauthorized',
        message: 'Invalid email or password',
        status: 401,
      };
    }
    
    return {
      type: 'unknown',
      message: (axiosError.response.data as any)?.message || axiosError.message,
      status: axiosError.response.status,
    };
  }
  
  return {
    type: 'unknown',
    message: error?.message || 'Unknown error',
  };
};

/**
 * Login to Traccar
 */
export const traccarLogin = async (email: string, password: string): Promise<TraccarUser> => {
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

/**
 * Logout from Traccar
 */
export const traccarLogout = async (): Promise<void> => {
  await traccarApi.delete('/session');
};

/**
 * Create a new user in Traccar (requires admin session)
 */
export const traccarCreateUser = async (email: string, password: string, name?: string): Promise<TraccarUser> => {
  const response = await traccarApi.post('/users', {
    email,
    password,
    name: name || email.split('@')[0],
    disabled: false,
  });
  return response.data;
};

/**
 * Create a new device in Traccar
 */
export const traccarCreateDevice = async (name: string, uniqueId: string, model?: string): Promise<TraccarDevice> => {
  const response = await traccarApi.post('/devices', {
    name,
    uniqueId,
    model: model || null,
    disabled: false,
    attributes: {},
  });
  return response.data;
};

/**
 * Register user in Traccar with auto-registration logic
 * 1. Try to login with admin credentials
 * 2. Create the user
 * 3. Logout admin
 * 4. Login as the new user
 */
export const traccarRegisterAndLogin = async (email: string, password: string): Promise<TraccarUser> => {
  try {
    // Step 1: Login as admin
    await traccarLogin(TRACCAR_ADMIN_EMAIL, TRACCAR_ADMIN_PASSWORD);
    
    // Step 2: Create the new user
    await traccarCreateUser(email, password);
    
    // Step 3: Logout admin
    await traccarLogout();
    
    // Step 4: Login as the new user
    const user = await traccarLogin(email, password);
    return user;
  } catch (error) {
    // Logout in case we're stuck in admin session
    try {
      await traccarLogout();
    } catch {
      // Ignore logout errors
    }
    throw error;
  }
};

/**
 * Smart login that handles auto-registration
 * - First tries to login directly
 * - If 401, attempts to auto-register the user
 */
export const traccarSmartLogin = async (
  email: string, 
  password: string,
  options?: { autoRegister?: boolean }
): Promise<{ user: TraccarUser; wasRegistered: boolean }> => {
  const { autoRegister = true } = options || {};
  
  try {
    // Try direct login first
    const user = await traccarLogin(email, password);
    return { user, wasRegistered: false };
  } catch (loginError) {
    const parsedError = parseTraccarError(loginError);
    
    // If unauthorized and auto-register is enabled, try to create the user
    if (parsedError.type === 'unauthorized' && autoRegister) {
      console.log('[Traccar] User not found, attempting auto-registration...');
      const user = await traccarRegisterAndLogin(email, password);
      return { user, wasRegistered: true };
    }
    
    // Re-throw for other error types
    throw loginError;
  }
};

export const fetchLatestPositions = async (): Promise<TraccarPosition[]> => {
  const response = await traccarApi.get<TraccarPosition[]>('/positions');
  return response.data;
};

export const fetchDevices = async (): Promise<TraccarDevice[]> => {
  const response = await traccarApi.get<TraccarDevice[]>('/devices');
  return response.data;
};
