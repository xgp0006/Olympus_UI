/**
 * Test utilities for drone-config plugin
 * Provides helpers for component rendering, store mocking, and test data
 */

import { render, type RenderResult } from '@testing-library/svelte';
import { readable, writable, get } from 'svelte/store';
import { vi } from 'vitest';
import type { ComponentType } from 'svelte';
import { 
  createMockDroneParameter,
  createMockTelemetryPacket,
  createMockVehicleInfo,
  createMockCommonParameters,
  createMockParameterProfile,
  createMockMAVLinkConnection
} from './mockDroneData';
import type {
  DroneConnectionState,
  DroneParameterState,
  DroneTelemetryState
} from '../../types/drone-types';

/**
 * Mock drone connection store
 */
export function createMockConnectionStore(overrides?: Partial<DroneConnectionState>) {
  const defaultState: DroneConnectionState = {
    isConnected: false,
    isConnecting: false,
    vehicle: null,
    port: null,
    baudRate: 57600,
    protocol: 'MAVLink',
    error: null,
    lastHeartbeat: null,
    ...overrides
  };

  const { subscribe, set, update } = writable(defaultState);

  return {
    subscribe,
    set,
    update,
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(undefined),
    setPort: vi.fn(),
    setBaudRate: vi.fn(),
    setProtocol: vi.fn()
  };
}

/**
 * Mock drone parameter store
 */
export function createMockParameterStore(overrides?: Partial<DroneParameterState>) {
  const defaultParameters = createMockCommonParameters();
  const defaultState: DroneParameterState = {
    parameters: defaultParameters,
    isLoading: false,
    error: null,
    ...overrides
  };

  const { subscribe, set, update } = writable(defaultState);

  return {
    subscribe,
    set,
    update,
    loadParameters: vi.fn().mockResolvedValue(defaultParameters),
    saveParameter: vi.fn().mockResolvedValue(true),
    revertParameter: vi.fn().mockResolvedValue(true),
    saveAllParameters: vi.fn().mockResolvedValue(true),
    revertAllParameters: vi.fn().mockResolvedValue(true),
    refreshParameters: vi.fn().mockResolvedValue(true),
    searchParameters: vi.fn((query: string) => 
      defaultParameters.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase())
      )
    ),
    exportParameters: vi.fn().mockResolvedValue({}),
    importParameters: vi.fn().mockResolvedValue(true),
    batchSaveParameters: vi.fn().mockResolvedValue({ success: 0, failed: 0 })
  };
}

/**
 * Mock drone telemetry store
 */
export function createMockTelemetryStore(overrides?: Partial<DroneTelemetryState>) {
  const defaultTelemetry = createMockTelemetryPacket();
  const defaultState: DroneTelemetryState = {
    telemetry: defaultTelemetry,
    isStreaming: false,
    streamRate: 10,
    error: null,
    history: [],
    ...overrides
  };

  const { subscribe, set, update } = writable(defaultState);

  return {
    subscribe,
    set,
    update,
    startStream: vi.fn().mockResolvedValue(true),
    stopStream: vi.fn().mockResolvedValue(true),
    setStreamRate: vi.fn(),
    clearHistory: vi.fn()
  };
}

/**
 * Mock parameter service
 */
export const mockParameterService = {
  loadParameterMetadata: vi.fn().mockResolvedValue(new Map()),
  validateParameter: vi.fn().mockReturnValue({ 
    valid: true, 
    errors: [], 
    warnings: [] 
  }),
  convertParameter: vi.fn((value: number) => value),
  validateBatchOperation: vi.fn().mockResolvedValue({ 
    valid: true, 
    errors: new Map() 
  }),
  createProfile: vi.fn().mockResolvedValue(createMockParameterProfile()),
  compareProfiles: vi.fn().mockReturnValue([]),
  exportToArduPilot: vi.fn().mockResolvedValue(undefined),
  importParameters: vi.fn().mockResolvedValue({ 
    parameters: [], 
    atomic: false, 
    validateFirst: true 
  }),
  getParameterGroups: vi.fn().mockReturnValue([]),
  getParameterMetadata: vi.fn().mockReturnValue(undefined),
  getValidationErrors: vi.fn().mockReturnValue([]),
  clearValidationErrors: vi.fn()
};

/**
 * Mock MAVLink service
 */
export const mockMAVLinkService = {
  connect: vi.fn().mockResolvedValue(true),
  disconnect: vi.fn().mockResolvedValue(undefined),
  isConnected: vi.fn().mockReturnValue(false),
  sendCommand: vi.fn().mockResolvedValue({ success: true }),
  requestParameters: vi.fn().mockResolvedValue([]),
  setParameter: vi.fn().mockResolvedValue(true),
  startTelemetryStream: vi.fn().mockResolvedValue(true),
  stopTelemetryStream: vi.fn().mockResolvedValue(true),
  subscribeToMessage: vi.fn().mockReturnValue(() => {}),
  armDisarm: vi.fn().mockResolvedValue(true),
  setFlightMode: vi.fn().mockResolvedValue(true),
  doMotorTest: vi.fn().mockResolvedValue(true),
  emergencyStop: vi.fn().mockResolvedValue(true)
};

/**
 * Render component with drone context
 */
