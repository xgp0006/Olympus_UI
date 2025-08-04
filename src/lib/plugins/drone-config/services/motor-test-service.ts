/**
 * Motor Test Service - NASA JPL Rule 4 compliant
 * Handles motor testing logic with safety interlocks
 * All functions < 60 lines to comply with NASA JPL standards
 */

import { get } from 'svelte/store';
import { motorTestStore, SafetyStage, type Motor, type MotorConfig } from '../stores/motor-test';
import { isConnected } from '../stores/drone-connection';
import { safeTauriInvoke } from '$lib/utils/tauri';
import { showNotification } from '$lib/stores/notifications';

export class MotorTestService {
  private audioContext: AudioContext | null = null;
  private countdownInterval: number | null = null;
  private telemetryInterval: number | null = null;

  /**
   * NASA JPL compliant: Initialize service
   */
  async initialize(): Promise<void> {
    this.initializeAudio();
    this.initializeMotors();
    this.startTelemetryPolling();
  }

  /**
   * NASA JPL compliant: Shutdown service
   */
  shutdown(): void {
    this.stopCountdown();
    this.stopTelemetryPolling();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }

  /**
   * NASA JPL compliant: Initialize audio context
   */
  private initializeAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Audio context not available:', error);
    }
  }

  /**
   * NASA JPL compliant: Initialize motors based on config
   */
  private initializeMotors(): void {
    this.changeMotorConfig('quad');
  }

  /**
   * NASA JPL compliant: Start telemetry polling
   */
  private startTelemetryPolling(): void {
    this.telemetryInterval = window.setInterval(async () => {
      if (!get(isConnected)) return;

      try {
        const telemetry = await safeTauriInvoke<any>('get_motor_telemetry');
        if (telemetry?.motors) {
          this.updateTelemetry(telemetry.motors);
        }
      } catch (error) {
        console.error('Telemetry error:', error);
      }
    }, 100);
  }

  /**
   * NASA JPL compliant: Stop telemetry polling
   */
  private stopTelemetryPolling(): void {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
    }
  }

  /**
   * NASA JPL compliant: Update telemetry data
   */
  private updateTelemetry(telemetryData: any[]): void {
    motorTestStore.motors.update((motors) =>
      motors.map((motor) => {
        const telem = telemetryData.find((t) => t.id === motor.id);
        if (telem) {
          this.checkMotorSafety(motor.id, telem);
          return {
            ...motor,
            rpm: telem.rpm,
            current: telem.current,
            temperature: telem.temperature
          };
        }
        return motor;
      })
    );
  }

  /**
   * NASA JPL compliant: Check motor safety conditions
   */
  private checkMotorSafety(motorId: number, telem: any): void {
    if (telem.temperature > 80) {
      showNotification({
        type: 'error',
        message: `Motor ${motorId} overheating: ${telem.temperature}°C`,
        timeout: 5000
      });
      this.setMotorThrottle(motorId, 0);
    }

    if (telem.current > 30) {
      showNotification({
        type: 'warning',
        message: `Motor ${motorId} high current: ${telem.current}A`,
        timeout: 3000
      });
    }
  }

  /**
   * NASA JPL compliant: Emergency stop
   */
  async emergencyStop(): Promise<void> {
    motorTestStore.isEmergencyStopping.set(true);
    motorTestStore.testActive.set(false);
    this.stopCountdown();

    motorTestStore.motors.update((m) => m.map((motor) => ({ ...motor, throttle: 0 })));

    try {
      await safeTauriInvoke('emergency_stop_motors');
      motorTestStore.currentStage.set(SafetyStage.LOCKED);
      this.playWarningSound(880, 500);

      showNotification({
        type: 'warning',
        message: 'EMERGENCY STOP ACTIVATED',
        timeout: 5000
      });
    } catch (error) {
      console.error('Emergency stop error:', error);
      showNotification({
        type: 'error',
        message: 'Emergency stop failed - disconnect power!',
        timeout: 10000
      });
    } finally {
      motorTestStore.isEmergencyStopping.set(false);
    }
  }

  /**
   * NASA JPL compliant: Play warning sound
   */
  playWarningSound(frequency: number, duration: number): void {
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = frequency;
      gainNode.gain.value = 0.3;

      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.warn('Could not play warning sound:', error);
    }
  }

  /**
   * NASA JPL compliant: Progress safety stage
   */
  progressStage(targetStage: SafetyStage): void {
    if (!this.validateStageTransition(targetStage)) return;

    this.playWarningSound(440 + targetStage * 100, 200);
    motorTestStore.currentStage.set(targetStage);
    this.startCountdown();

    showNotification({
      type: 'info',
      message: `Entered Safety Stage ${targetStage}`,
      timeout: 3000
    });
  }

  /**
   * NASA JPL compliant: Validate stage transition
   */
  private validateStageTransition(targetStage: SafetyStage): boolean {
    const currentStage = get(motorTestStore.currentStage);
    const propellerRemoved = get(motorTestStore.propellerRemoved);

    if (!propellerRemoved) {
      showNotification({
        type: 'error',
        message: 'Propellers must be removed before testing!',
        timeout: 5000
      });
      return false;
    }

    if (targetStage > currentStage + 1) {
      showNotification({
        type: 'warning',
        message: 'Must progress through stages sequentially',
        timeout: 3000
      });
      return false;
    }

    return true;
  }

  /**
   * NASA JPL compliant: Start countdown timer
   */
  private startCountdown(): void {
    this.stopCountdown();
    motorTestStore.countdownTime.set(10);

    this.countdownInterval = window.setInterval(() => {
      motorTestStore.countdownTime.update((t) => {
        if (t <= 1) {
          motorTestStore.currentStage.set(SafetyStage.LOCKED);
          this.stopCountdown();
          this.playWarningSound(330, 300);
          showNotification({
            type: 'warning',
            message: 'Stage timeout - reverting to LOCKED',
            timeout: 3000
          });
          return 0;
        }

        if (t <= 3) {
          this.playWarningSound(660, 50);
        }

        return t - 1;
      });
    }, 1000);
  }

  /**
   * NASA JPL compliant: Stop countdown timer
   */
  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    motorTestStore.countdownTime.set(0);
  }

  /**
   * NASA JPL compliant: Get max throttle for stage
   */
  getMaxThrottle(stage: SafetyStage): number {
    const STAGE_LIMITS: Record<SafetyStage, number> = {
      [SafetyStage.LOCKED]: 0,
      [SafetyStage.STAGE_1]: 25,
      [SafetyStage.STAGE_2]: 50,
      [SafetyStage.STAGE_3]: 75,
      [SafetyStage.STAGE_4]: 100
    };
    return STAGE_LIMITS[stage];
  }

  /**
   * NASA JPL compliant: Change motor configuration
   */
  changeMotorConfig(config: MotorConfig): void {
    motorTestStore.motorConfig.set(config);
    const layouts = this.getMotorLayouts();
    motorTestStore.motors.set([...layouts[config]]);
    motorTestStore.selectedMotors.set(new Set());
  }

  /**
   * NASA JPL compliant: Get motor layouts
   */
  private getMotorLayouts(): Record<MotorConfig, Motor[]> {
    return {
      quad: [
        { id: 1, x: 75, y: 25, direction: 'CW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
        { id: 2, x: 25, y: 25, direction: 'CCW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
        { id: 3, x: 25, y: 75, direction: 'CW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
        { id: 4, x: 75, y: 75, direction: 'CCW', throttle: 0, rpm: 0, current: 0, temperature: 0 }
      ],
      hex: [
        { id: 1, x: 75, y: 15, direction: 'CW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
        { id: 2, x: 25, y: 15, direction: 'CCW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
        { id: 3, x: 0, y: 50, direction: 'CW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
        { id: 4, x: 25, y: 85, direction: 'CCW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
        { id: 5, x: 75, y: 85, direction: 'CW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
        { id: 6, x: 100, y: 50, direction: 'CCW', throttle: 0, rpm: 0, current: 0, temperature: 0 }
      ],
      octo: [
        { id: 1, x: 70, y: 10, direction: 'CW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
        { id: 2, x: 30, y: 10, direction: 'CCW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
        { id: 3, x: 10, y: 30, direction: 'CW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
        { id: 4, x: 10, y: 70, direction: 'CCW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
        { id: 5, x: 30, y: 90, direction: 'CW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
        { id: 6, x: 70, y: 90, direction: 'CCW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
        { id: 7, x: 90, y: 70, direction: 'CW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
        { id: 8, x: 90, y: 30, direction: 'CCW', throttle: 0, rpm: 0, current: 0, temperature: 0 }
      ]
    };
  }

  /**
   * NASA JPL compliant: Toggle motor selection
   */
  toggleMotorSelection(motorId: number): void {
    motorTestStore.selectedMotors.update((selected) => {
      const newSelected = new Set(selected);
      if (newSelected.has(motorId)) {
        newSelected.delete(motorId);
      } else {
        newSelected.add(motorId);
      }
      return newSelected;
    });
  }

  /**
   * NASA JPL compliant: Set motor throttle
   */
  async setMotorThrottle(motorId: number, throttle: number): Promise<void> {
    const currentStage = get(motorTestStore.currentStage);
    const canTest = get(motorTestStore.canTest);
    const maxThrottle = this.getMaxThrottle(currentStage);

    if (!canTest) return;

    const clampedThrottle = Math.min(throttle, maxThrottle);

    try {
      await safeTauriInvoke('set_motor_throttle', {
        motorId,
        throttle: clampedThrottle / 100
      });

      motorTestStore.motors.update((m) =>
        m.map((motor) => (motor.id === motorId ? { ...motor, throttle: clampedThrottle } : motor))
      );

      this.startCountdown();
    } catch (error) {
      console.error('Motor control error:', error);
      showNotification({
        type: 'error',
        message: `Failed to control motor ${motorId}`,
        timeout: 3000
      });
    }
  }

  /**
   * NASA JPL compliant: Set all motors throttle
   */
  async setAllMotorsThrottle(throttle: number): Promise<void> {
    const selectedMotors = get(motorTestStore.selectedMotors);
    const motors = get(motorTestStore.motors);

    const motorIds = selectedMotors.size > 0 ? Array.from(selectedMotors) : motors.map((m) => m.id);

    for (const motorId of motorIds) {
      await this.setMotorThrottle(motorId, throttle);
    }
  }

  /**
   * NASA JPL compliant: Run direction test
   */
  async runDirectionTest(): Promise<void> {
    if (!get(motorTestStore.canTest)) return;

    motorTestStore.testActive.set(true);
    showNotification({
      type: 'info',
      message: 'Running direction test - 2 seconds per motor',
      timeout: 3000
    });

    try {
      const motors = get(motorTestStore.motors);

      for (const motor of motors) {
        if (!get(motorTestStore.testActive)) break;

        await this.setMotorThrottle(motor.id, 10);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await this.setMotorThrottle(motor.id, 0);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('Direction test error:', error);
      showNotification({
        type: 'error',
        message: 'Direction test failed',
        timeout: 3000
      });
    } finally {
      motorTestStore.testActive.set(false);
      await this.setAllMotorsThrottle(0);
    }
  }

  /**
   * NASA JPL compliant: Run ramp test
   */
  async runRampTest(): Promise<void> {
    const currentStage = get(motorTestStore.currentStage);
    const maxThrottle = this.getMaxThrottle(currentStage);

    if (!get(motorTestStore.canTest)) return;

    motorTestStore.testActive.set(true);
    showNotification({
      type: 'info',
      message: 'Running ramp test',
      timeout: 3000
    });

    try {
      // Ramp up
      for (let throttle = 0; throttle <= maxThrottle; throttle += 5) {
        if (!get(motorTestStore.testActive)) break;
        await this.setAllMotorsThrottle(throttle);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Ramp down
      for (let throttle = maxThrottle; throttle >= 0; throttle -= 5) {
        if (!get(motorTestStore.testActive)) break;
        await this.setAllMotorsThrottle(throttle);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('Ramp test error:', error);
      showNotification({
        type: 'error',
        message: 'Ramp test failed',
        timeout: 3000
      });
    } finally {
      motorTestStore.testActive.set(false);
      await this.setAllMotorsThrottle(0);
    }
  }
}

// Singleton instance
let motorTestServiceInstance: MotorTestService | null = null;

export function getMotorTestService(): MotorTestService {
  if (!motorTestServiceInstance) {
    motorTestServiceInstance = new MotorTestService();
  }
  return motorTestServiceInstance;
}
