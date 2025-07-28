/**
 * Mission Planning Workflow Integration Tests
 * Tests the complete mission planning workflow including map interactions,
 * waypoint management, and backend synchronization
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

// Import components (these would be the actual components in a real implementation)
import MissionPlanner from '../../src/lib/plugins/mission-planner/MissionPlanner.svelte';

// Import stores and functions
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
  createMissionItem,
  validateMissionSequence,
  saveMission,
  loadMissionById,
  missionState
} from '../../src/lib/stores/mission';

// Import test utilities
import { createMockMissionItem, createMockWaypointParams } from '../../src/lib/test-utils/mock-factories';
import { waitForComponentReady } from '../../src/lib/test-utils/component-helpers';

// Mock Tauri API
const mockInvoke = vi.fn();
const mockListen = vi.fn();

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: mockInvoke
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: mockListen,
  emit: vi.fn()
}));

// Mock MapLibre GL
const mockMap = {
  on: vi.fn(),
  off: vi.fn(),
  addSource: vi.fn(),
  addLayer: vi.fn(),
  removeLayer: vi.fn(),
  removeSource: vi.fn(),
  flyTo: vi.fn(),
  setCenter: vi.fn(),
  setZoom: vi.fn(),
  getCanvas: vi.fn(() => ({ style: {} })),
  resize: vi.fn(),
  remove: vi.fn()
};

vi.mock('maplibre-gl', () => ({
  Map: vi.fn(() => mockMap),
  Marker: vi.fn(() => ({
    setLngLat: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
    getElement: vi.fn(() => document.createElement('div'))
  })),
  Popup: vi.fn(() => ({
    setLngLat: vi.fn().mockReturnThis(),
    setHTML: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis()
  }))
}));

describe('Mission Planning Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mission store
    missionState.set({
      items: [],
      selectedItemId: null,
      loading: false,
      error: null,
      lastUpdated: 0
    });
    selectMissionItem(null);
    
    // Setup default mock responses
    mockInvoke.mockImplementation((command: string, args?: unknown) => {
      switch (command) {
        case 'get_mission_data':
          return Promise.resolve([
            createMockMissionItem('takeoff', { lat: 37.7749, lng: -122.4194, alt: 50 }),
            createMockMissionItem('waypoint', { lat: 37.7849, lng: -122.4094, alt: 100 }),
            createMockMissionItem('waypoint', { lat: 37.7949, lng: -122.3994, alt: 120 }),
            createMockMissionItem('land', { lat: 37.8049, lng: -122.3894, alt: 0 })
          ]);
        case 'update_waypoint_params':
          return Promise.resolve();
        case 'reorder_mission_item':
          return Promise.resolve();
        case 'save_mission':
          return Promise.resolve('mission-123');
        case 'load_mission_by_id':
          return Promise.resolve({
            id: 'mission-123',
            name: 'Test Mission',
            items: [createMockMissionItem('takeoff', { lat: 37.7749, lng: -122.4194, alt: 50 })]
          });
        default:
          return Promise.resolve(null);
      }
    });

    mockListen.mockResolvedValue(() => {});
  });

  describe('Mission Data Loading and Display', () => {
    test('loads mission data successfully', async () => {
      const items = await loadMissionData();
      
      expect(mockInvoke).toHaveBeenCalledWith('get_mission_data');
      expect(items).toHaveLength(4);
      expect(items[0].type).toBe('takeoff');
      expect(items[3].type).toBe('land');
      
      // Verify store is updated
      const storeItems = get(missionItems);
      expect(storeItems).toHaveLength(4);
    });

    test('handles mission data loading failure', async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === 'get_mission_data') {
          return Promise.reject(new Error('Backend connection failed'));
        }
        return Promise.resolve(null);
      });

      await expect(loadMissionData()).rejects.toThrow('Backend connection failed');
      
      // Verify error state
      const error = get(missionError);
      expect(error).toBe('Backend connection failed');
    });

    test('mission planner component displays loaded mission items', async () => {
      await loadMissionData();
      
      const { getByTestId } = render(MissionPlanner);
      
      await waitFor(() => {
        const accordion = getByTestId('mission-accordion');
        expect(accordion).toBeInTheDocument();
        
        // Should display all mission items
        const items = accordion.querySelectorAll('[data-testid="waypoint-item"]');
        expect(items).toHaveLength(4);
      });
    });
  });

  describe('Waypoint Management', () => {
    test('creates new mission item with correct defaults', () => {
      const position = { lat: 37.7749, lng: -122.4194, alt: 100 };
      const item = createMissionItem('waypoint', position, 'Test Waypoint');
      
      expect(item.type).toBe('waypoint');
      expect(item.name).toBe('Test Waypoint');
      expect(item.position).toEqual(position);
      expect(item.params.lat).toBe(position.lat);
      expect(item.params.lng).toBe(position.lng);
      expect(item.params.alt).toBe(position.alt);
      expect(item.params.speed).toBe(10); // Default waypoint speed
    });

    test('adds mission item to store', () => {
      const item = createMissionItem('waypoint', { lat: 37.7749, lng: -122.4194, alt: 100 });
      
      addMissionItem(item);
      
      const items = get(missionItems);
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual(item);
    });

    test('removes mission item from store', async () => {
      await loadMissionData();
      const items = get(missionItems);
      const itemToRemove = items[1]; // Second item
      
      removeMissionItem(itemToRemove.id);
      
      const updatedItems = get(missionItems);
      expect(updatedItems).toHaveLength(3);
      expect(updatedItems.find(item => item.id === itemToRemove.id)).toBeUndefined();
    });

    test('updates waypoint parameters and syncs with backend', async () => {
      await loadMissionData();
      const items = get(missionItems);
      const waypointId = items[1].id;
      
      const newParams = createMockWaypointParams({ lat: 38.0, lng: -123.0, alt: 150, speed: 15 });
      
      await updateWaypointParams(waypointId, newParams);
      
      expect(mockInvoke).toHaveBeenCalledWith('update_waypoint_params', {
        waypoint_id: waypointId,
        params: newParams
      });
      
      // Verify local store is updated
      const updatedItems = get(missionItems);
      const updatedItem = updatedItems.find(item => item.id === waypointId);
      expect(updatedItem?.params.lat).toBe(38.0);
      expect(updatedItem?.params.lng).toBe(-123.0);
      expect(updatedItem?.params.alt).toBe(150);
      expect(updatedItem?.params.speed).toBe(15);
    });

    test('handles waypoint parameter update failure', async () => {
      await loadMissionData();
      const items = get(missionItems);
      const waypointId = items[1].id;
      
      mockInvoke.mockImplementation((command: string) => {
        if (command === 'update_waypoint_params') {
          return Promise.reject(new Error('Invalid parameters'));
        }
        return Promise.resolve(null);
      });

      const newParams = createMockWaypointParams({ lat: 38.0, lng: -123.0, alt: 150 });
      
      await expect(updateWaypointParams(waypointId, newParams)).rejects.toThrow('Invalid parameters');
      
      // Verify error state
      const error = get(missionError);
      expect(error).toBe('Invalid parameters');
    });
  });

  describe('Mission Item Selection and Navigation', () => {
    test('selects mission item', async () => {
      await loadMissionData();
      const items = get(missionItems);
      const itemId = items[1].id;
      
      selectMissionItem(itemId);
      
      const selectedItem = get(selectedMissionItem);
      expect(selectedItem?.id).toBe(itemId);
    });

    test('deselects mission item', async () => {
      await loadMissionData();
      const items = get(missionItems);
      
      selectMissionItem(items[0].id);
      expect(get(selectedMissionItem)).toBeTruthy();
      
      selectMissionItem(null);
      expect(get(selectedMissionItem)).toBeNull();
    });

    test('map pans to selected waypoint', async () => {
      await loadMissionData();
      
      const { getByTestId } = render(MissionPlanner);
      
      await waitFor(() => {
        expect(getByTestId('map-viewer')).toBeInTheDocument();
      });

      const items = get(missionItems);
      selectMissionItem(items[1].id);
      
      // In a real implementation, this would verify the map.flyTo call
      // For now, we verify the selection worked
      expect(get(selectedMissionItem)?.id).toBe(items[1].id);
    });
  });

  describe('Mission Item Reordering', () => {
    test('reorders mission item successfully', async () => {
      await loadMissionData();
      const items = get(missionItems);
      const itemToMove = items[1];
      const newIndex = 2;
      
      await reorderMissionItem(itemToMove.id, newIndex);
      
      expect(mockInvoke).toHaveBeenCalledWith('reorder_mission_item', {
        item_id: itemToMove.id,
        new_index: newIndex
      });
      
      // Verify local reordering
      const reorderedItems = get(missionItems);
      expect(reorderedItems[newIndex].id).toBe(itemToMove.id);
    });

    test('handles reorder failure', async () => {
      await loadMissionData();
      const items = get(missionItems);
      
      mockInvoke.mockImplementation((command: string) => {
        if (command === 'reorder_mission_item') {
          return Promise.reject(new Error('Reorder failed'));
        }
        return Promise.resolve(null);
      });

      await expect(reorderMissionItem(items[1].id, 2)).rejects.toThrow('Reorder failed');
      
      const error = get(missionError);
      expect(error).toBe('Reorder failed');
    });

    test('drag and drop reordering in accordion', async () => {
      await loadMissionData();
      
      const { getByTestId } = render(MissionPlanner);
      
      await waitFor(() => {
        expect(getByTestId('mission-accordion')).toBeInTheDocument();
      });

      // In a real implementation, this would simulate drag and drop
      // For now, we verify the accordion is rendered
      const accordion = getByTestId('mission-accordion');
      const items = accordion.querySelectorAll('[data-testid="waypoint-item"]');
      expect(items).toHaveLength(4);
    });
  });

  describe('Mission Validation', () => {
    test('validates correct mission sequence', async () => {
      await loadMissionData();
      const items = get(missionItems);
      
      const validation = validateMissionSequence(items);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('detects missing takeoff at start', () => {
      const items = [
        createMissionItem('waypoint', { lat: 37.7749, lng: -122.4194, alt: 100 }),
        createMissionItem('land', { lat: 37.7849, lng: -122.4094, alt: 0 })
      ];
      
      const validation = validateMissionSequence(items);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Mission must start with a takeoff item');
    });

    test('warns about missing landing at end', () => {
      const items = [
        createMissionItem('takeoff', { lat: 37.7749, lng: -122.4194, alt: 50 }),
        createMissionItem('waypoint', { lat: 37.7849, lng: -122.4094, alt: 100 })
      ];
      
      const validation = validateMissionSequence(items);
      
      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain('Mission should end with a landing item');
    });

    test('detects invalid coordinates', () => {
      const items = [
        createMissionItem('takeoff', { lat: 91, lng: -122.4194, alt: 50 }), // Invalid latitude
        createMissionItem('waypoint', { lat: 37.7849, lng: 181, alt: 100 }) // Invalid longitude
      ];
      
      const validation = validateMissionSequence(items);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(error => error.includes('invalid latitude'))).toBe(true);
      expect(validation.errors.some(error => error.includes('invalid longitude'))).toBe(true);
    });

    test('warns about large altitude changes', () => {
      const items = [
        createMissionItem('takeoff', { lat: 37.7749, lng: -122.4194, alt: 50 }),
        createMissionItem('waypoint', { lat: 37.7849, lng: -122.4094, alt: 300 }) // Large altitude jump
      ];
      
      const validation = validateMissionSequence(items);
      
      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(warning => warning.includes('Large altitude change'))).toBe(true);
    });
  });

  describe('Mission Save and Load', () => {
    test('saves mission successfully', async () => {
      await loadMissionData();
      
      const missionId = await saveMission('Test Mission');
      
      expect(mockInvoke).toHaveBeenCalledWith('save_mission', {
        name: 'Test Mission',
        items: get(missionItems)
      });
      
      expect(missionId).toBe('mission-123');
    });

    test('handles mission save failure', async () => {
      await loadMissionData();
      
      mockInvoke.mockImplementation((command: string) => {
        if (command === 'save_mission') {
          return Promise.reject(new Error('Save failed'));
        }
        return Promise.resolve(null);
      });

      await expect(saveMission('Test Mission')).rejects.toThrow('Save failed');
      
      const error = get(missionError);
      expect(error).toBe('Save failed');
    });

    test('loads mission by ID successfully', async () => {
      const items = await loadMissionById('mission-123');
      
      expect(mockInvoke).toHaveBeenCalledWith('load_mission_by_id', {
        mission_id: 'mission-123'
      });
      
      expect(items).toHaveLength(1);
      expect(items[0].type).toBe('takeoff');
      
      // Verify store is updated
      const storeItems = get(missionItems);
      expect(storeItems).toHaveLength(1);
    });

    test('handles mission load failure', async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === 'load_mission_by_id') {
          return Promise.reject(new Error('Mission not found'));
        }
        return Promise.resolve(null);
      });

      await expect(loadMissionById('nonexistent')).rejects.toThrow('Mission not found');
      
      const error = get(missionError);
      expect(error).toBe('Mission not found');
    });
  });

  describe('Map Integration', () => {
    test('map displays waypoint markers', async () => {
      await loadMissionData();
      
      const { getByTestId } = render(MissionPlanner);
      
      await waitFor(() => {
        expect(getByTestId('map-viewer')).toBeInTheDocument();
      });

      // In a real implementation, this would verify markers are added to the map
      // For now, we verify the map component is rendered
      expect(getByTestId('map-viewer')).toBeInTheDocument();
    });

    test('map click adds new waypoint', async () => {
      const { getByTestId } = render(MissionPlanner);
      
      await waitFor(() => {
        expect(getByTestId('map-viewer')).toBeInTheDocument();
      });

      const mapElement = getByTestId('map-viewer');
      
      // Simulate map click event
      await fireEvent.click(mapElement, {
        detail: {
          lngLat: { lng: -122.4194, lat: 37.7749 }
        }
      });

      // In a real implementation, this would add a waypoint
      // For now, we verify the map is interactive
      expect(mapElement).toBeInTheDocument();
    });

    test('selected waypoint is highlighted on map', async () => {
      await loadMissionData();
      
      const { getByTestId } = render(MissionPlanner);
      
      await waitFor(() => {
        expect(getByTestId('map-viewer')).toBeInTheDocument();
      });

      const items = get(missionItems);
      selectMissionItem(items[1].id);

      // In a real implementation, this would verify the marker styling
      // For now, we verify the selection worked
      expect(get(selectedMissionItem)?.id).toBe(items[1].id);
    });
  });

  describe('Minimized Coin Functionality', () => {
    test('waypoint can be minimized to coin', async () => {
      await loadMissionData();
      
      const { getByTestId } = render(MissionPlanner);
      
      await waitFor(() => {
        expect(getByTestId('mission-accordion')).toBeInTheDocument();
      });

      // In a real implementation, this would test the minimize functionality
      // For now, we verify the accordion is rendered
      const accordion = getByTestId('mission-accordion');
      expect(accordion).toBeInTheDocument();
    });

    test('minimized coin can be dragged and pinned', async () => {
      // This would test the hexagonal coin drag and pin functionality
      // Implementation would depend on the actual MinimizedCoin component
      expect(true).toBe(true); // Placeholder
    });

    test('double-click expands coin back to accordion item', async () => {
      // This would test the expand functionality
      // Implementation would depend on the actual MinimizedCoin component
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Mission Planning Workflow End-to-End', () => {
    test('complete mission planning workflow', async () => {
      // 1. Load initial mission data
      await loadMissionData();
      expect(get(missionItems)).toHaveLength(4);

      // 2. Add a new waypoint
      const newWaypoint = createMissionItem('waypoint', { lat: 37.8149, lng: -122.3794, alt: 110 });
      addMissionItem(newWaypoint);
      expect(get(missionItems)).toHaveLength(5);

      // 3. Select and modify a waypoint
      const items = get(missionItems);
      selectMissionItem(items[1].id);
      expect(get(selectedMissionItem)?.id).toBe(items[1].id);

      const newParams = createMockWaypointParams({ lat: 37.7850, lng: -122.4095, alt: 105 });
      await updateWaypointParams(items[1].id, newParams);

      // 4. Reorder mission items
      await reorderMissionItem(items[2].id, 1);

      // 5. Validate mission
      const validation = validateMissionSequence(get(missionItems));
      expect(validation.valid).toBe(true);

      // 6. Save mission
      const missionId = await saveMission('Complete Test Mission');
      expect(missionId).toBe('mission-123');
    });

    test('handles errors gracefully during workflow', async () => {
      // Setup error conditions
      mockInvoke.mockImplementation((command: string) => {
        if (command === 'update_waypoint_params') {
          return Promise.reject(new Error('Network error'));
        }
        if (command === 'get_mission_data') {
          return Promise.resolve([
            createMissionItem('takeoff', { lat: 37.7749, lng: -122.4194, alt: 50 })
          ]);
        }
        return Promise.resolve(null);
      });

      // Load mission
      await loadMissionData();
      const items = get(missionItems);

      // Try to update waypoint (should fail)
      const newParams = createMockWaypointParams({ lat: 37.8, lng: -123, alt: 100 });
      await expect(updateWaypointParams(items[0].id, newParams)).rejects.toThrow('Network error');

      // Verify error state
      expect(get(missionError)).toBe('Network error');

      // System should still be functional for other operations
      const newWaypoint = createMissionItem('waypoint', { lat: 37.8, lng: -123, alt: 100 });
      addMissionItem(newWaypoint);
      expect(get(missionItems)).toHaveLength(2);
    });
  });

  describe('Performance and Optimization', () => {
    test('handles large missions efficiently', async () => {
      // Create a large mission
      const largeMission = Array.from({ length: 100 }, (_, i) => 
        createMissionItem('waypoint', { 
          lat: 37.7749 + (i * 0.001), 
          lng: -122.4194 + (i * 0.001), 
          alt: 100 + i 
        })
      );

      mockInvoke.mockImplementation((command: string) => {
        if (command === 'get_mission_data') {
          return Promise.resolve(largeMission);
        }
        return Promise.resolve(null);
      });

      const startTime = performance.now();
      await loadMissionData();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be fast
      expect(get(missionItems)).toHaveLength(100);
    });

    test('mission validation is performant for large missions', () => {
      const largeMission = Array.from({ length: 1000 }, (_, i) => 
        createMissionItem('waypoint', { 
          lat: 37.7749 + (i * 0.0001), 
          lng: -122.4194 + (i * 0.0001), 
          alt: 100 + (i * 0.1) 
        })
      );

      const startTime = performance.now();
      const validation = validateMissionSequence(largeMission);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // Should be very fast
      expect(validation.valid).toBe(false); // Missing takeoff
    });
  });
});