export function renderWithDroneContext<T extends ComponentType>(
  Component: T,
  props: Record<string, any> = {},
  storeOverrides: {
    connection?: Partial<DroneConnectionState>;
    parameters?: Partial<DroneParameterState>;
    telemetry?: Partial<DroneTelemetryState>;
  } = {}
): RenderResult & { mockStores: ReturnType<typeof createMockDroneStores> } {
  const mockStores = createMockDroneStores(storeOverrides);
  
  const result = render(Component, {
    props,
    // Use explicit type annotation to fix Map constructor type inference issue
    // The mixed types (stores and services) cause TypeScript to struggle with inference
    context: new Map<string, any>([
      ['droneConnectionStore', mockStores.droneConnectionStore],
      ['droneParameterStore', mockStores.droneParameterStore],
      ['droneTelemetryStore', mockStores.droneTelemetryStore],
      ['parameterService', mockParameterService],
      ['mavlinkService', mockMAVLinkService]
    ])
  });

  return {
    ...result,
    mockStores
  };
}

/**
 * Create mock drone stores
 */
export function createMockDroneStores(overrides: {
  connection?: Partial<DroneConnectionState>;
  parameters?: Partial<DroneParameterState>;
  telemetry?: Partial<DroneTelemetryState>;
} = {}) {
  return {
    droneConnectionStore: createMockConnectionStore(overrides.connection),
    droneParameterStore: createMockParameterStore(overrides.parameters),
    droneTelemetryStore: createMockTelemetryStore(overrides.telemetry)
  };
}

/**
 * Wait for async operations with timeout
 */
export async function waitForAsync(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 1000,
  interval: number = 10
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) return;
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Simulate emergency stop with performance tracking
 */
export async function simulateEmergencyStop(
  emergencyButton: HTMLElement,
  onClick: () => void
): Promise<number> {
  const startTime = performance.now();
  await onClick();
  const responseTime = performance.now() - startTime;
  return responseTime;
}

/**
 * Create mock WebSocket for telemetry
 */
export function createMockWebSocket() {
  const listeners = new Map<string, Set<Function>>();
  
  return {
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn((event: string, handler: Function) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(handler);
    }),
    removeEventListener: vi.fn((event: string, handler: Function) => {
      listeners.get(event)?.delete(handler);
    }),
    dispatchEvent: vi.fn((event: Event) => {
      const handlers = listeners.get(event.type);
      if (handlers) {
        handlers.forEach(handler => handler(event));
      }
    }),
    readyState: WebSocket.OPEN,
    url: 'ws://localhost:8080',
    protocol: '',
    extensions: '',
    bufferedAmount: 0,
    binaryType: 'blob' as BinaryType,
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null
  };
}

/**
 * Mock safety stage progression
 */
export function mockSafetyStageProgression() {
  let currentStage = 0;
  const maxStage = 4;
  
  return {
    getCurrentStage: () => currentStage,
    canProgressTo: (stage: number) => {
      // Can only progress one stage at a time
      return stage === currentStage + 1 && stage <= maxStage;
    },
    progressTo: (stage: number) => {
      if (stage === currentStage + 1 && stage <= maxStage) {
        currentStage = stage;
        return true;
      }
      return false;
    },
    reset: () => {
      currentStage = 0;
    }
  };
}

/**
 * Assert telemetry update frequency
 */
export async function assertTelemetryUpdateFrequency(
  telemetryStore: any,
  expectedHz: number,
  tolerance: number = 0.1
): Promise<void> {
  const updates: number[] = [];
  let lastUpdate = Date.now();
  
  const unsubscribe = telemetryStore.subscribe(() => {
    const now = Date.now();
    updates.push(now - lastUpdate);
    lastUpdate = now;
  });
  
  // Collect samples for 1 second
  await new Promise(resolve => setTimeout(resolve, 1000));
  unsubscribe();
  
  // Calculate average frequency
  const avgInterval = updates.reduce((a, b) => a + b, 0) / updates.length;
  const actualHz = 1000 / avgInterval;
  
  expect(actualHz).toBeCloseTo(expectedHz, tolerance);
}

/**
 * Create parameter constraint validator
 */
export function createParameterConstraintValidator(constraints: Record<string, any>) {
  return (name: string, value: number) => {
    const constraint = constraints[name];
    if (!constraint) return { valid: true, errors: [] };
    
    const errors: string[] = [];
    
    if (constraint.min !== undefined && value < constraint.min) {
      errors.push(`Value must be >= ${constraint.min}`);
    }
    if (constraint.max !== undefined && value > constraint.max) {
      errors.push(`Value must be <= ${constraint.max}`);
    }
    
    return { valid: errors.length === 0, errors };
  };
}

/**
 * Mock file operations for import/export
 */
export const mockFileOperations = {
  readFile: vi.fn().mockResolvedValue(''),
  writeFile: vi.fn().mockResolvedValue(undefined),
  selectFile: vi.fn().mockResolvedValue({ path: '/mock/file.param', content: '' }),
  saveDialog: vi.fn().mockResolvedValue('/mock/saved.param')
};

/**
 * Performance monitoring helper
 */
export class PerformanceMonitor {
  private marks = new Map<string, number>();
  
  mark(name: string): void {
    this.marks.set(name, performance.now());
  }
  
  measure(name: string, startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark);
    const end = endMark ? this.marks.get(endMark) : performance.now();
    
    if (!start) throw new Error(`Mark '${startMark}' not found`);
    if (endMark && !end) throw new Error(`Mark '${endMark}' not found`);
    
    return end! - start;
  }
  
  clear(): void {
    this.marks.clear();
  }
}