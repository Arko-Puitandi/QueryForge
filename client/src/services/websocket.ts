import { create } from 'zustand';

export interface WSMessage {
  type: string;
  payload: any;
  requestId?: string;
  timestamp: number;
}

export interface ProgressUpdate {
  step: number;
  totalSteps: number;
  stepName: string;
  progress: number;
  data?: any;
}

export interface StreamChunk {
  chunk: string;
  isComplete: boolean;
}

type MessageHandler = (message: WSMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private requestCallbacks: Map<string, {
    onProgress?: (progress: ProgressUpdate) => void;
    onStream?: (chunk: StreamChunk) => void;
    onResult?: (result: any) => void;
    onError?: (error: any) => void;
  }> = new Map();
  private clientId: string | null = null;
  private isConnecting = false;

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        // Wait for existing connection attempt with timeout
        let checkCount = 0;
        const maxChecks = 100; // 10 seconds max
        const checkInterval = setInterval(() => {
          checkCount++;
          if (this.ws?.readyState === WebSocket.OPEN) {
            clearInterval(checkInterval);
            resolve();
          } else if (checkCount >= maxChecks) {
            clearInterval(checkInterval);
            reject(new Error('Connection timeout'));
          }
        }, 100);
        return;
      }

      this.isConnecting = true;
      const wsUrl = `ws://${window.location.hostname}:3001/ws`;
      console.log('[WebSocket] Connecting to:', wsUrl);

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WSMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('[WebSocket] Failed to parse message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('[WebSocket] Disconnected');
          this.isConnecting = false;
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          this.isConnecting = false;
          reject(error);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: WSMessage): void {
    // Handle connection message
    if (message.type === 'connection') {
      this.clientId = message.payload.clientId;
      console.log('[WebSocket] Client ID:', this.clientId);
    }

    // Handle request-specific callbacks
    if (message.requestId) {
      const callbacks = this.requestCallbacks.get(message.requestId);
      if (callbacks) {
        switch (message.type) {
          case 'progress':
            callbacks.onProgress?.(message.payload);
            break;
          case 'stream':
            callbacks.onStream?.(message.payload);
            break;
          case 'result':
            callbacks.onResult?.(message.payload);
            this.requestCallbacks.delete(message.requestId);
            break;
          case 'error':
            callbacks.onError?.(message.payload);
            this.requestCallbacks.delete(message.requestId);
            break;
        }
      }
    }

    // Notify general handlers
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }

    // Notify wildcard handlers
    const wildcardHandlers = this.messageHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => handler(message));
    }
  }

  /**
   * Attempt to reconnect after disconnection
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  /**
   * Send a message with request tracking
   */
  async sendRequest(
    type: string,
    payload: any,
    callbacks?: {
      onProgress?: (progress: ProgressUpdate) => void;
      onStream?: (chunk: StreamChunk) => void;
      onResult?: (result: any) => void;
      onError?: (error: any) => void;
    }
  ): Promise<string> {
    await this.connect();

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (callbacks) {
      this.requestCallbacks.set(requestId, callbacks);
    }

    const message: WSMessage = {
      type,
      payload,
      requestId,
      timestamp: Date.now(),
    };

    this.ws?.send(JSON.stringify(message));
    return requestId;
  }

  /**
   * Send a message and wait for result (Promise-based)
   */
  sendRequestAsync<T = any>(
    type: string,
    payload: any,
    onProgress?: (progress: ProgressUpdate) => void
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.sendRequest(type, payload, {
        onProgress,
        onResult: (result) => resolve(result),
        onError: (error) => reject(error),
      });
    });
  }

  /**
   * Subscribe to a message type
   */
  subscribe(type: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.messageHandlers.get(type)?.delete(handler);
    };
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this.clientId = null;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get client ID
   */
  getClientId(): string | null {
    return this.clientId;
  }
}

// Singleton instance
export const wsService = new WebSocketService();

// Zustand store for WebSocket state
interface WebSocketState {
  isConnected: boolean;
  clientId: string | null;
  activeRequests: Map<string, { type: string; progress: number }>;
  setConnected: (connected: boolean) => void;
  setClientId: (id: string | null) => void;
  addRequest: (requestId: string, type: string) => void;
  updateRequestProgress: (requestId: string, progress: number) => void;
  removeRequest: (requestId: string) => void;
}

export const useWebSocketStore = create<WebSocketState>((set) => ({
  isConnected: false,
  clientId: null,
  activeRequests: new Map(),
  setConnected: (connected) => set({ isConnected: connected }),
  setClientId: (id) => set({ clientId: id }),
  addRequest: (requestId, type) =>
    set((state) => ({
      activeRequests: new Map(state.activeRequests).set(requestId, { type, progress: 0 }),
    })),
  updateRequestProgress: (requestId, progress) =>
    set((state) => {
      const requests = new Map(state.activeRequests);
      const existing = requests.get(requestId);
      if (existing) {
        requests.set(requestId, { ...existing, progress });
      }
      return { activeRequests: requests };
    }),
  removeRequest: (requestId) =>
    set((state) => {
      const requests = new Map(state.activeRequests);
      requests.delete(requestId);
      return { activeRequests: requests };
    }),
}));

export default wsService;
