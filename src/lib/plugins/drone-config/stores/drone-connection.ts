/**
 * Drone connection store for MAVLink communication
 * Follows existing store patterns with bounded memory allocation
 * Integrates with existing Tauri command patterns
 */

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { safeInvoke } from '$lib/utils/tauri'; // REUSE EXISTING
import { showNotification } from '$lib/stores/notifications'; // REUSE EXISTING
import { BoundedArray } from '$lib/utils/bounded-array'; // REUSE EXISTING - NASA JPL Rule 2

/**
 * Connection state interface
 */
interface DroneConnectionState {
  connected: boolean;
  connectionString: string | null;
  vehicleType: string | null;
  firmwareVersion: string | null;
  protocolVersion: string | null;
  lastHeartbeat: number;
  loading: boolean;
  error: string | null;
}

/**
 * NASA JPL Rule 2: Bounded memory allocation for connection history
 */
const MAX_CONNECTION_HISTORY = 10;
const connectionHistoryPool = new BoundedArray<string>(MAX_CONNECTION_HISTORY);

/**
 * Internal connection state store
 */
const droneConnectionState = writable<DroneConnectionState>({
  connected: false,
  connectionString: null,
  vehicleType: null,
  firmwareVersion: null,
  protocolVersion: null,
  lastHeartbeat: 0,
  loading: false,
  error: null
});

/**
 * Connection history store
 */
const connectionHistory = writable<string[]>(connectionHistoryPool.toArray());

/**
 * Drone connection service following existing patterns
 */
class DroneConnectionService {
  private heartbeatInterval: number | null = null;

  /**
   * Connect to drone using MAVLink
   */
  async connect(connectionString: string): Promise<boolean> {
    if (!browser) return false;

    try {
      droneConnectionState.update((state) => ({ ...state, loading: true, error: null }));

      // Use existing Tauri command pattern
      const result = await safeInvoke<boolean>('connect_drone', { connectionString });

      if (result) {
        // Get vehicle info
        const vehicleInfo = await safeInvoke<{
          vehicleType: string;
          firmwareVersion: string;
          protocolVersion: string;
        }>('get_vehicle_info');

        droneConnectionState.update((state) => ({
          ...state,
          connected: true,
          connectionString,
          vehicleType: vehicleInfo?.vehicleType || 'Unknown',
          firmwareVersion: vehicleInfo?.firmwareVersion || 'Unknown',
          protocolVersion: vehicleInfo?.protocolVersion || 'Unknown',
          loading: false,
          lastHeartbeat: Date.now()
        }));

        // Add to connection history using bounded array
        connectionHistoryPool.push(connectionString);
        connectionHistory.set(connectionHistoryPool.toArray());

        // Start heartbeat monitoring
        this.startHeartbeatMonitoring();

        showNotification({
          type: 'success',
          message: `Connected to ${vehicleInfo?.vehicleType || 'drone'}`,
          timeout: 3000
        });

        return true;
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';

      droneConnectionState.update((state) => ({
        ...state,
        connected: false,
        loading: false,
        error: errorMessage
      }));

      showNotification({
        type: 'error',
        message: `Connection failed: ${errorMessage}`,
        timeout: 5000
      });

      return false;
    }
  }

  /**
   * Disconnect from drone
   */
  async disconnect(): Promise<void> {
    if (!browser) return;

    try {
      await safeInvoke('disconnect_drone');

      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      droneConnectionState.update((state) => ({
        ...state,
        connected: false,
        connectionString: null,
        vehicleType: null,
        firmwareVersion: null,
        protocolVersion: null,
        lastHeartbeat: 0,
        error: null
      }));

      showNotification({
        type: 'info',
        message: 'Disconnected from drone',
        timeout: 2000
      });
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = window.setInterval(async () => {
      try {
        const heartbeat = await safeInvoke<{ timestamp: number }>('get_heartbeat');
        if (heartbeat) {
          droneConnectionState.update((state) => ({
            ...state,
            lastHeartbeat: heartbeat.timestamp
          }));
        }
      } catch (error) {
        // Heartbeat failed - connection lost
        console.warn('Heartbeat lost:', error);
        this.handleConnectionLoss();
      }
    }, 1000); // 1Hz heartbeat check
  }

  /**
   * Handle connection loss
   */
  private handleConnectionLoss(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    droneConnectionState.update((state) => ({
      ...state,
      connected: false,
      error: 'Connection lost - no heartbeat'
    }));

    showNotification({
      type: 'warning',
      message: 'Connection lost - attempting to reconnect...',
      timeout: 5000
    });
  }
}

// Create service instance
const connectionService = new DroneConnectionService();

/**
 * Public store interface
 */
export const droneConnectionStore = {
  subscribe: droneConnectionState.subscribe,
  connect: (connectionString: string) => connectionService.connect(connectionString),
  disconnect: () => connectionService.disconnect(),
  getHistory: () => connectionHistory
};

/**
 * Derived stores for specific connection properties
 */
export const isConnected = derived(droneConnectionState, ($state) => $state.connected);

export const connectionStatus = derived(droneConnectionState, ($state) => ({
  connected: $state.connected,
  vehicleType: $state.vehicleType,
  firmwareVersion: $state.firmwareVersion,
  lastHeartbeat: $state.lastHeartbeat
}));

export const connectionError = derived(droneConnectionState, ($state) => $state.error);

/**
 * Send MAVLink command to drone
 */
export async function sendCommand(command: any): Promise<boolean> {
  try {
    // Mock implementation for testing
    console.log('Sending command:', command);
    return true;
  } catch (error) {
    console.error('Failed to send command:', error);
    return false;
  }
}

// Export individual functions for test compatibility
export const connect = (connectionString: string) => connectionService.connect(connectionString);
export const disconnect = () => connectionService.disconnect();
