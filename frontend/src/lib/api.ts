import axios, { AxiosError } from 'axios';

// In development, Vite proxies /api to Traccar. In production, use env var.
const TRACCAR_API_URL = '/api';
/** In dev, use `/api` so Vite proxies to Traccar. Set VITE_TRACCAR_BASE_URL to override (e.g. direct server URL). */
function getTraccarApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_TRACCAR_BASE_URL;
  if (fromEnv != null && String(fromEnv).trim() !== '') {
    return `${String(fromEnv).replace(/\/$/, '')}/api`;
  }
  return '/api';
}

const TRACCAR_API_URL = getTraccarApiBaseUrl();

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

/**
 * Traccar REST allows HTTP Basic auth (see https://www.traccar.org/traccar-api/).
 * Use a dedicated client without cookies so we don't replace the end-user's session.
 * Creating devices requires an administrator — normal portal users only have a user session.
 */
function createTraccarAdminApi() {
  return axios.create({
    baseURL: TRACCAR_API_URL,
    auth: {
      username: TRACCAR_ADMIN_EMAIL,
      password: TRACCAR_ADMIN_PASSWORD,
    },
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Create a device in Traccar as admin, then link it to the portal user's Traccar account via /permissions.
 * @param ownerEmail — same email as Supabase / Traccar login (used to resolve Traccar user id).
 */
export const traccarCreateDevice = async (
  name: string,
  uniqueId: string,
  ownerEmail: string
): Promise<TraccarDevice> => {
  const adminApi = createTraccarAdminApi();
  let createdId: number | null = null;
  try {
    const { data: device } = await adminApi.post<TraccarDevice>('/devices', { name, uniqueId });
    createdId = device.id;

    const { data: users } = await adminApi.get<TraccarUser[]>('/users', {
      params: { keyword: ownerEmail.trim() },
    });
    const owner = users.find(
      (u) => u.email?.toLowerCase() === ownerEmail.trim().toLowerCase()
    );
    if (!owner) {
      throw new Error(
        'NO_TRACCAR_USER: No GPS account found for your email. Log out and log back in so your account syncs with the GPS server, then try again.'
      );
    }

    await adminApi.post('/permissions', { userId: owner.id, deviceId: device.id });
    return device;
  } catch (err) {
    if (createdId != null) {
      try {
        await adminApi.delete(`/devices/${createdId}`);
      } catch {
        // best-effort rollback
      }
    }
    throw err;
  }
};

/** Maps axios / network failures from Add Vehicle to readable UI text. */
export const formatAddVehicleTraccarError = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 502 || status === 503 || status === 504) {
      return (
        'Cannot reach the GPS server (bad gateway). Start Traccar (e.g. on port 8082), confirm the dev proxy in vite.config, ' +
        'or set VITE_TRACCAR_BASE_URL if the API is hosted elsewhere, then try again.'
      );
    }
    if (!err.response) {
      return 'Network error — check that Traccar is running and reachable from this browser.';
    }
    if (status === 401) {
      return 'Traccar admin authentication failed. Check VITE_TRACCAR_USERNAME / VITE_TRACCAR_PASSWORD match your Traccar admin account.';
    }
    const data = err.response?.data as { message?: string } | string | undefined;
    const msg =
      typeof data === 'object' && data && 'message' in data && typeof data.message === 'string'
        ? data.message
        : err.message;
    return msg || 'Request to GPS server failed.';
  }
  if (err instanceof Error) {
    if (err.message.startsWith('NO_TRACCAR_USER:')) {
      return err.message.replace(/^NO_TRACCAR_USER:\s*/, '');
    }
    return err.message;
  }
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return 'Failed to add vehicle';
};

export const fetchLatestPositions = async (): Promise<TraccarPosition[]> => {
  const response = await traccarApi.get<TraccarPosition[]>('/positions');
  return response.data;
};

export const fetchDevices = async (): Promise<TraccarDevice[]> => {
  const response = await traccarApi.get<TraccarDevice[]>('/devices');
  return response.data;
};
