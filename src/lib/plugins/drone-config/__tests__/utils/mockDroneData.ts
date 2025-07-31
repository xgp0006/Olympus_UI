/**
 * Mock data utilities for drone-config plugin tests
 * Provides realistic test data for all drone components
 */

import { vi } from 'vitest';
import type {
  DroneParameter,
  ParameterMetadata,
  TelemetryPacket,
  AttitudeTelemetry,
  GPSTelemetry,
  BatteryTelemetry,
  MotorTelemetry,
  SystemTelemetry,
  MAVLinkMessage,
  MAVLinkCommand,
  VehicleInfo,
  ParameterProfile,
  ParameterGroup,
  DroneError
} from '../../types/drone-types';
import {
  ParameterType
} from '../../types/drone-types';
import { 
  FlightMode, 
  ESCProtocol, 
  MAVComponent, 
  MAVMessageType,
  MAVResult,
  DEFAULT_PARAMETER_CONSTRAINTS,
  type ParameterConstraint,
  DroneErrorType
} from '../../types/drone-types';

/**
 * Create mock drone parameter matching the types interface
 */
export function createMockDroneParameter(overrides: Partial<DroneParameter> = {}): DroneParameter {
  return {
    id: 'MOT_SPIN_MIN_0',
    name: 'MOT_SPIN_MIN',
    value: 0.15,
    type: ParameterType.FLOAT,
    index: 42,
    lastUpdated: Date.now(),
    isDirty: false,
    isModified: false,
    metadata: createMockParameterMetadata(),
    ...overrides
  };
}

/**
 * Create mock parameter metadata
 */
export function createMockParameterMetadata(overrides: Partial<ParameterMetadata> = {}): ParameterMetadata {
  return {
    name: 'MOT_SPIN_MIN',
    type: ParameterType.FLOAT,
    defaultValue: 0.15,
    min: 0.0,
    max: 0.3,
    increment: 0.01,
    units: '',
    description: 'Motor spin minimum when armed',
    group: 'Motors',
    category: 'Essential',
    rebootRequired: false,
    volatile: false,
    ...overrides
  };
}

/**
 * Create mock common parameters set matching the types interface
 */
export function createMockCommonParameters(): DroneParameter[] {
  return [
    createMockDroneParameter({
      id: 'MOT_SPIN_MIN_0',
      name: 'MOT_SPIN_MIN',
      value: 0.15,
      type: ParameterType.FLOAT,
      index: 42,
      metadata: createMockParameterMetadata({
        name: 'MOT_SPIN_MIN',
        description: 'Motor spin minimum when armed',
        group: 'Motors',
        min: 0.0,
        max: 0.3,
        increment: 0.01
      })
    }),
    createMockDroneParameter({
      id: 'MOT_SPIN_MAX_1',
      name: 'MOT_SPIN_MAX',
      value: 0.95,
      type: ParameterType.FLOAT,
      index: 43,
      metadata: createMockParameterMetadata({
        name: 'MOT_SPIN_MAX',
        description: 'Motor spin maximum',
        group: 'Motors',
        min: 0.9,
        max: 1.0,
        increment: 0.01
      })
    }),
    createMockDroneParameter({
      id: 'ATC_RAT_RLL_P_2',
      name: 'ATC_RAT_RLL_P',
      value: 0.135,
      type: ParameterType.FLOAT,
      index: 100,
      metadata: createMockParameterMetadata({
        name: 'ATC_RAT_RLL_P',
        description: 'Roll axis rate controller P gain',
        group: 'Attitude Control',
        min: 0.0,
        max: 0.5,
        increment: 0.005
      })
    }),
    createMockDroneParameter({
      id: 'ATC_RAT_PIT_P_3',
      name: 'ATC_RAT_PIT_P',
      value: 0.135,
      type: ParameterType.FLOAT,
      index: 101,
      metadata: createMockParameterMetadata({
        name: 'ATC_RAT_PIT_P',
        description: 'Pitch axis rate controller P gain',
        group: 'Attitude Control',
        min: 0.0,
        max: 0.5,
        increment: 0.005
      })
    }),
    createMockDroneParameter({
      id: 'MOT_PWM_TYPE_4',
      name: 'MOT_PWM_TYPE',
      value: ESCProtocol.DSHOT600,
      type: ParameterType.UINT8,
      index: 50,
      metadata: createMockParameterMetadata({
        name: 'MOT_PWM_TYPE',
        type: ParameterType.UINT8,
        description: 'Motor PWM protocol type',
        group: 'Motors',
        values: [
          { value: 0, label: 'Normal PWM' },
          { value: 1, label: 'OneShot125' },
          { value: 4, label: 'DShot150' },
          { value: 5, label: 'DShot300' },
          { value: 6, label: 'DShot600' }
        ]
      })
    })
  ];
}

