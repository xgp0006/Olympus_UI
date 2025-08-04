/**
 * MAVLink Parser Service - NASA JPL Rule 4 compliant
 * Handles message parsing and data extraction
 */

import { showError, showWarning, showInfo } from '$lib/stores/notifications';
import type { MAVLinkMessage, VehicleInfo, MAVMessageType } from '../types/drone-types';

export class MAVLinkParser {
  private vehicleInfo: VehicleInfo | null = null;

  /**
   * NASA JPL compliant: Parse heartbeat message
   */
  parseHeartbeat(message: MAVLinkMessage): { connected: boolean } {
    // In real implementation, extract vehicle state, mode, etc.
    return { connected: true };
  }

  /**
   * NASA JPL compliant: Parse status text message
   */
  parseStatusText(message: MAVLinkMessage): void {
    try {
      const severity = message.payload[0];
      const text = new TextDecoder().decode(message.payload.slice(1, 51)).trim();

      if (severity < 4) {
        showError('Vehicle Message', text);
      } else if (severity < 6) {
        showWarning('Vehicle Message', text);
      } else {
        showInfo('Vehicle Message', text);
      }
    } catch (error) {
      console.error('Failed to parse status text:', error);
    }
  }

  /**
   * NASA JPL compliant: Parse autopilot version
   */
  parseAutopilotVersion(message: MAVLinkMessage): VehicleInfo | null {
    try {
      const capabilities = new DataView(message.payload.buffer).getBigUint64(0, true);
      const flightSwVersion = new DataView(message.payload.buffer).getUint32(8, true);

      this.vehicleInfo = {
        autopilot: 'ArduPilot',
        vehicleType: 'Quadcopter',
        firmwareVersion: this.extractVersion(flightSwVersion),
        protocolVersion: '2.0',
        capabilities: this.parseCapabilities(capabilities)
      };

      return this.vehicleInfo;
    } catch (error) {
      console.error('Failed to parse autopilot version:', error);
      return null;
    }
  }

  /**
   * NASA JPL compliant: Extract version string
   */
  private extractVersion(version: number): string {
    return `${(version >> 24) & 0xff}.${(version >> 16) & 0xff}.${(version >> 8) & 0xff}`;
  }

  /**
   * NASA JPL compliant: Parse vehicle capabilities
   */
  private parseCapabilities(capabilities: bigint): string[] {
    const caps: string[] = [];
    const FLAGS = [
      { flag: 0x01n, name: 'MISSION_FLOAT' },
      { flag: 0x02n, name: 'PARAM_FLOAT' },
      { flag: 0x04n, name: 'MISSION_INT' },
      { flag: 0x08n, name: 'COMMAND_INT' },
      { flag: 0x10n, name: 'PARAM_UNION' },
      { flag: 0x20n, name: 'FTP' },
      { flag: 0x40n, name: 'SET_ATTITUDE_TARGET' },
      { flag: 0x80n, name: 'SET_POSITION_TARGET_LOCAL_NED' },
      { flag: 0x100n, name: 'SET_POSITION_TARGET_GLOBAL_INT' }
    ];

    FLAGS.forEach(({ flag, name }) => {
      if (capabilities & flag) caps.push(name);
    });

    return caps;
  }

  getVehicleInfo(): VehicleInfo | null {
    return this.vehicleInfo;
  }
}
