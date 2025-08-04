/**
 * Mission planning store implementation
 * Manages mission items and state for the Mission Planner plugin
 * Requirements: 4.2, 4.4, 4.7
 */

import { writable, derived, type Writable } from 'svelte/store';
import { browser } from '$app/environment';

import {
  assert,
  assertParam,
  assertDefined,
  assertState,
  assertBounds,
  assertArrayBounds,
  assertInvariant,
  assertRange,
  assertPositive,
  assertFinite,
  assertString,
  assertArray,
  AssertionCategory,
  AssertionErrorCode,
  NUMERIC_CONSTANTS
} from '../utils/assert';
import { BoundedArray } from '../utils/bounded-array';
import { executeCommand } from '../utils/connection-manager';
import { invokeTauriCommand, safeTauriInvoke } from '../utils/tauri';

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
 * Mission validation constants
 * NASA JPL Rule 5: All parameters must have validation bounds
 */
const MISSION_LIMITS = {
  // Coordinate bounds (WGS84 standard)
  MIN_LATITUDE: -90.0,
  MAX_LATITUDE: 90.0,
  MIN_LONGITUDE: -180.0,
  MAX_LONGITUDE: 180.0,

  // Altitude bounds (meters) - safety limits for civilian drones
  MIN_ALTITUDE: 0,
  MAX_ALTITUDE: 500, // 500m safety ceiling
  MAX_ALTITUDE_CHANGE: 200, // Max altitude change between waypoints

  // Distance limits (meters)
  MIN_WAYPOINT_DISTANCE: 1, // Minimum 1m between waypoints
  MAX_WAYPOINT_DISTANCE: 10000, // Maximum 10km between waypoints
  MAX_TOTAL_DISTANCE: 50000, // Maximum 50km total mission distance

  // Speed limits (m/s)
  MIN_SPEED: 0.1,
  MAX_SPEED: 30, // 30 m/s = 108 km/h safety limit

  // Time limits
  MIN_HOLD_TIME: 0,
  MAX_HOLD_TIME: 300, // 5 minutes max hold

  // Radius limits (meters)
  MIN_RADIUS: 0.1,
  MAX_ACCEPTANCE_RADIUS: 100,
  MAX_PASS_RADIUS: 50,

  // Angle limits (degrees)
  MIN_YAW: -180,
  MAX_YAW: 180,
  MIN_PITCH: -90,
  MAX_PITCH: 90,

  // String limits
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,

  // Sequence limits
  MIN_SEQUENCE: 0,
  MAX_SEQUENCE: MAX_MISSION_ITEMS - 1
} as const;

/**
 * Validate coordinate values
 * NASA JPL Rule 5: Runtime validation of all inputs
 */
function validateCoordinate(lat: number, lng: number, context?: string): void {
  const ctx = context ? `${context}: ` : '';

  // Validate latitude
  assertFinite(lat, `${ctx}Latitude must be finite`);
  assertRange(
    lat,
    MISSION_LIMITS.MIN_LATITUDE,
    MISSION_LIMITS.MAX_LATITUDE,
    `${ctx}Latitude ${lat} out of valid range [-90, 90]`
  );

  // Validate longitude
  assertFinite(lng, `${ctx}Longitude must be finite`);
  assertRange(
    lng,
    MISSION_LIMITS.MIN_LONGITUDE,
    MISSION_LIMITS.MAX_LONGITUDE,
    `${ctx}Longitude ${lng} out of valid range [-180, 180]`
  );
}

/**
 * Validate altitude value
 * NASA JPL Rule 5: Safety-critical altitude validation
 */
