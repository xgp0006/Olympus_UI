/**
 * MAVLink Connection Service - NASA JPL Rule 4 compliant
 * Handles connection management and event listeners
 */

import { setupEventListener } from '$lib/utils/tauri';
import { showInfo } from '$lib/stores/notifications';
import type { MAVLinkMessage, MAVLinkConnectionOptions } from '../types/drone-types';

export class MAVLinkConnection {
  private systemId: number = 255;
  private componentId: number = 0;
  private connected: boolean = false;
  private messageUnlisten: (() => void) | null = null;
  private ackUnlisten: (() => void) | null = null;
  
  /**
   * NASA JPL compliant: Initialize connection
   */
  async initialize(
    options: MAVLinkConnectionOptions,
    onMessage: (message: MAVLinkMessage) => void,
    onAck: (ack: any) => void
  ): Promise<boolean> {
    try {
      if (options.systemId !== undefined) this.systemId = options.systemId;
      if (options.componentId !== undefined) this.componentId = options.componentId;
      
      this.messageUnlisten = await setupEventListener<MAVLinkMessage>(
        'mavlink-message',
        onMessage,
        { showErrorNotifications: false, enableLogging: false }
      );
      
      this.ackUnlisten = await setupEventListener(
        'mavlink-ack',
        onAck,
        { showErrorNotifications: true }
      );
      
      this.connected = true;
      showInfo('MAVLink Connected', 'Connection established');
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * NASA JPL compliant: Shutdown connection
   */
  shutdown(): void {
    if (this.messageUnlisten) {
      this.messageUnlisten();
      this.messageUnlisten = null;
    }
    
    if (this.ackUnlisten) {
      this.ackUnlisten();
      this.ackUnlisten = null;
    }
    
    this.connected = false;
  }
  
  isConnected(): boolean {
    return this.connected;
  }
  
  getSystemId(): number {
    return this.systemId;
  }
  
  getComponentId(): number {
    return this.componentId;
  }
}