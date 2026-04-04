import { useGPSStore } from './store';
import { TraccarPosition, TraccarDevice } from './api';

/**
 * Same-origin WebSocket so the browser sends Traccar session cookies (see axios withCredentials).
 * In dev, Vite proxies `ws(s)://<dev host>/api/socket` → Traccar :8082.
 */
function resolveTraccarWebSocketUrl(): string {
  const fromEnv = import.meta.env.VITE_TRACCAR_BASE_URL;
  if (fromEnv != null && String(fromEnv).trim() !== '') {
    const base = String(fromEnv).replace(/^http/, 'ws').replace(/\/$/, '');
    return `${base}/api/socket`;
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/api/socket`;
}

interface WebSocketMessage {
  positions?: TraccarPosition[];
  devices?: TraccarDevice[];
  events?: any[];
}

/**
 * Build WebSocket URL that works with Vite proxy
 * In development: ws://localhost:3000/api/socket (proxied to Traccar)
 * In production: Uses the same origin as the page
 */
function buildWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/api/socket`;
}

class TraccarWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isIntentionallyClosed = false;
  /** Used to show reconnect toast only after a drop, not on first-ever connect */
  private hadSuccessfulConnection = false;

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WS] Already connected');
      return;
    }

    this.isIntentionallyClosed = false;
    
    // Use relative path that goes through Vite proxy
    const wsUrl = buildWebSocketUrl();
    

    const wsUrl = resolveTraccarWebSocketUrl();

    console.log('[WS] Connecting to:', wsUrl);
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('[WS] Connection error:', error);
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('[WS] Connected successfully');
      const wasReconnect =
        this.hadSuccessfulConnection && this.reconnectAttempts > 0;
      this.reconnectAttempts = 0;
      this.hadSuccessfulConnection = true;
      useGPSStore.getState().setConnectionStatus(true);
      useGPSStore.getState().setError(null);
      if (wasReconnect) {
        useGPSStore.getState().setConnectionNotice('Live tracking reconnected');
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('[WS] Failed to parse message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WS] Error:', error);
      useGPSStore.getState().setError('WebSocket connection error');
    };

    this.ws.onclose = (event) => {
      console.log('[WS] Connection closed:', event.code, event.reason);
      useGPSStore.getState().setConnectionStatus(false);
      
      if (!this.isIntentionallyClosed) {
        this.scheduleReconnect();
      }
    };
  }

  private handleMessage(data: WebSocketMessage): void {
    const store = useGPSStore.getState();

    // Handle position updates
    if (data.positions && data.positions.length > 0) {
      data.positions.forEach((position) => {
        store.updatePosition(position);
      });
    }

    // Handle device updates
    if (data.devices && data.devices.length > 0) {
      data.devices.forEach((device) => {
        store.updateDevice(device);
      });
    }

    // Handle events (geofence, alerts, etc.)
    if (data.events && data.events.length > 0) {
      console.log('[WS] Events received:', data.events);
      // Future: dispatch events to store for notifications
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS] Max reconnect attempts reached');
      useGPSStore.getState().setError('Unable to connect to tracking server. Please refresh the page.');
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s... up to 30s max
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    useGPSStore.getState().setConnectionStatus(false);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Force reconnect (useful for manual retry)
  reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0; // Reset attempts
    setTimeout(() => this.connect(), 500);
  }
}

// Singleton instance
export const traccarWS = new TraccarWebSocket();
