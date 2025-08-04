/**
 * Communication Hub for Agent Coordination
 * Manages inter-agent messaging and synchronization
 */

import { EventEmitter } from 'events';
import * as WebSocket from 'ws';
import { createServer, Server } from 'http';
import type { ClaudeAgent, DevelopmentTask, ValidationResult } from '../types';

export interface AgentMessage {
  id: string;
  timestamp: Date;
  from: string;
  to: string | 'broadcast';
  type: MessageType;
  payload: any;
  correlationId?: string;
}

export type MessageType =
  | 'task-assignment'
  | 'task-update'
  | 'validation-request'
  | 'validation-result'
  | 'sync-request'
  | 'sync-response'
  | 'status-update'
  | 'error'
  | 'heartbeat';

export interface AgentConnection {
  agentId: string;
  ws: WebSocket;
  lastHeartbeat: Date;
  status: 'connected' | 'disconnected' | 'error';
}

export class CommunicationHub extends EventEmitter {
  private server: Server;
  private wss: WebSocket.Server;
  private connections: Map<string, AgentConnection> = new Map();
  private messageQueue: Map<string, AgentMessage[]> = new Map();
  private port: number = 8765;
  private heartbeatInterval: NodeJS.Timeout;

  constructor(port?: number) {
    super();
    if (port) this.port = port;
  }

  /**
   * Start the communication hub server
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create HTTP server
        this.server = createServer();

        // Create WebSocket server
        this.wss = new WebSocket.Server({ server: this.server });

        // Set up WebSocket handlers
        this.wss.on('connection', this.handleConnection.bind(this));

        // Start heartbeat monitoring
        this.startHeartbeatMonitoring();

        // Start server
        this.server.listen(this.port, () => {
          console.log(`Communication Hub started on port ${this.port}`);
          resolve();
        });

        this.server.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the communication hub
   */
  public async stop(): Promise<void> {
    // Stop heartbeat monitoring
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all connections
    this.connections.forEach((conn) => {
      conn.ws.close();
    });

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }

