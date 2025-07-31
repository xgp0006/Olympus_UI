/**
 * Mission planning store implementation
 * Manages mission items and state for the Mission Planner plugin
 * Requirements: 4.2, 4.4, 4.7
 */

import { writable, derived, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import { invokeTauriCommand, safeTauriInvoke } from '../utils/tauri';
import { BoundedArray } from '../utils/bounded-array';
import type { MissionItem, WaypointParams } from '../plugins/mission-planner/types';

/**
 * Mission state interface
 */
interface MissionState {
  items: MissionItem[];
  selectedItemId: string | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number;
}

/**
 * NASA JPL Rule 2: Bounded memory allocation for mission state
 */
const MAX_MISSION_ITEMS = 100; // Aerospace-grade limit
const missionItemsPool = new BoundedArray<MissionItem>(MAX_MISSION_ITEMS);

/**
 * Internal mission state store
 */
const missionState: Writable<MissionState> = writable({
  items: missionItemsPool.toArray(), // NASA JPL Rule 2: Use bounded allocation
  selectedItemId: null,
  loading: false,
  error: null,
  lastUpdated: 0
});

/**
 * Public mission items store
 */
export const missionItems = derived(missionState, ($state) => $state.items);

/**
 * Selected mission item store
 */
export const selectedMissionItem = derived(
  missionState,
  ($state) => $state.items.find((item) => item.id === $state.selectedItemId) || null
);

/**
 * Mission loading state store
 */
export const missionLoading = derived(missionState, ($state) => $state.loading);

/**
 * Mission error state store
 */
export const missionError = derived(missionState, ($state) => $state.error);

/**
 * Mock mission data for browser context fallback
 */
const MOCK_MISSION_DATA: MissionItem[] = [
  {
    id: 'mock-waypoint-1',
    type: 'waypoint',
    sequence: 1,
    lat: 37.7749,
    lng: -122.4194,
    altitude: 100,
    params: {
      hold_time: 5,
      acceptance_radius: 10,
      pass_radius: 5,
      yaw_angle: 0
    },
    name: 'San Francisco Waypoint',
    description: 'Demo waypoint over San Francisco'
  },
  {
    id: 'mock-waypoint-2',
    type: 'waypoint',
    sequence: 2,
    lat: 37.8044,
    lng: -122.2712,
    altitude: 150,
    params: {
      hold_time: 10,
      acceptance_radius: 15,
      pass_radius: 8,
      yaw_angle: 45
    },
    name: 'Oakland Waypoint',
    description: 'Demo waypoint over Oakland'
  },
  {
    id: 'mock-takeoff-1',
    type: 'takeoff',
    sequence: 0,
    lat: 37.7849,
    lng: -122.4094,
    altitude: 50,
    params: {
      min_pitch: 15,
      yaw_angle: 0
    },
    name: 'Mission Takeoff',
    description: 'Takeoff point for the mission'
  },
  {
    id: 'mock-land-1',
    type: 'land',
    sequence: 3,
    lat: 37.7649,
    lng: -122.4294,
    altitude: 0,
    params: {
      abort_alt: 20,
      precision_land: true
    },
    name: 'Mission Landing',
    description: 'Landing point for the mission'
  }
];

/**
 * NASA JPL Rule 4: Split function - Update mission state with data
 */
function updateMissionState(items: MissionItem[], loading: boolean, error: string | null = null): void {
  missionState.update((state) => ({
    ...state,
    items,
    loading,
    error,
    lastUpdated: Date.now()
  }));
}

/**
 * NASA JPL Rule 4: Split function - Load mission data from Tauri backend
 */
async function loadFromTauriBackend(): Promise<MissionItem[] | null> {
  if (!browser || !('__TAURI__' in window)) {
    return null;
  }

  try {
    const items = await safeTauriInvoke<MissionItem[]>('get_mission_data', undefined, {
      showNotification: false,
      suppressConsoleError: true
    });

    if (items && items.length > 0) {
      console.log(`Loaded ${items.length} mission items from backend`);
      return items;
    }
  } catch (error) {
    console.warn('Failed to load from Tauri backend:', error);
  }

  return null;
}

/**
 * Load mission data from backend
 * NASA JPL Rule 4: Function refactored to be ≤60 lines
 * @returns Promise resolving to mission items
 */
export async function loadMissionData(): Promise<MissionItem[]> {
  // Set loading state
  updateMissionState([], true);

  try {
    // Try to load from Tauri backend
    const backendItems = await loadFromTauriBackend();
    
    if (backendItems) {
      updateMissionState(backendItems, false);
      return backendItems;
    }

    // Fall back to mock data
    console.log('Using mock mission data');
    updateMissionState(MOCK_MISSION_DATA, false);
    return MOCK_MISSION_DATA;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load mission data';
    console.warn('Mission data loading failed, falling back to mock data:', errorMessage);

    // Fallback to mock data on error (don't set error when we have fallback)
    updateMissionState(MOCK_MISSION_DATA, false, null);
    return MOCK_MISSION_DATA;
  }
}

/**
 * Update waypoint parameters
 * @param waypointId - ID of the waypoint to update
 * @param params - New waypoint parameters
 */
export async function updateWaypointParams(
  waypointId: string,
  params: WaypointParams
): Promise<void> {
  try {
    await invokeTauriCommand<void>('update_waypoint_params', {
      waypoint_id: waypointId,
      params
    });

    // Update local state
    missionState.update((state) => ({
      ...state,
      items: state.items.map((item) =>
        item.id === waypointId
          ? {
              ...item,
              params: { ...item.params, ...params },
              position:
                params.lat !== undefined && params.lng !== undefined && params.alt !== undefined
                  ? {
                      lat: params.lat,
                      lng: params.lng,
                      alt: params.alt
                    }
                  : item.position
            }
          : item
      ),
      lastUpdated: Date.now()
    }));

    console.log(`Updated waypoint ${waypointId} parameters`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update waypoint';

    missionState.update((state) => ({
      ...state,
      error: errorMessage
    }));

    console.error('Failed to update waypoint params:', error);
    throw error;
  }
}

/**
 * Reorder mission item
 * @param itemId - ID of the item to reorder
 * @param newIndex - New index position
 */
export async function reorderMissionItem(itemId: string, newIndex: number): Promise<void> {
  try {
    await invokeTauriCommand<void>(
      'reorder_mission_item',
      {
        item_id: itemId,
        new_index: newIndex
      },
      {
        showNotification: false // Suppress notification for drag & drop operations
      }
    );

    // Update local state
    missionState.update((state) => {
      const items = [...state.items];
      const currentIndex = items.findIndex((item) => item.id === itemId);

      if (currentIndex !== -1) {
        const [movedItem] = items.splice(currentIndex, 1);
        items.splice(newIndex, 0, movedItem);
      }

      return {
        ...state,
        items,
        lastUpdated: Date.now()
      };
    });

    console.log(`Reordered mission item ${itemId} to index ${newIndex}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to reorder mission item';

    missionState.update((state) => ({
      ...state,
      error: errorMessage
    }));

    console.error('Failed to reorder mission item:', error);
    throw error;
  }
}

/**
 * Select a mission item
 * @param itemId - ID of the item to select, or null to deselect
 */
export function selectMissionItem(itemId: string | null): void {
  missionState.update((state) => ({
    ...state,
    selectedItemId: itemId
  }));

  console.log(`Selected mission item: ${itemId || 'none'}`);
}

/**
 * Add a new mission item
 * @param item - Mission item to add
 */
export function addMissionItem(item: MissionItem): void {
  missionState.update((state) => ({
    ...state,
    items: [...state.items, item],
    lastUpdated: Date.now()
  }));

  console.log(`Added mission item: ${item.id}`);
}

/**
 * Remove a mission item
 * @param itemId - ID of the item to remove
 */
export function removeMissionItem(itemId: string): void {
  missionState.update((state) => ({
    ...state,
    items: state.items.filter((item) => item.id !== itemId),
    selectedItemId: state.selectedItemId === itemId ? null : state.selectedItemId,
    lastUpdated: Date.now()
  }));

  console.log(`Removed mission item: ${itemId}`);
}

/**
 * Update a mission item
 * @param itemId - ID of the item to update
 * @param updates - Updates to apply to the item
 */
export async function updateMissionItem(itemId: string, updates: Partial<MissionItem>): Promise<void> {
  try {
    // Update local state optimistically
    missionState.update((state) => ({
      ...state,
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
      lastUpdated: Date.now()
    }));

    // Sync with backend if available
    await invokeTauriCommand<void>('update_mission_item', {
      item_id: itemId,
      updates
    });

    console.log(`Updated mission item: ${itemId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update mission item';
    
    missionState.update((state) => ({
      ...state,
      error: errorMessage
    }));

    console.error('Failed to update mission item:', error);
    throw error;
  }
}

/**
 * Delete a mission item (alias for removeMissionItem for consistency)
 * @param itemId - ID of the item to delete
 */
export async function deleteMissionItem(itemId: string): Promise<void> {
  removeMissionItem(itemId);
  
  try {
    // Sync with backend if available
    await invokeTauriCommand<void>('delete_mission_item', {
      item_id: itemId
    });
  } catch (error) {
    console.warn('Failed to sync deletion with backend:', error);
    // Don't throw - we already updated local state
  }
}

/**
 * Clear mission error state
 */
export function clearMissionError(): void {
  missionState.update((state) => ({
    ...state,
    error: null
  }));
}

/**
 * Save mission to backend
 * @param missionName - Name for the mission
 * @returns Promise resolving to saved mission ID
 */
export async function saveMission(missionName: string): Promise<string> {
  const state = getMissionState();

  try {
    const missionId = await invokeTauriCommand<string>('save_mission', {
      name: missionName,
      items: state.items
    });

    console.log(`Saved mission "${missionName}" with ID: ${missionId}`);
    return missionId;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save mission';

    missionState.update((currentState) => ({
      ...currentState,
      error: errorMessage
    }));

    console.error('Failed to save mission:', error);
    throw error;
  }
}

/**
 * Load mission from backend by ID
 * @param missionId - ID of the mission to load
 * @returns Promise resolving to mission items
 */
export async function loadMissionById(missionId: string): Promise<MissionItem[]> {
  missionState.update((state) => ({
    ...state,
    loading: true,
    error: null
  }));

  try {
    const mission = await invokeTauriCommand<{ id: string; name: string; items: MissionItem[] }>(
      'load_mission_by_id',
      { mission_id: missionId }
    );

    missionState.update((state) => ({
      ...state,
      items: mission.items || [],
      loading: false,
      lastUpdated: Date.now()
    }));

    console.log(`Loaded mission "${mission.name}" with ${mission.items?.length || 0} items`);
    return mission.items || [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load mission';

    missionState.update((state) => ({
      ...state,
      loading: false,
      error: errorMessage
    }));

    console.error('Failed to load mission by ID:', error);
    throw error;
  }
}

/**
 * Get list of saved missions
 * @returns Promise resolving to array of mission metadata
 */
export async function getMissionList(): Promise<
  Array<{ id: string; name: string; created_at: string; updated_at: string }>
> {
  try {
    const missions =
      await invokeTauriCommand<
        Array<{ id: string; name: string; created_at: string; updated_at: string }>
      >('get_mission_list');

    console.log(`Retrieved ${missions.length} saved missions`);
    return missions;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get mission list';

    missionState.update((state) => ({
      ...state,
      error: errorMessage
    }));

    console.error('Failed to get mission list:', error);
    throw error;
  }
}

/**
 * Delete mission from backend
 * @param missionId - ID of the mission to delete
 */
export async function deleteMission(missionId: string): Promise<void> {
  try {
    await invokeTauriCommand<void>('delete_mission', {
      mission_id: missionId
    });

    console.log(`Deleted mission with ID: ${missionId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete mission';

    missionState.update((state) => ({
      ...state,
      error: errorMessage
    }));

    console.error('Failed to delete mission:', error);
    throw error;
  }
}

/**
 * Create a new mission item with proper defaults
 * @param type - Type of mission item
 * @param position - Position for the item
 * @param name - Optional name for the item
 * @returns New mission item
 */
export function createMissionItem(
  type: MissionItem['type'],
  position: { lat: number; lng: number; alt: number },
  name?: string
): MissionItem {
  const id = `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  const defaultParams: WaypointParams = {
    lat: position.lat,
    lng: position.lng,
    alt: position.alt,
    speed: type === 'takeoff' ? 5 : type === 'land' ? 3 : 10
  };

  // Add type-specific defaults
  if (type === 'loiter') {
    defaultParams.action = 'loiter';
  }

  return {
    id,
    type,
    name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${id.split('-')[1]}`,
    params: defaultParams,
    position: {
      lat: position.lat,
      lng: position.lng,
      alt: position.alt
    }
  };
}

/**
 * Validate mission sequence for MAVLINK compatibility
 * NASA JPL Rule 2: Bounded memory - limit validation arrays
 * @param items - Mission items to validate
 * @returns Validation result with errors if any
 */
/**
 * NASA JPL Rule 4: Split function - Validate mission endpoints
 */
function validateMissionEndpoints(
  items: MissionItem[],
  errors: BoundedArray<string>,
  warnings: BoundedArray<string>
): void {
  if (items.length === 0) {
    warnings.push('Mission is empty');
    return;
  }

  // Check for required takeoff at start
  if (items[0].type !== 'takeoff') {
    errors.push('Mission must start with a takeoff item');
  }

  // Check for landing at end
  if (items[items.length - 1].type !== 'land') {
    warnings.push('Mission should end with a landing item');
  }
}

/**
 * NASA JPL Rule 4: Split function - Validate item coordinates
 */
function validateItemCoordinates(
  item: MissionItem,
  index: number,
  errors: BoundedArray<string>
): void {
  // Check altitude
  if (item.params.alt !== undefined && item.params.alt < 0) {
    errors.push(`Item ${index + 1} (${item.name}) has negative altitude`);
  }

  // Check coordinates
  if (item.params.lat !== undefined && Math.abs(item.params.lat) > 90) {
    errors.push(`Item ${index + 1} (${item.name}) has invalid latitude: ${item.params.lat}`);
  }
  if (item.params.lng !== undefined && Math.abs(item.params.lng) > 180) {
    errors.push(`Item ${index + 1} (${item.name}) has invalid longitude: ${item.params.lng}`);
  }
}

/**
 * NASA JPL Rule 4: Split function - Validate altitude progression
 */
function validateAltitudeProgression(
  items: MissionItem[],
  warnings: BoundedArray<string>
): void {
  for (let i = 1; i < items.length; i++) {
    const current = items[i];
    const previous = items[i - 1];

    if (current.params.alt !== undefined && previous.params.alt !== undefined) {
      const altitudeDiff = Math.abs(current.params.alt - previous.params.alt);
      if (altitudeDiff > 200) {
        warnings.push(`Large altitude change (${altitudeDiff}m) between items ${i} and ${i + 1}`);
      }
    }
  }
}

export function validateMissionSequence(items: MissionItem[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const MAX_ERRORS = 100; // NASA JPL Rule 2: Bounded memory
  const MAX_WARNINGS = 50; // NASA JPL Rule 2: Bounded memory
  
  const errors = new BoundedArray<string>(MAX_ERRORS);
  const warnings = new BoundedArray<string>(MAX_WARNINGS);

  // Validate mission endpoints
  validateMissionEndpoints(items, errors, warnings);

  // Validate each item's coordinates
  items.forEach((item, index) => {
    validateItemCoordinates(item, index, errors);
  });

  // Validate altitude progression
  validateAltitudeProgression(items, warnings);

  return {
    valid: errors.length === 0,
    errors: errors.getAll(),
    warnings: warnings.getAll()
  };
}

/**
 * Set mission items directly (for reordering operations)
 * @param items - Mission items to set
 */
export function setMissionItems(items: MissionItem[]): void {
  missionState.update((state) => ({
    ...state,
    items,
    lastUpdated: Date.now()
  }));

  console.log(`Set ${items.length} mission items`);
}

/**
 * Get current mission state (for testing/debugging)
 */
export function getMissionState(): MissionState {
  let state: MissionState | undefined;
  const unsubscribe = missionState.subscribe((s) => (state = s));
  unsubscribe();
  return state!;
}

// Export the mission state store for advanced use cases
export { missionState };
