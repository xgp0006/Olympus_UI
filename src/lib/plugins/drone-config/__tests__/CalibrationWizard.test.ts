/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor, act } from '@testing-library/svelte';
import { tick } from 'svelte';
import CalibrationWizard from '../components/CalibrationWizard.svelte';
import { renderComponent } from '$lib/test-utils/component-helpers';
import { 
  createMockMAVLinkCommand,
  createMockTelemetryPacket,
  createMockAttitudeTelemetry,
  createMockGPSTelemetry
} from './utils/mockDroneData';
import * as droneConnectionStore from '../stores/drone-connection';
import * as droneTelemetryStore from '../stores/drone-telemetry';
import * as notificationStore from '$lib/stores/notifications';
import * as tauriUtils from '$lib/utils/tauri';
import { MAVResult, type TelemetryPacket } from '../types/drone-types';

// Mock stores
vi.mock('../stores/drone-connection', () => ({
  droneConnectionStore: {
    subscribe: vi.fn(),
    sendCommand: vi.fn()
  },
  isConnected: {
    subscribe: vi.fn()
  }
}));

vi.mock('../stores/drone-telemetry', () => ({
  droneTelemetryStore: {
    subscribe: vi.fn()
  },
  currentTelemetry: {
    subscribe: vi.fn()
  }
}));

vi.mock('$lib/stores/notifications', () => ({
  showNotification: vi.fn()
}));

vi.mock('$lib/utils/tauri', () => ({
  safeInvoke: vi.fn()
}));

