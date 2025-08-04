/**
 * Motor Test Store - NASA JPL Rule 4 compliant
 * Manages state for motor testing with safety interlocks
 */

import { writable, derived } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';

// Types
export enum SafetyStage {
  LOCKED = 0,
  STAGE_1 = 1,
  STAGE_2 = 2,
  STAGE_3 = 3,
  STAGE_4 = 4
}

export type MotorConfig = 'quad' | 'hex' | 'octo';

export interface Motor {
  id: number;
  x: number;
  y: number;
  direction: 'CW' | 'CCW';
  throttle: number;
  rpm: number;
  current: number;
  temperature: number;
}

// Store creation
function createMotorTestStore() {
  // Base stores
  const currentStage = writable<SafetyStage>(SafetyStage.LOCKED);
  const propellerRemoved = writable<boolean>(false);
  const motorConfig = writable<MotorConfig>('quad');
  const motors = writable<Motor[]>([]);
  const selectedMotors = writable<Set<number>>(new Set());
  const isEmergencyStopping = writable<boolean>(false);
  const testActive = writable<boolean>(false);
  const countdownTime = writable<number>(0);

  // Derived stores
  const canTest = derived(
    [propellerRemoved, currentStage],
    ([$propRemoved, $stage]) => $propRemoved && $stage > SafetyStage.LOCKED
  );

  const totalCurrent = derived(motors, ($motors) =>
    $motors.reduce((sum, motor) => sum + motor.current, 0)
  );

  return {
    currentStage,
    propellerRemoved,
    motorConfig,
    motors,
    selectedMotors,
    isEmergencyStopping,
    testActive,
    countdownTime,
    canTest,
    totalCurrent
  };
}

export const motorTestStore = createMotorTestStore();
