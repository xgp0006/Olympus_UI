/**
 * Comprehensive type definitions for the drone-config plugin
 * Following aerospace-grade standards and NASA JPL compliance
 *
 * Theme variables used by components consuming these types:
 * - --color-text-primary: Primary text color for parameter names
 * - --color-text-secondary: Secondary text color for parameter descriptions
 * - --color-text-error: Error text color for validation messages
 * - --color-surface-card: Background for parameter cards
 * - --color-border: Border color for parameter inputs
 */

/**
 * MAVLink component IDs
 */
export enum MAVComponent {
  ALL = 0,
  AUTOPILOT1 = 1,
  GIMBAL = 154,
  CAMERA = 100,
  ONBOARD_COMPUTER = 191,
  ONBOARD_COMPUTER2 = 192,
  ONBOARD_COMPUTER3 = 193,
  ONBOARD_COMPUTER4 = 194
}

/**
 * MAVLink message types we handle
 */
export enum MAVMessageType {
  HEARTBEAT = 0,
  SYS_STATUS = 1,
  PARAM_REQUEST_READ = 20,
  PARAM_REQUEST_LIST = 21,
  PARAM_VALUE = 22,
  PARAM_SET = 23,
  GPS_RAW_INT = 24,
  ATTITUDE = 30,
  GLOBAL_POSITION_INT = 33,
  RC_CHANNELS = 65,
  VFR_HUD = 74,
  COMMAND_LONG = 76,
  COMMAND_ACK = 77,
  BATTERY_STATUS = 147,
  AUTOPILOT_VERSION = 148,
  STATUSTEXT = 253
}

/**
 * MAVLink command results
 */
export enum MAVResult {
  ACCEPTED = 0,
  TEMPORARILY_REJECTED = 1,
  DENIED = 2,
  UNSUPPORTED = 3,
  FAILED = 4,
  IN_PROGRESS = 5,
  CANCELLED = 6
}

/**
 * Flight modes enumeration (ArduPilot)
 */
export enum FlightMode {
  STABILIZE = 0,
  ACRO = 1,
  ALT_HOLD = 2,
  AUTO = 3,
  GUIDED = 4,
  LOITER = 5,
  RTL = 6,
  CIRCLE = 7,
  LAND = 9,
  DRIFT = 11,
  SPORT = 13,
  FLIP = 14,
  AUTOTUNE = 15,
  POSHOLD = 16,
  BRAKE = 17,
  THROW = 18,
  AVOID_ADSB = 19,
  GUIDED_NOGPS = 20,
  SMART_RTL = 21,
  FLOWHOLD = 22,
  FOLLOW = 23,
  ZIGZAG = 24,
  SYSTEMID = 25,
  AUTOROTATE = 26
}

/**
 * ESC protocols enumeration
 */
export enum ESCProtocol {
  PWM = 0,
  ONESHOT125 = 1,
  ONESHOT42 = 2,
  MULTISHOT = 3,
  DSHOT150 = 4,
  DSHOT300 = 5,
  DSHOT600 = 6,
  DSHOT1200 = 7,
  PROSHOT1000 = 8
}

/**
 * Parameter types following QGroundControl metadata format
 */
export enum ParameterType {
  UINT8 = 'uint8',
  INT8 = 'int8',
  UINT16 = 'uint16',
  INT16 = 'int16',
  UINT32 = 'uint32',
  INT32 = 'int32',
  UINT64 = 'uint64',
  INT64 = 'int64',
  FLOAT = 'float',
  DOUBLE = 'double',
  ENUM = 'enum',
  STRING = 'string'
}

/**
 * Parameter metadata interface (QGroundControl compatible)
 */
export interface ParameterMetadata {
  name: string;
  type: ParameterType;
  defaultValue: number;
  min?: number;
  max?: number;
  increment?: number;
  units?: string;
  description: string;
  group: string;
  category?: string;
  rebootRequired?: boolean;
  volatile?: boolean;
  bitmask?: Array<{ bit: number; label: string }>;
  values?: Array<{ value: number; label: string }>;
}