/**
 * Create mock attitude telemetry
 */
export function createMockAttitudeTelemetry(overrides: Partial<AttitudeTelemetry> = {}): AttitudeTelemetry {
  return {
    roll: 0.01,
    pitch: -0.02,
    yaw: 1.57,
    rollSpeed: 0.0,
    pitchSpeed: 0.0,
    yawSpeed: 0.05,
    timestamp: Date.now(),
    ...overrides
  };
}

/**
 * Create mock GPS telemetry
 */
export function createMockGPSTelemetry(overrides: Partial<GPSTelemetry> = {}): GPSTelemetry {
  return {
    lat: 377749000, // 37.7749 degrees * 1e7
    lon: -1224194000, // -122.4194 degrees * 1e7
    alt: 100000, // 100m in millimeters
    relativeAlt: 50000, // 50m
    vx: 0,
    vy: 0,
    vz: 0,
    fixType: 3, // 3D fix
    satellitesVisible: 12,
    hdop: 1.2,
    vdop: 1.5,
    timestamp: Date.now(),
    ...overrides
  };
}

/**
 * Create mock battery telemetry
 */
export function createMockBatteryTelemetry(overrides: Partial<BatteryTelemetry> = {}): BatteryTelemetry {
  return {
    voltage: 16800, // 16.8V in millivolts (4S battery)
    current: 15000, // 15A in milliamps
    remaining: 85, // 85% battery
    consumed: 500, // 500mAh consumed
    temperature: 2500, // 25°C * 100
    cellCount: 4,
    cellVoltages: [4200, 4200, 4200, 4200], // 4.2V per cell
    timestamp: Date.now(),
    ...overrides
  };
}

/**
 * Create mock motor telemetry
 */
export function createMockMotorTelemetry(overrides: Partial<MotorTelemetry> = {}): MotorTelemetry {
  return {
    motorCount: 4,
    throttle: [0, 0, 0, 0], // All motors at 0%
    rpm: [0, 0, 0, 0],
    temperature: [25, 25, 25, 25], // 25°C per motor
    current: [0, 0, 0, 0], // 0A per motor
    timestamp: Date.now(),
    ...overrides
  };
}

/**
 * Create mock system telemetry
 */
export function createMockSystemTelemetry(overrides: Partial<SystemTelemetry> = {}): SystemTelemetry {
  return {
    armed: false,
    flightMode: FlightMode.STABILIZE,
    cpuLoad: 45, // 45% CPU
    ramUsage: 62, // 62% RAM
    temperature: 45, // 45°C
    uptime: 120000, // 2 minutes
    errors: [],
    warnings: [],
    timestamp: Date.now(),
    ...overrides
  };
}

/**
 * Create complete mock telemetry packet
 */
export function createMockTelemetryPacket(overrides: Partial<TelemetryPacket> = {}): TelemetryPacket {
  const timestamp = Date.now();
  return {
    attitude: createMockAttitudeTelemetry({ timestamp }),
    gps: createMockGPSTelemetry({ timestamp }),
    battery: createMockBatteryTelemetry({ timestamp }),
    motors: createMockMotorTelemetry({ timestamp }),
    system: createMockSystemTelemetry({ timestamp }),
    timestamp,
    ...overrides
  };
}

