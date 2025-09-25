/**
 * Execution WebSocket Service - Real-time Updates
 *
 * Provides real-time execution status updates using WebSocket connections.
 * Handles connection management, reconnection logic, and message routing.
 */

import React from 'react';

interface ExecutionStatusUpdate {
  executionId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress?: number; // 0-100
  message?: string;
  timestamp: string;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
  latencyMs?: number;
  costUsd?: number;
}

interface ExecutionWebSocketConfig {
  url?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

type ExecutionEventHandler = (update: ExecutionStatusUpdate) => void;
type ConnectionEventHandler = (connected: boolean) => void;
type ErrorEventHandler = (error: Error) => void;

/**
 * WebSocket service for real-time execution updates
 */
export class ExecutionWebSocketService {
  private ws: WebSocket | null = null;
  private config: Required<ExecutionWebSocketConfig>;
  private reconnectAttempts = 0;
  private reconnectTimeoutId: number | null = null;
  private heartbeatIntervalId: number | null = null;
  private subscriptions = new Set<string>();

  // Event handlers
  private executionHandlers = new Map<string, Set<ExecutionEventHandler>>();
  private connectionHandlers = new Set<ConnectionEventHandler>();
  private errorHandlers = new Set<ErrorEventHandler>();

  constructor(config: ExecutionWebSocketConfig = {}) {
    this.config = {
      url: config.url || this.getWebSocketUrl(),
      reconnectAttempts: config.reconnectAttempts || 5,
      reconnectDelay: config.reconnectDelay || 1000,
      heartbeatInterval: config.heartbeatInterval || 30000,
    };
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = (): void => {
          // WebSocket connected successfully
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.notifyConnectionHandlers(true);

          // Re-subscribe to executions after reconnection
          this.resubscribeAll();

          resolve();
        };

        this.ws.onmessage = (event): void => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event): void => {
          // WebSocket disconnected
          this.stopHeartbeat();
          this.notifyConnectionHandlers(false);

          if (event.code !== 1000) {
            // Not a normal closure
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (event): void => {
          const error = new Error(`WebSocket error: ${event}`);
          console.error('WebSocket error:', error);
          this.notifyErrorHandlers(error);
          reject(error);
        };
      } catch (error) {
        const wsError =
          error instanceof Error
            ? error
            : new Error('Failed to create WebSocket');
        this.notifyErrorHandlers(wsError);
        reject(wsError);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.subscriptions.clear();
    this.notifyConnectionHandlers(false);
  }

  /**
   * Subscribe to updates for a specific execution
   */
  subscribeToExecution(
    executionId: string,
    handler: ExecutionEventHandler
  ): () => void {
    if (!this.executionHandlers.has(executionId)) {
      this.executionHandlers.set(executionId, new Set());
    }

    this.executionHandlers.get(executionId)!.add(handler);
    this.subscriptions.add(executionId);

    // Send subscription message if connected
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendMessage({
        type: 'subscribe',
        executionId,
      });
    }

    // Return unsubscribe function
    return () => {
      const handlers = this.executionHandlers.get(executionId);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.executionHandlers.delete(executionId);
          this.subscriptions.delete(executionId);

          // Send unsubscription message if connected
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.sendMessage({
              type: 'unsubscribe',
              executionId,
            });
          }
        }
      }
    };
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionChange(handler: ConnectionEventHandler): () => void {
    this.connectionHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to WebSocket errors
   */
  onError(handler: ErrorEventHandler): () => void {
    this.errorHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  /**
   * Check if WebSocket is currently connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    if (!this.ws) return 'disconnected';

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'error';
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      if (message.type === 'execution_update') {
        this.handleExecutionUpdate(message.data);
      } else if (message.type === 'pong') {
        // Heartbeat response - connection is alive
      } else if (message.type === 'error') {
        const error = new Error(message.message || 'WebSocket server error');
        this.notifyErrorHandlers(error);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Handle execution status updates
   */
  private handleExecutionUpdate(update: ExecutionStatusUpdate): void {
    const handlers = this.executionHandlers.get(update.executionId);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(update);
        } catch (error) {
          console.error('Error in execution update handler:', error);
        }
      });
    }
  }

  /**
   * Send a message to the WebSocket server
   */
  private sendMessage(message: {
    type: string;
    executionId?: string;
    [key: string]: unknown;
  }): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Re-subscribe to all active executions after reconnection
   */
  private resubscribeAll(): void {
    this.subscriptions.forEach(executionId => {
      this.sendMessage({
        type: 'subscribe',
        executionId,
      });
    });
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.reconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay =
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    // Scheduling reconnection attempt

    this.reconnectTimeoutId = window.setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
        this.scheduleReconnect();
      });
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatIntervalId = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage({ type: 'ping' });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  /**
   * Get WebSocket URL based on current location
   */
  private getWebSocketUrl(): string {
    if (typeof window === 'undefined') {
      return 'ws://localhost:3001/ws'; // Server-side default
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/api/ws/executions`;
  }

  /**
   * Notify connection handlers
   */
  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(connected);
      } catch (error) {
        console.error('Error in connection handler:', error);
      }
    });
  }

  /**
   * Notify error handlers
   */
  private notifyErrorHandlers(error: Error): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (err) {
        console.error('Error in error handler:', err);
      }
    });
  }
}

// Singleton instance
export const executionWebSocketService = new ExecutionWebSocketService();

// React hook for easy integration
export function useExecutionWebSocket(): {
  isConnected: boolean;
  subscribe: (
    executionId: string,
    handler: ExecutionEventHandler
  ) => () => void;
} {
  const [isConnected, setIsConnected] = React.useState(
    executionWebSocketService.isConnected()
  );

  React.useEffect(() => {
    const unsubscribeConnection =
      executionWebSocketService.onConnectionChange(setIsConnected);

    // Connect if not already connected
    if (!executionWebSocketService.isConnected()) {
      executionWebSocketService.connect().catch(error => {
        console.error('Failed to connect to WebSocket:', error);
      });
    }

    return (): void => {
      unsubscribeConnection();
    };
  }, []);

  return {
    isConnected,
    subscribe: executionWebSocketService.subscribeToExecution.bind(
      executionWebSocketService
    ),
  };
}

// Export types for use in components
export type { ExecutionStatusUpdate, ExecutionEventHandler };