/**
 * Drone parameter interface with all properties
 */
export interface DroneParameter {
  id: string; // Unique identifier (name + index)
  name: string; // Parameter name (e.g., "MOT_SPIN_MIN")
  value: number; // Current value
  type: ParameterType; // Data type
  index: number; // Parameter index in MAVLink
  metadata?: ParameterMetadata; // Optional metadata
  lastUpdated: number; // Timestamp of last update
  isDirty?: boolean; // Has uncommitted changes
  isModified?: boolean; // Different from default
  // Direct access properties for UI components
  group?: string; // Parameter grouping for UI organization
  advanced?: boolean; // Flag for advanced parameters
  description?: string; // Parameter description
  min?: number; // Minimum value constraint
  max?: number; // Maximum value constraint
  increment?: number; // Step increment for UI controls
  units?: string; // Parameter units (e.g., "m/s", "degrees")
  options?: Array<{ value: number; label: string }>; // For enum-type parameters
}

/**
 * Parameter constraint for validation
 */
export interface ParameterConstraint {
  min?: number;
  max?: number;
  allowedValues?: number[];
  validator?: (value: number) => boolean;
  errorMessage?: string;
}

/**
 * Parameter group for organization
 */
export interface ParameterGroup {
  name: string;
  description: string;
  parameters: string[]; // Parameter names
  icon?: string;
  priority?: number; // Display order
}

/**
 * Parameter profile for saving/loading configurations
 */
export interface ParameterProfile {
  id: string;
  name: string;
  description?: string;
  parameters: Record<string, number>; // name -> value
  vehicleType?: string;
  created: number;
  modified: number;
}

/**
 * Attitude telemetry data
 */
export interface AttitudeTelemetry {
  roll: number; // radians
  pitch: number; // radians
  yaw: number; // radians
  rollSpeed: number; // rad/s
  pitchSpeed: number; // rad/s
  yawSpeed: number; // rad/s
  timestamp: number;
}

/**
 * GPS telemetry data
 */
export interface GPSTelemetry {
  lat: number; // degrees * 1e7
  lon: number; // degrees * 1e7
  alt: number; // millimeters
  relativeAlt: number; // millimeters
  vx: number; // cm/s
  vy: number; // cm/s
  vz: number; // cm/s
  fixType: number; // 0-3 (no fix to 3D fix)
  satellitesVisible: number;
  hdop: number; // Horizontal dilution of precision
  vdop: number; // Vertical dilution of precision
  timestamp: number;
}

/**
 * Battery telemetry data
 */
export interface BatteryTelemetry {
  voltage: number; // millivolts
  current: number; // milliamps
  remaining: number; // percentage (0-100)
  consumed: number; // milliamp-hours
  temperature?: number; // celsius * 100
  cellCount?: number;
  cellVoltages?: number[]; // millivolts per cell
  timestamp: number;
}

/**
 * Motor telemetry data
 */
export interface MotorTelemetry {
  motorCount: number;
  throttle: number[]; // 0-100% per motor
  rpm?: number[]; // RPM per motor (if available)
  temperature?: number[]; // celsius per motor
  current?: number[]; // amps per motor
  timestamp: number;
}

/**
 * System status telemetry
 */
export interface SystemTelemetry {
  armed: boolean;
  flightMode: FlightMode;
  cpuLoad: number; // percentage
  ramUsage: number; // percentage
  temperature?: number; // celsius
  uptime: number; // milliseconds
  errors: string[];
  warnings: string[];
  timestamp: number;
}

/**
 * Complete telemetry packet
 */
export interface TelemetryPacket {
  attitude?: AttitudeTelemetry;
  gps?: GPSTelemetry;
  battery?: BatteryTelemetry;
  motors?: MotorTelemetry;
  system?: SystemTelemetry;
  timestamp: number;
}

/**
 * MAVLink message interface
 */
