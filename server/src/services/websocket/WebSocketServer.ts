import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { Server } from 'http';
import { v4 as uuidv4 } from 'uuid';

export interface WSClient {
  id: string;
  ws: WebSocket;
  isAlive: boolean;
  subscriptions: Set<string>;
}

export interface WSMessage {
  type: string;
  payload: any;
  requestId?: string;
  timestamp: number;
}

export type MessageHandler = (client: WSClient, message: WSMessage) => Promise<void>;

export class WebSocketManager {
  private wss: WSServer | null = null;
  private clients: Map<string, WSClient> = new Map();
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server attached to HTTP server
   */
  initialize(server: Server): void {
    this.wss = new WSServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = uuidv4();
      const client: WSClient = {
        id: clientId,
        ws,
        isAlive: true,
        subscriptions: new Set(),
      };

      this.clients.set(clientId, client);
      console.log(`[WebSocket] Client connected: ${clientId}`);

      // Send connection acknowledgment
      this.sendToClient(clientId, {
        type: 'connection',
        payload: { clientId, message: 'Connected to Text-to-SQL WebSocket server' },
        timestamp: Date.now(),
      });

      // Handle incoming messages
      ws.on('message', async (data: Buffer) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          await this.handleMessage(client, message);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
          this.sendToClient(clientId, {
            type: 'error',
            payload: { error: 'Invalid message format' },
            timestamp: Date.now(),
          });
        }
      });

      // Handle pong for heartbeat
      ws.on('pong', () => {
        client.isAlive = true;
      });

      // Handle close
      ws.on('close', () => {
        console.log(`[WebSocket] Client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`[WebSocket] Client error ${clientId}:`, error);
        this.clients.delete(clientId);
      });
    });

    // Start heartbeat to detect dead connections
    this.startHeartbeat();

    console.log('[WebSocket] Server initialized on /ws');
  }

  /**
   * Register a message handler for a specific message type
   */
  registerHandler(type: string, handler: MessageHandler): void {
    this.messageHandlers.set(type, handler);
    console.log(`[WebSocket] Registered handler for: ${type}`);
  }

  /**
   * Handle incoming message by routing to appropriate handler
   */
  private async handleMessage(client: WSClient, message: WSMessage): Promise<void> {
    const handler = this.messageHandlers.get(message.type);
    
    if (handler) {
      try {
        await handler(client, message);
      } catch (error: any) {
        console.error(`[WebSocket] Handler error for ${message.type}:`, error);
        this.sendToClient(client.id, {
          type: 'error',
          payload: { 
            error: error.message || 'Internal server error',
            originalType: message.type 
          },
          requestId: message.requestId,
          timestamp: Date.now(),
        });
      }
    } else {
      this.sendToClient(client.id, {
        type: 'error',
        payload: { error: `Unknown message type: ${message.type}` },
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Send message to a specific client
   */
  sendToClient(clientId: string, message: WSMessage): boolean {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  /**
   * Send progress update to client (for multi-step operations)
   */
  sendProgress(clientId: string, requestId: string, step: number, totalSteps: number, stepName: string, data?: any): void {
    this.sendToClient(clientId, {
      type: 'progress',
      payload: {
        step,
        totalSteps,
        stepName,
        progress: Math.round((step / totalSteps) * 100),
        data,
      },
      requestId,
      timestamp: Date.now(),
    });
  }

  /**
   * Send streaming chunk to client
   */
  sendStreamChunk(clientId: string, requestId: string, chunk: string, isComplete: boolean = false): void {
    this.sendToClient(clientId, {
      type: 'stream',
      payload: {
        chunk,
        isComplete,
      },
      requestId,
      timestamp: Date.now(),
    });
  }

  /**
   * Send final result to client
   */
  sendResult(clientId: string, requestId: string, result: any): void {
    this.sendToClient(clientId, {
      type: 'result',
      payload: result,
      requestId,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: WSMessage): void {
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  /**
   * Heartbeat to detect and clean up dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          console.log(`[WebSocket] Terminating inactive client: ${clientId}`);
          client.ws.terminate();
          this.clients.delete(clientId);
          return;
        }
        client.isAlive = false;
        client.ws.ping();
      });
    }, 30000); // 30 second heartbeat
  }

  /**
   * Get count of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.clients.forEach((client) => {
      client.ws.close();
    });
    
    this.wss?.close();
    console.log('[WebSocket] Server shutdown complete');
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();
