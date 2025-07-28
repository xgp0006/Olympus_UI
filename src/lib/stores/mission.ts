/**
 * Mission planning store implementation
 * Manages mission items and state for the Mission Planner plugin
 * Requirements: 4.2, 4.4, 4.7
 */

import { writable, derived, type Writable } from 'svelte/store';
import { invokeTauriCommand } from '../utils/tauri';
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
 * Internal mission state store
 */
const missionState: Writable<MissionState> = writable({
  items: [],
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
 * Load mission data from backend
 * @returns Promise resolving to mission items
 */
export async function loadMissionData(): Promise<MissionItem[]> {
  missionState.update((state) => ({
    ...state,
    loading: true,
    error: null
  }));

  try {
    const items = await invokeTauriCommand<MissionItem[]>('get_mission_data');

    missionState.update((state) => ({
      ...state,
      items: items || [],
      loading: false,
      lastUpdated: Date.now()
    }));

    console.log(`Loaded ${items?.length || 0} mission items`);
    return items || [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load mission data';

    missionState.update((state) => ({
      ...state,
      loading: false,
      error: errorMessage
    }));

    console.error('Failed to load mission data:', error);
    throw error;
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
              position: {
                lat: params.lat,
                lng: params.lng,
                alt: params.alt
              }
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
    await invokeTauriCommand<void>('reorder_mission_item', {
      item_id: itemId,
      new_index: newIndex
    });

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
 * @param items - Mission items to validate
 * @returns Validation result with errors if any
 */
export function validateMissionSequence(items: MissionItem[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (items.length === 0) {
    warnings.push('Mission is empty');
    return { valid: true, errors, warnings };
  }

  // Check for required takeoff at start
  if (items[0].type !== 'takeoff') {
    errors.push('Mission must start with a takeoff item');
  }

  // Check for landing at end
  if (items[items.length - 1].type !== 'land') {
    warnings.push('Mission should end with a landing item');
  }

  // Validate coordinates and altitude for all items
  items.forEach((item, index) => {
    // Check altitude
    if (item.params.alt < 0) {
      errors.push(`Item ${index + 1} (${item.name}) has negative altitude`);
    }

    // Check coordinates
    if (Math.abs(item.params.lat) > 90) {
      errors.push(`Item ${index + 1} (${item.name}) has invalid latitude: ${item.params.lat}`);
    }
    if (Math.abs(item.params.lng) > 180) {
      errors.push(`Item ${index + 1} (${item.name}) has invalid longitude: ${item.params.lng}`);
    }
  });

  // Validate altitude progression between items
  for (let i = 1; i < items.length; i++) {
    const current = items[i];
    const previous = items[i - 1];

    // Check for reasonable altitude changes
    const altitudeDiff = Math.abs(current.params.alt - previous.params.alt);
    if (altitudeDiff > 200) {
      warnings.push(`Large altitude change (${altitudeDiff}m) between items ${i} and ${i + 1}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
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
