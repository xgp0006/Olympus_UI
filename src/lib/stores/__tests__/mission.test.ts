/**
 * Mission Store Tests
 * Tests for mission planning store implementation
 * Requirements: 4.2, 4.4
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  missionItems,
  selectedMissionItem,
  missionLoading,
  missionError,
  loadMissionData,
  updateWaypointParams,
  reorderMissionItem,
  selectMissionItem,
  addMissionItem,
  removeMissionItem,
  clearMissionError,
  getMissionState,
  missionState,
  saveMission,
  loadMissionById,
  getMissionList,
  deleteMission,
  createMissionItem,
  validateMissionSequence
} from '../mission';
import type { MissionItem, WaypointParams } from '../../plugins/mission-planner/types';

// Mock Tauri utilities
vi.mock('../../utils/tauri', () => ({
  invokeTauriCommand: vi.fn()
}));

import { invokeTauriCommand } from '../../utils/tauri';

describe('Mission Store', () => {
  const mockMissionItems: MissionItem[] = [
    {
      id: 'takeoff-1',
      type: 'takeoff',
      name: 'Takeoff Point',
      params: {
        lat: 37.7749,
        lng: -122.4194,
        alt: 50,
        speed: 5
      },
      position: {
        lat: 37.7749,
        lng: -122.4194,
        alt: 50
      }
    },
    {
      id: 'waypoint-1',
      type: 'waypoint',
      name: 'Waypoint 1',
      params: {
        lat: 37.7849,
        lng: -122.4294,
        alt: 100,
        speed: 10,
        action: 'hover'
      },
      position: {
        lat: 37.7849,
        lng: -122.4294,
        alt: 100
      }
    },
    {
      id: 'waypoint-2',
      type: 'waypoint',
      name: 'Waypoint 2',
      params: {
        lat: 37.7949,
        lng: -122.4394,
        alt: 120,
        speed: 8
      },
      position: {
        lat: 37.7949,
        lng: -122.4394,
        alt: 120
      }
    },
    {
      id: 'land-1',
      type: 'land',
      name: 'Landing Point',
      params: {
        lat: 37.8049,
        lng: -122.4494,
        alt: 0,
        speed: 3
      },
      position: {
        lat: 37.8049,
        lng: -122.4494,
        alt: 0
      }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mission state
    missionState.set({
      items: [],
      selectedItemId: null,
      loading: false,
      error: null,
      lastUpdated: 0
    });
  });

  describe('Store Initialization', () => {
    test('should initialize with empty state', () => {
      const items = get(missionItems);
      const selected = get(selectedMissionItem);
      const loading = get(missionLoading);
      const error = get(missionError);

      expect(items).toEqual([]);
      expect(selected).toBeNull();
      expect(loading).toBe(false);
      expect(error).toBeNull();
    });

    test('should provide access to mission state', () => {
      const state = getMissionState();

      expect(state).toEqual({
        items: [],
        selectedItemId: null,
        loading: false,
        error: null,
        lastUpdated: 0
      });
    });
  });

  describe('Mission Data Loading', () => {
    test('should load mission data successfully', async () => {
      vi.mocked(invokeTauriCommand).mockResolvedValue(mockMissionItems);

      const result = await loadMissionData();

      expect(invokeTauriCommand).toHaveBeenCalledWith('get_mission_data');
      expect(result).toEqual(mockMissionItems);
      expect(get(missionItems)).toEqual(mockMissionItems);
      expect(get(missionLoading)).toBe(false);
      expect(get(missionError)).toBeNull();
    });

    test('should handle loading state correctly', async () => {
      vi.mocked(invokeTauriCommand).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockMissionItems), 100))
      );

      const loadPromise = loadMissionData();

      // Check loading state
      expect(get(missionLoading)).toBe(true);
      expect(get(missionError)).toBeNull();

      await loadPromise;

      // Check final state
      expect(get(missionLoading)).toBe(false);
      expect(get(missionItems)).toEqual(mockMissionItems);
    });

    test('should handle loading errors', async () => {
      const errorMessage = 'Failed to load mission data';
      vi.mocked(invokeTauriCommand).mockRejectedValue(new Error(errorMessage));

      await expect(loadMissionData()).rejects.toThrow(errorMessage);

      expect(get(missionLoading)).toBe(false);
      expect(get(missionError)).toBe(errorMessage);
      expect(get(missionItems)).toEqual([]);
    });

    test('should handle null response from backend', async () => {
      vi.mocked(invokeTauriCommand).mockResolvedValue(null);

      const result = await loadMissionData();

      expect(result).toEqual([]);
      expect(get(missionItems)).toEqual([]);
    });
  });

  describe('Waypoint Parameter Updates', () => {
    beforeEach(() => {
      // Set up initial mission items
      missionState.set({
        items: mockMissionItems,
        selectedItemId: null,
        loading: false,
        error: null,
        lastUpdated: Date.now()
      });
    });

    test('should update waypoint parameters successfully', async () => {
      vi.mocked(invokeTauriCommand).mockResolvedValue(undefined);

      const newParams: WaypointParams = {
        lat: 37.785,
        lng: -122.4295,
        alt: 110,
        speed: 12,
        action: 'loiter'
      };

      await updateWaypointParams('waypoint-1', newParams);

      expect(invokeTauriCommand).toHaveBeenCalledWith('update_waypoint_params', {
        waypoint_id: 'waypoint-1',
        params: newParams
      });

      const updatedItems = get(missionItems);
      const updatedWaypoint = updatedItems.find((item) => item.id === 'waypoint-1');

      expect(updatedWaypoint).toBeDefined();
      expect(updatedWaypoint!.params).toEqual(expect.objectContaining(newParams));
      expect(updatedWaypoint!.position).toEqual({
        lat: newParams.lat,
        lng: newParams.lng,
        alt: newParams.alt
      });
    });

    test('should handle waypoint update errors', async () => {
      const errorMessage = 'Failed to update waypoint';
      vi.mocked(invokeTauriCommand).mockRejectedValue(new Error(errorMessage));

      const newParams: WaypointParams = {
        lat: 37.785,
        lng: -122.4295,
        alt: 110,
        speed: 12
      };

      await expect(updateWaypointParams('waypoint-1', newParams)).rejects.toThrow(errorMessage);

      expect(get(missionError)).toBe(errorMessage);

      // Original data should remain unchanged
      const items = get(missionItems);
      const originalWaypoint = items.find((item) => item.id === 'waypoint-1');
      expect(originalWaypoint!.params.lat).toBe(37.7849); // Original value
    });

    test('should update partial waypoint parameters', async () => {
      vi.mocked(invokeTauriCommand).mockResolvedValue(undefined);

      const partialParams: Partial<WaypointParams> = {
        speed: 15
      };

      await updateWaypointParams('waypoint-1', partialParams as WaypointParams);

      const updatedItems = get(missionItems);
      const updatedWaypoint = updatedItems.find((item) => item.id === 'waypoint-1');

      expect(updatedWaypoint!.params.speed).toBe(15);
      expect(updatedWaypoint!.params.lat).toBe(37.7849); // Should remain unchanged
      expect(updatedWaypoint!.params.lng).toBe(-122.4294); // Should remain unchanged
    });
  });

  describe('Mission Item Reordering', () => {
    beforeEach(() => {
      missionState.set({
        items: mockMissionItems,
        selectedItemId: null,
        loading: false,
        error: null,
        lastUpdated: Date.now()
      });
    });

    test('should reorder mission items successfully', async () => {
      vi.mocked(invokeTauriCommand).mockResolvedValue(undefined);

      // Move waypoint-1 (index 1) to index 2
      await reorderMissionItem('waypoint-1', 2);

      expect(invokeTauriCommand).toHaveBeenCalledWith('reorder_mission_item', {
        item_id: 'waypoint-1',
        new_index: 2
      });

      const reorderedItems = get(missionItems);
      expect(reorderedItems[2].id).toBe('waypoint-1');
      expect(reorderedItems[1].id).toBe('waypoint-2');
    });

    test('should handle reordering errors', async () => {
      const errorMessage = 'Failed to reorder mission item';
      vi.mocked(invokeTauriCommand).mockRejectedValue(new Error(errorMessage));

      await expect(reorderMissionItem('waypoint-1', 2)).rejects.toThrow(errorMessage);

      expect(get(missionError)).toBe(errorMessage);

      // Original order should remain unchanged
      const items = get(missionItems);
      expect(items[1].id).toBe('waypoint-1');
      expect(items[2].id).toBe('waypoint-2');
    });

    test('should handle reordering non-existent item gracefully', async () => {
      vi.mocked(invokeTauriCommand).mockResolvedValue(undefined);

      await reorderMissionItem('non-existent', 1);

      // Should not crash and items should remain unchanged
      const items = get(missionItems);
      expect(items).toEqual(mockMissionItems);
    });
  });

  describe('Mission Item Selection', () => {
    beforeEach(() => {
      missionState.set({
        items: mockMissionItems,
        selectedItemId: null,
        loading: false,
        error: null,
        lastUpdated: Date.now()
      });
    });

    test('should select mission item', () => {
      selectMissionItem('waypoint-1');

      const selected = get(selectedMissionItem);
      expect(selected).toBeDefined();
      expect(selected!.id).toBe('waypoint-1');
      expect(selected!.name).toBe('Waypoint 1');
    });

    test('should deselect mission item', () => {
      selectMissionItem('waypoint-1');
      expect(get(selectedMissionItem)).toBeDefined();

      selectMissionItem(null);
      expect(get(selectedMissionItem)).toBeNull();
    });

    test('should handle selecting non-existent item', () => {
      selectMissionItem('non-existent');
      expect(get(selectedMissionItem)).toBeNull();
    });
  });

  describe('Mission Item Management', () => {
    test('should add mission item', () => {
      const newItem: MissionItem = {
        id: 'new-waypoint',
        type: 'waypoint',
        name: 'New Waypoint',
        params: {
          lat: 37.8,
          lng: -122.45,
          alt: 80,
          speed: 6
        },
        position: {
          lat: 37.8,
          lng: -122.45,
          alt: 80
        }
      };

      addMissionItem(newItem);

      const items = get(missionItems);
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual(newItem);
    });

    test('should remove mission item', () => {
      missionState.set({
        items: mockMissionItems,
        selectedItemId: 'waypoint-1',
        loading: false,
        error: null,
        lastUpdated: Date.now()
      });

      removeMissionItem('waypoint-1');

      const items = get(missionItems);
      expect(items).toHaveLength(3);
      expect(items.find((item) => item.id === 'waypoint-1')).toBeUndefined();

      // Should deselect if selected item was removed
      expect(get(selectedMissionItem)).toBeNull();
    });

    test('should remove mission item without affecting selection if different item selected', () => {
      missionState.set({
        items: mockMissionItems,
        selectedItemId: 'waypoint-2',
        loading: false,
        error: null,
        lastUpdated: Date.now()
      });

      removeMissionItem('waypoint-1');

      const items = get(missionItems);
      expect(items).toHaveLength(3);

      // Selection should remain unchanged
      const selected = get(selectedMissionItem);
      expect(selected!.id).toBe('waypoint-2');
    });
  });

  describe('Error Management', () => {
    test('should clear mission error', () => {
      missionState.set({
        items: [],
        selectedItemId: null,
        loading: false,
        error: 'Test error',
        lastUpdated: Date.now()
      });

      expect(get(missionError)).toBe('Test error');

      clearMissionError();

      expect(get(missionError)).toBeNull();
    });
  });

  describe('Store Reactivity', () => {
    test('should update derived stores when mission state changes', () => {
      // Initial state
      expect(get(missionItems)).toEqual([]);
      expect(get(selectedMissionItem)).toBeNull();
      expect(get(missionLoading)).toBe(false);
      expect(get(missionError)).toBeNull();

      // Update state
      missionState.set({
        items: mockMissionItems,
        selectedItemId: 'waypoint-1',
        loading: true,
        error: 'Test error',
        lastUpdated: Date.now()
      });

      // Check derived stores updated
      expect(get(missionItems)).toEqual(mockMissionItems);
      expect(get(selectedMissionItem)!.id).toBe('waypoint-1');
      expect(get(missionLoading)).toBe(true);
      expect(get(missionError)).toBe('Test error');
    });
  });

  describe('Mission Sequence Management', () => {
    test('should maintain mission sequence order', () => {
      const sequencedItems = [
        mockMissionItems[0], // takeoff
        mockMissionItems[1], // waypoint-1
        mockMissionItems[2], // waypoint-2
        mockMissionItems[3] // land
      ];

      missionState.set({
        items: sequencedItems,
        selectedItemId: null,
        loading: false,
        error: null,
        lastUpdated: Date.now()
      });

      const items = get(missionItems);
      expect(items[0].type).toBe('takeoff');
      expect(items[1].type).toBe('waypoint');
      expect(items[2].type).toBe('waypoint');
      expect(items[3].type).toBe('land');
    });

    test('should support MAVLINK-compatible mission components', () => {
      // Set up mission items
      missionState.set({
        items: mockMissionItems,
        selectedItemId: null,
        loading: false,
        error: null,
        lastUpdated: Date.now()
      });

      const updatedItems = get(missionItems);

      // Verify all items have required MAVLINK-compatible properties
      updatedItems.forEach((item) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('params');
        expect(item.params).toHaveProperty('lat');
        expect(item.params).toHaveProperty('lng');
        expect(item.params).toHaveProperty('alt');

        if (item.position) {
          expect(item.position).toHaveProperty('lat');
          expect(item.position).toHaveProperty('lng');
          expect(item.position).toHaveProperty('alt');
        }
      });
    });
  });

  describe('Mission Persistence', () => {
    beforeEach(() => {
      missionState.set({
        items: mockMissionItems,
        selectedItemId: null,
        loading: false,
        error: null,
        lastUpdated: Date.now()
      });
    });

    test('should save mission successfully', async () => {
      const mockMissionId = 'mission-123';
      vi.mocked(invokeTauriCommand).mockResolvedValue(mockMissionId);

      const result = await saveMission('Test Mission');

      expect(invokeTauriCommand).toHaveBeenCalledWith('save_mission', {
        name: 'Test Mission',
        items: mockMissionItems
      });
      expect(result).toBe(mockMissionId);
    });

    test('should handle save mission errors', async () => {
      const errorMessage = 'Failed to save mission';
      vi.mocked(invokeTauriCommand).mockRejectedValue(new Error(errorMessage));

      await expect(saveMission('Test Mission')).rejects.toThrow(errorMessage);
      expect(get(missionError)).toBe(errorMessage);
    });

    test('should load mission by ID successfully', async () => {
      const mockMissionData = {
        id: 'mission-123',
        name: 'Test Mission',
        items: mockMissionItems
      };
      vi.mocked(invokeTauriCommand).mockResolvedValue(mockMissionData);

      const result = await loadMissionById('mission-123');

      expect(invokeTauriCommand).toHaveBeenCalledWith('load_mission_by_id', {
        mission_id: 'mission-123'
      });
      expect(result).toEqual(mockMissionItems);
      expect(get(missionItems)).toEqual(mockMissionItems);
    });

    test('should get mission list successfully', async () => {
      const mockMissionList = [
        { id: 'mission-1', name: 'Mission 1', created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: 'mission-2', name: 'Mission 2', created_at: '2024-01-02', updated_at: '2024-01-02' }
      ];
      vi.mocked(invokeTauriCommand).mockResolvedValue(mockMissionList);

      const result = await getMissionList();

      expect(invokeTauriCommand).toHaveBeenCalledWith('get_mission_list');
      expect(result).toEqual(mockMissionList);
    });

    test('should delete mission successfully', async () => {
      vi.mocked(invokeTauriCommand).mockResolvedValue(undefined);

      await deleteMission('mission-123');

      expect(invokeTauriCommand).toHaveBeenCalledWith('delete_mission', {
        mission_id: 'mission-123'
      });
    });
  });

  describe('Mission Item Creation', () => {
    test('should create takeoff mission item with correct defaults', () => {
      const position = { lat: 37.7749, lng: -122.4194, alt: 50 };
      const item = createMissionItem('takeoff', position);

      expect(item.type).toBe('takeoff');
      expect(item.params.lat).toBe(position.lat);
      expect(item.params.lng).toBe(position.lng);
      expect(item.params.alt).toBe(position.alt);
      expect(item.params.speed).toBe(5); // Default takeoff speed
      expect(item.position).toEqual(position);
      expect(item.id).toMatch(/^takeoff-\d+-[a-z0-9]+$/);
    });

    test('should create waypoint mission item with correct defaults', () => {
      const position = { lat: 37.7849, lng: -122.4294, alt: 100 };
      const item = createMissionItem('waypoint', position, 'Custom Waypoint');

      expect(item.type).toBe('waypoint');
      expect(item.name).toBe('Custom Waypoint');
      expect(item.params.speed).toBe(10); // Default waypoint speed
    });

    test('should create loiter mission item with action', () => {
      const position = { lat: 37.7949, lng: -122.4394, alt: 120 };
      const item = createMissionItem('loiter', position);

      expect(item.type).toBe('loiter');
      expect(item.params.action).toBe('loiter');
    });

    test('should create land mission item with correct defaults', () => {
      const position = { lat: 37.8049, lng: -122.4494, alt: 0 };
      const item = createMissionItem('land', position);

      expect(item.type).toBe('land');
      expect(item.params.speed).toBe(3); // Default landing speed
    });
  });

  describe('Mission Validation', () => {
    test('should validate correct mission sequence', () => {
      const result = validateMissionSequence(mockMissionItems);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing takeoff at start', () => {
      const invalidMission = mockMissionItems.slice(1); // Remove takeoff
      const result = validateMissionSequence(invalidMission);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Mission must start with a takeoff item');
    });

    test('should warn about missing landing at end', () => {
      const missionWithoutLanding = mockMissionItems.slice(0, -1); // Remove landing
      const result = validateMissionSequence(missionWithoutLanding);

      expect(result.warnings).toContain('Mission should end with a landing item');
    });

    test('should detect invalid coordinates', () => {
      const invalidMission = [
        {
          ...mockMissionItems[0],
          params: { ...mockMissionItems[0].params, lat: 95 } // Invalid latitude
        }
      ];
      const result = validateMissionSequence(invalidMission);

      expect(result.valid).toBe(false);
      expect(result.errors.some((error) => error.includes('invalid latitude'))).toBe(true);
    });

    test('should detect negative altitude', () => {
      const invalidMission = [
        {
          ...mockMissionItems[0],
          params: { ...mockMissionItems[0].params, alt: -10 },
          name: 'Invalid Takeoff'
        }
      ];
      const result = validateMissionSequence(invalidMission);

      expect(result.valid).toBe(false);
      expect(result.errors.some((error) => error.includes('negative altitude'))).toBe(true);
    });

    test('should warn about large altitude changes', () => {
      const missionWithLargeAltChange = [
        mockMissionItems[0], // alt: 50
        {
          ...mockMissionItems[1],
          params: { ...mockMissionItems[1].params, alt: 300 } // Large jump
        }
      ];
      const result = validateMissionSequence(missionWithLargeAltChange);

      expect(result.warnings.some((warning) => warning.includes('Large altitude change'))).toBe(
        true
      );
    });

    test('should handle empty mission', () => {
      const result = validateMissionSequence([]);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Mission is empty');
    });
  });

  describe('Performance and State Updates', () => {
    test('should update lastUpdated timestamp on state changes', async () => {
      const initialState = getMissionState();
      const initialTimestamp = initialState.lastUpdated;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      addMissionItem(mockMissionItems[0]);

      const updatedState = getMissionState();
      expect(updatedState.lastUpdated).toBeGreaterThan(initialTimestamp);
    });

    test('should handle concurrent operations gracefully', async () => {
      vi.mocked(invokeTauriCommand).mockResolvedValue(undefined);

      missionState.set({
        items: mockMissionItems,
        selectedItemId: null,
        loading: false,
        error: null,
        lastUpdated: Date.now()
      });

      // Simulate concurrent operations
      const operations = [
        updateWaypointParams('waypoint-1', {
          lat: mockMissionItems[1].params.lat,
          lng: mockMissionItems[1].params.lng,
          alt: mockMissionItems[1].params.alt,
          speed: 15
        }),
        reorderMissionItem('waypoint-2', 1),
        updateWaypointParams('waypoint-2', {
          lat: mockMissionItems[2].params.lat,
          lng: mockMissionItems[2].params.lng,
          alt: 150,
          speed: mockMissionItems[2].params.speed
        })
      ];

      await Promise.all(operations);

      // Verify final state is consistent
      const items = get(missionItems);
      expect(items).toHaveLength(4);
      expect(get(missionError)).toBeNull();
    });
  });
});
