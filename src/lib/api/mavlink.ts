// MAVLink Drone Communication API
// TypeScript interface for Tauri backend commands

import { invoke } from '@tauri-apps/api/tauri';

// Types matching Rust structs
export interface VehicleInfo {
  system_id: number;
  component_id: number;
  autopilot_type: string;
  vehicle_type: string;
  firmware_version: string;
  capabilities: string[];
  armed: boolean;
  flight_mode: string;
}

export interface Parameter {
  id: string;
  value: number;
  param_type: string;
  description?: string;
  min_value?: number;
  max_value?: number;
  units?: string;
}

export interface CalibrationResult {
  success: boolean;
  sensor_type: string;
  offsets: number[];
  scales: number[];
  fitness: number;
  message: string;
}

export interface ConnectionStatus {
  connected: boolean;
  connection_string?: string;
  last_heartbeat?: number;
  messages_received: number;
  messages_sent: number;
  link_quality: number;
}

// Connection Commands
export async function connectDrone(connectionString: string): Promise<boolean> {
  return await invoke('connect_drone', { connectionString });
}

export async function disconnectDrone(): Promise<void> {
  return await invoke('disconnect_drone');
}

export async function getVehicleInfo(): Promise<VehicleInfo> {
  return await invoke('get_vehicle_info');
}

// Parameter Commands
export async function getDroneParameters(): Promise<Parameter[]> {
  return await invoke('get_drone_parameters');
}

export async function setDroneParameter(paramId: string, value: number): Promise<void> {
  return await invoke('set_drone_parameter', { paramId, value });
}

// Motor Test Commands
export async function testMotor(
  motorId: number,
  throttle: number,
  durationMs: number
): Promise<void> {
  return await invoke('test_motor', { motorId, throttle, durationMs });
}

export async function emergencyStop(): Promise<void> {
  return await invoke('emergency_stop');
}

// Calibration Commands
export async function calibrateAccelerometer(): Promise<CalibrationResult> {
  return await invoke('calibrate_accelerometer');
}

export async function calibrateGyroscope(): Promise<CalibrationResult> {
  return await invoke('calibrate_gyroscope');
}

// Helper function to format connection strings
export function formatConnectionString(
  type: 'serial' | 'udp' | 'tcp',
  host: string,
  port?: number,
  baudrate?: number
): string {
  switch (type) {
    case 'serial':
      return `${host}:${baudrate || 57600}`;
    case 'udp':
      return `udp://${host}:${port || 14550}`;
    case 'tcp':
      return `tcp://${host}:${port || 5760}`;
    default:
      throw new Error(`Unknown connection type: ${type}`);
  }
}

// Common connection strings
export const CONNECTION_PRESETS = {
  SITL: 'tcp://127.0.0.1:5760',
  MAVPROXY: 'udp://127.0.0.1:14550',
  USB_PIXHAWK: '/dev/ttyACM0:115200',
  SERIAL_PIXHAWK: '/dev/ttyUSB0:57600',
  WINDOWS_COM: 'COM3:57600',
} as const;

// Safety constants
export const SAFETY_LIMITS = {
  MAX_MOTOR_ID: 8,
  MAX_THROTTLE_PERCENT: 100,
  MAX_TEST_DURATION_MS: 5000,
  MIN_BATTERY_VOLTAGE: 3.3,
  MAX_LEAN_ANGLE_DEG: 45,
} as const;