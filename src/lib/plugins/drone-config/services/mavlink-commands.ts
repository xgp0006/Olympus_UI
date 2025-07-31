/**
 * MAVLink Commands Service - NASA JPL Rule 4 compliant
 * Handles command sending and acknowledgment
 */

import { invokeTauriCommand } from '$lib/utils/tauri';
import { BoundedArray } from '$lib/utils/bounded-array';
import type { MAVLinkCommand, MAVResult } from '../types/drone-types';

const MAX_PENDING_COMMANDS = 50;

interface PendingCommand {
  command: MAVLinkCommand;
  timestamp: number;
  retries: number;
  resolver: (result: MAVResult) => void;
  rejecter: (error: Error) => void;
  timeoutId: number;
}

export class MAVLinkCommands {
  private pendingCommands = new Map<string, PendingCommand>();
  private messagesSent: number = 0;
  
  /**
   * NASA JPL compliant: Generate command key
   */
  private generateKey(cmd: MAVLinkCommand): string {
    return `${cmd.targetSystem}_${cmd.targetComponent}_${cmd.command}_${cmd.confirmation}`;
  }
  
  /**
   * NASA JPL compliant: Send command
   */
  async sendCommand(
    command: MAVLinkCommand,
    options: { timeout?: number; retries?: number } = {}
  ): Promise<MAVResult> {
    const timeout = options.timeout || 5000;
    const maxRetries = options.retries || 3;
    
    this.checkPendingLimit();
    
    return new Promise((resolve, reject) => {
      const key = this.generateKey(command);
      
      const pending: PendingCommand = {
        command,
        timestamp: Date.now(),
        retries: 0,
        resolver: resolve,
        rejecter: reject,
        timeoutId: window.setTimeout(() => {
          this.handleTimeout(key, pending, maxRetries);
        }, timeout)
      };
      
      this.pendingCommands.set(key, pending);
      this.sendToBackend(command).catch(error => {
        clearTimeout(pending.timeoutId);
        this.pendingCommands.delete(key);
        reject(error);
      });
    });
  }
  
  /**
   * NASA JPL compliant: Handle command acknowledgment
   */
  handleAck(ack: { command: number; result: MAVResult }): void {
    for (const [key, pending] of this.pendingCommands.entries()) {
      if (pending.command.command === ack.command) {
        clearTimeout(pending.timeoutId);
        
        if (ack.result === 0 || ack.result === 5) { // ACCEPTED or IN_PROGRESS
          pending.resolver(ack.result);
        } else {
          pending.rejecter(new Error(`Command failed: ${ack.result}`));
        }
        
        this.pendingCommands.delete(key);
        break;
      }
    }
  }
  
  /**
   * NASA JPL compliant: Check pending commands limit
   */
  private checkPendingLimit(): void {
    if (this.pendingCommands.size >= MAX_PENDING_COMMANDS) {
      const oldestKey = Array.from(this.pendingCommands.keys())[0];
      const oldest = this.pendingCommands.get(oldestKey);
      if (oldest) {
        clearTimeout(oldest.timeoutId);
        oldest.rejecter(new Error('Command queue full'));
        this.pendingCommands.delete(oldestKey);
      }
    }
  }
  
  /**
   * NASA JPL compliant: Handle command timeout
   */
  private handleTimeout(key: string, pending: PendingCommand, maxRetries: number): void {
    if (pending.retries < maxRetries) {
      pending.retries++;
      this.retryCommand(key, pending);
    } else {
      this.pendingCommands.delete(key);
      pending.rejecter(new Error(`Command timeout after ${maxRetries} retries`));
    }
  }
  
  /**
   * NASA JPL compliant: Retry command
   */
  private async retryCommand(key: string, pending: PendingCommand): Promise<void> {
    try {
      await this.sendToBackend(pending.command);
      
      pending.timeoutId = window.setTimeout(() => {
        this.handleTimeout(key, pending, 3);
      }, 5000);
    } catch (error) {
      this.pendingCommands.delete(key);
      pending.rejecter(error as Error);
    }
  }
  
  /**
   * NASA JPL compliant: Send command to backend
   */
  private async sendToBackend(command: MAVLinkCommand): Promise<void> {
    await invokeTauriCommand('send_mavlink_command', { command }, {
      showNotification: false,
      retryAttempts: 0
    });
    this.messagesSent++;
  }
  
  /**
   * NASA JPL compliant: Clear pending commands
   */
  clearPending(): void {
    this.pendingCommands.forEach(pending => {
      clearTimeout(pending.timeoutId);
      pending.rejecter(new Error('Service shutting down'));
    });
    this.pendingCommands.clear();
  }
  
  getMessagesSent(): number {
    return this.messagesSent;
  }
}