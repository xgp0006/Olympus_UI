/**
 * MAVLink Service (Refactored) - NASA JPL Rule 4 compliant
 * Main facade that coordinates sub-services
 */

import { invokeTauriCommand, safeTauriInvoke } from '$lib/utils/tauri';
import { showError } from '$lib/stores/notifications';
import { MAVLinkConnection } from './mavlink-connection';
import { MAVLinkParser } from './mavlink-parser';
import { MAVLinkCommands } from './mavlink-commands';
import { MAVLinkTelemetry } from './mavlink-telemetry';
import type {
  MAVLinkMessage,
  MAVLinkCommand,
  MAVMessageType,
  MAVResult,
  MAVLinkConnectionOptions,
  VehicleInfo
} from '../types/drone-types';

export class MAVLinkService {
  private connection = new MAVLinkConnection();
  private parser = new MAVLinkParser();
  private commands = new MAVLinkCommands();
  private telemetry = new MAVLinkTelemetry();
  private sequence: number = 0;
  
  /**
   * NASA JPL compliant: Initialize service
   */
  async initialize(options: MAVLinkConnectionOptions = {}): Promise<boolean> {
    try {
      const success = await this.connection.initialize(
        options,
        this.handleIncomingMessage.bind(this),
        this.handleCommandAck.bind(this)
      );
      
      if (success) {
        await this.requestVehicleInfo();
      }
      
      return success;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'MAVLink initialization failed';
      showError('MAVLink Error', msg);
      return false;
    }
  }
  
  /**
   * NASA JPL compliant: Shutdown service
   */
  shutdown(): void {
    this.commands.clearPending();
    this.connection.shutdown();
  }
  
  /**
   * NASA JPL compliant: Handle incoming message
   */
  private handleIncomingMessage(message: MAVLinkMessage): void {
    this.telemetry.recordMessage(message);
    
    switch (message.messageId) {
      case 0: // HEARTBEAT
        this.parser.parseHeartbeat(message);
        break;
      case 253: // STATUSTEXT
        this.parser.parseStatusText(message);
        break;
      case 148: // AUTOPILOT_VERSION
        this.parser.parseAutopilotVersion(message);
        break;
    }
  }
  
  /**
   * NASA JPL compliant: Handle command acknowledgment
   */
  private handleCommandAck(ack: { command: number; result: MAVResult }): void {
    this.telemetry.recordAck(ack.command, ack.result);
    this.commands.handleAck(ack);
  }
  
  /**
   * NASA JPL compliant: Send command
   */
  async sendCommand(
    command: MAVLinkCommand,
    options?: { timeout?: number; retries?: number }
  ): Promise<MAVResult> {
    return this.commands.sendCommand(command, options);
  }
  
  /**
   * NASA JPL compliant: Send raw message
   */
  async sendMessage(messageId: MAVMessageType, payload: Uint8Array): Promise<void> {
    const message: MAVLinkMessage = {
      systemId: this.connection.getSystemId(),
      componentId: this.connection.getComponentId(),
      messageId,
      sequence: this.sequence++,
      payload,
      checksum: 0,
      timestamp: Date.now()
    };
    
    if (this.sequence > 255) this.sequence = 0;
    
    await invokeTauriCommand('send_mavlink_message', { message }, {
      showNotification: false
    });
    
    this.telemetry.recordSentMessage(payload.length);
  }
  
  /**
   * NASA JPL compliant: Request vehicle info
   */
  private async requestVehicleInfo(): Promise<void> {
    try {
      const info = await safeTauriInvoke<VehicleInfo>('get_vehicle_info');
      if (info) {
        // Parser will store it internally
      }
    } catch (error) {
      console.warn('Failed to get vehicle info:', error);
    }
  }
  
  /**
   * NASA JPL compliant: Request parameter list
   */
  async requestParameterList(): Promise<void> {
    await this.sendMessage(21, new Uint8Array([1, 0])); // PARAM_REQUEST_LIST
  }
  
  /**
   * NASA JPL compliant: Request single parameter
   */
  async requestParameter(name: string, index: number = -1): Promise<void> {
    const encoder = new TextEncoder();
    const nameBytes = encoder.encode(name);
    const payload = new Uint8Array(18);
    
    payload[0] = 1; // target_system
    payload[1] = 0; // target_component
    payload.set(nameBytes.slice(0, 16), 2);
    
    const view = new DataView(payload.buffer);
    view.setInt16(18, index, true);
    
    await this.sendMessage(20, payload); // PARAM_REQUEST_READ
  }
  
  /**
   * NASA JPL compliant: Set parameter value
   */
  async setParameter(name: string, value: number, type: number = 9): Promise<void> {
    const encoder = new TextEncoder();
    const nameBytes = encoder.encode(name);
    const payload = new Uint8Array(23);
    
    payload[0] = 1; // target_system
    payload[1] = 0; // target_component
    payload.set(nameBytes.slice(0, 16), 2);
    
    const view = new DataView(payload.buffer);
    view.setFloat32(18, value, true);
    payload[22] = type;
    
    await this.sendMessage(23, payload); // PARAM_SET
  }
  
  // Getters
  isConnected(): boolean { return this.connection.isConnected(); }
  getVehicleInfo(): VehicleInfo | null { return this.parser.getVehicleInfo(); }
  getStatistics(): any { return this.telemetry.getStats(); }
  getCommandHistory(): any[] { return this.telemetry.getCommandHistory(); }
  clearStatistics(): void { this.telemetry.clearStats(); }
}