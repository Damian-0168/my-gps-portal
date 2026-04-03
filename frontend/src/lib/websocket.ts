import { useGPSStore } from './store';
import { TraccarPosition, TraccarDevice } from './api';

const TRACCAR_BASE_URL = import.meta.env.VITE_TRACCAR_BASE_URL || 'http://localhost:8082';

interface WebSocketMessage {
  positions?: TraccarPosition[];
  devices?: TraccarDevice[];
  events?: any[];
}

class TraccarWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isIntentionallyClosed = false;

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WS] Already connected');
      return;
    }

    this.isIntentionallyClosed = false;
    
    // Convert http(s) to ws(s)
    const wsUrl = TRACCAR_BASE_URL.replace(/^http/, 'ws') + '/api/socket';
    
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
      this.reconnectAttempts = 0;
      useGPSStore.getState().setConnectionStatus(true);
      useGPSStore.getState().setError(null);
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

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
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
}

// Singleton instance
export const traccarWS = new TraccarWebSocket();
