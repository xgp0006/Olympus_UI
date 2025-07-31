/**
 * Drone parameters store for managing configuration values
 * Follows mission.ts store pattern with aerospace-grade safety
 * Integrates with calibration system and parameter persistence
 */

import { writable, derived, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import { safeTauriInvoke as safeInvoke } from '$lib/utils/tauri';
import { showNotification } from '$lib/stores/notifications';
import { BoundedArray } from '$lib/utils/bounded-array';
import type { DroneParameter } from '../types/drone-types';
import { ParameterType } from '../types/drone-types';


/**
 * Parameter store state - following mission.ts pattern
 */
interface DroneState {
  parameters: DroneParameter[];
  selectedParameterId: string | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number;
}

/**
 * NASA JPL Rule 2: Bounded arrays for parameters
 */
const MAX_PARAMETERS = 500; // Aerospace-grade limit
const parametersPool = new BoundedArray<DroneParameter>(MAX_PARAMETERS);

/**
 * Mock parameter data for development/fallback
 */
const MOCK_PARAMETERS: DroneParameter[] = [
  {
    id: 'INS_ACCOFFS_X_0',
    name: 'INS_ACCOFFS_X',
    value: 0,
    type: ParameterType.FLOAT,
    index: 0,
    lastUpdated: Date.now(),
    isDirty: false,
    isModified: false,
    // Direct access properties
    group: 'Calibration',
    advanced: false,
    description: 'Accelerometer X-axis offset',
    min: -3.5,
    max: 3.5,
    increment: 0.01,
    units: 'm/s²'
  },
  {
    id: 'MOT_PWM_MIN_1',
    name: 'MOT_PWM_MIN',
    value: 1000,
    type: ParameterType.INT16,
    index: 1,
    lastUpdated: Date.now(),
    isDirty: false,
    isModified: false,
    // Direct access properties
    group: 'Motors',
    advanced: false,
    description: 'Minimum PWM value sent to ESCs',
    min: 800,
    max: 1300,
    increment: 1,
    units: 'µs'
  },
  {
    id: 'RC1_TRIM_2',
    name: 'RC1_TRIM',
    value: 1500,
    type: ParameterType.INT16,
    index: 2,
    lastUpdated: Date.now(),
    isDirty: false,
    isModified: false,
    // Direct access properties
    group: 'Radio Control',
    advanced: false,
    description: 'Roll channel center/trim position',
    min: 800,
    max: 2200,
    increment: 1,
    units: 'µs'
  }
];

/**
 * Internal drone state store with bounded allocations
 */
const droneState: Writable<DroneState> = writable({
  parameters: parametersPool.toArray(), // NASA JPL Rule 2: Bounded
  selectedParameterId: null,
  loading: false,
  error: null,
  lastUpdated: 0
});

/**
 * Public parameter store - exposes only the parameters array
 */
export const droneParameters = derived(droneState, ($state) => $state.parameters);

/**
 * Selected parameter store
 */
export const selectedParameter = derived(
  droneState,
  ($state) => $state.parameters.find((param) => param.id === $state.selectedParameterId) || null
);

/**
 * Parameter loading state store
 */
export const parameterLoading = derived(droneState, ($state) => $state.loading);

/**
 * Parameter error state store
 */
export const parameterError = derived(droneState, ($state) => $state.error);

/**
 * NASA JPL Rule 4: Split function - Update parameter state with data
 */
function updateParameterState(parameters: DroneParameter[], loading: boolean, error: string | null = null): void {
  droneState.update((state) => ({
    ...state,
    parameters,
    loading,
    error,
    lastUpdated: Date.now()
  }));
}

/**
 * NASA JPL Rule 4: Split function - Load parameters from Tauri backend
 */
async function loadFromTauriBackend(): Promise<DroneParameter[] | null> {
  if (!browser || !('__TAURI__' in window)) {
    return null;
  }

  try {
    const params = await safeInvoke<Array<{
      id: string;
      value: number;
      type: ParameterType;
    }>>('get_all_parameters');

    if (params && params.length > 0) {
      console.log(`Loaded ${params.length} parameters from backend`);
      // Transform to DroneParameter format
      return params.map((p, index) => ({
        id: `${p.id}_${index}`,
        name: p.id,
        value: p.value,
        type: p.type,
        index: index,
        lastUpdated: Date.now(),
        isDirty: false,
        isModified: false,
        // Direct access properties
        group: 'Miscellaneous',
        advanced: false,
        description: 'Drone parameter loaded from backend'
      }));
    }
  } catch (error) {
    console.warn('Failed to load from Tauri backend:', error);
  }

  return null;
}

/**
 * Load parameter data from backend
 * NASA JPL Rule 4: Function refactored to be ≤60 lines
 * @returns Promise resolving to parameters
 */
export async function loadParameterData(): Promise<DroneParameter[]> {
  // Set loading state
  updateParameterState([], true);

  try {
    // Try to load from Tauri backend
    const backendParams = await loadFromTauriBackend();
    
    if (backendParams) {
      // Clear and repopulate bounded array
      parametersPool.clear();
      backendParams.forEach(p => parametersPool.push(p));
      
      updateParameterState(parametersPool.toArray(), false);
      return backendParams;
    }

    // Fall back to mock data
    console.log('Using mock parameter data');
    parametersPool.clear();
    MOCK_PARAMETERS.forEach(p => parametersPool.push(p));
    
    updateParameterState(MOCK_PARAMETERS, false);
    return MOCK_PARAMETERS;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load parameter data';
    console.warn('Parameter data loading failed, falling back to mock data:', errorMessage);

    // Fallback to mock data on error (don't set error when we have fallback)
    parametersPool.clear();
    MOCK_PARAMETERS.forEach(p => parametersPool.push(p));
    
    updateParameterState(MOCK_PARAMETERS, false, null);
    return MOCK_PARAMETERS;
  }
}

/**
 * Update parameter value
 * @param parameterId - ID of the parameter to update
 * @param value - New value
 */
export async function updateParameterValue(
  parameterId: string,
  value: number
): Promise<void> {
  try {
    await safeInvoke<void>('set_parameter', {
      id: parameterId,
      value
    });

    // Update local state
    droneState.update((state) => ({
      ...state,
      parameters: state.parameters.map((param) =>
        param.id === parameterId
          ? {
              ...param,
              value,
              modified: true,
              lastSync: Date.now()
            }
          : param
      ),
      lastUpdated: Date.now()
    }));

    console.log(`Updated parameter ${parameterId} to ${value}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update parameter';

    droneState.update((state) => ({
      ...state,
      error: errorMessage
    }));

    console.error('Failed to update parameter:', error);
    throw error;
  }
}

/**
 * Select a parameter
 * @param parameterId - ID of the parameter to select, or null to deselect
 */
export function selectParameter(parameterId: string | null): void {
  droneState.update((state) => ({
    ...state,
    selectedParameterId: parameterId
  }));

  console.log(`Selected parameter: ${parameterId || 'none'}`);
}

/**
 * Clear parameter error state
 */
export function clearParameterError(): void {
  droneState.update((state) => ({
    ...state,
    error: null
  }));
}

/**
 * Save parameters to file
 * @returns Promise resolving to saved file path
 */
export async function saveParameters(): Promise<string> {
  const state = getDroneState();

  try {
    const filePath = await safeInvoke<string>('save_parameters', {
      parameters: state.parameters
    });

    if (!filePath) {
      throw new Error('No file path returned from backend');
    }

    console.log(`Saved parameters to: ${filePath}`);
    return filePath;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save parameters';

    droneState.update((currentState) => ({
      ...currentState,
      error: errorMessage
    }));

    console.error('Failed to save parameters:', error);
    throw error;
  }
}

/**
 * Get current drone state (for testing/debugging)
 */
export function getDroneState(): DroneState {
  let state: DroneState | undefined;
  const unsubscribe = droneState.subscribe((s) => (state = s));
  unsubscribe();
  return state!;
}

/**
 * Derived stores for specific parameter groups
 */
export const calibrationParameters = derived(
  droneState,
  $state => $state.parameters.filter(p => p.group === 'Calibration')
);

export const pidParameters = derived(
  droneState,
  $state => $state.parameters.filter(p => p.group === 'PID')
);

export const modifiedParameters = derived(
  droneState,
  $state => $state.parameters.filter(p => p.isModified)
);

export const parametersByGroup = derived(
  droneState,
  $state => {
    const groups = new Map<string, DroneParameter[]>();
    
    $state.parameters.forEach(param => {
      const group = param.group || 'Miscellaneous';
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(param);
    });
    
    return groups;
  }
);

// Export the drone state store for advanced use cases
export { droneState };

// Convenience store for selected parameter writable access
export const selectedParameterWritable = {
  subscribe: selectedParameter.subscribe,
  set: selectParameter,
  update: (updater: (value: string | null) => string | null) => {
    let currentValue: string | null = null;
    const unsubscribe = selectedParameter.subscribe((param) => {
      currentValue = param?.id || null;
    });
    unsubscribe();

    const newValue = updater(currentValue);
    selectParameter(newValue);
  }
};

/**
 * Main parameter store object with methods (for component compatibility)
 */
export const droneParameterStore = {
  subscribe: droneState.subscribe,
  setParameter: updateParameterValue,
  loadParameters: loadParameterData,
  saveParameters,
  selectParameter,
  clearError: clearParameterError
};

/**
 * Legacy export for test compatibility (plural form)
 */
export const droneParametersStore = droneParameterStore;

// Export aliases for backward compatibility
export const parameterGroups = parametersByGroup;
export const flightModeParameters = pidParameters;