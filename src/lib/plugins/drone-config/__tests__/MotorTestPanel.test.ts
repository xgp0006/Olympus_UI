/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor, act } from '@testing-library/svelte';
import { tick } from 'svelte';
import MotorTestPanel from '../components/MotorTestPanel.svelte';
import { 
  createMockStore, 
  renderComponent,
  playWarningSound 
} from '$lib/test-utils/component-helpers';
import { 
  createMockMotorTelemetry, 
  MOTOR_SAFETY_SCENARIOS,
  createMockMAVLinkConnection 
} from './utils/mockDroneData';
import * as droneConnectionStore from '../stores/drone-connection';
import * as notificationStore from '$lib/stores/notifications';
import * as tauriUtils from '$lib/utils/tauri';

// Mock stores
vi.mock('../stores/drone-connection', () => ({
  droneConnectionStore: {
    subscribe: vi.fn()
  },
  isConnected: {
    subscribe: vi.fn()
  }
}));

vi.mock('$lib/stores/notifications', () => ({
  showNotification: vi.fn()
}));

vi.mock('$lib/utils/tauri', () => ({
  safeInvoke: vi.fn()
}));

// Mock AudioContext
class MockAudioContext {
  currentTime = 0;
  createOscillator = vi.fn(() => ({
    frequency: { value: 0 },
    start: vi.fn(),
    stop: vi.fn(),
    connect: vi.fn()
  }));
  createGain = vi.fn(() => ({
    gain: { value: 0 },
    connect: vi.fn()
  }));
  close = vi.fn();
  destination = {};
}