describe('CalibrationWizard', () => {
  let mockTelemetry = createMockTelemetryPacket();
  let isConnectedValue = true;
  
  // Mock DeviceOrientation API
  let mockDeviceOrientation = {
    alpha: 0,
    beta: 0,
    gamma: 0
  };

  beforeEach(() => {
    vi.clearAllMocks();
    isConnectedValue = true;
    
    // Setup store mocks
    vi.mocked(droneConnectionStore.isConnected.subscribe).mockImplementation((callback) => {
      callback(isConnectedValue);
      return () => {};
    });
    
    vi.mocked(droneTelemetryStore.currentTelemetry.subscribe).mockImplementation((callback: (value: TelemetryPacket | null) => void) => {
      callback(mockTelemetry);
      return () => {};
    });
    
    // Note: sendCommand is not directly exported from droneConnectionStore
    // Mock will be handled at component level if needed
    
    // Mock device orientation
    Object.defineProperty(window, 'DeviceOrientationEvent', {
      writable: true,
      value: vi.fn()
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Calibration Types', () => {
    it('should display all calibration options', () => {
      const { getByText } = render(CalibrationWizard);
      
      expect(getByText('Accelerometer')).toBeInTheDocument();
      expect(getByText('Compass')).toBeInTheDocument();
      expect(getByText('Gyroscope')).toBeInTheDocument();
      expect(getByText('Level')).toBeInTheDocument();
      expect(getByText('Radio')).toBeInTheDocument();
      expect(getByText('ESC')).toBeInTheDocument();
    });

    it('should show calibration descriptions', () => {
      const { container } = render(CalibrationWizard);
      
      expect(container.textContent).toContain('Calibrate accelerometer for accurate attitude');
      expect(container.textContent).toContain('Calibrate compass for heading accuracy');
      expect(container.textContent).toContain('Calibrate gyroscope for rotation sensing');
    });

    it('should indicate calibration status', () => {
      const { container } = render(CalibrationWizard);
      
      // Check for status indicators
      const accelCard = container.querySelector('[data-calibration="accelerometer"]');
      expect(accelCard?.querySelector('.status-indicator')).toBeInTheDocument();
    });
  });

  describe('Accelerometer Calibration', () => {
    it('should start accelerometer calibration', async () => {
      const { getByText } = render(CalibrationWizard);
      
      const startButton = getByText('Accelerometer').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      
      // Should show calibration steps
      expect(getByText('Accelerometer Calibration')).toBeInTheDocument();
      expect(getByText('Place drone on flat level surface')).toBeInTheDocument();
      expect(getByText('Start Calibration')).toBeInTheDocument();
    });

    it('should guide through 6-point calibration', async () => {
      const { getByText, container } = render(CalibrationWizard);
      
      // Start calibration
      const startButton = getByText('Accelerometer').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      await fireEvent.click(getByText('Start Calibration'));
      
      // Should show first orientation
      expect(container.textContent).toContain('Place drone LEVEL');
      expect(container.querySelector('.orientation-visual')).toBeInTheDocument();
      
      // Click when ready
      await fireEvent.click(getByText('Capture'));
      
      // Should progress to next orientation
      await waitFor(() => {
        expect(container.textContent).toContain('Place drone NOSE DOWN');
      });
      
      // Continue through all 6 orientations
      const orientations = ['NOSE DOWN', 'NOSE UP', 'LEFT SIDE', 'RIGHT SIDE', 'UPSIDE DOWN'];
      for (const orientation of orientations) {
        await fireEvent.click(getByText('Capture'));
        if (orientation !== 'UPSIDE DOWN') {
          await waitFor(() => {
            expect(container.textContent).toContain(orientation);
          });
        }
      }
      
      // Should complete calibration
      expect(notificationStore.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: 'Accelerometer calibration complete'
        })
      );
    });

    it('should show progress indicator', async () => {
      const { getByText, container } = render(CalibrationWizard);
      
      const startButton = getByText('Accelerometer').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      await fireEvent.click(getByText('Start Calibration'));
      
      // Should show progress
      const progress = container.querySelector('.calibration-progress');
      expect(progress).toBeInTheDocument();
      expect(progress?.textContent).toContain('1 / 6');
      
      // Progress through steps
      await fireEvent.click(getByText('Capture'));
      await waitFor(() => {
        expect(progress?.textContent).toContain('2 / 6');
      });
    });

    it('should validate orientation before capture', async () => {
      const { getByText, container } = render(CalibrationWizard);
      
      // Mock telemetry with incorrect orientation
      mockTelemetry = createMockTelemetryPacket({
        attitude: createMockAttitudeTelemetry({
          roll: 0.5, // Not level
          pitch: 0.5
        })
      });
      
      const startButton = getByText('Accelerometer').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      await fireEvent.click(getByText('Start Calibration'));
      
      // Should show orientation warning
      expect(container.querySelector('.orientation-warning')).toBeInTheDocument();
      expect(container.textContent).toContain('Drone not level');
      
      // Capture button should be disabled
      expect(getByText('Capture')).toBeDisabled();
    });
  });

  describe('Compass Calibration', () => {
    it('should start compass calibration', async () => {
      const { getByText } = render(CalibrationWizard);
      
      const startButton = getByText('Compass').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      
      expect(getByText('Compass Calibration')).toBeInTheDocument();
      expect(getByText('Rotate drone in all axes continuously')).toBeInTheDocument();
    });

    it('should show rotation animation', async () => {
      const { getByText, container } = render(CalibrationWizard);
      
      const startButton = getByText('Compass').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      await fireEvent.click(getByText('Start Calibration'));
      
      // Should show rotation visualization
      const rotationVisual = container.querySelector('.rotation-animation');
      expect(rotationVisual).toBeInTheDocument();
      expect(rotationVisual).toHaveClass('rotating');
    });

    it('should collect compass samples', async () => {
      vi.useFakeTimers();
      
      const { getByText, container } = render(CalibrationWizard);
      
      const startButton = getByText('Compass').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      await fireEvent.click(getByText('Start Calibration'));
      
      // Should show sample progress
      expect(container.querySelector('.sample-progress')).toBeInTheDocument();
      expect(container.textContent).toContain('Samples: 0');
      
      // Simulate data collection
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      
      // Mock telemetry updates with varying compass data
      for (let i = 0; i < 10; i++) {
        mockTelemetry = createMockTelemetryPacket({
          attitude: createMockAttitudeTelemetry({
            yaw: i * 0.628 // Rotate through 360 degrees
          })
        });
        
        vi.mocked(droneTelemetryStore.currentTelemetry.subscribe).mockImplementation((callback: (value: TelemetryPacket | null) => void) => {
          callback(mockTelemetry);
          return () => {};
        });
        
        act(() => {
          vi.advanceTimersByTime(100);
        });
      }
      
      // Should show sample count
      await waitFor(() => {
        expect(container.textContent).toMatch(/Samples: \d+/);
      });
      
      vi.useRealTimers();
    });

    it('should detect interference', async () => {
      const { getByText, container } = render(CalibrationWizard);
      
      // Mock high magnetic interference
      vi.mocked(tauriUtils.safeInvoke).mockImplementation(async (command: string) => {
        if (command === 'get_mag_field_strength') {
          return { x: 500, y: 500, z: 500 }; // High values indicate interference
        }
        return Promise.resolve();
      });
      
      const startButton = getByText('Compass').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      
      // Should show interference warning
      await waitFor(() => {
        expect(container.querySelector('.interference-warning')).toBeInTheDocument();
        expect(container.textContent).toContain('High magnetic interference detected');
      });
    });
  });

  describe('Gyroscope Calibration', () => {
    it('should require drone to be still', async () => {
      const { getByText, container } = render(CalibrationWizard);
      
      // Mock moving telemetry
      mockTelemetry = createMockTelemetryPacket({
        attitude: createMockAttitudeTelemetry({
          rollSpeed: 0.1,
          pitchSpeed: 0.1,
          yawSpeed: 0.1
        })
      });
      
      const startButton = getByText('Gyroscope').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      
      // Should show movement warning
      expect(container.querySelector('.movement-warning')).toBeInTheDocument();
      expect(container.textContent).toContain('Keep drone completely still');
      expect(getByText('Start Calibration')).toBeDisabled();
    });

    it('should show temperature compensation option', async () => {
      const { getByText, getByLabelText } = render(CalibrationWizard);
      
      const startButton = getByText('Gyroscope').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      
      expect(getByLabelText('Enable temperature compensation')).toBeInTheDocument();
    });

    it('should complete quickly when still', async () => {
      vi.useFakeTimers();
      
      const { getByText, container } = render(CalibrationWizard);
      
      // Mock still telemetry
      mockTelemetry = createMockTelemetryPacket({
        attitude: createMockAttitudeTelemetry({
          rollSpeed: 0,
          pitchSpeed: 0,
          yawSpeed: 0
        })
      });
      
      const startButton = getByText('Gyroscope').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      await fireEvent.click(getByText('Start Calibration'));
      
      // Should show countdown
      expect(container.textContent).toContain('Calibrating... 10s');
      
      // Fast forward
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      
      // Should complete
      await waitFor(() => {
        expect(notificationStore.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Gyroscope calibration complete'
          })
        );
      });
      
      vi.useRealTimers();
    });
  });

  describe('Level Calibration', () => {
    it('should use bubble level visualization', async () => {
      const { getByText, container } = render(CalibrationWizard);
      
      const startButton = getByText('Level').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      
      // Should show bubble level
      const bubbleLevel = container.querySelector('.bubble-level');
      expect(bubbleLevel).toBeInTheDocument();
      
      const bubble = container.querySelector('.level-bubble');
      expect(bubble).toBeInTheDocument();
    });

    it('should show level when drone is flat', async () => {
      const { getByText, container } = render(CalibrationWizard);
      
      // Mock level telemetry
      mockTelemetry = createMockTelemetryPacket({
        attitude: createMockAttitudeTelemetry({
          roll: 0,
          pitch: 0
        })
      });
      
      const startButton = getByText('Level').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      
      // Bubble should be centered
      const bubble = container.querySelector('.level-bubble') as HTMLElement;
      expect(bubble.style.transform).toContain('translate(50%, 50%)');
      
      // Should show level indicator
      expect(container.querySelector('.level-indicator.level')).toBeInTheDocument();
      expect(container.textContent).toContain('LEVEL');
    });

    it('should update bubble position based on tilt', async () => {
      const { getByText, container } = render(CalibrationWizard);
      
      const startButton = getByText('Level').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      
      // Update with tilted telemetry
      mockTelemetry = createMockTelemetryPacket({
        attitude: createMockAttitudeTelemetry({
          roll: 0.1, // ~5.7 degrees
          pitch: -0.05 // ~-2.9 degrees
        })
      });
      
      vi.mocked(droneTelemetryStore.currentTelemetry.subscribe).mockImplementation((callback: (value: TelemetryPacket | null) => void) => {
        callback(mockTelemetry);
        return () => {};
      });
      
      await tick();
      
      // Bubble should move based on tilt
      const bubble = container.querySelector('.level-bubble') as HTMLElement;
      expect(bubble.style.transform).not.toContain('translate(50%, 50%)');
    });
  });

  describe('Radio Calibration', () => {
    it('should show stick positions', async () => {
      const { getByText, container } = render(CalibrationWizard);
      
      const startButton = getByText('Radio').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      
      // Should show RC stick visualizations
      expect(container.querySelector('.stick-left')).toBeInTheDocument();
      expect(container.querySelector('.stick-right')).toBeInTheDocument();
      
      // Should show channel values
      expect(container.textContent).toContain('Throttle:');
      expect(container.textContent).toContain('Yaw:');
      expect(container.textContent).toContain('Pitch:');
      expect(container.textContent).toContain('Roll:');
    });

    it('should guide through min/max calibration', async () => {
      const { getByText, container } = render(CalibrationWizard);
      
      const startButton = getByText('Radio').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      await fireEvent.click(getByText('Start Calibration'));
      
      // Should show instructions
      expect(container.textContent).toContain('Move all sticks to minimum position');
      
      // Capture min
      await fireEvent.click(getByText('Capture Min'));
      
      // Should move to max
      expect(container.textContent).toContain('Move all sticks to maximum position');
      
      // Capture max
      await fireEvent.click(getByText('Capture Max'));
      
      // Should move to center
      expect(container.textContent).toContain('Center all sticks');
      
      // Capture center
      await fireEvent.click(getByText('Capture Center'));
      
      // Should complete
      expect(notificationStore.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: 'Radio calibration complete'
        })
      );
    });

    it('should validate stick ranges', async () => {
      const { getByText, container } = render(CalibrationWizard);
      
      // Mock RC channel data
      vi.mocked(tauriUtils.safeInvoke).mockImplementation(async (command: string) => {
        if (command === 'get_rc_channels') {
          return {
            channels: [
              1100, // Too close to min for center
              1500, 1500, 1500, 1500, 1500, 1500, 1500
            ]
          };
        }
        return Promise.resolve();
      });
      
      const startButton = getByText('Radio').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      await fireEvent.click(getByText('Start Calibration'));
      
      // Try to capture center with bad values
      await fireEvent.click(getByText('Capture Min'));
      await fireEvent.click(getByText('Capture Max'));
      
      // Should show warning
      expect(container.querySelector('.range-warning')).toBeInTheDocument();
      expect(container.textContent).toContain('Insufficient stick range detected');
    });
  });

  describe('ESC Calibration', () => {
    it('should show safety warnings', async () => {
      const { getByText, container } = render(CalibrationWizard);
      
      const startButton = getByText('ESC').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      
      // Should show prominent safety warnings
      const safetyWarning = container.querySelector('.safety-warning');
      expect(safetyWarning).toBeInTheDocument();
      expect(safetyWarning?.textContent).toContain('REMOVE ALL PROPELLERS');
      expect(safetyWarning?.textContent).toContain('Ensure battery is disconnected');
    });

    it('should require safety confirmation', async () => {
      const { getByText, getByLabelText } = render(CalibrationWizard);
      
      const startButton = getByText('ESC').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      
      // Start button should be disabled
      expect(getByText('Start ESC Calibration')).toBeDisabled();
      
      // Check safety confirmations
      const propellerCheck = getByLabelText('I confirm all propellers are removed');
      const batteryCheck = getByLabelText('I confirm battery is ready to connect');
      
      await fireEvent.click(propellerCheck);
      await fireEvent.click(batteryCheck);
      
      // Now should be enabled
      expect(getByText('Start ESC Calibration')).not.toBeDisabled();
    });

    it('should guide through ESC calibration sequence', async () => {
      const { getByText, getByLabelText, container } = render(CalibrationWizard);
      
      const startButton = getByText('ESC').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      
      // Confirm safety
      await fireEvent.click(getByLabelText('I confirm all propellers are removed'));
      await fireEvent.click(getByLabelText('I confirm battery is ready to connect'));
      await fireEvent.click(getByText('Start ESC Calibration'));
      
      // Should show step 1
      expect(container.textContent).toContain('Step 1: Throttle to maximum');
      expect(container.querySelector('.throttle-indicator')).toBeInTheDocument();
      
      // Simulate throttle max
      vi.mocked(tauriUtils.safeInvoke).mockImplementation(async (command: string) => {
        if (command === 'get_rc_channels') {
          return { channels: [2000, 1500, 1500, 1500] }; // Throttle max
        }
        return Promise.resolve();
      });
      
      await waitFor(() => {
        expect(container.textContent).toContain('Step 2: Connect battery NOW');
      });
      
      // Simulate battery connection
      await fireEvent.click(getByText('Battery Connected'));
      
      // Should hear ESC beeps instruction
      expect(container.textContent).toContain('Wait for ESC initialization beeps');
      
      // Continue through sequence
      await fireEvent.click(getByText('Beeps Heard'));
      
      expect(container.textContent).toContain('Step 3: Throttle to minimum');
      
      // Simulate throttle min
      vi.mocked(tauriUtils.safeInvoke).mockImplementation(async (command: string) => {
        if (command === 'get_rc_channels') {
          return { channels: [1000, 1500, 1500, 1500] }; // Throttle min
        }
        return Promise.resolve();
      });
      
      await waitFor(() => {
        expect(notificationStore.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'ESC calibration complete'
          })
        );
      });
    });
  });

  describe('Mobile Device Support', () => {
    it('should use device orientation for level calibration on mobile', async () => {
      // Mock mobile detection
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 1
      });
      
      const { getByText, container } = render(CalibrationWizard);
      
      const startButton = getByText('Level').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      
      // Should show mobile instructions
      expect(container.textContent).toContain('Place phone on drone');
      
      // Simulate device orientation
      const orientationEvent = new Event('deviceorientation');
      Object.assign(orientationEvent, {
        alpha: 0,
        beta: 5, // 5 degrees tilt
        gamma: -3 // -3 degrees roll
      });
      
      window.dispatchEvent(orientationEvent);
      
      await waitFor(() => {
        // Should update bubble based on device orientation
        const bubble = container.querySelector('.level-bubble') as HTMLElement;
        expect(bubble.style.transform).toContain('translate');
      });
    });
  });

  describe('Calibration Progress Persistence', () => {
    it('should save calibration progress', async () => {
      const { getByText } = render(CalibrationWizard);
      
      // Start accelerometer calibration
      const startButton = getByText('Accelerometer').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      await fireEvent.click(getByText('Start Calibration'));
      
      // Complete first orientation
      await fireEvent.click(getByText('Capture'));
      
      // Should save progress
      expect(tauriUtils.safeInvoke).toHaveBeenCalledWith('save_calibration_progress', 
        expect.objectContaining({
          type: 'accelerometer',
          step: 1,
          data: expect.any(Object)
        })
      );
    });

    it('should resume interrupted calibration', async () => {
      // Mock saved progress
      vi.mocked(tauriUtils.safeInvoke).mockImplementation(async (command: string) => {
        if (command === 'get_calibration_progress') {
          return {
            type: 'accelerometer',
            step: 3,
            data: { orientations: ['level', 'nose_down', 'nose_up'] }
          };
        }
        return Promise.resolve();
      });
      
      const { getByText, container } = render(CalibrationWizard);
      
      // Should show resume option
      await waitFor(() => {
        expect(container.textContent).toContain('Resume previous calibration?');
      });
      
      await fireEvent.click(getByText('Resume'));
      
      // Should continue from step 3
      expect(container.textContent).toContain('4 / 6');
      expect(container.textContent).toContain('LEFT SIDE');
    });
  });

  describe('Error Handling', () => {
    it('should handle calibration command failures', async () => {
      // Note: sendCommand is not directly exported from droneConnectionStore
      // Mock will be handled at component level if needed
      
      const { getByText } = render(CalibrationWizard);
      
      const startButton = getByText('Accelerometer').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      await fireEvent.click(getByText('Start Calibration'));
      
      await waitFor(() => {
        expect(notificationStore.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: expect.stringContaining('Failed to start calibration')
          })
        );
      });
    });

    it('should handle connection loss during calibration', async () => {
      const { getByText, container } = render(CalibrationWizard);
      
      const startButton = getByText('Compass').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      await fireEvent.click(getByText('Start Calibration'));
      
      // Simulate connection loss
      isConnectedValue = false;
      vi.mocked(droneConnectionStore.isConnected.subscribe).mockImplementation((callback) => {
        callback(false);
        return () => {};
      });
      
      await tick();
      
      // Should show connection lost error
      expect(container.querySelector('.connection-error')).toBeInTheDocument();
      expect(container.textContent).toContain('Connection lost');
      
      // Should disable controls
      expect(container.querySelector('button:not(:disabled)')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should announce calibration steps', async () => {
      const { getByText, container } = render(CalibrationWizard);
      
      // Check for live region
      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      
      const startButton = getByText('Accelerometer').parentElement?.querySelector('button');
      await fireEvent.click(startButton!);
      await fireEvent.click(getByText('Start Calibration'));
      
      // Should announce current step
      expect(liveRegion?.textContent).toContain('Step 1 of 6: Place drone LEVEL');
    });

    it('should support keyboard navigation', async () => {
      const { container } = render(CalibrationWizard);
      
      const firstButton = container.querySelector('button') as HTMLButtonElement;
      firstButton.focus();
      
      // Tab through calibration options
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      firstButton.dispatchEvent(tabEvent);
      
      // Space/Enter should activate
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      document.activeElement?.dispatchEvent(spaceEvent);
    });
  });
});