// Motor-related types for the drone config system

export type MotorConfig = 'quad' | 'hex' | 'octo';

export interface Motor {
  id: number;
  x: number; // Position X (0-100%)
  y: number; // Position Y (0-100%)
  direction: 'CW' | 'CCW';
  throttle: number; // Current throttle (0-100)
  rpm: number;
  current: number;
  temperature: number;
}