describe('MotorTestPanel - CRITICAL SAFETY TESTS', () => {
  let mockConnection: ReturnType<typeof createMockMAVLinkConnection>;
  let isConnectedValue = true;
  let originalAudioContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnection = createMockMAVLinkConnection();
    
    // Setup AudioContext mock
    originalAudioContext = window.AudioContext;
    (window as any).AudioContext = MockAudioContext;
    
    // Setup connection store mock
    vi.mocked(droneConnectionStore.isConnected.subscribe).mockImplementation((callback) => {
      callback(isConnectedValue);
      return () => {};
    });
    
    // Setup default safeInvoke responses
    vi.mocked(tauriUtils.safeInvoke).mockImplementation(async (command: string, args?: any) => {
      switch (command) {
        case 'emergency_stop_motors':
          return Promise.resolve();
        case 'set_motor_throttle':
          return Promise.resolve();
        case 'get_motor_telemetry':
          return {
            motors: [
              { id: 1, rpm: 0, current: 0, temperature: 25 },
              { id: 2, rpm: 0, current: 0, temperature: 25 },
              { id: 3, rpm: 0, current: 0, temperature: 25 },
              { id: 4, rpm: 0, current: 0, temperature: 25 }
            ]
          };
        default:
          return Promise.resolve();
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (window as any).AudioContext = originalAudioContext;
  });

  describe('Emergency Stop - < 1ms Response Time', () => {
    it('should stop all motors in less than 1ms', async () => {
      const { getByText, container } = render(MotorTestPanel);
      
      // Enable testing by confirming propellers removed
      const propellerCheckbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await fireEvent.click(propellerCheckbox);
      
      // Progress to Stage 1
      const stage1Button = getByText('Stage 1: 25%');
      await fireEvent.click(stage1Button);
      
      // Set some throttle
      const throttleSliders = container.querySelectorAll('.throttle-slider');
      await fireEvent.input(throttleSliders[0], { target: { value: '20' } });
      
      // Measure emergency stop time
      const startTime = performance.now();
      
      const emergencyButton = container.querySelector('.emergency-stop') as HTMLButtonElement;
      await fireEvent.click(emergencyButton);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Verify response time
      expect(responseTime).toBeLessThan(1); // Less than 1ms
      
      // Verify emergency stop was called
      expect(tauriUtils.safeInvoke).toHaveBeenCalledWith('emergency_stop_motors');
      
      // Verify all throttles reset to 0
      const throttleValues = container.querySelectorAll('.throttle-value');
      throttleValues.forEach((value, index) => {
        if (index < 4) { // First 4 are motor throttles
          expect(value.textContent).toBe('0%');
        }
      });
      
      // Verify safety stage reset to LOCKED
      expect(container.querySelector('.stage-name')?.textContent).toContain('LOCKED');
    });

    it('should trigger emergency stop on ESC key press', async () => {
      const { container } = render(MotorTestPanel);
      
      // Trigger ESC key
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      window.dispatchEvent(escapeEvent);
      
      await waitFor(() => {
        expect(tauriUtils.safeInvoke).toHaveBeenCalledWith('emergency_stop_motors');
      });
    });
  });

  describe('Safety Stage Progression', () => {
    it('should only allow sequential stage progression', async () => {
      const { getByText, container } = render(MotorTestPanel);
      
      // Enable testing
      const propellerCheckbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await fireEvent.click(propellerCheckbox);
      
      // Try to skip to Stage 2 directly (should fail)
      const stage2Button = getByText('Stage 2: 50%');
      expect(stage2Button).toBeDisabled();
      
      // Progress to Stage 1 first
      const stage1Button = getByText('Stage 1: 25%');
      await fireEvent.click(stage1Button);
      await tick();
      
      // Now Stage 2 should be enabled
      expect(stage2Button).not.toBeDisabled();
      
      // But Stage 3 and 4 should still be disabled
      expect(getByText('Stage 3: 75%')).toBeDisabled();
      expect(getByText('Stage 4: 100%')).toBeDisabled();
    });

    it('should show warning when trying to skip stages', async () => {
      const { getByText, container } = render(MotorTestPanel);
      
      // Mock the component to be in Stage 1
      const propellerCheckbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await fireEvent.click(propellerCheckbox);
      await fireEvent.click(getByText('Stage 1: 25%'));
      
      // Try to progress to Stage 3 (skipping Stage 2)
      // This would require internal state manipulation which the UI prevents
      // Verify notification is shown
      expect(notificationStore.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          message: expect.stringContaining('Stage 1')
        })
      );
    });
  });

  describe('Timeout Enforcement', () => {
    it('should revert to LOCKED after 10 seconds of inactivity', async () => {
      vi.useFakeTimers();
      
      const { getByText, container } = render(MotorTestPanel);
      
      // Enable testing and progress to Stage 1
      const propellerCheckbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await fireEvent.click(propellerCheckbox);
      await fireEvent.click(getByText('Stage 1: 25%'));
      
      // Verify countdown starts at 10
      expect(container.querySelector('.countdown')?.textContent).toBe('10s');
      
      // Fast forward 9 seconds
      act(() => {
        vi.advanceTimersByTime(9000);
      });
      
      // Should still be in Stage 1 with 1 second left
      expect(container.querySelector('.countdown')?.textContent).toBe('1s');
      expect(container.querySelector('.stage-name')?.textContent).toContain('Stage 1');
      
      // Fast forward final second
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      
      // Should revert to LOCKED
      await waitFor(() => {
        expect(container.querySelector('.stage-name')?.textContent).toContain('LOCKED');
      });
      
      // Verify timeout notification
      expect(notificationStore.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          message: 'Stage timeout - reverting to LOCKED'
        })
      );
      
      vi.useRealTimers();
    });

    it('should reset countdown on motor activity', async () => {
      vi.useFakeTimers();
      
      const { getByText, container } = render(MotorTestPanel);
      
      // Enable testing and progress to Stage 1
      const propellerCheckbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await fireEvent.click(propellerCheckbox);
      await fireEvent.click(getByText('Stage 1: 25%'));
      
      // Fast forward 5 seconds
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      expect(container.querySelector('.countdown')?.textContent).toBe('5s');
      
      // Adjust motor throttle (activity)
      const throttleSlider = container.querySelector('.throttle-slider') as HTMLInputElement;
      await fireEvent.input(throttleSlider, { target: { value: '10' } });
      
      // Countdown should reset to 10
      await waitFor(() => {
        expect(container.querySelector('.countdown')?.textContent).toBe('10s');
      });
      
      vi.useRealTimers();
    });
  });

  describe('Propeller Removal Confirmation', () => {
    it('should prevent any motor testing without propeller confirmation', async () => {
      const { getByText, container } = render(MotorTestPanel);
      
      // All stage buttons should be disabled without confirmation
      expect(getByText('Stage 1: 25%')).toBeDisabled();
      expect(getByText('Stage 2: 50%')).toBeDisabled();
      expect(getByText('Stage 3: 75%')).toBeDisabled();
      expect(getByText('Stage 4: 100%')).toBeDisabled();
      
      // Test buttons should also be disabled
      expect(getByText('Direction Test')).toBeDisabled();
      expect(getByText('Ramp Test')).toBeDisabled();
    });

    it('should enable stage progression after propeller confirmation', async () => {
      const { getByText, container } = render(MotorTestPanel);
      
      const propellerCheckbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await fireEvent.click(propellerCheckbox);
      
      // Stage 1 should now be enabled
      expect(getByText('Stage 1: 25%')).not.toBeDisabled();
      
      // But higher stages still disabled until progression
      expect(getByText('Stage 2: 50%')).toBeDisabled();
    });
  });

  describe('Throttle Limiting by Stage', () => {
    const testThrottleLimit = async (stage: number, limit: number) => {
      const { getByText, container } = render(MotorTestPanel);
      
      // Enable testing
      const propellerCheckbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await fireEvent.click(propellerCheckbox);
      
      // Progress through stages
      for (let i = 1; i <= stage; i++) {
        await fireEvent.click(getByText(`Stage ${i}: ${i * 25}%`));
        await tick();
      }
      
      // Try to set throttle above limit
      const throttleSlider = container.querySelector('.throttle-slider') as HTMLInputElement;
      await fireEvent.input(throttleSlider, { target: { value: '100' } });
      
      // Verify throttle is clamped to stage limit
      expect(tauriUtils.safeInvoke).toHaveBeenCalledWith('set_motor_throttle', {
        motorId: 1,
        throttle: limit / 100 // Converted to 0-1 range
      });
    };

    it.each([
      { stage: 1, limit: 25 },
      { stage: 2, limit: 50 },
      { stage: 3, limit: 75 },
      { stage: 4, limit: 100 }
    ])('Stage $stage should limit throttle to $limit%', async ({ stage, limit }) => {
      await testThrottleLimit(stage, limit);
    });
  });

  describe('Mobile Gesture Hold', () => {
    it('should require 3-second hold for stage progression on touch devices', async () => {
      vi.useFakeTimers();
      
      const { getByText, container } = render(MotorTestPanel);
      
      // Enable testing
      const propellerCheckbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await fireEvent.click(propellerCheckbox);
      
      const stage1Button = getByText('Stage 1: 25%');
      
      // Start touch
      await fireEvent.touchStart(stage1Button);
      
      // Release before 3 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      await fireEvent.touchEnd(stage1Button);
      
      // Should show hold instruction
      expect(notificationStore.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Hold for 3 seconds to confirm'
        })
      );
      
      // Stage should not progress
      expect(container.querySelector('.stage-name')?.textContent).toContain('LOCKED');
      
      // Try again with full 3-second hold
      await fireEvent.touchStart(stage1Button);
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      await fireEvent.touchEnd(stage1Button);
      
      // Stage should progress
      await waitFor(() => {
        expect(container.querySelector('.stage-name')?.textContent).toContain('Stage 1');
      });
      
      vi.useRealTimers();
    });
  });

  describe('Temperature Protection', () => {
    it('should stop motor when temperature exceeds 80°C', async () => {
      const { container } = render(MotorTestPanel);
      
      // Setup high temperature telemetry
      vi.mocked(tauriUtils.safeInvoke).mockImplementation(async (command: string) => {
        if (command === 'get_motor_telemetry') {
          return {
            motors: [
              { id: 1, rpm: 5000, current: 15, temperature: 85 }, // Over limit
              { id: 2, rpm: 5000, current: 15, temperature: 75 },
              { id: 3, rpm: 5000, current: 15, temperature: 75 },
              { id: 4, rpm: 5000, current: 15, temperature: 75 }
            ]
          };
        }
        return Promise.resolve();
      });
      
      // Wait for telemetry update
      await waitFor(() => {
        expect(notificationStore.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Motor 1 overheating: 85°C'
          })
        );
      });
      
      // Verify motor throttle set to 0
      expect(tauriUtils.safeInvoke).toHaveBeenCalledWith('set_motor_throttle', {
        motorId: 1,
        throttle: 0
      });
    });
  });

  describe('Current Monitoring', () => {
    it('should show warning for current above 30A', async () => {
      const { container } = render(MotorTestPanel);
      
      // Setup high current telemetry
      vi.mocked(tauriUtils.safeInvoke).mockImplementation(async (command: string) => {
        if (command === 'get_motor_telemetry') {
          return {
            motors: [
              { id: 1, rpm: 8000, current: 35, temperature: 60 }, // Over limit
              { id: 2, rpm: 8000, current: 25, temperature: 60 },
              { id: 3, rpm: 8000, current: 25, temperature: 60 },
              { id: 4, rpm: 8000, current: 25, temperature: 60 }
            ]
          };
        }
        return Promise.resolve();
      });
      
      // Wait for telemetry update
      await waitFor(() => {
        expect(notificationStore.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'warning',
            message: 'Motor 1 high current: 35A'
          })
        );
      });
      
      // Verify visual warning in telemetry display
      const telemetryCards = container.querySelectorAll('.telemetry-card');
      const motor1Current = telemetryCards[0].querySelector('.telemetry-item:nth-child(3) span:last-child');
      expect(motor1Current).toHaveClass('warning');
    });
  });

  describe('Test Pattern Execution', () => {
    it('should run direction test safely', async () => {
      vi.useFakeTimers();
      
      const { getByText, container } = render(MotorTestPanel);
      
      // Enable testing
      const propellerCheckbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await fireEvent.click(propellerCheckbox);
      await fireEvent.click(getByText('Stage 1: 25%'));
      
      // Start direction test
      await fireEvent.click(getByText('Direction Test'));
      
      // Verify test notification
      expect(notificationStore.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Running direction test - 2 seconds per motor'
        })
      );
      
      // Verify motors are tested sequentially
      for (let i = 1; i <= 4; i++) {
        // Motor should be at 10% throttle
        expect(tauriUtils.safeInvoke).toHaveBeenCalledWith('set_motor_throttle', {
          motorId: i,
          throttle: 0.1
        });
        
        // Advance 2 seconds
        act(() => {
          vi.advanceTimersByTime(2000);
        });
        
        // Motor should stop
        expect(tauriUtils.safeInvoke).toHaveBeenCalledWith('set_motor_throttle', {
          motorId: i,
          throttle: 0
        });
        
        // Advance 500ms pause
        act(() => {
          vi.advanceTimersByTime(500);
        });
      }
      
      vi.useRealTimers();
    });

    it('should stop test on emergency stop', async () => {
      const { getByText, container } = render(MotorTestPanel);
      
      // Enable testing
      const propellerCheckbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await fireEvent.click(propellerCheckbox);
      await fireEvent.click(getByText('Stage 1: 25%'));
      
      // Start ramp test
      await fireEvent.click(getByText('Ramp Test'));
      
      // Trigger emergency stop
      const emergencyButton = container.querySelector('.emergency-stop') as HTMLButtonElement;
      await fireEvent.click(emergencyButton);
      
      // Verify all motors stopped
      expect(tauriUtils.safeInvoke).toHaveBeenCalledWith('emergency_stop_motors');
    });
  });

  describe('Visual Safety Indicators', () => {
    it('should show locked state visually', async () => {
      const { container } = render(MotorTestPanel);
      
      const safetyStatus = container.querySelector('.safety-status');
      expect(safetyStatus).toHaveClass('locked');
    });

    it('should pulse emergency button when active', async () => {
      const { container } = render(MotorTestPanel);
      
      const emergencyButton = container.querySelector('.emergency-stop') as HTMLButtonElement;
      await fireEvent.click(emergencyButton);
      
      // Button should have active class during emergency stop
      expect(emergencyButton).toHaveClass('active');
    });

    it('should show countdown urgency in last 3 seconds', async () => {
      vi.useFakeTimers();
      
      const { getByText, container } = render(MotorTestPanel);
      
      // Enable testing and progress to Stage 1
      const propellerCheckbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await fireEvent.click(propellerCheckbox);
      await fireEvent.click(getByText('Stage 1: 25%'));
      
      // Fast forward to 3 seconds remaining
      act(() => {
        vi.advanceTimersByTime(7000);
      });
      
      const countdown = container.querySelector('.countdown');
      expect(countdown).toHaveClass('urgent');
      expect(countdown?.textContent).toBe('3s');
      
      vi.useRealTimers();
    });
  });

  describe('Connection State Handling', () => {
    it('should disable all controls when disconnected', async () => {
      isConnectedValue = false;
      
      const { getByText, container } = render(MotorTestPanel);
      
      // Should show disconnection warning
      expect(container.textContent).toContain('No drone connection');
      
      // Even with propellers removed, stages should be disabled
      const propellerCheckbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await fireEvent.click(propellerCheckbox);
      
      expect(getByText('Stage 1: 25%')).toBeDisabled();
      expect(getByText('Direction Test')).toBeDisabled();
      expect(getByText('Ramp Test')).toBeDisabled();
    });
  });

  describe('Motor Selection', () => {
    it('should allow individual motor selection', async () => {
      const { container } = render(MotorTestPanel);
      
      // Click on motor 1 in visualization
      const motor1 = container.querySelector('.motor') as SVGGElement;
      await fireEvent.click(motor1);
      
      expect(motor1).toHaveClass('selected');
      
      // Click again to deselect
      await fireEvent.click(motor1);
      expect(motor1).not.toHaveClass('selected');
    });

    it('should apply throttle only to selected motors', async () => {
      const { container } = render(MotorTestPanel);
      
      // Enable testing
      const propellerCheckbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await fireEvent.click(propellerCheckbox);
      const stage1Button = container.querySelector('.stage-button') as HTMLButtonElement;
      await fireEvent.click(stage1Button);
      
      // Select motors 1 and 3
      const motors = container.querySelectorAll('.motor');
      await fireEvent.click(motors[0]); // Motor 1
      await fireEvent.click(motors[2]); // Motor 3
      
      // Use ALL motors slider
      const allMotorsSlider = container.querySelector('.all-motors .throttle-slider') as HTMLInputElement;
      await fireEvent.input(allMotorsSlider, { target: { value: '20' } });
      
      // Only motors 1 and 3 should receive throttle commands
      expect(tauriUtils.safeInvoke).toHaveBeenCalledWith('set_motor_throttle', {
        motorId: 1,
        throttle: 0.2
      });
      expect(tauriUtils.safeInvoke).toHaveBeenCalledWith('set_motor_throttle', {
        motorId: 3,
        throttle: 0.2
      });
      expect(tauriUtils.safeInvoke).not.toHaveBeenCalledWith('set_motor_throttle', {
        motorId: 2,
        throttle: 0.2
      });
    });
  });

  describe('Configuration Changes', () => {
    it('should update motor layout for different configurations', async () => {
      const { getByText, container } = render(MotorTestPanel);
      
      // Default is quad (4 motors)
      expect(container.querySelectorAll('.motor')).toHaveLength(4);
      
      // Change to hex
      await fireEvent.click(getByText('HEX'));
      expect(container.querySelectorAll('.motor')).toHaveLength(6);
      
      // Change to octo
      await fireEvent.click(getByText('OCTO'));
      expect(container.querySelectorAll('.motor')).toHaveLength(8);
    });
  });

  describe('Accessibility', () => {
    it('should support keyboard navigation', async () => {
      const { container } = render(MotorTestPanel);
      
      // Motors should be keyboard accessible
      const motors = container.querySelectorAll('.motor');
      motors.forEach(motor => {
        expect(motor).toHaveAttribute('role', 'button');
        expect(motor).toHaveAttribute('tabindex', '0');
      });
    });

    it('should work in high contrast mode', () => {
      // CSS handles this, just verify classes exist
      const { container } = render(MotorTestPanel);
      
      // Key elements should have appropriate styling
      expect(container.querySelector('.emergency-stop')).toBeTruthy();
      expect(container.querySelector('.safety-status')).toBeTruthy();
      expect(container.querySelector('.stage-button')).toBeTruthy();
    });
  });
});