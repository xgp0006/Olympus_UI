/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import DroneConfigDashboard from '../DroneConfigDashboard.svelte';
import { renderComponent } from '$lib/test-utils/component-helpers';
import { 
  createMockVehicleInfo,
  createMockDroneParameter,
  createMockMAVLinkConnection,
  createMockCommonParameters
} from './utils/mockDroneData';
import * as droneConnectionStore from '../stores/drone-connection';
import * as droneParametersStore from '../stores/drone-parameters';
import * as droneTelemetryStore from '../stores/drone-telemetry';
import * as notificationStore from '$lib/stores/notifications';
import type { DroneParameter } from '../types/drone-types';

// Mock stores
vi.mock('../stores/drone-connection', () => ({
  droneConnectionStore: {
    subscribe: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn()
  },
  isConnected: {
    subscribe: vi.fn()
  },
  connectionStatus: {
    subscribe: vi.fn()
  }
}));

vi.mock('../stores/drone-parameters', () => ({
  droneParametersStore: {
    subscribe: vi.fn(),
    loadParameters: vi.fn(),
    setParameter: vi.fn(),
    saveParameters: vi.fn(),
    selectParameter: vi.fn(),
    clearError: vi.fn()
  },
  parametersByGroup: {
    subscribe: vi.fn()
  },
  modifiedParameters: {
    subscribe: vi.fn()
  }
}));

vi.mock('../stores/drone-telemetry', () => ({
  droneTelemetryStore: {
    subscribe: vi.fn(),
    startTelemetry: vi.fn(),
    stopTelemetry: vi.fn()
  },
  currentTelemetry: {
    subscribe: vi.fn()
  }
}));

vi.mock('$lib/stores/notifications', () => ({
  showNotification: vi.fn()
}));

// Mock child components
vi.mock('../components/ParameterPanel.svelte', () => ({
  default: {
    $$render: () => '<div data-testid="parameter-panel">Parameter Panel</div>'
  }
}));

vi.mock('../components/PIDTuningPanel.svelte', () => ({
  default: {
    $$render: () => '<div data-testid="pid-tuning-panel">PID Tuning Panel</div>'
  }
}));

vi.mock('../components/MotorTestPanel.svelte', () => ({
  default: {
    $$render: () => '<div data-testid="motor-test-panel">Motor Test Panel</div>'
  }
}));

vi.mock('../components/CalibrationWizard.svelte', () => ({
  default: {
    $$render: () => '<div data-testid="calibration-wizard">Calibration Wizard</div>'
  }
}));

vi.mock('../components/FlightModePanel.svelte', () => ({
  default: {
    $$render: () => '<div data-testid="flight-mode-panel">Flight Mode Panel</div>'
  }
}));

