/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import PIDTuningPanel from '../components/PIDTuningPanel.svelte';
import { renderComponent } from '$lib/test-utils/component-helpers';
import { 
  createMockDroneParameter,
  createMockTelemetryPacket,
  createMockAttitudeTelemetry,
  createMockTelemetryStream
} from './utils/mockDroneData';
import * as droneParametersStore from '../stores/drone-parameters';
import * as droneTelemetryStore from '../stores/drone-telemetry';
import * as notificationStore from '$lib/stores/notifications';
import { ParameterType } from '../types/drone-types';

// Mock stores
vi.mock('../stores/drone-parameters', () => ({
  droneParametersStore: {
    subscribe: vi.fn(),
    saveParameter: vi.fn(),
    batchSaveParameters: vi.fn()
  },
  pidParameters: {
    subscribe: vi.fn()
  }
}));

vi.mock('../stores/drone-telemetry', () => ({
  droneTelemetryStore: {
    subscribe: vi.fn()
  },
  latestTelemetry: {
    subscribe: vi.fn()
  },
  telemetryHistory: {
    subscribe: vi.fn()
  }
}));

vi.mock('$lib/stores/notifications', () => ({
  showNotification: vi.fn()
}));

// Mock Chart.js
vi.mock('chart.js/auto', () => ({
  default: vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    update: vi.fn(),
    data: { datasets: [] },
    options: {}
  }))
}));