    // Close HTTP server
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('Communication Hub stopped');
          resolve();
        });
      });
    }
  }

  /**
   * Register a Claude agent
   */
  public async registerAgent(agent: ClaudeAgent): Promise<void> {
    // Agent will connect via WebSocket from its terminal
    // Store agent info for validation when connection is established
    this.emit('agent:registering', agent);
  }

  /**
   * Send task to specific agent
   */
  public async sendTaskToAgent(agentId: string, task: DevelopmentTask): Promise<void> {
    const message: AgentMessage = {
      id: this.generateMessageId(),
      timestamp: new Date(),
      from: 'mission-control',
      to: agentId,
      type: 'task-assignment',
      payload: task
    };

    await this.sendMessage(message);
  }

  /**
   * Send validation feedback to agent
   */
  public async sendValidationFeedback(agentId: string, result: ValidationResult): Promise<void> {
    const message: AgentMessage = {
      id: this.generateMessageId(),
      timestamp: new Date(),
      from: 'validator',
      to: agentId,
      type: 'validation-result',
      payload: result
    };

    await this.sendMessage(message);
  }

  /**
   * Broadcast message to all agents
   */
  public async broadcast(type: MessageType, payload: any, excludeAgent?: string): Promise<void> {
    const message: AgentMessage = {
      id: this.generateMessageId(),
      timestamp: new Date(),
      from: 'mission-control',
      to: 'broadcast',
      type,
      payload
    };

    this.connections.forEach((conn, agentId) => {
      if (agentId !== excludeAgent && conn.status === 'connected') {
        this.sendToConnection(conn, message);
      }
    });
  }

  /**
   * Request synchronization between agents
   */
  public async requestSync(fromAgent: string, toAgent: string, data: any): Promise<any> {
    const correlationId = this.generateMessageId();

    const message: AgentMessage = {
      id: this.generateMessageId(),
      timestamp: new Date(),
      from: fromAgent,
      to: toAgent,
      type: 'sync-request',
      payload: data,
      correlationId
    };

    return new Promise((resolve, reject) => {
      // Set up response handler
      const responseHandler = (response: AgentMessage) => {
        if (response.correlationId === correlationId && response.type === 'sync-response') {
          this.off('message', responseHandler);
          resolve(response.payload);
        }
      };

      this.on('message', responseHandler);

      // Send request
      this.sendMessage(message).catch(reject);

      // Timeout after 30 seconds
      setTimeout(() => {
        this.off('message', responseHandler);
        reject(new Error('Sync request timeout'));
      }, 30000);
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: any): void {
    const agentId = this.extractAgentId(req);

    if (!agentId) {
      ws.close(1002, 'Agent ID required');
      return;
    }

    // Create connection record
    const connection: AgentConnection = {
      agentId,
      ws,
      lastHeartbeat: new Date(),
      status: 'connected'
    };

    this.connections.set(agentId, connection);

    // Set up message handlers
    ws.on('message', (data: WebSocket.Data) => this.handleMessage(agentId, data));
    ws.on('close', () => this.handleDisconnection(agentId));
    ws.on('error', (error: Error) => this.handleError(agentId, error));
    ws.on('pong', () => this.handlePong(agentId));

    // Send queued messages
    this.sendQueuedMessages(agentId);

    this.emit('agent:connected', agentId);
    console.log(`Agent ${agentId} connected`);
  }

  /**
   * Handle incoming message from agent
   */
  private handleMessage(agentId: string, data: WebSocket.RawData): void {
    try {
      const message = JSON.parse(data.toString()) as AgentMessage;
      message.from = agentId; // Ensure from field is correct

      // Validate message
      if (!this.validateMessage(message)) {
        console.error(`Invalid message from ${agentId}:`, message);
        return;
      }

      // Route message
      if (message.to === 'broadcast') {
        this.broadcast(message.type, message.payload, agentId);
      } else if (message.to) {
        this.sendMessage(message);
      }

      // Emit for local handling
      this.emit('message', message);
      this.emit(`message:${message.type}`, message);
    } catch (error) {
      console.error(`Error handling message from ${agentId}:`, error);
    }
  }

  /**
   * Handle agent disconnection
   */
  private handleDisconnection(agentId: string): void {
    const connection = this.connections.get(agentId);
    if (connection) {
      connection.status = 'disconnected';
      this.emit('agent:disconnected', agentId);
      console.log(`Agent ${agentId} disconnected`);
    }
  }

  /**
   * Handle connection error
   */
  private handleError(agentId: string, error: Error): void {
    const connection = this.connections.get(agentId);
    if (connection) {
      connection.status = 'error';
      this.emit('agent:error', { agentId, error });
      console.error(`Agent ${agentId} error:`, error);
    }
  }

  /**
   * Handle pong response
   */
  private handlePong(agentId: string): void {
    const connection = this.connections.get(agentId);
    if (connection) {
      connection.lastHeartbeat = new Date();
    }
  }

  /**
   * Send message to specific agent
   */
  private async sendMessage(message: AgentMessage): Promise<void> {
    const connection = this.connections.get(message.to);

    if (connection && connection.status === 'connected') {
      this.sendToConnection(connection, message);
    } else {
      // Queue message for later delivery
      this.queueMessage(message);
    }
  }

  /**
   * Send message through WebSocket connection
   */
  private sendToConnection(connection: AgentConnection, message: AgentMessage): void {
    try {
      connection.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Error sending to ${connection.agentId}:`, error);
      connection.status = 'error';
    }
  }

  /**
   * Queue message for offline agent
   */
  private queueMessage(message: AgentMessage): void {
    const queue = this.messageQueue.get(message.to) || [];
    queue.push(message);
    this.messageQueue.set(message.to, queue);
  }

  /**
   * Send queued messages to reconnected agent
   */
  private sendQueuedMessages(agentId: string): void {
    const queue = this.messageQueue.get(agentId);
    if (queue && queue.length > 0) {
      const connection = this.connections.get(agentId);
      if (connection) {
        queue.forEach((message) => this.sendToConnection(connection, message));
        this.messageQueue.delete(agentId);
      }
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      this.connections.forEach((conn, agentId) => {
        if (conn.status === 'connected') {
          // Check last heartbeat
          const timeSinceLastHeartbeat = Date.now() - conn.lastHeartbeat.getTime();

          if (timeSinceLastHeartbeat > 60000) {
            // 1 minute timeout
            console.warn(`Agent ${agentId} heartbeat timeout`);
            conn.status = 'disconnected';
            this.emit('agent:timeout', agentId);
          } else {
            // Send ping
            conn.ws.ping();
          }
        }
      });
    }, 30000); // Check every 30 seconds
  }

  /**
   * Validate message structure
   */
  private validateMessage(message: AgentMessage): boolean {
    return !!(
      message.id &&
      message.timestamp &&
      message.from &&
      message.type &&
      message.payload !== undefined
    );
  }

  /**
   * Extract agent ID from request
   */
  private extractAgentId(req: any): string | null {
    // Extract from URL query parameter or header
    const url = new URL(req.url, `http://${req.headers.host}`);
    return url.searchParams.get('agentId') || req.headers['x-agent-id'] || null;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connection status for all agents
   */
  public getConnectionStatuses(): Map<string, string> {
    const statuses = new Map<string, string>();
    this.connections.forEach((conn, agentId) => {
      statuses.set(agentId, conn.status);
    });
    return statuses;
  }

  /**
   * Check if agent is connected
   */
  public isAgentConnected(agentId: string): boolean {
    const connection = this.connections.get(agentId);
    return connection?.status === 'connected';
  }

  /**
   * Get message queue size for agent
   */
  public getQueueSize(agentId: string): number {
    return this.messageQueue.get(agentId)?.length || 0;
  }
}