/**
 * Create mock MAVLink message
 */
export function createMockMAVLinkMessage(overrides: Partial<MAVLinkMessage> = {}): MAVLinkMessage {
  return {
    systemId: 1,
    componentId: MAVComponent.AUTOPILOT1,
    messageId: MAVMessageType.HEARTBEAT,
    sequence: 0,
    payload: new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]),
    checksum: 0,
    timestamp: Date.now(),
    ...overrides
  };
}

/**
 * Create mock MAVLink command
 */
export function createMockMAVLinkCommand(overrides: Partial<MAVLinkCommand> = {}): MAVLinkCommand {
  return {
    command: 400, // MAV_CMD_COMPONENT_ARM_DISARM
    confirmation: 0,
    param1: 0, // 0 = disarm, 1 = arm
    param2: 0,
    param3: 0,
    param4: 0,
    param5: 0,
    param6: 0,
    param7: 0,
    targetSystem: 1,
    targetComponent: MAVComponent.AUTOPILOT1,
    ...overrides
  };
}

/**
 * Create mock vehicle info
 */
export function createMockVehicleInfo(overrides: Partial<VehicleInfo> = {}): VehicleInfo {
  return {
    autopilot: 'ArduPilot',
    vehicleType: 'Quadcopter',
    firmwareVersion: '4.3.0',
    protocolVersion: '2.0',
    capabilities: ['FLIGHT_TERMINATION', 'COMPASS_CALIBRATION', 'MOTOR_TEST'],
    uid: '0x1234567890ABCDEF',
    ...overrides
  };
}

/**
 * Create mock parameter profile
 */
export function createMockParameterProfile(overrides: Partial<ParameterProfile> = {}): ParameterProfile {
  return {
    id: 'profile-1',
    name: 'Racing Profile',
    description: 'High performance racing configuration',
    parameters: {
      'MOT_SPIN_MIN': 0.15,
      'MOT_SPIN_MAX': 0.95,
      'ATC_RAT_RLL_P': 0.15,
      'ATC_RAT_PIT_P': 0.15,
      'ATC_RAT_YAW_P': 0.20
    },
    vehicleType: 'Quadcopter',
    created: Date.now() - 86400000, // 1 day ago
    modified: Date.now(),
    ...overrides
  };
}

/**
 * Create mock parameter group
 */
export function createMockParameterGroup(overrides: Partial<ParameterGroup> = {}): ParameterGroup {
  return {
    name: 'Motors',
    description: 'Motor and ESC configuration parameters',
    parameters: [
      'MOT_SPIN_MIN',
      'MOT_SPIN_MAX',
      'MOT_SPIN_ARM',
      'MOT_THST_EXPO',
      'MOT_PWM_TYPE'
    ],
    icon: 'motor',
    priority: 1,
    ...overrides
  };
}

/**
 * Create mock drone error
 */
export function createMockDroneError(
  type: DroneErrorType = DroneErrorType.CONNECTION_FAILED,
  overrides: Partial<DroneError> = {}
): DroneError {
  const errorMessages: Record<DroneErrorType, string> = {
    [DroneErrorType.CONNECTION_FAILED]: 'Failed to connect to drone',
    [DroneErrorType.CONNECTION_LOST]: 'Connection to drone lost',
    [DroneErrorType.PARAMETER_READ_FAILED]: 'Failed to read parameter',
    [DroneErrorType.PARAMETER_WRITE_FAILED]: 'Failed to write parameter',
    [DroneErrorType.COMMAND_FAILED]: 'Command execution failed',
    [DroneErrorType.TIMEOUT]: 'Operation timed out',
    [DroneErrorType.INVALID_PARAMETER]: 'Invalid parameter value',
    [DroneErrorType.PERMISSION_DENIED]: 'Permission denied',
    [DroneErrorType.UNKNOWN]: 'Unknown error occurred'
  };

  return {
    type,
    message: errorMessages[type],
    timestamp: Date.now(),
    ...overrides
  };
}