describe('DroneConfigDashboard', () => {
  let mockConnection: ReturnType<typeof createMockMAVLinkConnection>;
  let mockVehicleInfo = createMockVehicleInfo();
  let mockParameters = createMockCommonParameters();
  let isConnectedValue = false;
  let connectionStatusValue: {
    connected: boolean;
    vehicleType: string | null;
    firmwareVersion: string | null;
    lastHeartbeat: number;
  } = {
    connected: false,
    vehicleType: null,
    firmwareVersion: null,
    lastHeartbeat: 0
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnection = createMockMAVLinkConnection();
    isConnectedValue = false;
    connectionStatusValue = {
      connected: false,
      vehicleType: null,
      firmwareVersion: null,
      lastHeartbeat: 0
    };
    
    // Setup store mocks
    vi.mocked(droneConnectionStore.isConnected.subscribe).mockImplementation((callback) => {
      callback(isConnectedValue);
      return () => {};
    });
    
    vi.mocked(droneConnectionStore.connectionStatus.subscribe).mockImplementation((callback) => {
      callback(connectionStatusValue);
      return () => {};
    });
    
    vi.mocked(droneConnectionStore.droneConnectionStore.subscribe).mockImplementation((callback) => {
      callback({
        connected: isConnectedValue,
        connectionString: null,
        vehicleType: isConnectedValue ? mockVehicleInfo.vehicleType : null,
        firmwareVersion: isConnectedValue ? mockVehicleInfo.firmwareVersion : null,
        protocolVersion: null,
        lastHeartbeat: isConnectedValue ? Date.now() : 0,
        loading: false,
        error: null
      });
      return () => {};
    });
    
    vi.mocked(droneParametersStore.droneParametersStore.subscribe).mockImplementation((callback) => {
      callback({
        parameters: mockParameters,
        selectedParameterId: null,
        loading: false,
        error: null,
        lastUpdated: Date.now()
      });
      return () => {};
    });
    
    vi.mocked(droneParametersStore.parametersByGroup.subscribe).mockImplementation((callback: (value: Map<string, DroneParameter[]>) => void) => {
      const parameterMap = new Map<string, DroneParameter[]>();
      parameterMap.set('Motors', mockParameters.filter(p => p.group === 'Motors'));
      parameterMap.set('Attitude Control', mockParameters.filter(p => p.group === 'Attitude Control'));
      callback(parameterMap);
      return () => {};
    });
    
    vi.mocked(droneParametersStore.modifiedParameters.subscribe).mockImplementation((callback: (value: DroneParameter[]) => void) => {
      callback([]);
      return () => {};
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Connection Management', () => {
    it('should show connection UI when disconnected', () => {
      const { getByText, container } = render(DroneConfigDashboard);
      
      expect(getByText('Drone Configuration')).toBeInTheDocument();
      expect(container.querySelector('.connection-panel')).toBeInTheDocument();
      expect(getByText('Connect')).toBeInTheDocument();
    });

    it('should connect to drone on button click', async () => {
      const { getByText } = render(DroneConfigDashboard);
      
      const connectButton = getByText('Connect');
      await fireEvent.click(connectButton);
      
      expect(droneConnectionStore.droneConnectionStore.connect).toHaveBeenCalled();
    });

    it('should show connecting state', async () => {
      connectionStatusValue = {
        connected: false,
        vehicleType: null,
        firmwareVersion: null,
        lastHeartbeat: 0
      };
      
      const { getByText, container } = render(DroneConfigDashboard);
      
      expect(container.querySelector('.status-indicator')?.textContent).toContain('Connecting...');
      expect(getByText('Connect')).toBeDisabled();
    });

    it('should show vehicle info when connected', async () => {
      isConnectedValue = true;
      connectionStatusValue = {
        connected: true,
        vehicleType: mockVehicleInfo.vehicleType,
        firmwareVersion: mockVehicleInfo.firmwareVersion,
        lastHeartbeat: Date.now()
      };
      
      const { container } = render(DroneConfigDashboard);
      
      expect(container.querySelector('.vehicle-info')).toBeInTheDocument();
      expect(container.textContent).toContain(mockVehicleInfo.autopilot);
      expect(container.textContent).toContain(mockVehicleInfo.vehicleType);
      expect(container.textContent).toContain(mockVehicleInfo.firmwareVersion);
    });

    it('should handle disconnect', async () => {
      isConnectedValue = true;
      connectionStatusValue = {
        connected: true,
        vehicleType: mockVehicleInfo.vehicleType,
        firmwareVersion: mockVehicleInfo.firmwareVersion,
        lastHeartbeat: Date.now()
      };
      
      const { getByText } = render(DroneConfigDashboard);
      
      const disconnectButton = getByText('Disconnect');
      await fireEvent.click(disconnectButton);
      
      expect(droneConnectionStore.droneConnectionStore.disconnect).toHaveBeenCalled();
    });

    it('should show connection error', () => {
      connectionStatusValue = {
        connected: false,
        vehicleType: null,
        firmwareVersion: null,
        lastHeartbeat: 0
      };
      
      const { container } = render(DroneConfigDashboard);
      
      expect(container.querySelector('.status-indicator.error')).toBeInTheDocument();
      expect(container.textContent).toContain('Connection failed');
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(() => {
      isConnectedValue = true;
      connectionStatusValue = {
        connected: true,
        vehicleType: mockVehicleInfo.vehicleType,
        firmwareVersion: mockVehicleInfo.firmwareVersion,
        lastHeartbeat: Date.now()
      };
    });

    it('should show all tabs when connected', () => {
      const { getByText } = render(DroneConfigDashboard);
      
      expect(getByText('Parameters')).toBeInTheDocument();
      expect(getByText('PID Tuning')).toBeInTheDocument();
      expect(getByText('Motor Test')).toBeInTheDocument();
      expect(getByText('Calibration')).toBeInTheDocument();
      expect(getByText('Flight Modes')).toBeInTheDocument();
    });

    it('should switch tabs on click', async () => {
      const { getByText, container } = render(DroneConfigDashboard);
      
      // Default should show parameter panel
      expect(container.querySelector('[data-testid="parameter-panel"]')).toBeInTheDocument();
      
      // Click PID Tuning tab
      await fireEvent.click(getByText('PID Tuning'));
      expect(container.querySelector('[data-testid="pid-tuning-panel"]')).toBeInTheDocument();
      
      // Click Motor Test tab
      await fireEvent.click(getByText('Motor Test'));
      expect(container.querySelector('[data-testid="motor-test-panel"]')).toBeInTheDocument();
    });

    it('should highlight active tab', async () => {
      const { getByText, container } = render(DroneConfigDashboard);
      
      const parametersTab = getByText('Parameters').parentElement;
      expect(parametersTab).toHaveClass('active');
      
      await fireEvent.click(getByText('PID Tuning'));
      
      const pidTab = getByText('PID Tuning').parentElement;
      expect(pidTab).toHaveClass('active');
      expect(parametersTab).not.toHaveClass('active');
    });
  });

  describe('Parameter Operations', () => {
    beforeEach(() => {
      isConnectedValue = true;
      connectionStatusValue = {
        connected: true,
        vehicleType: mockVehicleInfo.vehicleType,
        firmwareVersion: mockVehicleInfo.firmwareVersion,
        lastHeartbeat: Date.now()
      };
    });

    it('should load parameters on connection', async () => {
      // Simulate connection
      isConnectedValue = false;
      const { rerender } = render(DroneConfigDashboard);
      
      // Update to connected state
      isConnectedValue = true;
      vi.mocked(droneConnectionStore.isConnected.subscribe).mockImplementation((callback) => {
        callback(true);
        return () => {};
      });
      
      // Trigger rerender
      rerender({ component: DroneConfigDashboard });
      
      await waitFor(() => {
        expect(droneParametersStore.droneParametersStore.loadParameters).toHaveBeenCalled();
      });
    });

    it('should show parameter count', () => {
      const { container } = render(DroneConfigDashboard);
      
      expect(container.querySelector('.parameter-count')?.textContent).toContain(`${mockParameters.length} parameters`);
    });

    it('should show modified parameter indicator', async () => {
      // Mock modified parameters
      vi.mocked(droneParametersStore.modifiedParameters.subscribe).mockImplementation((callback: (value: DroneParameter[]) => void) => {
        callback([
          createMockDroneParameter({ id: 'MOT_SPIN_MIN_0', isModified: true }),
          createMockDroneParameter({ id: 'MOT_SPIN_MAX_1', isModified: true })
        ]);
        return () => {};
      });
      
      const { container } = render(DroneConfigDashboard);
      
      expect(container.querySelector('.modified-indicator')?.textContent).toContain('2 unsaved');
    });

    it('should refresh parameters on button click', async () => {
      const { container } = render(DroneConfigDashboard);
      
      const refreshButton = container.querySelector('[aria-label="Refresh parameters"]') as HTMLButtonElement;
      await fireEvent.click(refreshButton);
      
      expect(droneParametersStore.droneParametersStore.loadParameters).toHaveBeenCalled();
    });
  });

  describe('Telemetry Management', () => {
    beforeEach(() => {
      isConnectedValue = true;
      connectionStatusValue = {
        connected: true,
        vehicleType: mockVehicleInfo.vehicleType,
        firmwareVersion: mockVehicleInfo.firmwareVersion,
        lastHeartbeat: Date.now()
      };
    });

    it('should start telemetry on connection', async () => {
      // Simulate connection
      isConnectedValue = false;
      const { rerender } = render(DroneConfigDashboard);
      
      // Update to connected state
      isConnectedValue = true;
      vi.mocked(droneConnectionStore.isConnected.subscribe).mockImplementation((callback) => {
        callback(true);
        return () => {};
      });
      
      // Trigger rerender
      rerender({ component: DroneConfigDashboard });
      
      await waitFor(() => {
        expect(droneTelemetryStore.droneTelemetryStore.startTelemetry).toHaveBeenCalled();
      });
    });

    it('should stop telemetry on disconnect', async () => {
      const { getByText } = render(DroneConfigDashboard);
      
      const disconnectButton = getByText('Disconnect');
      await fireEvent.click(disconnectButton);
      
      expect(droneTelemetryStore.droneTelemetryStore.stopTelemetry).toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('should show mobile-friendly layout on small screens', () => {
      // Mock window size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500
      });
      
      const { container } = render(DroneConfigDashboard);
      
      // Tabs should be scrollable on mobile
      expect(container.querySelector('.tab-navigation')).toHaveStyle({
        overflowX: 'auto'
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error notification on connection failure', async () => {
      vi.mocked(droneConnectionStore.droneConnectionStore.connect).mockRejectedValue(
        new Error('Connection failed')
      );
      
      const { getByText } = render(DroneConfigDashboard);
      
      const connectButton = getByText('Connect');
      await fireEvent.click(connectButton);
      
      await waitFor(() => {
        expect(notificationStore.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: expect.stringContaining('Failed to connect')
          })
        );
      });
    });

    it('should handle parameter loading errors', async () => {
      isConnectedValue = true;
      
      vi.mocked(droneParametersStore.droneParametersStore.subscribe).mockImplementation((callback) => {
        callback({
          parameters: [],
          isLoading: false,
          error: 'Failed to load parameters'
        });
        return () => {};
      });
      
      const { container } = render(DroneConfigDashboard);
      
      expect(container.querySelector('.error-message')?.textContent).toContain('Failed to load parameters');
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      isConnectedValue = true;
      connectionStatusValue = {
        connected: true,
        vehicleType: mockVehicleInfo.vehicleType,
        firmwareVersion: mockVehicleInfo.firmwareVersion,
        lastHeartbeat: Date.now()
      };
    });

    it('should support keyboard navigation between tabs', async () => {
      const { container } = render(DroneConfigDashboard);
      
      const tabs = container.querySelectorAll('.tab-button');
      
      // Focus first tab
      (tabs[0] as HTMLElement).focus();
      
      // Arrow right should move to next tab
      const rightArrowEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      tabs[0].dispatchEvent(rightArrowEvent);
      
      await tick();
      
      expect(document.activeElement).toBe(tabs[1]);
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner when connecting', () => {
      connectionStatusValue = 'connecting';
      
      const { container } = render(DroneConfigDashboard);
      
      expect(container.querySelector('.loading-spinner')).toBeInTheDocument();
    });

    it('should show parameter loading state', () => {
      isConnectedValue = true;
      
      vi.mocked(droneParametersStore.droneParametersStore.subscribe).mockImplementation((callback) => {
        callback({
          parameters: [],
          isLoading: true,
          error: null
        });
        return () => {};
      });
      
      const { container } = render(DroneConfigDashboard);
      
      expect(container.querySelector('.parameter-loading')?.textContent).toContain('Loading parameters...');
    });
  });

  describe('Theme Integration', () => {
    it('should apply theme classes correctly', () => {
      const { container } = render(DroneConfigDashboard);
      
      // Check for theme-aware classes
      expect(container.querySelector('.drone-config-dashboard')).toBeInTheDocument();
      expect(container.querySelector('.header')).toBeInTheDocument();
      expect(container.querySelector('.connection-panel')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should debounce rapid connection attempts', async () => {
      const { getByText } = render(DroneConfigDashboard);
      
      const connectButton = getByText('Connect');
      
      // Click multiple times rapidly
      await fireEvent.click(connectButton);
      await fireEvent.click(connectButton);
      await fireEvent.click(connectButton);
      
      // Should only call connect once
      expect(droneConnectionStore.droneConnectionStore.connect).toHaveBeenCalledTimes(1);
    });

    it('should clean up subscriptions on unmount', () => {
      const unsubscribeFn = vi.fn();
      
      vi.mocked(droneConnectionStore.isConnected.subscribe).mockReturnValue(unsubscribeFn);
      vi.mocked(droneConnectionStore.connectionStatus.subscribe).mockReturnValue(unsubscribeFn);
      vi.mocked(droneParametersStore.droneParametersStore.subscribe).mockReturnValue(unsubscribeFn);
      
      const { unmount } = render(DroneConfigDashboard);
      
      unmount();
      
      // All subscriptions should be cleaned up
      expect(unsubscribeFn).toHaveBeenCalledTimes(3);
    });
  });
});