function validateAltitude(altitude: number, context?: string): void {
  const ctx = context ? `${context}: ` : '';

  assertFinite(altitude, `${ctx}Altitude must be finite`);
  assertRange(
    altitude,
    MISSION_LIMITS.MIN_ALTITUDE,
    MISSION_LIMITS.MAX_ALTITUDE,
    `${ctx}Altitude ${altitude}m exceeds safety limits [0, 500m]`
  );
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * NASA JPL Rule 4: Function ≤60 lines
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Validate waypoint distance constraints
 * NASA JPL Rule 5: Distance validation between waypoints
 */
function validateWaypointDistance(item1: MissionItem, item2: MissionItem, context?: string): void {
  if (!item1.params.lat || !item1.params.lng || !item2.params.lat || !item2.params.lng) {
    return; // Skip validation if coordinates missing
  }

  const distance = calculateDistance(
    item1.params.lat,
    item1.params.lng,
    item2.params.lat,
    item2.params.lng
  );

  const ctx = context ? `${context}: ` : '';

  assert(
    distance >= MISSION_LIMITS.MIN_WAYPOINT_DISTANCE,
    `${ctx}Waypoints too close: ${distance.toFixed(1)}m < ${MISSION_LIMITS.MIN_WAYPOINT_DISTANCE}m`,
    AssertionCategory.BOUNDS,
    AssertionErrorCode.BOUNDS_UNDERFLOW,
    { distance, min: MISSION_LIMITS.MIN_WAYPOINT_DISTANCE }
  );

  assert(
    distance <= MISSION_LIMITS.MAX_WAYPOINT_DISTANCE,
    `${ctx}Waypoints too far: ${distance.toFixed(1)}m > ${MISSION_LIMITS.MAX_WAYPOINT_DISTANCE}m`,
    AssertionCategory.BOUNDS,
    AssertionErrorCode.BOUNDS_OVERFLOW,
    { distance, max: MISSION_LIMITS.MAX_WAYPOINT_DISTANCE }
  );
}

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
 * NASA JPL Rule 5: Consistent data structure with proper validation
 */
const MOCK_MISSION_DATA: MissionItem[] = [
  {
    id: 'mock-takeoff-1',
    type: 'takeoff',
    sequence: 0,
    lat: 37.7849,
    lng: -122.4094,
    altitude: 50,
    params: {
      lat: 37.7849,
      lng: -122.4094,
      alt: 50,
      speed: 5,
      min_pitch: 15,
      yaw_angle: 0
    },
    position: {
      lat: 37.7849,
      lng: -122.4094,
      alt: 50
    },
    name: 'Mission Takeoff',
    description: 'Takeoff point for the mission'
  },
  {
    id: 'mock-waypoint-1',
    type: 'waypoint',
    sequence: 1,
    lat: 37.7749,
    lng: -122.4194,
    altitude: 100,
    params: {
      lat: 37.7749,
      lng: -122.4194,
      alt: 100,
      speed: 10,
      hold_time: 5,
      acceptance_radius: 10,
      pass_radius: 5,
      yaw_angle: 0
    },
    position: {
      lat: 37.7749,
      lng: -122.4194,
      alt: 100
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
      lat: 37.8044,
      lng: -122.2712,
      alt: 150,
      speed: 10,
      hold_time: 10,
      acceptance_radius: 15,
      pass_radius: 8,
      yaw_angle: 45
    },
    position: {
      lat: 37.8044,
      lng: -122.2712,
      alt: 150
    },
    name: 'Oakland Waypoint',
    description: 'Demo waypoint over Oakland'
  },
  {
    id: 'mock-land-1',
    type: 'land',
    sequence: 3,
    lat: 37.7649,
    lng: -122.4294,
    altitude: 0,
    params: {
      lat: 37.7649,
      lng: -122.4294,
      alt: 0,
      speed: 3,
      abort_alt: 20,
      precision_land: true
    },
    position: {
      lat: 37.7649,
      lng: -122.4294,
      alt: 0
    },
    name: 'Mission Landing',
    description: 'Landing point for the mission'
  }
];

/**
 * NASA JPL Rule 4: Split function - Update mission state with data
 */
function updateMissionState(
  items: MissionItem[],
  loading: boolean,
  error: string | null = null
): void {
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
 * Validate waypoint parameters
 * NASA JPL Rule 5: Comprehensive parameter validation
 */
function validateWaypointParams(params: WaypointParams, context?: string): void {
  const ctx = context ? `${context}: ` : '';

  // Validate coordinates if present
  if (params.lat !== undefined && params.lng !== undefined) {
    validateCoordinate(params.lat, params.lng, ctx);
  }

  // Validate altitude if present
  if (params.alt !== undefined) {
    validateAltitude(params.alt, ctx);
  }

  // Validate speed if present
  if (params.speed !== undefined) {
    assertFinite(params.speed, `${ctx}Speed must be finite`);
    assertRange(
      params.speed,
      MISSION_LIMITS.MIN_SPEED,
      MISSION_LIMITS.MAX_SPEED,
      `${ctx}Speed ${params.speed}m/s out of range [${MISSION_LIMITS.MIN_SPEED}, ${MISSION_LIMITS.MAX_SPEED}]`
    );
  }

  // Validate hold time if present
  if (params.hold_time !== undefined) {
    assertFinite(params.hold_time, `${ctx}Hold time must be finite`);
    assertRange(
      params.hold_time,
      MISSION_LIMITS.MIN_HOLD_TIME,
      MISSION_LIMITS.MAX_HOLD_TIME,
      `${ctx}Hold time ${params.hold_time}s out of range [0, ${MISSION_LIMITS.MAX_HOLD_TIME}]`
    );
  }

  // Validate radius parameters
  if (params.acceptance_radius !== undefined) {
    assertPositive(params.acceptance_radius, `${ctx}Acceptance radius must be positive`);
    assert(
      params.acceptance_radius <= MISSION_LIMITS.MAX_ACCEPTANCE_RADIUS,
      `${ctx}Acceptance radius ${params.acceptance_radius}m > max ${MISSION_LIMITS.MAX_ACCEPTANCE_RADIUS}m`,
      AssertionCategory.BOUNDS,
      AssertionErrorCode.BOUNDS_OVERFLOW
    );
  }

  if (params.pass_radius !== undefined) {
    assertPositive(params.pass_radius, `${ctx}Pass radius must be positive`);
    assert(
      params.pass_radius <= MISSION_LIMITS.MAX_PASS_RADIUS,
      `${ctx}Pass radius ${params.pass_radius}m > max ${MISSION_LIMITS.MAX_PASS_RADIUS}m`,
      AssertionCategory.BOUNDS,
      AssertionErrorCode.BOUNDS_OVERFLOW
    );
  }

  // Validate angles
  if (params.yaw_angle !== undefined) {
    assertFinite(params.yaw_angle, `${ctx}Yaw angle must be finite`);
    assertRange(
      params.yaw_angle,
      MISSION_LIMITS.MIN_YAW,
      MISSION_LIMITS.MAX_YAW,
      `${ctx}Yaw angle ${params.yaw_angle}° out of range [-180, 180]`
    );
  }

  if (params.min_pitch !== undefined) {
    assertFinite(params.min_pitch, `${ctx}Min pitch must be finite`);
    assertRange(
      params.min_pitch,
      MISSION_LIMITS.MIN_PITCH,
      MISSION_LIMITS.MAX_PITCH,
      `${ctx}Min pitch ${params.min_pitch}° out of range [-90, 90]`
    );
  }

  // Validate abort altitude
  if (params.abort_alt !== undefined) {
    assertFinite(params.abort_alt, `${ctx}Abort altitude must be finite`);
    assertPositive(params.abort_alt, `${ctx}Abort altitude must be positive`);
    assert(
      params.abort_alt <= MISSION_LIMITS.MAX_ALTITUDE,
      `${ctx}Abort altitude ${params.abort_alt}m > max ${MISSION_LIMITS.MAX_ALTITUDE}m`,
      AssertionCategory.BOUNDS,
      AssertionErrorCode.BOUNDS_OVERFLOW
    );
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
  // NASA JPL Rule 5: Validate all inputs
  assertString(waypointId, 1, undefined, undefined);
  assertDefined(params, 'Waypoint parameters required');
  validateWaypointParams(params, 'updateWaypointParams');

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
 * Validate mission item
 * NASA JPL Rule 5: Complete mission item validation
 */
function validateMissionItem(item: MissionItem, context?: string): void {
  const ctx = context ? `${context}: ` : '';

  // Validate required fields
  assertString(item.id, 1, undefined, undefined);
  assertString(item.name, 1, MISSION_LIMITS.MAX_NAME_LENGTH, undefined);
  assert(
    ['takeoff', 'waypoint', 'loiter', 'land'].includes(item.type),
    `${ctx}Invalid mission item type: ${item.type}`,
    AssertionCategory.PARAMETER,
    AssertionErrorCode.PARAM_INVALID_FORMAT
  );

  // Validate optional description
  if (item.description !== undefined) {
    assertString(item.description, 0, MISSION_LIMITS.MAX_DESCRIPTION_LENGTH, undefined);
  }

  // Validate sequence if present
  if (item.sequence !== undefined) {
    assertBounds(
      item.sequence,
      MISSION_LIMITS.MIN_SEQUENCE,
      MISSION_LIMITS.MAX_SEQUENCE + 1,
      `${ctx}Sequence number out of bounds`
    );
  }

  // Validate parameters
  assertDefined(item.params, `${ctx}Mission item parameters required`);
  validateWaypointParams(item.params, `${ctx}${item.name}`);

  // Validate legacy coordinate fields
  if (item.lat !== undefined && item.lng !== undefined) {
    validateCoordinate(item.lat, item.lng, `${ctx}Legacy coords`);
  }
  if (item.altitude !== undefined) {
    validateAltitude(item.altitude, `${ctx}Legacy altitude`);
  }

  // Type-specific validation
  switch (item.type) {
    case 'takeoff':
      assert(
        item.params.alt !== undefined && item.params.alt > 0,
        `${ctx}Takeoff altitude must be positive`,
        AssertionCategory.PARAMETER,
        AssertionErrorCode.PARAM_OUT_OF_RANGE
      );
      break;

    case 'land':
      assert(
        item.params.alt === undefined || item.params.alt === 0,
        `${ctx}Landing altitude must be 0`,
        AssertionCategory.PARAMETER,
        AssertionErrorCode.PARAM_OUT_OF_RANGE
      );
      break;

    case 'loiter':
      assert(
        item.params.hold_time !== undefined && item.params.hold_time > 0,
        `${ctx}Loiter requires positive hold time`,
        AssertionCategory.PARAMETER,
        AssertionErrorCode.PARAM_MISSING
      );
      break;
  }
}

/**
 * Reorder mission item
 * @param itemId - ID of the item to reorder
 * @param newIndex - New index position
 */
export async function reorderMissionItem(itemId: string, newIndex: number): Promise<void> {
  // NASA JPL Rule 5: Validate inputs
  assertString(itemId, 1, undefined, undefined);
  assertBounds(newIndex, 0, MAX_MISSION_ITEMS, 'New index out of bounds');

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
export async function selectMissionItem(itemId: string | null): Promise<void> {
  try {
    // Update local state
    missionState.update((state) => ({
      ...state,
      selectedItemId: itemId
    }));

    // Sync with backend if available
    if (browser) {
      await executeCommand('select_mission_item', { itemId });
    }

    console.log(`Selected mission item: ${itemId || 'none'}`);
  } catch (error) {
    console.error('Failed to select mission item:', error);
    // Don't throw - selection is not critical
  }
}

/**
 * Add a new mission item
 * @param item - Mission item to add
 */
export async function addMissionItem(item: MissionItem): Promise<void> {
  // NASA JPL Rule 5: Validate mission item
  assertDefined(item, 'Mission item required');
  validateMissionItem(item, 'addMissionItem');

  try {
    // Check mission size limit
    const currentState = getMissionState();
    assert(
      currentState.items.length < MAX_MISSION_ITEMS,
      `Mission full: ${currentState.items.length} >= ${MAX_MISSION_ITEMS}`,
      AssertionCategory.BOUNDS,
      AssertionErrorCode.BOUNDS_SIZE_LIMIT,
      { current: currentState.items.length, max: MAX_MISSION_ITEMS }
    );

    // Validate sequence integrity if sequence is set
    if (item.sequence !== undefined) {
      const existingSequence = currentState.items.find((i) => i.sequence === item.sequence);
      assert(
        !existingSequence,
        `Duplicate sequence number: ${item.sequence}`,
        AssertionCategory.STATE,
        AssertionErrorCode.STATE_INVALID,
        { sequence: item.sequence }
      );
    }

    // Validate distance from previous waypoint
    if (currentState.items.length > 0) {
      const lastItem = currentState.items[currentState.items.length - 1];
      if (lastItem.params.lat && lastItem.params.lng && item.params.lat && item.params.lng) {
        validateWaypointDistance(lastItem, item, 'Distance from last waypoint');
      }
    }

    // Update local state optimistically
    missionState.update((state) => ({
      ...state,
      items: [...state.items, item],
      lastUpdated: Date.now()
    }));

    // Sync with backend if available
    if (browser) {
      await executeCommand('add_mission_item', { item });
    }

    console.log(`Added mission item: ${item.id}`);
  } catch (error) {
    // Rollback on error
    missionState.update((state) => ({
      ...state,
      items: state.items.filter((i) => i.id !== item.id),
      error: 'Failed to add mission item'
    }));
    console.error('Failed to add mission item:', error);
    throw error;
  }
}

/**
 * Remove a mission item
 * @param itemId - ID of the item to remove
 */
export async function removeMissionItem(itemId: string): Promise<void> {
  // NASA JPL Rule 5: Validate input
  assertString(itemId, 1, undefined, undefined);

  // Store item for potential rollback
  let removedItem: MissionItem | undefined;

  try {
    // Update local state optimistically
    missionState.update((state) => {
      removedItem = state.items.find((item) => item.id === itemId);
      return {
        ...state,
        items: state.items.filter((item) => item.id !== itemId),
        selectedItemId: state.selectedItemId === itemId ? null : state.selectedItemId,
        lastUpdated: Date.now()
      };
    });

    // Sync with backend if available
    if (browser) {
      await executeCommand('remove_mission_item', { itemId });
    }

    console.log(`Removed mission item: ${itemId}`);
  } catch (error) {
    // Rollback on error
    if (removedItem) {
      missionState.update((state) => ({
        ...state,
        items: [...state.items, removedItem!], // We checked removedItem exists
        error: 'Failed to remove mission item'
      }));
    }
    console.error('Failed to remove mission item:', error);
    throw error;
  }
}

/**
 * Update a mission item
 * @param itemId - ID of the item to update
 * @param updates - Updates to apply to the item
 */
export async function updateMissionItem(
  itemId: string,
  updates: Partial<MissionItem>
): Promise<void> {
  // NASA JPL Rule 5: Validate inputs
  assertString(itemId, 1, undefined, undefined);
  assertDefined(updates, 'Updates required');

  // Validate updated fields
  if (updates.name !== undefined) {
    assertString(updates.name, 1, MISSION_LIMITS.MAX_NAME_LENGTH, undefined);
  }
  if (updates.description !== undefined) {
    assertString(updates.description, 0, MISSION_LIMITS.MAX_DESCRIPTION_LENGTH, undefined);
  }
  if (updates.params !== undefined) {
    validateWaypointParams(updates.params, 'updateMissionItem');
  }
  if (updates.sequence !== undefined) {
    assertBounds(
      updates.sequence,
      MISSION_LIMITS.MIN_SEQUENCE,
      MISSION_LIMITS.MAX_SEQUENCE + 1,
      'Updated sequence out of bounds'
    );
  }

  try {
    // Update local state optimistically
    missionState.update((state) => ({
      ...state,
      items: state.items.map((item) => (item.id === itemId ? { ...item, ...updates } : item)),
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
  await removeMissionItem(itemId);
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
  // NASA JPL Rule 5: Validate mission name
  assertString(missionName, 1, MISSION_LIMITS.MAX_NAME_LENGTH, undefined);

  const state = getMissionState();

  // Validate mission state
  assert(
    state.items.length > 0,
    'Cannot save empty mission',
    AssertionCategory.STATE,
    AssertionErrorCode.STATE_INVALID
  );

  // Validate mission sequence
  const validation = validateMissionSequence(state.items);
  assert(
    validation.valid,
    `Invalid mission: ${validation.errors.join(', ')}`,
    AssertionCategory.STATE,
    AssertionErrorCode.STATE_INVALID,
    { errors: validation.errors }
  );

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
  // NASA JPL Rule 5: Validate mission ID
  assertString(missionId, 1, undefined, undefined);

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
  // NASA JPL Rule 5: Validate mission ID
  assertString(missionId, 1, undefined, undefined);

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
  // NASA JPL Rule 5: Validate inputs
  assert(
    ['takeoff', 'waypoint', 'loiter', 'land'].includes(type),
    `Invalid mission item type: ${type}`,
    AssertionCategory.PARAMETER,
    AssertionErrorCode.PARAM_INVALID_FORMAT
  );

  assertDefined(position, 'Position required for mission item');
  validateCoordinate(position.lat, position.lng, 'createMissionItem');
  validateAltitude(position.alt, 'createMissionItem');

  if (name !== undefined) {
    assertString(name, 0, MISSION_LIMITS.MAX_NAME_LENGTH, undefined);
  }
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

  // NASA JPL Rule 5: Assert array bounds
  assertArrayBounds(items, 0, 'Mission items array');
  assertArrayBounds(items, items.length - 1, 'Mission items array');

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
function validateAltitudeProgression(items: MissionItem[], warnings: BoundedArray<string>): void {
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

/**
 * NASA JPL Rule 4: Split function - Validate total mission distance
 */
function validateTotalMissionDistance(items: MissionItem[], errors: BoundedArray<string>): void {
  let totalDistance = 0;

  for (let i = 1; i < items.length; i++) {
    const current = items[i];
    const previous = items[i - 1];

    if (
      current.params.lat !== undefined &&
      current.params.lng !== undefined &&
      previous.params.lat !== undefined &&
      previous.params.lng !== undefined
    ) {
      const distance = calculateDistance(
        previous.params.lat,
        previous.params.lng,
        current.params.lat,
        current.params.lng
      );
      totalDistance += distance;
    }
  }

  if (totalDistance > MISSION_LIMITS.MAX_TOTAL_DISTANCE) {
    errors.push(
      `Total mission distance (${(totalDistance / 1000).toFixed(1)}km) exceeds maximum (${MISSION_LIMITS.MAX_TOTAL_DISTANCE / 1000}km)`
    );
  }
}

/**
 * NASA JPL Rule 4: Split function - Validate mission sequence numbers
 */
function validateSequenceNumbers(items: MissionItem[], errors: BoundedArray<string>): void {
  const sequences = new Set<number>();

  items.forEach((item, index) => {
    if (item.sequence !== undefined) {
      if (sequences.has(item.sequence)) {
        errors.push(`Duplicate sequence number ${item.sequence} at item ${index + 1}`);
      }
      sequences.add(item.sequence);
    }
  });
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

  // NASA JPL Rule 5: Validate input array
  assertArray(items, 0, MAX_MISSION_ITEMS);

  // Validate mission endpoints
  validateMissionEndpoints(items, errors, warnings);

  // Validate each item's coordinates
  items.forEach((item, index) => {
    validateItemCoordinates(item, index, errors);
  });

  // Validate altitude progression
  validateAltitudeProgression(items, warnings);

  // Validate total mission distance
  validateTotalMissionDistance(items, errors);

  // Validate sequence numbers
  validateSequenceNumbers(items, errors);

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
export async function setMissionItems(items: MissionItem[]): Promise<void> {
  // NASA JPL Rule 5: Validate all mission items
  assertArray(items, 0, MAX_MISSION_ITEMS);

  // Validate each item
  items.forEach((item, index) => {
    try {
      validateMissionItem(item, `setMissionItems[${index}]`);
    } catch (error) {
      throw new Error(
        `Invalid mission item at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });

  // Validate mission sequence
  const validation = validateMissionSequence(items);
  if (!validation.valid) {
    console.warn('Mission validation warnings:', validation.errors.concat(validation.warnings));
  }

  try {
    // Update local state
    missionState.update((state) => ({
      ...state,
      items,
      lastUpdated: Date.now()
    }));

    // Sync with backend if available
    if (browser) {
      await executeCommand('set_mission_items', { items });
    }

    console.log(`Set ${items.length} mission items`);
  } catch (error) {
    console.error('Failed to set mission items:', error);
    throw error;
  }
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