/**
 * Create mock MAVLink connection
 */
export function createMockMAVLinkConnection() {
  const subscribers = new Map<string, Set<Function>>();
  let connected = false;
  let messageSequence = 0;

  return {
    connect: vi.fn(async () => {
      connected = true;
      return true;
    }),
    disconnect: vi.fn(async () => {
      connected = false;
      subscribers.clear();
    }),
    isConnected: vi.fn(() => connected),
    sendCommand: vi.fn(async (command: MAVLinkCommand) => {
      // Simulate command acknowledgment
      const ack = createMockMAVLinkMessage({
        messageId: MAVMessageType.COMMAND_ACK,
        sequence: messageSequence++,
        payload: new Uint8Array([
          command.command & 0xFF,
          (command.command >> 8) & 0xFF,
          MAVResult.ACCEPTED
        ])
      });
      
      // Notify subscribers
      const handlers = subscribers.get('COMMAND_ACK') || new Set();
      handlers.forEach(handler => handler(ack));
      
      return MAVResult.ACCEPTED;
    }),
    subscribe: vi.fn((messageType: string, handler: Function) => {
      if (!subscribers.has(messageType)) {
        subscribers.set(messageType, new Set());
      }
      subscribers.get(messageType)!.add(handler);
      
      return () => {
        subscribers.get(messageType)?.delete(handler);
      };
    }),
    requestParameters: vi.fn(async () => {
      // Simulate parameter list response
      const params = createMockCommonParameters();
      const handlers = subscribers.get('PARAM_VALUE') || new Set();
      
      params.forEach((param, index) => {
        setTimeout(() => {
          const msg = createMockMAVLinkMessage({
            messageId: MAVMessageType.PARAM_VALUE,
            sequence: messageSequence++,
            payload: new Uint8Array([/* encoded parameter data */])
          });
          handlers.forEach(handler => handler(msg, param));
        }, index * 10); // Stagger responses
      });
      
      return params.length;
    }),
    setParameter: vi.fn(async (name: string, value: number) => {
      // Simulate parameter set acknowledgment
      const param = createMockDroneParameter({ name, value });
      const handlers = subscribers.get('PARAM_VALUE') || new Set();
      
      setTimeout(() => {
        const msg = createMockMAVLinkMessage({
          messageId: MAVMessageType.PARAM_VALUE,
          sequence: messageSequence++
        });
        handlers.forEach(handler => handler(msg, param));
      }, 50);
      
      return true;
    })
  };
}

/**
 * Export DEFAULT_PARAMETER_CONSTRAINTS for tests
 */
export { DEFAULT_PARAMETER_CONSTRAINTS };

/**
 * Create mock parameter constraints (simplified to match actual ParameterConstraint interface)
 */
export function createMockParameterConstraints(): Record<string, ParameterConstraint> {
  return {
    'MOT_SPIN_MIN': { min: 0, max: 0.3 },
    'MOT_SPIN_MAX': { min: 0.9, max: 1.0 },
    'MOT_SPIN_ARM': { min: 0, max: 0.3 },
    'ATC_RAT_RLL_P': { min: 0, max: 0.5 },
    'ATC_RAT_PIT_P': { min: 0, max: 0.5 },
    'ATC_RAT_YAW_P': { min: 0, max: 0.5 }
  };
}

/**
 * Create mock telemetry stream for testing
 */
export function createMockTelemetryStream(
  onPacket: (packet: TelemetryPacket) => void,
  intervalMs: number = 100
): () => void {
  const interval = setInterval(() => {
    const packet = createMockTelemetryPacket();
    onPacket(packet);
  }, intervalMs);

  // Return cleanup function
  return () => {
    clearInterval(interval);
  };
}