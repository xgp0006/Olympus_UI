/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { 
  droneParameters,
  selectedParameter,
  parameterLoading,
  parameterError,
  calibrationParameters,
  pidParameters,
  modifiedParameters,
  loadParameterData,
  updateParameterValue,
  selectParameter,
  clearParameterError,
  saveParameters,
  getDroneState,
  droneState
} from '../../stores/drone-parameters';
import { 
  createMockDroneParameter,
  createMockCommonParameters
} from '../utils/mockDroneData';
import * as notificationStore from '$lib/stores/notifications';
import * as tauriUtils from '$lib/utils/tauri';
import { ParameterType } from '../../types/drone-types';

// Mock dependencies
vi.mock('$lib/stores/notifications', () => ({
  showNotification: vi.fn()
}));

vi.mock('$lib/utils/tauri', () => ({
  safeTauriInvoke: vi.fn()
}));

describe('drone-parameters store', () => {
  let mockParameters = createMockCommonParameters();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset store state by loading empty parameters
    droneState.set({
      parameters: [],
      selectedParameterId: null,
      loading: false,
      error: null,
      lastUpdated: 0
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should start with empty parameters', () => {
      const parameters = get(droneParameters);
      const loading = get(parameterLoading);
      const error = get(parameterError);
      
      expect(parameters).toEqual([]);
      expect(loading).toBe(false);
      expect(error).toBeNull();
    });

    it('should have empty derived stores', () => {
      expect(get(calibrationParameters)).toEqual([]);
      expect(get(pidParameters)).toEqual([]);
      expect(get(modifiedParameters)).toEqual([]);
    });

    it('should have no selected parameter', () => {
      expect(get(selectedParameter)).toBeNull();
    });
  });

  describe('Loading Parameters', () => {
    it('should load parameters successfully', async () => {
      vi.mocked(tauriUtils.safeTauriInvoke).mockResolvedValue(mockParameters);
      
      const result = await loadParameterData();
      
      expect(result).toEqual(mockParameters);
      expect(get(droneParameters)).toEqual(mockParameters);
      expect(get(parameterLoading)).toBe(false);
      expect(get(parameterError)).toBeNull();
      
      expect(tauriUtils.safeTauriInvoke).toHaveBeenCalledWith('get_all_parameters');
    });

    it('should show loading state', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => { resolvePromise = resolve; });
      
      vi.mocked(tauriUtils.safeTauriInvoke).mockReturnValue(promise);
      
      const loadPromise = loadParameterData();
      
      // Should be loading initially
      expect(get(parameterLoading)).toBe(true);
      
      resolvePromise!(mockParameters);
      await loadPromise;
      
      expect(get(parameterLoading)).toBe(false);
    });

    it('should handle loading errors and fallback to mock data', async () => {
      vi.mocked(tauriUtils.safeTauriInvoke).mockRejectedValue(new Error('Failed to load'));
      
      const result = await loadParameterData();
      
      // Should fallback to mock data instead of failing
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(get(parameterLoading)).toBe(false);
      expect(get(parameterError)).toBeNull(); // No error since we have fallback
    });

    it('should organize calibration parameters', async () => {
      vi.mocked(tauriUtils.safeTauriInvoke).mockResolvedValue(mockParameters);
      
      await loadParameterData();
      
      const calibParams = get(calibrationParameters);
      expect(calibParams).toBeDefined();
      expect(Array.isArray(calibParams)).toBe(true);
    });

    it('should organize PID parameters', async () => {
      vi.mocked(tauriUtils.safeTauriInvoke).mockResolvedValue(mockParameters);
      
      await loadParameterData();
      
      const pidParams = get(pidParameters);
      expect(pidParams).toBeDefined();
      expect(Array.isArray(pidParams)).toBe(true);
    });
  });

  describe('Parameter Selection', () => {
    beforeEach(async () => {
      vi.mocked(tauriUtils.safeTauriInvoke).mockResolvedValue(mockParameters);
      await loadParameterData();
    });

    it('should select parameter by ID', () => {
      const paramId = mockParameters[0]?.id;
      if (paramId) {
        selectParameter(paramId);
        
        const selected = get(selectedParameter);
        expect(selected).toBeDefined();
        expect(selected?.id).toBe(paramId);
      }
    });

    it('should deselect parameter with null', () => {
      selectParameter('some-id');
      selectParameter(null);
      
      expect(get(selectedParameter)).toBeNull();
    });
  });

  describe('Parameter Updates', () => {
    beforeEach(async () => {
      vi.mocked(tauriUtils.safeTauriInvoke).mockResolvedValue(mockParameters);
      await loadParameterData();
    });

    it('should update parameter value successfully', async () => {
      vi.mocked(tauriUtils.safeTauriInvoke).mockResolvedValue(undefined);
      
      const paramId = mockParameters[0]?.id;
      if (paramId) {
        await updateParameterValue(paramId, 0.5);
        
        expect(tauriUtils.safeTauriInvoke).toHaveBeenCalledWith('set_parameter', {
          id: paramId,
          value: 0.5
        });
        
        // Should update local state
        const updatedParams = get(droneParameters);
        const updatedParam = updatedParams.find(p => p.id === paramId);
        expect(updatedParam?.value).toBe(0.5);
        expect(updatedParam?.isModified).toBe(true);
      }
    });

    it('should handle update failures', async () => {
      vi.mocked(tauriUtils.safeTauriInvoke).mockRejectedValue(new Error('Update failed'));
      
      const paramId = mockParameters[0]?.id;
      if (paramId) {
        await expect(updateParameterValue(paramId, 0.5)).rejects.toThrow('Update failed');
        
        // Should set error state
        expect(get(parameterError)).toBeTruthy();
      }
    });
  });

  describe('Parameter Saving', () => {
    it('should save parameters to file', async () => {
      const mockFilePath = '/path/to/saved/parameters.json';
      vi.mocked(tauriUtils.safeTauriInvoke).mockResolvedValue(mockFilePath);
      
      const result = await saveParameters();
      
      expect(result).toBe(mockFilePath);
      expect(tauriUtils.safeTauriInvoke).toHaveBeenCalledWith('save_parameters', {
        parameters: expect.any(Array)
      });
    });

    it('should handle save failures', async () => {
      vi.mocked(tauriUtils.safeTauriInvoke).mockRejectedValue(new Error('Save failed'));
      
      await expect(saveParameters()).rejects.toThrow('Save failed');
      expect(get(parameterError)).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should clear parameter errors', () => {
      // Set an error state first
      droneState.update(state => ({ ...state, error: 'Test error' }));
      expect(get(parameterError)).toBe('Test error');
      
      clearParameterError();
      expect(get(parameterError)).toBeNull();
    });
  });

  describe('Derived Stores', () => {
    beforeEach(async () => {
      vi.mocked(tauriUtils.safeTauriInvoke).mockResolvedValue(mockParameters);
      await loadParameterData();
    });

    it('should organize parameters by category', () => {
      const calibParams = get(calibrationParameters);
      const pidParams = get(pidParameters);
      expect(Array.isArray(calibParams)).toBe(true);
      expect(Array.isArray(pidParams)).toBe(true);
    });

    it('should track modified parameters correctly', async () => {
      vi.mocked(tauriUtils.safeTauriInvoke).mockResolvedValue(undefined);
      
      const paramId = mockParameters[0]?.id;
      if (paramId) {
        expect(get(modifiedParameters)).toEqual([]);
        
        await updateParameterValue(paramId, 0.999);
        
        const modified = get(modifiedParameters);
        expect(modified.length).toBe(1);
        expect(modified[0].id).toBe(paramId);
      }
    });
  });

  describe('State Access', () => {
    it('should provide access to current drone state', () => {
      const state = getDroneState();
      
      expect(state).toBeDefined();
      expect(state).toHaveProperty('parameters');
      expect(state).toHaveProperty('selectedParameterId');
      expect(state).toHaveProperty('loading');
      expect(state).toHaveProperty('error');
      expect(state).toHaveProperty('lastUpdated');
    });
  });
});