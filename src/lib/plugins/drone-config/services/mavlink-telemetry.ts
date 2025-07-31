/**
 * MAVLink Telemetry Service - NASA JPL Rule 4 compliant
 * Handles telemetry data and statistics
 */

import { BoundedArray } from '$lib/utils/bounded-array';
import type { MAVLinkMessage, MAVResult } from '../types/drone-types';

const MAX_MESSAGE_QUEUE = 100;
const MAX_ACK_HISTORY = 100;

export interface MAVLinkStats {
  messagesReceived: number;
  messagesSent: number;
  errorsCount: number;
  lastMessageTime: number;
  bytesReceived: number;
  bytesSent: number;
}

export class MAVLinkTelemetry {
  private messageQueue = new BoundedArray<MAVLinkMessage>(MAX_MESSAGE_QUEUE);
  private ackHistory = new BoundedArray<{
    command: number;
    result: MAVResult;
    timestamp: number;
  }>(MAX_ACK_HISTORY);
  
  private stats: MAVLinkStats = {
    messagesReceived: 0,
    messagesSent: 0,
    errorsCount: 0,
    lastMessageTime: 0,
    bytesReceived: 0,
    bytesSent: 0
  };
  
  /**
   * NASA JPL compliant: Record incoming message
   */
  recordMessage(message: MAVLinkMessage): void {
    this.stats.messagesReceived++;
    this.stats.bytesReceived += message.payload.length + 8;
    this.stats.lastMessageTime = Date.now();
    this.messageQueue.push(message);
  }
  
  /**
   * NASA JPL compliant: Record sent message
   */
  recordSentMessage(payloadSize: number): void {
    this.stats.messagesSent++;
    this.stats.bytesSent += payloadSize + 8;
  }
  
  /**
   * NASA JPL compliant: Record command acknowledgment
   */
  recordAck(command: number, result: MAVResult): void {
    this.ackHistory.push({
      command,
      result,
      timestamp: Date.now()
    });
  }
  
  /**
   * NASA JPL compliant: Record error
   */
  recordError(): void {
    this.stats.errorsCount++;
  }
  
  /**
   * NASA JPL compliant: Get statistics
   */
  getStats(): MAVLinkStats {
    return { ...this.stats };
  }
  
  /**
   * NASA JPL compliant: Get message queue
   */
  getMessageQueue(): MAVLinkMessage[] {
    return this.messageQueue.getAll();
  }
  
  /**
   * NASA JPL compliant: Get command history
   */
  getCommandHistory(): Array<{ command: number; result: MAVResult; timestamp: number }> {
    return this.ackHistory.getAll();
  }
  
  /**
   * NASA JPL compliant: Clear statistics
   */
  clearStats(): void {
    this.stats = {
      messagesReceived: 0,
      messagesSent: 0,
      errorsCount: 0,
      lastMessageTime: 0,
      bytesReceived: 0,
      bytesSent: 0
    };
  }
}