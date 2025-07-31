/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';
import ParameterPanel from '../components/ParameterPanel.svelte';
import { 
  createMockDroneParameter,
  createMockParameterGroup,
  createMockParameterProfile,
  createMockCommonParameters,
  DEFAULT_PARAMETER_CONSTRAINTS
} from './utils/mockDroneData';
import { 
  renderWithDroneContext,
  createMockParameterStore,
  mockParameterService
} from './utils/testUtils';
import * as notificationStore from '$lib/stores/notifications';
import { ParameterType } from '../types/drone-types';

// Mock notifications
vi.mock('$lib/stores/notifications', () => ({
  showNotification: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn()
}));

// Mock file operations
const mockFileReader = {
  readAsText: vi.fn(),
  result: null,
  onload: null,
  onerror: null
};

global.FileReader = vi.fn(() => mockFileReader) as any;

describe('ParameterPanel', () => {
  let mockParameters = createMockCommonParameters();
  let mockGroups = [
    createMockParameterGroup({ name: 'Motors', parameters: ['MOT_SPIN_MIN', 'MOT_SPIN_MAX', 'MOT_PWM_TYPE'] }),
    createMockParameterGroup({ name: 'Attitude Control', parameters: ['ATC_RAT_RLL_P', 'ATC_RAT_PIT_P'] })
  ];
  let mockProfiles = [
    createMockParameterProfile({ id: 'profile-1', name: 'Racing Profile' }),
    createMockParameterProfile({ id: 'profile-2', name: 'Cinematic Profile' })
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock parameter service
    mockParameterService.getParameterGroups.mockReturnValue(mockGroups);
    mockParameterService.validateParameter.mockReturnValue({
      valid: true,
      errors: [],
      warnings: []
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Parameter Display', () => {
    it('should display all parameter groups', () => {
      const { getByText } = render(ParameterPanel);
      
      expect(getByText('Motors')).toBeInTheDocument();
      expect(getByText('Attitude Control')).toBeInTheDocument();
    });

    it('should display parameters within groups', () => {
      const { getByText, container } = render(ParameterPanel);
      
      // Expand Motors group
      const motorsGroup = getByText('Motors').parentElement;
      expect(motorsGroup).toBeInTheDocument();
      
      // Should show motor parameters
      expect(container.textContent).toContain('MOT_SPIN_MIN');
      expect(container.textContent).toContain('MOT_SPIN_MAX');
    });

    it('should show parameter details', () => {
      const { container } = render(ParameterPanel);
      
      const param = mockParameters[0];
      const paramCard = container.querySelector(`[data-param-id="${param.id}"]`);
      
      expect(paramCard?.textContent).toContain(param.name);
      expect(paramCard?.textContent).toContain(param.metadata?.description);
      expect(paramCard?.querySelector('input')?.value).toBe(param.value.toString());
    });

    it('should indicate modified parameters', async () => {
      modifiedParameterIds.add('MOT_SPIN_MIN_0');
      
      const { container } = render(ParameterPanel);
      
      const paramCard = container.querySelector('[data-param-id="MOT_SPIN_MIN_0"]');
      expect(paramCard).toHaveClass('modified');
      expect(paramCard?.querySelector('.modified-indicator')).toBeInTheDocument();
    });
  });

  describe('Parameter Editing', () => {
    it('should update parameter value on input', async () => {
      const { container } = render(ParameterPanel);
      
      const input = container.querySelector('[data-param-id="MOT_SPIN_MIN_0"] input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: '0.2' } });
      
      expect(droneParametersStore.droneParametersStore.saveParameter).toHaveBeenCalledWith(
        'MOT_SPIN_MIN',
        0.2
      );
    });

    it('should validate parameter constraints', async () => {
      const { container } = render(ParameterPanel);
      
      const param = mockParameters[0]; // MOT_SPIN_MIN with max 0.3
      const input = container.querySelector(`[data-param-id="${param.id}"] input`) as HTMLInputElement;
      
      // Try to set value above max
      await fireEvent.input(input, { target: { value: '0.5' } });
      
      // Should show validation error
      expect(notificationStore.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Value must be between')
        })
      );
      
      // Should not save invalid value
      expect(droneParametersStore.droneParametersStore.saveParameter).not.toHaveBeenCalled();
    });

    it('should handle enum parameters with dropdown', async () => {
      const { container } = render(ParameterPanel);
      
      // MOT_PWM_TYPE is an enum parameter
      const enumParam = container.querySelector('[data-param-id="MOT_PWM_TYPE_4"]');
      const select = enumParam?.querySelector('select') as HTMLSelectElement;
      
      expect(select).toBeInTheDocument();
      expect(select.options.length).toBeGreaterThan(1);
      
      // Change value
      await fireEvent.change(select, { target: { value: '1' } });
      
      expect(droneParametersStore.droneParametersStore.saveParameter).toHaveBeenCalledWith(
        'MOT_PWM_TYPE',
        1
      );
    });

    it('should show revert button for modified parameters', async () => {
      modifiedParameterIds.add('MOT_SPIN_MIN_0');
      
      const { container } = render(ParameterPanel);
      
      const paramCard = container.querySelector('[data-param-id="MOT_SPIN_MIN_0"]');
      const revertButton = paramCard?.querySelector('[aria-label="Revert parameter"]') as HTMLButtonElement;
      
      expect(revertButton).toBeInTheDocument();
      
      await fireEvent.click(revertButton);
      
      expect(droneParametersStore.droneParametersStore.revertParameter).toHaveBeenCalledWith('MOT_SPIN_MIN');
    });
  });

  describe('Search and Filter', () => {
    it('should filter parameters by search term', async () => {
      const { container, getByPlaceholderText } = render(ParameterPanel);
      
      const searchInput = getByPlaceholderText('Search parameters...');
      await fireEvent.input(searchInput, { target: { value: 'MOT' } });
      
      await waitFor(() => {
        // Should show only motor parameters
        expect(container.textContent).toContain('MOT_SPIN_MIN');
        expect(container.textContent).toContain('MOT_SPIN_MAX');
        expect(container.textContent).not.toContain('ATC_RAT_RLL_P');
      });
    });

    it('should search by parameter description', async () => {
      const { container, getByPlaceholderText } = render(ParameterPanel);
      
      const searchInput = getByPlaceholderText('Search parameters...');
      await fireEvent.input(searchInput, { target: { value: 'spin' } });
      
      await waitFor(() => {
        expect(container.textContent).toContain('MOT_SPIN_MIN');
      });
    });

    it('should show modified only filter', async () => {
      modifiedParameterIds.add('MOT_SPIN_MIN_0');
      modifiedParameterIds.add('ATC_RAT_RLL_P_2');
      
      const { container, getByLabelText } = render(ParameterPanel);
      
      const modifiedOnlyCheckbox = getByLabelText('Show modified only');
      await fireEvent.click(modifiedOnlyCheckbox);
      
      await waitFor(() => {
        // Should only show modified parameters
        expect(container.textContent).toContain('MOT_SPIN_MIN');
        expect(container.textContent).toContain('ATC_RAT_RLL_P');
        expect(container.textContent).not.toContain('MOT_SPIN_MAX');
      });
    });

    it('should combine search and filter', async () => {
      modifiedParameterIds.add('MOT_SPIN_MIN_0');
      modifiedParameterIds.add('ATC_RAT_RLL_P_2');
      
      const { container, getByPlaceholderText, getByLabelText } = render(ParameterPanel);
      
      // Search for MOT
      const searchInput = getByPlaceholderText('Search parameters...');
      await fireEvent.input(searchInput, { target: { value: 'MOT' } });
      
      // Enable modified only
      const modifiedOnlyCheckbox = getByLabelText('Show modified only');
      await fireEvent.click(modifiedOnlyCheckbox);
      
      await waitFor(() => {
        // Should only show modified MOT parameters
        expect(container.textContent).toContain('MOT_SPIN_MIN');
        expect(container.textContent).not.toContain('MOT_SPIN_MAX'); // Not modified
        expect(container.textContent).not.toContain('ATC_RAT_RLL_P'); // Not MOT
      });
    });
  });

  describe('Batch Operations', () => {
    it('should save all modified parameters', async () => {
      modifiedParameterIds.add('MOT_SPIN_MIN_0');
      modifiedParameterIds.add('MOT_SPIN_MAX_1');
      
      const { getByText } = render(ParameterPanel);
      
      const saveAllButton = getByText('Save All');
      await fireEvent.click(saveAllButton);
      
      expect(droneParametersStore.droneParametersStore.saveAllParameters).toHaveBeenCalled();
      expect(notificationStore.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: 'All parameters saved'
        })
      );
    });

    it('should revert all modified parameters', async () => {
      modifiedParameterIds.add('MOT_SPIN_MIN_0');
      modifiedParameterIds.add('MOT_SPIN_MAX_1');
      
      const { getByText } = render(ParameterPanel);
      
      const revertAllButton = getByText('Revert All');
      await fireEvent.click(revertAllButton);
      
      // Should show confirmation dialog
      expect(getByText('Revert all 2 modified parameters?')).toBeInTheDocument();
      
      const confirmButton = getByText('Confirm');
      await fireEvent.click(confirmButton);
      
      expect(droneParametersStore.droneParametersStore.revertAllParameters).toHaveBeenCalled();
    });

    it('should disable batch buttons when no modifications', () => {
      const { getByText } = render(ParameterPanel);
      
      const saveAllButton = getByText('Save All');
      const revertAllButton = getByText('Revert All');
      
      expect(saveAllButton).toBeDisabled();
      expect(revertAllButton).toBeDisabled();
    });
  });

  describe('Import/Export', () => {
    it('should export parameters to JSON', async () => {
      // Mock URL.createObjectURL and link click
      const mockUrl = 'blob:mock-url';
      global.URL.createObjectURL = vi.fn(() => mockUrl);
      global.URL.revokeObjectURL = vi.fn();
      
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      
      const { getByText } = render(ParameterPanel);
      
      const exportButton = getByText('Export');
      await fireEvent.click(exportButton);
      
      expect(droneParametersStore.droneParametersStore.exportParameters).toHaveBeenCalled();
      expect(mockLink.download).toContain('drone_parameters_');
      expect(mockLink.download).toContain('.json');
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should import parameters from JSON file', async () => {
      const { getByLabelText } = render(ParameterPanel);
      
      const fileInput = getByLabelText('Import parameters') as HTMLInputElement;
      
      const mockFile = new File(
        [JSON.stringify({ MOT_SPIN_MIN: 0.2, MOT_SPIN_MAX: 0.9 })],
        'params.json',
        { type: 'application/json' }
      );
      
      // Setup FileReader mock
      mockFileReader.readAsText = vi.fn(() => {
        setTimeout(() => {
          mockFileReader.result = JSON.stringify({ MOT_SPIN_MIN: 0.2, MOT_SPIN_MAX: 0.9 });
          mockFileReader.onload?.({} as any);
        }, 0);
      });
      
      // Trigger file selection
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false
      });
      
      await fireEvent.change(fileInput);
      
      await waitFor(() => {
        expect(droneParametersStore.droneParametersStore.importParameters).toHaveBeenCalledWith({
          MOT_SPIN_MIN: 0.2,
          MOT_SPIN_MAX: 0.9
        });
      });
    });

    it('should handle import errors', async () => {
      const { getByLabelText } = render(ParameterPanel);
      
      const fileInput = getByLabelText('Import parameters') as HTMLInputElement;
      
      const mockFile = new File(['invalid json'], 'params.json', { type: 'application/json' });
      
      mockFileReader.readAsText = vi.fn(() => {
        setTimeout(() => {
          mockFileReader.onerror?.({} as any);
        }, 0);
      });
      
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false
      });
      
      await fireEvent.change(fileInput);
      
      await waitFor(() => {
        expect(notificationStore.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: expect.stringContaining('Failed to import')
          })
        );
      });
    });
  });

  describe('Parameter Profiles', () => {
    it('should display saved profiles', () => {
      const { getByText } = render(ParameterPanel);
      
      expect(getByText('Racing Profile')).toBeInTheDocument();
      expect(getByText('Cinematic Profile')).toBeInTheDocument();
    });

    it('should load a profile', async () => {
      const { getByText } = render(ParameterPanel);
      
      const loadButton = getByText('Racing Profile').parentElement?.querySelector('button');
      await fireEvent.click(loadButton!);
      
      expect(droneParametersStore.parameterProfiles.loadProfile).toHaveBeenCalledWith('profile-1');
      expect(notificationStore.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: 'Profile loaded: Racing Profile'
        })
      );
    });

    it('should save current parameters as profile', async () => {
      const { getByText, getByPlaceholderText } = render(ParameterPanel);
      
      const saveProfileButton = getByText('Save as Profile');
      await fireEvent.click(saveProfileButton);
      
      // Enter profile name
      const nameInput = getByPlaceholderText('Profile name');
      await fireEvent.input(nameInput, { target: { value: 'My Custom Profile' } });
      
      const descInput = getByPlaceholderText('Description (optional)');
      await fireEvent.input(descInput, { target: { value: 'Test profile' } });
      
      const saveButton = getByText('Save Profile');
      await fireEvent.click(saveButton);
      
      expect(droneParametersStore.parameterProfiles.saveProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Custom Profile',
          description: 'Test profile'
        })
      );
    });

    it('should delete a profile with confirmation', async () => {
      const { container, getByText } = render(ParameterPanel);
      
      const profileCard = container.querySelector('[data-profile-id="profile-1"]');
      const deleteButton = profileCard?.querySelector('[aria-label="Delete profile"]') as HTMLButtonElement;
      
      await fireEvent.click(deleteButton);
      
      // Confirm deletion
      expect(getByText('Delete profile "Racing Profile"?')).toBeInTheDocument();
      
      const confirmButton = getByText('Delete');
      await fireEvent.click(confirmButton);
      
      expect(droneParametersStore.parameterProfiles.deleteProfile).toHaveBeenCalledWith('profile-1');
    });
  });

  describe('Group Management', () => {
    it('should expand/collapse parameter groups', async () => {
      const { container, getByText } = render(ParameterPanel);
      
      const motorsHeader = getByText('Motors').parentElement;
      const toggleButton = motorsHeader?.querySelector('[aria-label="Toggle group"]') as HTMLButtonElement;
      
      // Should be expanded by default
      expect(container.querySelector('[data-group="Motors"]')).toHaveAttribute('aria-expanded', 'true');
      
      // Collapse
      await fireEvent.click(toggleButton);
      expect(container.querySelector('[data-group="Motors"]')).toHaveAttribute('aria-expanded', 'false');
      
      // Expand again
      await fireEvent.click(toggleButton);
      expect(container.querySelector('[data-group="Motors"]')).toHaveAttribute('aria-expanded', 'true');
    });

    it('should show parameter count per group', () => {
      const { container } = render(ParameterPanel);
      
      const motorsGroup = container.querySelector('[data-group="Motors"]');
      expect(motorsGroup?.textContent).toContain('3 parameters');
      
      const attitudeGroup = container.querySelector('[data-group="Attitude Control"]');
      expect(attitudeGroup?.textContent).toContain('2 parameters');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const { container } = render(ParameterPanel);
      
      // Parameter inputs should have labels
      const inputs = container.querySelectorAll('input[type="number"]');
      inputs.forEach(input => {
        expect(input).toHaveAttribute('aria-label');
      });
      
      // Buttons should have labels
      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should support keyboard navigation', async () => {
      const { container } = render(ParameterPanel);
      
      const firstInput = container.querySelector('input[type="number"]') as HTMLInputElement;
      firstInput.focus();
      
      // Tab should move to next focusable element
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      firstInput.dispatchEvent(tabEvent);
      
      // Enter should save value
      await fireEvent.input(firstInput, { target: { value: '0.2' } });
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      firstInput.dispatchEvent(enterEvent);
      
      expect(droneParametersStore.droneParametersStore.saveParameter).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should debounce parameter value changes', async () => {
      vi.useFakeTimers();
      
      const { container } = render(ParameterPanel);
      
      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      
      // Type multiple values quickly
      await fireEvent.input(input, { target: { value: '0.16' } });
      await fireEvent.input(input, { target: { value: '0.17' } });
      await fireEvent.input(input, { target: { value: '0.18' } });
      
      // Should not save immediately
      expect(droneParametersStore.droneParametersStore.saveParameter).not.toHaveBeenCalled();
      
      // Fast forward past debounce delay
      vi.advanceTimersByTime(500);
      
      // Should save only once with final value
      expect(droneParametersStore.droneParametersStore.saveParameter).toHaveBeenCalledTimes(1);
      expect(droneParametersStore.droneParametersStore.saveParameter).toHaveBeenCalledWith(
        'MOT_SPIN_MIN',
        0.18
      );
      
      vi.useRealTimers();
    });

    it('should virtualize long parameter lists', () => {
      // Create many parameters
      const manyParameters = Array.from({ length: 100 }, (_, i) => 
        createMockDroneParameter({
          id: `PARAM_${i}`,
          name: `PARAM_${i}`,
          index: i
        })
      );
      
      vi.mocked(droneParametersStore.droneParametersStore.subscribe).mockImplementation((callback) => {
        callback({
          parameters: manyParameters,
          isLoading: false,
          error: null
        });
        return () => {};
      });
      
      const { container } = render(ParameterPanel);
      
      // Should use virtual scrolling (check for viewport container)
      expect(container.querySelector('.parameter-viewport')).toBeInTheDocument();
    });
  });
});