export interface MAVLinkMessage {
  systemId: number;
  componentId: number;
  messageId: MAVMessageType;
  sequence: number;
  payload: Uint8Array;
  checksum: number;
  timestamp: number;
}

/**
 * MAVLink command interface
 */
export interface MAVLinkCommand {
  command: number;
  confirmation: number;
  param1: number;
  param2: number;
  param3: number;
  param4: number;
  param5: number;
  param6: number;
  param7: number;
  targetSystem: number;
  targetComponent: number;
}

/**
 * Connection options for MAVLink
 */
export interface MAVLinkConnectionOptions {
  baudRate?: number;
  systemId?: number;
  componentId?: number;
  heartbeatInterval?: number;
  requestTimeout?: number;
  maxRetries?: number;
}

/**
 * Parameter change event
 */
export interface ParameterChangeEvent {
  parameter: DroneParameter;
  oldValue: number;
  newValue: number;
  source: 'user' | 'vehicle' | 'sync';
  timestamp: number;
}

/**
 * Telemetry subscription options
 */
export interface TelemetrySubscriptionOptions {
  attitude?: boolean;
  gps?: boolean;
  battery?: boolean;
  motors?: boolean;
  system?: boolean;
  rateHz?: number; // Update rate in Hz
}

/**
 * Error types for drone operations
 */
export enum DroneErrorType {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_LOST = 'CONNECTION_LOST',
  PARAMETER_READ_FAILED = 'PARAMETER_READ_FAILED',
  PARAMETER_WRITE_FAILED = 'PARAMETER_WRITE_FAILED',
  COMMAND_FAILED = 'COMMAND_FAILED',
  TIMEOUT = 'TIMEOUT',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Drone error interface
 */
export interface DroneError {
  type: DroneErrorType;
  message: string;
  details?: unknown;
  timestamp: number;
}

/**
 * Batch parameter operation
 */
export interface BatchParameterOperation {
  parameters: Array<{
    name: string;
    value: number;
  }>;
  atomic?: boolean; // All or nothing
  validateFirst?: boolean;
}

/**
 * Parameter comparison result
 */
export interface ParameterComparison {
  name: string;
  currentValue: number;
  compareValue: number;
  isDifferent: boolean;
  percentDifference?: number;
}

/**
 * Vehicle information
 */
export interface VehicleInfo {
  autopilot: string;
  vehicleType: string;
  firmwareVersion: string;
  protocolVersion: string;
  capabilities: string[];
  uid?: string;
}

/**
 * Type guards
 */
export function isValidParameterType(type: string): type is ParameterType {
  return Object.values(ParameterType).includes(type as ParameterType);
}

export function isValidFlightMode(mode: number): mode is FlightMode {
  return Object.values(FlightMode).includes(mode);
}

export function isValidESCProtocol(protocol: number): protocol is ESCProtocol {
  return Object.values(ESCProtocol).includes(protocol);
}

/**
 * Default parameter constraints by type
 */
export const DEFAULT_PARAMETER_CONSTRAINTS: Record<ParameterType, ParameterConstraint> = {
  [ParameterType.UINT8]: { min: 0, max: 255 },
  [ParameterType.INT8]: { min: -128, max: 127 },
  [ParameterType.UINT16]: { min: 0, max: 65535 },
  [ParameterType.INT16]: { min: -32768, max: 32767 },
  [ParameterType.UINT32]: { min: 0, max: 4294967295 },
  [ParameterType.INT32]: { min: -2147483648, max: 2147483647 },
  [ParameterType.UINT64]: { min: 0, max: Number.MAX_SAFE_INTEGER },
  [ParameterType.INT64]: { min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER },
  [ParameterType.FLOAT]: { min: -Number.MAX_VALUE, max: Number.MAX_VALUE },
  [ParameterType.DOUBLE]: { min: -Number.MAX_VALUE, max: Number.MAX_VALUE },
  [ParameterType.ENUM]: {}, // No numeric constraints for enum types
  [ParameterType.STRING]: {} // No numeric constraints for string types
};