describe('PIDTuningPanel', () => {
  let mockPIDParameters = {
    roll: {
      p: createMockDroneParameter({
        name: 'ATC_RAT_RLL_P',
        value: 0.135,
        type: ParameterType.FLOAT,
        metadata: {
          name: 'ATC_RAT_RLL_P',
          type: ParameterType.FLOAT,
          defaultValue: 0.135,
          min: 0.0,
          max: 0.5,
          increment: 0.005,
          description: 'Roll axis rate controller P gain',
          group: 'Attitude Control'
        }
      }),
      i: createMockDroneParameter({
        name: 'ATC_RAT_RLL_I',
        value: 0.135,
        type: ParameterType.FLOAT
      }),
      d: createMockDroneParameter({
        name: 'ATC_RAT_RLL_D',
        value: 0.0036,
        type: ParameterType.FLOAT
      }),
      imax: createMockDroneParameter({
        name: 'ATC_RAT_RLL_IMAX',
        value: 0.5,
        type: ParameterType.FLOAT
      })
    },
    pitch: {
      p: createMockDroneParameter({
        name: 'ATC_RAT_PIT_P',
        value: 0.135,
        type: ParameterType.FLOAT
      }),
      i: createMockDroneParameter({
        name: 'ATC_RAT_PIT_I',
        value: 0.135,
        type: ParameterType.FLOAT
      }),
      d: createMockDroneParameter({
        name: 'ATC_RAT_PIT_D',
        value: 0.0036,
        type: ParameterType.FLOAT
      }),
      imax: createMockDroneParameter({
        name: 'ATC_RAT_PIT_IMAX',
        value: 0.5,
        type: ParameterType.FLOAT
      })
    },
    yaw: {
      p: createMockDroneParameter({
        name: 'ATC_RAT_YAW_P',
        value: 0.18,
        type: ParameterType.FLOAT
      }),
      i: createMockDroneParameter({
        name: 'ATC_RAT_YAW_I',
        value: 0.018,
        type: ParameterType.FLOAT
      }),
      d: createMockDroneParameter({
        name: 'ATC_RAT_YAW_D',
        value: 0.0,
        type: ParameterType.FLOAT
      }),
      imax: createMockDroneParameter({
        name: 'ATC_RAT_YAW_IMAX',
        value: 0.5,
        type: ParameterType.FLOAT
      })
    }
  };

  let mockTelemetry = createMockTelemetryPacket();
  let telemetryCleanup: (() => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup store mocks
    vi.mocked(droneParametersStore.pidParameters.subscribe).mockImplementation((callback) => {
      callback(mockPIDParameters);
      return () => {};
    });
    
    vi.mocked(droneTelemetryStore.latestTelemetry.subscribe).mockImplementation((callback) => {
      callback(mockTelemetry);
      return () => {};
    });
    
    vi.mocked(droneTelemetryStore.telemetryHistory.subscribe).mockImplementation((callback) => {
      callback([mockTelemetry]);
      return () => {};
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (telemetryCleanup) {
      telemetryCleanup();
      telemetryCleanup = null;
    }
  });

  describe('PID Display', () => {
    it('should display all axis tabs', () => {
      const { getByText } = render(PIDTuningPanel);
      
      expect(getByText('Roll')).toBeInTheDocument();
      expect(getByText('Pitch')).toBeInTheDocument();
      expect(getByText('Yaw')).toBeInTheDocument();
    });

    it('should display PID values for selected axis', () => {
      const { container } = render(PIDTuningPanel);
      
      // Default axis is Roll
      const pInput = container.querySelector('[aria-label="P gain"]') as HTMLInputElement;
      const iInput = container.querySelector('[aria-label="I gain"]') as HTMLInputElement;
      const dInput = container.querySelector('[aria-label="D gain"]') as HTMLInputElement;
      const imaxInput = container.querySelector('[aria-label="I max"]') as HTMLInputElement;
      
      expect(pInput.value).toBe('0.135');
      expect(iInput.value).toBe('0.135');
      expect(dInput.value).toBe('0.0036');
      expect(imaxInput.value).toBe('0.5');
    });

    it('should switch between axes', async () => {
      const { getByText, container } = render(PIDTuningPanel);
      
      // Switch to Yaw
      await fireEvent.click(getByText('Yaw'));
      
      const pInput = container.querySelector('[aria-label="P gain"]') as HTMLInputElement;
      expect(pInput.value).toBe('0.18'); // Yaw P value
    });

    it('should show parameter descriptions', () => {
      const { container } = render(PIDTuningPanel);
      
      expect(container.textContent).toContain('Roll axis rate controller P gain');
    });
  });

  describe('PID Editing', () => {
    it('should update PID values', async () => {
      const { container } = render(PIDTuningPanel);
      
      const pInput = container.querySelector('[aria-label="P gain"]') as HTMLInputElement;
      await fireEvent.input(pInput, { target: { value: '0.15' } });
      
      await waitFor(() => {
        expect(droneParametersStore.droneParametersStore.saveParameter).toHaveBeenCalledWith(
          'ATC_RAT_RLL_P',
          0.15
        );
      });
    });

    it('should validate PID constraints', async () => {
      const { container } = render(PIDTuningPanel);
      
      const pInput = container.querySelector('[aria-label="P gain"]') as HTMLInputElement;
      
      // Try to set value above max (0.5)
      await fireEvent.input(pInput, { target: { value: '0.6' } });
      
      expect(notificationStore.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Value must be between 0 and 0.5')
        })
      );
    });

    it('should handle slider adjustments', async () => {
      const { container } = render(PIDTuningPanel);
      
      const pSlider = container.querySelector('[aria-label="P gain slider"]') as HTMLInputElement;
      await fireEvent.input(pSlider, { target: { value: '0.15' } });
      
      // Should update both input and save
      const pInput = container.querySelector('[aria-label="P gain"]') as HTMLInputElement;
      expect(pInput.value).toBe('0.15');
      
      expect(droneParametersStore.droneParametersStore.saveParameter).toHaveBeenCalledWith(
        'ATC_RAT_RLL_P',
        0.15
      );
    });

    it('should maintain precision for small values', async () => {
      const { container } = render(PIDTuningPanel);
      
      const dInput = container.querySelector('[aria-label="D gain"]') as HTMLInputElement;
      await fireEvent.input(dInput, { target: { value: '0.0042' } });
      
      expect(droneParametersStore.droneParametersStore.saveParameter).toHaveBeenCalledWith(
        'ATC_RAT_RLL_D',
        0.0042
      );
    });
  });

  describe('Presets', () => {
    it('should display tuning presets', () => {
      const { getByText } = render(PIDTuningPanel);
      
      expect(getByText('Conservative')).toBeInTheDocument();
      expect(getByText('Moderate')).toBeInTheDocument();
      expect(getByText('Aggressive')).toBeInTheDocument();
      expect(getByText('Custom')).toBeInTheDocument();
    });

    it('should apply preset values', async () => {
      const { getByText } = render(PIDTuningPanel);
      
      await fireEvent.click(getByText('Aggressive'));
      
      // Should show confirmation dialog
      expect(getByText('Apply Aggressive preset?')).toBeInTheDocument();
      expect(getByText('This will overwrite current PID values for Roll axis')).toBeInTheDocument();
      
      const confirmButton = getByText('Apply');
      await fireEvent.click(confirmButton);
      
      // Should batch save aggressive values
      expect(droneParametersStore.droneParametersStore.batchSaveParameters).toHaveBeenCalledWith(
        expect.arrayContaining([
          { name: 'ATC_RAT_RLL_P', value: expect.any(Number) },
          { name: 'ATC_RAT_RLL_I', value: expect.any(Number) },
          { name: 'ATC_RAT_RLL_D', value: expect.any(Number) }
        ])
      );
    });

    it('should warn about aggressive presets', async () => {
      const { getByText } = render(PIDTuningPanel);
      
      await fireEvent.click(getByText('Aggressive'));
      
      const warningText = 'Warning: Aggressive tuning may cause instability';
      expect(getByText(warningText)).toBeInTheDocument();
    });
  });

  describe('Real-time Visualization', () => {
    it('should show attitude telemetry', () => {
      const { container } = render(PIDTuningPanel);
      
      const telemetryCard = container.querySelector('.telemetry-card');
      expect(telemetryCard).toBeInTheDocument();
      
      // Should display current attitude
      expect(container.textContent).toContain('Roll:');
      expect(container.textContent).toContain('0.6°'); // Converted from radians
      expect(container.textContent).toContain('Pitch:');
      expect(container.textContent).toContain('-1.1°');
    });

    it('should update telemetry in real-time', async () => {
      const { container } = render(PIDTuningPanel);
      
      // Update telemetry
      mockTelemetry = createMockTelemetryPacket({
        attitude: createMockAttitudeTelemetry({
          roll: 0.1, // radians
          pitch: 0.2,
          yaw: 0.3
        })
      });
      
      // Trigger store update
      vi.mocked(droneTelemetryStore.latestTelemetry.subscribe).mockImplementation((callback) => {
        callback(mockTelemetry);
        return () => {};
      });
      
      await tick();
      
      // Should show updated values
      expect(container.textContent).toContain('5.7°'); // 0.1 rad to degrees
      expect(container.textContent).toContain('11.5°'); // 0.2 rad to degrees
    });

    it('should render performance chart', () => {
      const { container } = render(PIDTuningPanel);
      
      const chartCanvas = container.querySelector('canvas');
      expect(chartCanvas).toBeInTheDocument();
      expect(chartCanvas).toHaveAttribute('aria-label', 'PID performance chart');
    });

    it('should show rate vs setpoint comparison', () => {
      const { container } = render(PIDTuningPanel);
      
      // Chart legend should show both lines
      expect(container.textContent).toContain('Actual Rate');
      expect(container.textContent).toContain('Setpoint');
    });
  });

  describe('Autotune', () => {
    it('should show autotune button', () => {
      const { getByText } = render(PIDTuningPanel);
      
      expect(getByText('Start Autotune')).toBeInTheDocument();
    });

    it('should start autotune process', async () => {
      const { getByText } = render(PIDTuningPanel);
      
      await fireEvent.click(getByText('Start Autotune'));
      
      // Should show safety warning
      expect(getByText('Autotune Safety Check')).toBeInTheDocument();
      expect(getByText(/Ensure drone is in a safe/)).toBeInTheDocument();
      expect(getByText(/Battery above 50%/)).toBeInTheDocument();
      expect(getByText(/Ready to take manual control/)).toBeInTheDocument();
      
      const startButton = getByText('Start Autotune');
      await fireEvent.click(startButton);
      
      // Should send autotune command
      expect(notificationStore.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          message: 'Starting autotune for Roll axis'
        })
      );
    });

    it('should show autotune progress', async () => {
      const { getByText, container } = render(PIDTuningPanel);
      
      // Start autotune
      await fireEvent.click(getByText('Start Autotune'));
      const startButton = container.querySelectorAll('button').find(
        btn => btn.textContent === 'Start Autotune' && !btn.parentElement?.classList.contains('autotune-button')
      );
      await fireEvent.click(startButton!);
      
      // Should show progress
      expect(container.querySelector('.autotune-progress')).toBeInTheDocument();
      expect(getByText('Cancel Autotune')).toBeInTheDocument();
    });
  });

  describe('Copy Between Axes', () => {
    it('should allow copying values between axes', async () => {
      const { getByText, container } = render(PIDTuningPanel);
      
      // Copy roll to pitch
      const copyButton = container.querySelector('[aria-label="Copy to other axes"]') as HTMLButtonElement;
      await fireEvent.click(copyButton);
      
      // Should show copy dialog
      expect(getByText('Copy Roll PID values to:')).toBeInTheDocument();
      
      // Select Pitch
      const pitchCheckbox = container.querySelector('[value="pitch"]') as HTMLInputElement;
      await fireEvent.click(pitchCheckbox);
      
      const applyButton = getByText('Copy Values');
      await fireEvent.click(applyButton);
      
      // Should batch save roll values to pitch parameters
      expect(droneParametersStore.droneParametersStore.batchSaveParameters).toHaveBeenCalledWith(
        expect.arrayContaining([
          { name: 'ATC_RAT_PIT_P', value: 0.135 }, // Roll P value
          { name: 'ATC_RAT_PIT_I', value: 0.135 },
          { name: 'ATC_RAT_PIT_D', value: 0.0036 }
        ])
      );
    });

    it('should allow copying to multiple axes', async () => {
      const { getByText, container } = render(PIDTuningPanel);
      
      const copyButton = container.querySelector('[aria-label="Copy to other axes"]') as HTMLButtonElement;
      await fireEvent.click(copyButton);
      
      // Select both Pitch and Yaw
      const pitchCheckbox = container.querySelector('[value="pitch"]') as HTMLInputElement;
      const yawCheckbox = container.querySelector('[value="yaw"]') as HTMLInputElement;
      await fireEvent.click(pitchCheckbox);
      await fireEvent.click(yawCheckbox);
      
      const applyButton = getByText('Copy Values');
      await fireEvent.click(applyButton);
      
      // Should save to both axes
      expect(droneParametersStore.droneParametersStore.batchSaveParameters).toHaveBeenCalledWith(
        expect.arrayContaining([
          { name: 'ATC_RAT_PIT_P', value: 0.135 },
          { name: 'ATC_RAT_YAW_P', value: 0.135 }
        ])
      );
    });
  });

  describe('Advanced Settings', () => {
    it('should show advanced settings toggle', () => {
      const { getByText } = render(PIDTuningPanel);
      
      expect(getByText('Show Advanced')).toBeInTheDocument();
    });

    it('should toggle advanced parameters', async () => {
      const { getByText, container } = render(PIDTuningPanel);
      
      await fireEvent.click(getByText('Show Advanced'));
      
      // Should show additional parameters
      expect(container.textContent).toContain('Feed Forward');
      expect(container.textContent).toContain('Filter Frequency');
      expect(container.textContent).toContain('Error Limit');
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate and display overshoot', async () => {
      const { container } = render(PIDTuningPanel);
      
      // Simulate telemetry with overshoot
      const telemetryWithOvershoot = [
        createMockTelemetryPacket({
          attitude: createMockAttitudeTelemetry({ rollSpeed: 0 })
        }),
        createMockTelemetryPacket({
          attitude: createMockAttitudeTelemetry({ rollSpeed: 2.2 }) // Overshoot
        }),
        createMockTelemetryPacket({
          attitude: createMockAttitudeTelemetry({ rollSpeed: 2.0 }) // Setpoint
        })
      ];
      
      vi.mocked(droneTelemetryStore.telemetryHistory.subscribe).mockImplementation((callback) => {
        callback(telemetryWithOvershoot);
        return () => {};
      });
      
      await tick();
      
      expect(container.textContent).toContain('Overshoot: 10%');
    });

    it('should calculate settling time', () => {
      const { container } = render(PIDTuningPanel);
      
      expect(container.textContent).toContain('Settling Time:');
    });

    it('should show rise time', () => {
      const { container } = render(PIDTuningPanel);
      
      expect(container.textContent).toContain('Rise Time:');
    });
  });

  describe('Safety Features', () => {
    it('should limit rate of change for PID values', async () => {
      const { container } = render(PIDTuningPanel);
      
      const pInput = container.querySelector('[aria-label="P gain"]') as HTMLInputElement;
      const currentValue = parseFloat(pInput.value);
      
      // Try to make a large change
      await fireEvent.input(pInput, { target: { value: (currentValue * 3).toString() } });
      
      // Should show warning
      expect(notificationStore.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('Large change detected')
        })
      );
    });

    it('should prevent saving while armed', async () => {
      // Mock armed state
      mockTelemetry = createMockTelemetryPacket({
        system: { armed: true, flightMode: 0, cpuLoad: 0, ramUsage: 0, uptime: 0, errors: [], warnings: [], timestamp: Date.now() }
      });
      
      vi.mocked(droneTelemetryStore.latestTelemetry.subscribe).mockImplementation((callback) => {
        callback(mockTelemetry);
        return () => {};
      });
      
      const { container } = render(PIDTuningPanel);
      
      // All inputs should be disabled
      const inputs = container.querySelectorAll('input[type="number"]');
      inputs.forEach(input => {
        expect(input).toBeDisabled();
      });
      
      // Should show armed warning
      expect(container.querySelector('.armed-warning')).toBeInTheDocument();
      expect(container.textContent).toContain('Drone is ARMED - PID changes disabled');
    });
  });

  describe('Export/Import', () => {
    it('should export PID values', async () => {
      const mockUrl = 'blob:mock-url';
      global.URL.createObjectURL = vi.fn(() => mockUrl);
      global.URL.revokeObjectURL = vi.fn();
      
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      
      const { container } = render(PIDTuningPanel);
      
      const exportButton = container.querySelector('[aria-label="Export PID values"]') as HTMLButtonElement;
      await fireEvent.click(exportButton);
      
      expect(mockLink.download).toContain('pid_values_');
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should import PID values from file', async () => {
      const { container } = render(PIDTuningPanel);
      
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      
      const mockFile = new File(
        [JSON.stringify({
          roll: { p: 0.15, i: 0.15, d: 0.004 },
          pitch: { p: 0.15, i: 0.15, d: 0.004 },
          yaw: { p: 0.2, i: 0.02, d: 0 }
        })],
        'pid_values.json',
        { type: 'application/json' }
      );
      
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false
      });
      
      await fireEvent.change(fileInput);
      
      // Should batch save imported values
      await waitFor(() => {
        expect(droneParametersStore.droneParametersStore.batchSaveParameters).toHaveBeenCalled();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500
      });
      
      const { container } = render(PIDTuningPanel);
      
      // Should stack controls vertically on mobile
      const pidControls = container.querySelector('.pid-controls');
      expect(pidControls).toHaveClass('mobile-layout');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      const { container } = render(PIDTuningPanel);
      
      // Tabs should have proper roles
      const tabList = container.querySelector('[role="tablist"]');
      expect(tabList).toBeInTheDocument();
      
      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs).toHaveLength(3); // Roll, Pitch, Yaw
      
      // Inputs should have labels
      const inputs = container.querySelectorAll('input[type="number"]');
      inputs.forEach(input => {
        expect(input).toHaveAttribute('aria-label');
      });
    });

    it('should support keyboard navigation', async () => {
      const { container } = render(PIDTuningPanel);
      
      const firstTab = container.querySelector('[role="tab"]') as HTMLElement;
      firstTab.focus();
      
      // Arrow keys should navigate tabs
      const rightArrowEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      firstTab.dispatchEvent(rightArrowEvent);
      
      // Should focus next tab
      const tabs = container.querySelectorAll('[role="tab"]');
      expect(document.activeElement).toBe(tabs[1]);
    });
  });
});