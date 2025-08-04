/**
 * MAVLink Service Legacy Exports - NASA JPL Rule 4 compliant
 * Provides singleton instance and common commands
 */

import { MAVLinkService } from './mavlink-service-refactored';
import { MAVLinkAssertions } from './mavlink-assertions';
import type { MAVResult } from '../types/drone-types';

// Singleton instance
let mavlinkServiceInstance: MAVLinkService | null = null;

/**
 * Get MAVLink service instance
 */
export function getMAVLinkService(): MAVLinkService {
  if (!mavlinkServiceInstance) {
    mavlinkServiceInstance = new MAVLinkService();
  }
  return mavlinkServiceInstance;
}

/**
 * Common MAVLink commands
 */
export const MAVCommands = {
  /**
   * Arm/disarm vehicle
   */
  async armDisarm(arm: boolean): Promise<MAVResult> {
    const service = getMAVLinkService();

    return service.sendCommand({
      command: 400,
      confirmation: 0,
      param1: arm ? 1 : 0,
      param2: 0,
      param3: 0,
      param4: 0,
      param5: 0,
      param6: 0,
      param7: 0,
      targetSystem: 1,
      targetComponent: 0
    });
  },

  /**
   * Set flight mode
   */
  async setMode(mode: number): Promise<MAVResult> {
    const service = getMAVLinkService();

    return service.sendCommand({
      command: 176,
      confirmation: 0,
      param1: 1,
      param2: mode,
      param3: 0,
      param4: 0,
      param5: 0,
      param6: 0,
      param7: 0,
      targetSystem: 1,
      targetComponent: 0
    });
  },

  /**
   * Takeoff
   */
  async takeoff(altitude: number): Promise<MAVResult> {
    // NASA JPL Rule 5: Validate altitude before sending command
    if (!Number.isFinite(altitude)) {
      throw new Error(`Takeoff altitude must be a finite number, got: ${altitude}`);
    }

    const service = getMAVLinkService();

    return service.sendCommand({
      command: 22,
      confirmation: 0,
      param1: 0,
      param2: 0,
      param3: 0,
      param4: 0,
      param5: 0,
      param6: 0,
      param7: altitude,
      targetSystem: 1,
      targetComponent: 0
    });
  },

  /**
   * Return to launch
   */
  async returnToLaunch(): Promise<MAVResult> {
    const service = getMAVLinkService();

    return service.sendCommand({
      command: 20,
      confirmation: 0,
      param1: 0,
      param2: 0,
      param3: 0,
      param4: 0,
      param5: 0,
      param6: 0,
      param7: 0,
      targetSystem: 1,
      targetComponent: 0
    });
  },

  /**
   * Reboot autopilot
   */
  async rebootAutopilot(): Promise<MAVResult> {
    const service = getMAVLinkService();

    return service.sendCommand({
      command: 246,
      confirmation: 0,
      param1: 1,
      param2: 0,
      param3: 0,
      param4: 0,
      param5: 0,
      param6: 0,
      param7: 0,
      targetSystem: 1,
      targetComponent: 0
    });
  }
};
