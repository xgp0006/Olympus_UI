/**
 * WebSocket Type Declarations
 * Temporary type declarations for ws module
 */

declare module 'ws' {
  import { EventEmitter } from 'events';
  import { IncomingMessage } from 'http';
  
  export interface WebSocketOptions {
    port?: number;
    host?: string;
    path?: string;
    headers?: Record<string, string>;
  }
  
  export interface ServerOptions {
    port?: number;
    host?: string;
    path?: string;
    noServer?: boolean;
    clientTracking?: boolean;
    perMessageDeflate?: boolean;
  }
  
  export class WebSocket extends EventEmitter {
    static CONNECTING: number;
    static OPEN: number;
    static CLOSING: number;
    static CLOSED: number;
    
    readyState: number;
    
    constructor(url: string, options?: WebSocketOptions);
    
    send(data: string | Buffer | ArrayBuffer | ArrayBufferView): void;
    close(code?: number, reason?: string): void;
    ping(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
    pong(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
    
    on(event: 'open', listener: () => void): this;
    on(event: 'close', listener: (code: number, reason: string) => void): this;
    on(event: 'message', listener: (data: Data) => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'ping' | 'pong', listener: (data: Buffer) => void): this;
  }
  
  export type Data = string | Buffer | ArrayBuffer | Buffer[];
  
  export class Server extends EventEmitter {
    constructor(options?: ServerOptions, callback?: () => void);
    
    handleUpgrade(
      request: IncomingMessage,
      socket: any,
      head: Buffer,
      callback: (ws: WebSocket) => void
    ): void;
    
    on(event: 'connection', listener: (ws: WebSocket, request: IncomingMessage) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'headers', listener: (headers: string[], request: IncomingMessage) => void): this;
    on(event: 'close' | 'listening', listener: () => void): this;
  }
  
  export default WebSocket;
}