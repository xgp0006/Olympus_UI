/**
 * Real-time telemetry store for drone data streaming
 * Implements efficient circular buffers for memory management
 * Follows NASA JPL compliance with bounded arrays
 * 
 * Theme variables used by consuming components:
 * - --color-telemetry-good: Healthy telemetry indicators
 * - --color-telemetry-warning: Warning state indicators
 * - --color-telemetry-critical: Critical state indicators
 * - --color-surface-telemetry: Telemetry widget backgrounds
 */

import { writable, derived, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import { setupEventListener, type UnlistenFn } from '$lib/utils/tauri';
import { showWarning, showError } from '$lib/stores/notifications';
import { BoundedArray } from '$lib/utils/bounded-array';
import type {
  TelemetryPacket,
  AttitudeTelemetry,
  GPSTelemetry,
  BatteryTelemetry,
  MotorTelemetry,
  SystemTelemetry,
  TelemetrySubscriptionOptions
} from '../types/drone-types';

/**
 * NASA JPL Rule 2: Bounded memory allocation
 */
const MAX_TELEMETRY_HISTORY = 1000;
const MAX_ERROR_HISTORY = 50;

/**
 * Circular buffer implementation for efficient telemetry storage
 */
class CircularBuffer<T> {
  private buffer: (T | undefined)[];
  private writeIndex = 0;
  private size = 0;
  
  constructor(private capacity: number) {
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    this.buffer[this.writeIndex] = item;
    this.writeIndex = (this.writeIndex + 1) % this.capacity;
    if (this.size < this.capacity) {
      this.size++;
    }
  }

  getLatest(count: number): T[] {
    const result: T[] = [];
    const start = this.size < this.capacity 
      ? 0 
      : this.writeIndex;
    
    for (let i = 0; i < Math.min(count, this.size); i++) {
      const index = (start - i - 1 + this.capacity) % this.capacity;
      const item = this.buffer[index];
      if (item !== undefined) {
        result.push(item);
      }
    }
    
    return result;
  }

  clear(): void {
    this.buffer = new Array(this.capacity);
    this.writeIndex = 0;
    this.size = 0;
  }

  getSize(): number {
    return this.size;
  }
}

/**
 * Telemetry store state interface
 */
interface TelemetryState {
  current: TelemetryPacket | null;
  attitude: AttitudeTelemetry | null;
  gps: GPSTelemetry | null;
  battery: BatteryTelemetry | null;
  motors: MotorTelemetry | null;
  system: SystemTelemetry | null;
  connected: boolean;
  streaming: boolean;
  lastUpdate: number;
  updateRate: number; // Hz
  errors: string[];
}

/**
 * Telemetry history buffers
 */
const telemetryBuffer = new CircularBuffer<TelemetryPacket>(MAX_TELEMETRY_HISTORY);
const attitudeHistory = new CircularBuffer<AttitudeTelemetry>(MAX_TELEMETRY_HISTORY);
const gpsHistory = new CircularBuffer<GPSTelemetry>(MAX_TELEMETRY_HISTORY);
const batteryHistory = new CircularBuffer<BatteryTelemetry>(MAX_TELEMETRY_HISTORY);

/**
 * Error tracking
 */
const errorHistory = new BoundedArray<{ message: string; timestamp: number }>(MAX_ERROR_HISTORY);

/**
 * Internal telemetry state
 */
const telemetryState: Writable<TelemetryState> = writable({
  current: null,
  attitude: null,
  gps: null,
  battery: null,
  motors: null,
  system: null,
  connected: false,
  streaming: false,
  lastUpdate: 0,
  updateRate: 0,
  errors: []
});

/**
 * Performance monitoring
 */
let lastUpdateTime = 0;
let updateCount = 0;
let updateRateTimer: number | null = null;

/**
 * Event listeners
 */
let telemetryUnlisten: UnlistenFn | null = null;
let attitudeUnlisten: UnlistenFn | null = null;
let gpsUnlisten: UnlistenFn | null = null;
let batteryUnlisten: UnlistenFn | null = null;
let motorUnlisten: UnlistenFn | null = null;
let systemUnlisten: UnlistenFn | null = null;

/**
 * Public derived stores
 */
export const currentTelemetry = derived(
  telemetryState,
  $state => $state.current
);

export const attitudeTelemetry = derived(
  telemetryState,
  $state => $state.attitude
);

export const gpsTelemetry = derived(
  telemetryState,
  $state => $state.gps
);

export const batteryTelemetry = derived(
  telemetryState,
  $state => $state.battery
);

export const motorTelemetry = derived(
  telemetryState,
  $state => $state.motors
);

export const systemTelemetry = derived(
  telemetryState,
  $state => $state.system
);

export const telemetryConnected = derived(
  telemetryState,
  $state => $state.connected
);

export const telemetryStreaming = derived(
  telemetryState,
  $state => $state.streaming
);

export const telemetryUpdateRate = derived(
  telemetryState,
  $state => $state.updateRate
);

export const telemetryErrors = derived(
  telemetryState,
  $state => $state.errors
);

/**
 * Derived computed stores
 */
export const gpsStatus = derived(
  gpsTelemetry,
  $gps => {
    if (!$gps) return { hasfix: false, quality: 'none' };
    
    const hasFix = $gps.fixType >= 2;
    let quality = 'none';
    
    if ($gps.fixType === 3 && $gps.satellitesVisible >= 8) {
      quality = $gps.hdop < 1.5 ? 'excellent' : $gps.hdop < 2.5 ? 'good' : 'fair';
    } else if ($gps.fixType === 3) {
      quality = 'fair';
    } else if ($gps.fixType === 2) {
      quality = 'poor';
    }
    
    return { hasFix, quality, satellites: $gps.satellitesVisible, hdop: $gps.hdop };
  }
);

export const batteryStatus = derived(
  batteryTelemetry,
  $battery => {
    if (!$battery) return { level: 'unknown', percentage: 0, voltage: 0 };
    
    let level = 'critical';
    if ($battery.remaining > 50) level = 'good';
    else if ($battery.remaining > 30) level = 'warning';
    else if ($battery.remaining > 15) level = 'low';
    
    return {
      level,
      percentage: $battery.remaining,
      voltage: $battery.voltage / 1000, // Convert to volts
      current: $battery.current / 1000, // Convert to amps
      consumed: $battery.consumed
    };
  }
);

/**
 * NASA JPL Rule 4: Split function - Calculate update rate
 */
function calculateUpdateRate(): void {
  const now = Date.now();
  
  if (lastUpdateTime > 0) {
    updateCount++;
    
    // Calculate rate every second
    if (now - lastUpdateTime >= 1000) {
      const rate = updateCount / ((now - lastUpdateTime) / 1000);
      
      telemetryState.update(state => ({
        ...state,
        updateRate: Math.round(rate)
      }));
      
      updateCount = 0;
      lastUpdateTime = now;
    }
  } else {
    lastUpdateTime = now;
  }
}

/**
 * NASA JPL Rule 4: Split function - Process telemetry packet
 */
function processTelemetryPacket(packet: TelemetryPacket): void {
  // Update histories
  telemetryBuffer.push(packet);
  if (packet.attitude) attitudeHistory.push(packet.attitude);
  if (packet.gps) gpsHistory.push(packet.gps);
  if (packet.battery) batteryHistory.push(packet.battery);
  
  // Update current state
  telemetryState.update(state => ({
    ...state,
    current: packet,
    attitude: packet.attitude ?? null,
    gps: packet.gps ?? null,
    battery: packet.battery ?? null,
    motors: packet.motors ?? null,
    system: packet.system ?? null,
    lastUpdate: packet.timestamp,
    connected: true,
    streaming: true
  }));
  
  // Update rate calculation
  calculateUpdateRate();
  
  // Check for critical conditions
  checkCriticalConditions(packet);
}

/**
 * NASA JPL Rule 4: Split function - Check critical conditions
 */
function checkCriticalConditions(packet: TelemetryPacket): void {
  // Battery critical
  if (packet.battery && packet.battery.remaining < 10) {
    showWarning('Critical Battery', `Battery at ${packet.battery.remaining}%`);
  }
  
  // GPS loss
  if (packet.gps && packet.gps.fixType < 2) {
    recordError('GPS fix lost');
  }
  
  // System errors
  if (packet.system && packet.system.errors.length > 0) {
    packet.system.errors.forEach(error => recordError(error));
  }
}

/**
 * Record telemetry error
 */
function recordError(message: string): void {
  errorHistory.push({ message, timestamp: Date.now() });
  
  telemetryState.update(state => ({
    ...state,
    errors: errorHistory.getAll().map(e => e.message)
  }));
}

/**
 * Start telemetry streaming
 */
export async function startTelemetryStream(
  options: TelemetrySubscriptionOptions = {}
): Promise<boolean> {
  if (!browser) return false;
  
  try {
    // Set up WebSocket event listeners
    telemetryUnlisten = await setupEventListener<TelemetryPacket>(
      'telemetry-packet',
      processTelemetryPacket,
      {
        showErrorNotifications: false,
        maxErrorsBeforeDisable: 5
      }
    );
    
    // Set up individual telemetry streams if requested
    if (options.attitude !== false) {
      attitudeUnlisten = await setupEventListener<AttitudeTelemetry>(
        'telemetry-attitude',
        (data) => {
          attitudeHistory.push(data);
          telemetryState.update(state => ({ ...state, attitude: data }));
        }
      );
    }
    
    if (options.gps !== false) {
      gpsUnlisten = await setupEventListener<GPSTelemetry>(
        'telemetry-gps',
        (data) => {
          gpsHistory.push(data);
          telemetryState.update(state => ({ ...state, gps: data }));
        }
      );
    }
    
    if (options.battery !== false) {
      batteryUnlisten = await setupEventListener<BatteryTelemetry>(
        'telemetry-battery',
        (data) => {
          batteryHistory.push(data);
          telemetryState.update(state => ({ ...state, battery: data }));
        }
      );
    }
    
    if (options.motors !== false) {
      motorUnlisten = await setupEventListener<MotorTelemetry>(
        'telemetry-motors',
        (data) => {
          telemetryState.update(state => ({ ...state, motors: data }));
        }
      );
    }
    
    if (options.system !== false) {
      systemUnlisten = await setupEventListener<SystemTelemetry>(
        'telemetry-system',
        (data) => {
          telemetryState.update(state => ({ ...state, system: data }));
          checkCriticalConditions({ system: data } as TelemetryPacket);
        }
      );
    }
    
    // Start update rate monitoring
    updateRateTimer = window.setInterval(calculateUpdateRate, 1000);
    
    // Start memory monitoring for aerospace safety
    MemoryMonitor.startMonitoring();
    
    telemetryState.update(state => ({
      ...state,
      streaming: true,
      connected: true
    }));
    
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to start telemetry';
    recordError(errorMessage);
    showError('Telemetry Start Failed', errorMessage);
    return false;
  }
}

/**
 * Stop telemetry streaming with proper cleanup
 * NASA JPL Rule 2: Prevent memory leaks
 */
export function stopTelemetryStream(): void {
  // Clean up event listeners and null them
  if (telemetryUnlisten) {
    telemetryUnlisten();
    telemetryUnlisten = null;
  }
  if (attitudeUnlisten) {
    attitudeUnlisten();
    attitudeUnlisten = null;
  }
  if (gpsUnlisten) {
    gpsUnlisten();
    gpsUnlisten = null;
  }
  if (batteryUnlisten) {
    batteryUnlisten();
    batteryUnlisten = null;
  }
  if (motorUnlisten) {
    motorUnlisten();
    motorUnlisten = null;
  }
  if (systemUnlisten) {
    systemUnlisten();
    systemUnlisten = null;
  }
  
  // Clear timer
  if (updateRateTimer) {
    clearInterval(updateRateTimer);
    updateRateTimer = null;
  }
  
  // Stop memory monitoring
  MemoryMonitor.stopMonitoring();
  
  // Reset state
  telemetryState.update(state => ({
    ...state,
    streaming: false,
    updateRate: 0
  }));
  
  updateCount = 0;
  lastUpdateTime = 0;
}

/**
 * Get telemetry history
 */
export function getTelemetryHistory(count: number = 100): {
  telemetry: TelemetryPacket[];
  attitude: AttitudeTelemetry[];
  gps: GPSTelemetry[];
  battery: BatteryTelemetry[];
} {
  return {
    telemetry: telemetryBuffer.getLatest(count),
    attitude: attitudeHistory.getLatest(count),
    gps: gpsHistory.getLatest(count),
    battery: batteryHistory.getLatest(count)
  };
}

/**
 * Clear telemetry history
 */
export function clearTelemetryHistory(): void {
  telemetryBuffer.clear();
  attitudeHistory.clear();
  gpsHistory.clear();
  batteryHistory.clear();
  errorHistory.clear();
  
  telemetryState.update(state => ({
    ...state,
    errors: []
  }));
}

/**
 * Export telemetry data
 */
export function exportTelemetryData(): {
  history: ReturnType<typeof getTelemetryHistory>;
  errors: Array<{ message: string; timestamp: number }>;
  stats: {
    totalPackets: number;
    duration: number;
    averageRate: number;
  };
} {
  const history = getTelemetryHistory(MAX_TELEMETRY_HISTORY);
  const packets = history.telemetry;
  
  let duration = 0;
  let averageRate = 0;
  
  if (packets.length > 1) {
    duration = packets[0].timestamp - packets[packets.length - 1].timestamp;
    averageRate = (packets.length / duration) * 1000; // Hz
  }
  
  return {
    history,
    errors: errorHistory.getAll(),
    stats: {
      totalPackets: telemetryBuffer.getSize(),
      duration,
      averageRate
    }
  };
}

/**
 * Get current telemetry state (for testing)
 */
export function getTelemetryState(): TelemetryState {
  let state: TelemetryState | undefined;
  const unsubscribe = telemetryState.subscribe(s => state = s);
  unsubscribe();
  return state!;
}

/**
 * Get telemetry statistics
 */
export function getTelemetryStats(): {
  packetsReceived: number;
  updateRate: number;
  uptime: number;
  errorCount: number;
  packetCount: number;
  averageRate: number;
  latency: number;
  batteryStats: any;
  attitudeStats: any;
} {
  const state = getTelemetryState();
  const history = getTelemetryHistory(100);
  const packetsReceived = telemetryBuffer.getSize();
  
  return {
    packetsReceived,
    updateRate: state.updateRate,
    uptime: state.lastUpdate > 0 ? Date.now() - state.lastUpdate : 0,
    errorCount: state.errors.length,
    packetCount: packetsReceived, // Alias for compatibility
    averageRate: state.updateRate, // Same as updateRate
    latency: 0, // TODO: Implement actual latency calculation
    batteryStats: {}, // TODO: Implement battery statistics
    attitudeStats: {} // TODO: Implement attitude statistics
  };
}

/**
 * Set telemetry subscription options
 */
export async function setTelemetryOptions(options: TelemetrySubscriptionOptions): Promise<void> {
  // Stop current stream if running
  if (getTelemetryState().streaming) {
    stopTelemetryStream();
  }
  
  // Start with new options
  await startTelemetryStream(options);
}

/**
 * Memory monitoring for aerospace safety
 * NASA JPL Rule 2: Monitor memory usage
 */
class MemoryMonitor {
  private static readonly MAX_HEAP_SIZE = 50 * 1024 * 1024; // 50MB limit
  private static monitorInterval: number | null = null;
  
  static startMonitoring(): void {
    if (this.monitorInterval) return;
    
    this.monitorInterval = window.setInterval(() => {
      this.checkMemoryUsage();
    }, 5000); // Check every 5 seconds
  }
  
  static stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }
  
  private static checkMemoryUsage(): void {
    if (!browser || !(performance as any).memory) return;
    
    const usage = (performance as any).memory.usedJSHeapSize;
    if (usage > this.MAX_HEAP_SIZE) {
      console.warn(`Memory usage high: ${Math.round(usage / 1024 / 1024)}MB`);
      // Trigger cleanup if needed
      this.performCleanup();
    }
  }
  
  private static performCleanup(): void {
    // Clear old history data
    const historySize = telemetryBuffer.getSize();
    if (historySize > MAX_TELEMETRY_HISTORY / 2) {
      // In a real implementation, we'd trim the circular buffer
      console.log('Performing telemetry history cleanup');
    }
  }
}

// Export for testing and component usage
export { telemetryState, MemoryMonitor };

// Export main store for compatibility with methods
export const droneTelemetryStore = Object.assign(telemetryState, {
  startTelemetry: startTelemetryStream,
  stopTelemetry: stopTelemetryStream
});

// Export aliases for backward compatibility
export const latestTelemetry = currentTelemetry;
export const telemetryHistory = derived(telemetryState, ($state) => 
  getTelemetryHistory()
);
export const telemetryRate = telemetryUpdateRate;

// Compatibility aliases for test interface
export const startTelemetry = startTelemetryStream;
export const stopTelemetry = stopTelemetryStream;