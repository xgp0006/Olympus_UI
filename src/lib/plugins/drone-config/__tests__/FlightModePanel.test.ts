/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import FlightModePanel from '../components/FlightModePanel.svelte';
import { renderComponent } from '$lib/test-utils/component-helpers';
import { 
  createMockDroneParameter,
  createMockTelemetryPacket,
  createMockSystemTelemetry
} from './utils/mockDroneData';
import * as droneConnectionStore from '../stores/drone-connection';
import * as droneParametersStore from '../stores/drone-parameters';
import * as droneTelemetryStore from '../stores/drone-telemetry';
import * as notificationStore from '$lib/stores/notifications';
import { FlightMode, ParameterType } from '../types/drone-types';

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

vi.mock('../stores/drone-parameters', () => ({
  droneParametersStore: {
    subscribe: vi.fn(),
    saveParameter: vi.fn()
  },
  flightModeParameters: {
    subscribe: vi.fn()
  }
}));

vi.mock('../stores/drone-telemetry', () => ({
  droneTelemetryStore: {
    subscribe: vi.fn()
  },
  latestTelemetry: {
    subscribe: vi.fn()
  }
}));

vi.mock('$lib/stores/notifications', () => ({
  showNotification: vi.fn()
}));

describe('FlightModePanel', () => {
  let mockTelemetry = createMockTelemetryPacket();
  let isConnectedValue = true;
  let mockFlightModeParams = {
    FLTMODE1: createMockDroneParameter({
      name: 'FLTMODE1',
      value: FlightMode.STABILIZE,
      type: ParameterType.UINT8,
      metadata: {
        name: 'FLTMODE1',
        type: ParameterType.UINT8,
        defaultValue: FlightMode.STABILIZE,
        description: 'Flight mode switch position 1',
        group: 'Flight Modes',
        values: Object.entries(FlightMode).filter(([k, v]) => typeof v === 'number').map(([k, v]) => ({
          value: v as number,
          label: k
        }))
      }
    }),
    FLTMODE2: createMockDroneParameter({
      name: 'FLTMODE2',
      value: FlightMode.ALT_HOLD,
      type: ParameterType.UINT8
    }),
    FLTMODE3: createMockDroneParameter({
      name: 'FLTMODE3',
      value: FlightMode.LOITER,
      type: ParameterType.UINT8
    }),
    FLTMODE4: createMockDroneParameter({
      name: 'FLTMODE4',
      value: FlightMode.AUTO,
      type: ParameterType.UINT8
    }),
    FLTMODE5: createMockDroneParameter({
      name: 'FLTMODE5',
      value: FlightMode.GUIDED,
      type: ParameterType.UINT8
    }),
    FLTMODE6: createMockDroneParameter({
      name: 'FLTMODE6',
      value: FlightMode.RTL,
      type: ParameterType.UINT8
    }),
    FLTMODE_CH: createMockDroneParameter({
      name: 'FLTMODE_CH',
      value: 5, // Channel 5
      type: ParameterType.UINT8,
      metadata: {
        name: 'FLTMODE_CH',
        type: ParameterType.UINT8,
        defaultValue: 5,
        min: 5,
        max: 16,
        description: 'RC channel for flight mode switching',
        group: 'Flight Modes'
      }
    })
  };

  beforeEach(() => {
    vi.clearAllMocks();
    isConnectedValue = true;
    
    // Setup store mocks
    vi.mocked(droneConnectionStore.isConnected.subscribe).mockImplementation((callback) => {
      callback(isConnectedValue);
      return () => {};
    });
    
    vi.mocked(droneParametersStore.flightModeParameters.subscribe).mockImplementation((callback) => {
      callback(mockFlightModeParams);
      return () => {};
    });
    
    vi.mocked(droneTelemetryStore.latestTelemetry.subscribe).mockImplementation((callback) => {
      callback(mockTelemetry);
      return () => {};
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Flight Mode Display', () => {
    it('should display current flight mode', () => {
      const { container } = render(FlightModePanel);
      
      const currentMode = container.querySelector('.current-flight-mode');
      expect(currentMode).toBeInTheDocument();
      expect(currentMode?.textContent).toContain('STABILIZE');
    });

    it('should show armed/disarmed status', () => {
      const { container } = render(FlightModePanel);
      
      const armedStatus = container.querySelector('.armed-status');
      expect(armedStatus).toBeInTheDocument();
      expect(armedStatus?.textContent).toContain('DISARMED');
      expect(armedStatus).toHaveClass('disarmed');
    });

    it('should update armed status', async () => {
      const { container } = render(FlightModePanel);
      
      // Update telemetry to armed
      mockTelemetry = createMockTelemetryPacket({
        system: createMockSystemTelemetry({
          armed: true,
          flightMode: FlightMode.STABILIZE
        })
      });
      
      vi.mocked(droneTelemetryStore.latestTelemetry.subscribe).mockImplementation((callback) => {
        callback(mockTelemetry);
        return () => {};
      });
      
      await tick();
      
      const armedStatus = container.querySelector('.armed-status');
      expect(armedStatus?.textContent).toContain('ARMED');
      expect(armedStatus).toHaveClass('armed');
    });

    it('should display all 6 flight mode slots', () => {
      const { container } = render(FlightModePanel);
      
      const modeSlots = container.querySelectorAll('.flight-mode-slot');
      expect(modeSlots).toHaveLength(6);
      
      // Check each slot
      expect(modeSlots[0].textContent).toContain('Mode 1');
      expect(modeSlots[0].textContent).toContain('STABILIZE');
      expect(modeSlots[1].textContent).toContain('ALT_HOLD');
      expect(modeSlots[2].textContent).toContain('LOITER');
      expect(modeSlots[3].textContent).toContain('AUTO');
      expect(modeSlots[4].textContent).toContain('GUIDED');
      expect(modeSlots[5].textContent).toContain('RTL');
    });

    it('should highlight active flight mode', async () => {
      const { container } = render(FlightModePanel);
      
      // Mode 1 (STABILIZE) should be active
      const modeSlots = container.querySelectorAll('.flight-mode-slot');
      expect(modeSlots[0]).toHaveClass('active');
      
      // Change to mode 3
      mockTelemetry = createMockTelemetryPacket({
        system: createMockSystemTelemetry({
          flightMode: FlightMode.LOITER
        })
      });
      
      vi.mocked(droneTelemetryStore.latestTelemetry.subscribe).mockImplementation((callback) => {
        callback(mockTelemetry);
        return () => {};
      });
      
      await tick();
      
      expect(modeSlots[0]).not.toHaveClass('active');
      expect(modeSlots[2]).toHaveClass('active');
    });
  });

  describe('Flight Mode Configuration', () => {
    it('should allow changing flight mode assignments', async () => {
      const { container } = render(FlightModePanel);
      
      const firstModeSelect = container.querySelector('.flight-mode-slot select') as HTMLSelectElement;
      expect(firstModeSelect).toBeInTheDocument();
      
      // Change mode 1 to ACRO
      await fireEvent.change(firstModeSelect, { target: { value: FlightMode.ACRO.toString() } });
      
      expect(droneParametersStore.droneParametersStore.saveParameter).toHaveBeenCalledWith(
        'FLTMODE1',
        FlightMode.ACRO
      );
    });

    it('should show mode descriptions on hover', async () => {
      const { container } = render(FlightModePanel);
      
      const modeInfo = container.querySelector('.mode-info-icon');
      await fireEvent.mouseEnter(modeInfo!);
      
      const tooltip = container.querySelector('.mode-tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip?.textContent).toContain('Manual flight with self-leveling');
    });

    it('should group modes by category', () => {
      const { container } = render(FlightModePanel);
      
      const firstModeSelect = container.querySelector('.flight-mode-slot select') as HTMLSelectElement;
      const optgroups = firstModeSelect.querySelectorAll('optgroup');
      
      expect(optgroups.length).toBeGreaterThan(0);
      expect(Array.from(optgroups).some(g => g.label === 'Manual Modes')).toBe(true);
      expect(Array.from(optgroups).some(g => g.label === 'Assisted Modes')).toBe(true);
      expect(Array.from(optgroups).some(g => g.label === 'Auto Modes')).toBe(true);
    });

    it('should warn about duplicate mode assignments', async () => {
      const { container } = render(FlightModePanel);
      
      // Try to set mode 2 to STABILIZE (already assigned to mode 1)
      const secondModeSelect = container.querySelectorAll('.flight-mode-slot select')[1] as HTMLSelectElement;
      await fireEvent.change(secondModeSelect, { target: { value: FlightMode.STABILIZE.toString() } });
      
      expect(notificationStore.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          message: 'STABILIZE is already assigned to Mode 1'
        })
      );
    });

    it('should configure flight mode channel', async () => {
      const { container } = render(FlightModePanel);
      
      const channelSelect = container.querySelector('#flight-mode-channel') as HTMLSelectElement;
      expect(channelSelect.value).toBe('5');
      
      await fireEvent.change(channelSelect, { target: { value: '7' } });
      
      expect(droneParametersStore.droneParametersStore.saveParameter).toHaveBeenCalledWith(
        'FLTMODE_CH',
        7
      );
    });
  });

  describe('Quick Mode Switch', () => {
    it('should show quick switch buttons for common modes', () => {
      const { getByText } = render(FlightModePanel);
      
      expect(getByText('STABILIZE')).toBeInTheDocument();
      expect(getByText('ALT HOLD')).toBeInTheDocument();
      expect(getByText('LOITER')).toBeInTheDocument();
      expect(getByText('RTL')).toBeInTheDocument();
    });

    it('should switch mode on button click', async () => {
      const { getByText } = render(FlightModePanel);
      
      const loiterButton = getByText('LOITER');
      await fireEvent.click(loiterButton);
      
      expect(droneConnectionStore.droneConnectionStore.sendCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.any(Number), // MAV_CMD_DO_SET_MODE
          param1: expect.any(Number),
          param2: FlightMode.LOITER
        })
      );
    });

    it('should disable quick switch when disarmed for certain modes', () => {
      const { container } = render(FlightModePanel);
      
      // AUTO mode should be disabled when disarmed
      const autoButton = container.querySelector('[data-mode="AUTO"]') as HTMLButtonElement;
      expect(autoButton).toBeDisabled();
      
      // But STABILIZE should be enabled
      const stabilizeButton = container.querySelector('[data-mode="STABILIZE"]') as HTMLButtonElement;
      expect(stabilizeButton).not.toBeDisabled();
    });

    it('should show confirmation for critical modes', async () => {
      const { getByText } = render(FlightModePanel);
      
      const rtlButton = getByText('RTL');
      await fireEvent.click(rtlButton);
      
      // Should show confirmation dialog
      expect(getByText('Confirm mode change to RTL?')).toBeInTheDocument();
      expect(getByText('This will return the drone to launch position')).toBeInTheDocument();
      
      const confirmButton = getByText('Confirm');
      await fireEvent.click(confirmButton);
      
      expect(droneConnectionStore.droneConnectionStore.sendCommand).toHaveBeenCalled();
    });
  });

  describe('Mode Restrictions', () => {
    it('should show GPS requirement for GPS modes', () => {
      const { container } = render(FlightModePanel);
      
      // Mock no GPS fix
      mockTelemetry = createMockTelemetryPacket({
        gps: { 
          lat: 0, lon: 0, alt: 0, relativeAlt: 0,
          vx: 0, vy: 0, vz: 0,
          fixType: 0, // No fix
          satellitesVisible: 0,
          hdop: 99.99, vdop: 99.99,
          timestamp: Date.now()
        }
      });
      
      vi.mocked(droneTelemetryStore.latestTelemetry.subscribe).mockImplementation((callback) => {
        callback(mockTelemetry);
        return () => {};
      });
      
      // LOITER requires GPS
      const loiterOption = container.querySelector('option[value="5"]') as HTMLOptionElement;
      expect(loiterOption).toBeDisabled();
      expect(loiterOption.textContent).toContain('(GPS required)');
    });

    it('should show battery warning for AUTO modes', async () => {
      // Mock low battery
      mockTelemetry = createMockTelemetryPacket({
        battery: {
          voltage: 14000, // Low voltage for 4S
          current: 0,
          remaining: 20, // 20% battery
          consumed: 2000,
          temperature: 2500,
          cellCount: 4,
          timestamp: Date.now()
        }
      });
      
      vi.mocked(droneTelemetryStore.latestTelemetry.subscribe).mockImplementation((callback) => {
        callback(mockTelemetry);
        return () => {};
      });
      
      const { container } = render(FlightModePanel);
      
      // Should show battery warning
      const batteryWarning = container.querySelector('.battery-warning');
      expect(batteryWarning).toBeInTheDocument();
      expect(batteryWarning?.textContent).toContain('Low battery - avoid AUTO modes');
    });
  });

  describe('Emergency Mode Override', () => {
    it('should show emergency RTL button', () => {
      const { container } = render(FlightModePanel);
      
      const emergencyButton = container.querySelector('.emergency-rtl');
      expect(emergencyButton).toBeInTheDocument();
      expect(emergencyButton?.textContent).toContain('EMERGENCY RTL');
    });

    it('should immediately switch to RTL on emergency', async () => {
      const { container } = render(FlightModePanel);
      
      const emergencyButton = container.querySelector('.emergency-rtl') as HTMLButtonElement;
      await fireEvent.click(emergencyButton);
      
      // Should send command immediately without confirmation
      expect(droneConnectionStore.droneConnectionStore.sendCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          param2: FlightMode.RTL
        })
      );
      
      expect(notificationStore.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          message: 'Emergency RTL activated'
        })
      );
    });

    it('should show LAND option when GPS unavailable', async () => {
      // Mock no GPS
      mockTelemetry = createMockTelemetryPacket({
        gps: { 
          lat: 0, lon: 0, alt: 0, relativeAlt: 0,
          vx: 0, vy: 0, vz: 0,
          fixType: 0, // No fix
          satellitesVisible: 0,
          hdop: 99.99, vdop: 99.99,
          timestamp: Date.now()
        }
      });
      
      vi.mocked(droneTelemetryStore.latestTelemetry.subscribe).mockImplementation((callback) => {
        callback(mockTelemetry);
        return () => {};
      });
      
      const { container } = render(FlightModePanel);
      
      // Emergency button should show LAND instead of RTL
      const emergencyButton = container.querySelector('.emergency-rtl');
      expect(emergencyButton?.textContent).toContain('EMERGENCY LAND');
    });
  });

  describe('Mode Transition Safety', () => {
    it('should prevent unsafe mode transitions', async () => {
      // Mock high altitude
      mockTelemetry = createMockTelemetryPacket({
        gps: {
          lat: 377749000, lon: -1224194000,
          alt: 120000000, // 120m altitude
          relativeAlt: 120000000,
          vx: 0, vy: 0, vz: 0,
          fixType: 3, satellitesVisible: 10,
          hdop: 1.2, vdop: 1.5,
          timestamp: Date.now()
        },
        system: createMockSystemTelemetry({
          armed: true,
          flightMode: FlightMode.LOITER
        })
      });
      
      vi.mocked(droneTelemetryStore.latestTelemetry.subscribe).mockImplementation((callback) => {
        callback(mockTelemetry);
        return () => {};
      });
      
      const { getByText } = render(FlightModePanel);
      
      // Try to switch to ACRO at high altitude
      const acroButton = container.querySelector('[data-mode="ACRO"]') as HTMLButtonElement;
      await fireEvent.click(acroButton!);
      
      // Should show safety warning
      expect(getByText('Unsafe mode transition')).toBeInTheDocument();
      expect(getByText(/high altitude/)).toBeInTheDocument();
    });

    it('should suggest safe intermediate modes', async () => {
      mockTelemetry = createMockTelemetryPacket({
        system: createMockSystemTelemetry({
          armed: true,
          flightMode: FlightMode.AUTO
        })
      });
      
      const { getByText, container } = render(FlightModePanel);
      
      // Try to switch from AUTO to ACRO
      const acroButton = container.querySelector('[data-mode="ACRO"]') as HTMLButtonElement;
      await fireEvent.click(acroButton!);
      
      // Should suggest intermediate mode
      expect(getByText('Suggested transition:')).toBeInTheDocument();
      expect(getByText('AUTO → LOITER → STABILIZE → ACRO')).toBeInTheDocument();
    });
  });

  describe('Custom Mode Profiles', () => {
    it('should allow saving mode configurations', async () => {
      const { getByText, getByPlaceholderText } = render(FlightModePanel);
      
      const saveProfileButton = getByText('Save Mode Profile');
      await fireEvent.click(saveProfileButton);
      
      const nameInput = getByPlaceholderText('Profile name');
      await fireEvent.input(nameInput, { target: { value: 'Racing Setup' } });
      
      const saveButton = getByText('Save');
      await fireEvent.click(saveButton);
      
      expect(notificationStore.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: 'Mode profile saved: Racing Setup'
        })
      );
    });

    it('should load saved profiles', async () => {
      // Mock saved profiles
      const mockProfiles = [
        {
          id: 'profile-1',
          name: 'Racing Setup',
          modes: [
            FlightMode.ACRO,
            FlightMode.STABILIZE,
            FlightMode.ALT_HOLD,
            FlightMode.POSHOLD,
            FlightMode.RTL,
            FlightMode.LAND
          ]
        }
      ];
      
      const { getByText } = render(FlightModePanel);
      
      // Click load profile
      const loadButton = getByText('Racing Setup');
      await fireEvent.click(loadButton);
      
      // Should batch update all modes
      expect(droneParametersStore.droneParametersStore.saveParameter).toHaveBeenCalledTimes(6);
    });
  });

  describe('Visual Indicators', () => {
    it('should show mode capability icons', () => {
      const { container } = render(FlightModePanel);
      
      const modeCards = container.querySelectorAll('.flight-mode-slot');
      
      // LOITER should show GPS icon
      const loiterCard = Array.from(modeCards).find(card => card.textContent?.includes('LOITER'));
      expect(loiterCard?.querySelector('.icon-gps')).toBeInTheDocument();
      
      // AUTO should show autopilot icon
      const autoCard = Array.from(modeCards).find(card => card.textContent?.includes('AUTO'));
      expect(autoCard?.querySelector('.icon-autopilot')).toBeInTheDocument();
    });

    it('should color-code modes by type', () => {
      const { container } = render(FlightModePanel);
      
      const modeCards = container.querySelectorAll('.flight-mode-slot');
      
      // Manual modes (STABILIZE) should have one color
      const stabilizeCard = Array.from(modeCards).find(card => card.textContent?.includes('STABILIZE'));
      expect(stabilizeCard).toHaveClass('mode-manual');
      
      // Auto modes (RTL) should have different color
      const rtlCard = Array.from(modeCards).find(card => card.textContent?.includes('RTL'));
      expect(rtlCard).toHaveClass('mode-auto');
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should support number keys for mode switching', async () => {
      const { container } = render(FlightModePanel);
      
      // Press "1" for mode 1
      const keyEvent = new KeyboardEvent('keydown', { key: '1' });
      window.dispatchEvent(keyEvent);
      
      await waitFor(() => {
        expect(droneConnectionStore.droneConnectionStore.sendCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            param2: FlightMode.STABILIZE
          })
        );
      });
    });

    it('should show keyboard shortcuts in UI', () => {
      const { container } = render(FlightModePanel);
      
      const modeSlots = container.querySelectorAll('.flight-mode-slot');
      expect(modeSlots[0].textContent).toContain('[1]');
      expect(modeSlots[1].textContent).toContain('[2]');
    });
  });

  describe('Mode History', () => {
    it('should track mode change history', async () => {
      const { container } = render(FlightModePanel);
      
      // Simulate mode changes
      const modes = [FlightMode.STABILIZE, FlightMode.LOITER, FlightMode.AUTO];
      
      for (const mode of modes) {
        mockTelemetry = createMockTelemetryPacket({
          system: createMockSystemTelemetry({ flightMode: mode })
        });
        
        vi.mocked(droneTelemetryStore.latestTelemetry.subscribe).mockImplementation((callback) => {
          callback(mockTelemetry);
          return () => {};
        });
        
        await tick();
      }
      
      // Should show mode history
      const history = container.querySelector('.mode-history');
      expect(history).toBeInTheDocument();
      expect(history?.textContent).toContain('STABILIZE → LOITER → AUTO');
    });
  });

  describe('Accessibility', () => {
    it('should announce mode changes', async () => {
      const { container } = render(FlightModePanel);
      
      const liveRegion = container.querySelector('[aria-live="assertive"]');
      expect(liveRegion).toBeInTheDocument();
      
      // Change mode
      mockTelemetry = createMockTelemetryPacket({
        system: createMockSystemTelemetry({
          flightMode: FlightMode.RTL
        })
      });
      
      vi.mocked(droneTelemetryStore.latestTelemetry.subscribe).mockImplementation((callback) => {
        callback(mockTelemetry);
        return () => {};
      });
      
      await tick();
      
      expect(liveRegion?.textContent).toContain('Flight mode changed to RTL');
    });

    it('should have proper ARIA labels', () => {
      const { container } = render(FlightModePanel);
      
      const selects = container.querySelectorAll('select');
      selects.forEach(select => {
        expect(select).toHaveAttribute('aria-label');
      });
      
      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });
  });
});