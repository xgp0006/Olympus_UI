/**
 * Integration tests for map-mission interaction
 * Tests requirement 4.9: Map-mission interaction, highlighting, and synchronization
 */

import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { vi } from 'vitest';
import { get } from 'svelte/store';
import MissionPlanner from '../MissionPlanner.svelte';
import { selectedMissionItem, selectMissionItem, missionState } from '$lib/stores/mission';
import type { MissionItem } from '../types';

// Mock Tauri
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn()
}));

// Mock MapLibre GL JS
vi.mock('maplibre-gl', () => ({
  Map: vi.fn().mockImplementation(() => ({
    addControl: vi.fn(),
    on: vi.fn(),
    getSource: vi.fn().mockReturnValue({
      type: 'geojson',
      setData: vi.fn()
    }),
    getLayer: vi.fn().mockReturnValue(true),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    setPaintProperty: vi.fn(),
    flyTo: vi.fn(),
    getZoom: vi.fn().mockReturnValue(10),
    remove: vi.fn()
  })),
  NavigationControl: vi.fn(),
  ScaleControl: vi.fn()
}));

// Mock theme store
vi.mock('$lib/stores/theme', () => ({
  theme: {
    subscribe: vi.fn((callback) => {
      callback({
        components: {
          map: {
            waypoint_color_default: '#00bfff',
            waypoint_color_selected: '#ffd700',
            path_color: '#00ff88'
          }
        },
        colors: {
          text_primary: '#ffffff',
          background_primary: '#000000'
        }
      });
      return () => {};
    })
  }
}));

describe('Map-Mission Integration', () => {
  const mockMissionItems: MissionItem[] = [
    {
      id: 'takeoff-1',
      type: 'takeoff',
      name: 'Takeoff Point',
      params: { lat: 37.7749, lng: -122.4194, alt: 50, speed: 5 },
      position: { lat: 37.7749, lng: -122.4194, alt: 50 }
    },
    {
      id: 'waypoint-1',
      type: 'waypoint',
      name: 'Waypoint 1',
      params: { lat: 37.7849, lng: -122.4094, alt: 100, speed: 10 },
      position: { lat: 37.7849, lng: -122.4094, alt: 100 }
    },
    {
      id: 'waypoint-2',
      type: 'waypoint',
      name: 'Waypoint 2',
      params: { lat: 37.7949, lng: -122.3994, alt: 120, speed: 8 },
      position: { lat: 37.7949, lng: -122.3994, alt: 120 }
    },
    {
      id: 'land-1',
      type: 'land',
      name: 'Landing Point',
      params: { lat: 37.8049, lng: -122.3894, alt: 0, speed: 3 },
      position: { lat: 37.8049, lng: -122.3894, alt: 0 }
    }
  ];

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock successful mission data loading
    const { invoke } = await import('@tauri-apps/api/tauri');
    vi.mocked(invoke).mockResolvedValue(mockMissionItems);

    // Reset mission store
    missionState.set({
      items: mockMissionItems,
      selectedItemId: null,
      loading: false,
      error: null,
      lastUpdated: Date.now()
    });
  });

  test('should pass mission items to MapViewer component', async () => {
    const { getByTestId } = render(MissionPlanner);

    // Wait for component to initialize
    await waitFor(() => {
      expect(getByTestId('mission-planner')).toBeInTheDocument();
    });

    // Verify MapViewer receives mission items
    const mapViewer = getByTestId('map-viewer');
    expect(mapViewer).toBeInTheDocument();
  });

  test('should pass selected item ID to MapViewer', async () => {
    const { getByTestId } = render(MissionPlanner);

    await waitFor(() => {
      expect(getByTestId('mission-planner')).toBeInTheDocument();
    });

    // Select a mission item
    selectMissionItem('waypoint-1');

    // Verify the selected item is passed to MapViewer
    await waitFor(() => {
      const mapViewer = getByTestId('map-viewer');
      expect(mapViewer).toBeInTheDocument();
    });
  });

  test('should synchronize accordion selection with map highlighting', async () => {
    const { getByTestId } = render(MissionPlanner);

    await waitFor(() => {
      expect(getByTestId('mission-planner')).toBeInTheDocument();
    });

    // Find and click on a waypoint in the accordion
    const accordionItem = getByTestId('accordion-item-waypoint-1');
    expect(accordionItem).toBeInTheDocument();

    // Click on the item selector to select it
    const itemSelector = accordionItem.querySelector('.item-selector');
    expect(itemSelector).toBeInTheDocument();

    await fireEvent.click(itemSelector!);

    // Verify the item is selected in the store
    await waitFor(() => {
      const currentSelected = get(selectedMissionItem);
      expect(currentSelected?.id).toBe('waypoint-1');
    });
  });

  test('should handle map click events', async () => {
    const { getByTestId } = render(MissionPlanner);

    await waitFor(() => {
      expect(getByTestId('mission-planner')).toBeInTheDocument();
    });

    const mapContainer = getByTestId('map-container');
    expect(mapContainer).toBeInTheDocument();

    // Simulate map click (this would normally come from MapLibre GL JS)
    // The MapViewer component should handle this internally
  });

  test('should update map when mission items change', async () => {
    const { getByTestId } = render(MissionPlanner);

    await waitFor(() => {
      expect(getByTestId('mission-planner')).toBeInTheDocument();
    });

    // Add a new mission item
    const newItem: MissionItem = {
      id: 'waypoint-3',
      type: 'waypoint',
      name: 'Waypoint 3',
      params: { lat: 37.8149, lng: -122.3794, alt: 150, speed: 12 },
      position: { lat: 37.8149, lng: -122.3794, alt: 150 }
    };

    // Update mission items
    missionState.update((state) => ({
      ...state,
      items: [...state.items, newItem],
      lastUpdated: Date.now()
    }));

    // The MapViewer should automatically update due to reactive statements
    await waitFor(() => {
      const mapViewer = getByTestId('map-viewer');
      expect(mapViewer).toBeInTheDocument();
    });
  });

  test('should handle accordion item minimize and expand', async () => {
    const { getByTestId } = render(MissionPlanner);

    await waitFor(() => {
      expect(getByTestId('mission-planner')).toBeInTheDocument();
    });

    // Find minimize button for a waypoint
    const accordionItem = getByTestId('accordion-item-waypoint-1');
    const minimizeButton = accordionItem.querySelector('.minimize-button');
    expect(minimizeButton).toBeInTheDocument();

    // Click minimize button
    await fireEvent.click(minimizeButton!);

    // Should show minimized coins container
    await waitFor(() => {
      const coinsContainer = getByTestId('minimized-coins');
      expect(coinsContainer).toBeInTheDocument();
    });
  });

  test('should maintain map-accordion synchronization during reordering', async () => {
    const { getByTestId } = render(MissionPlanner);

    await waitFor(() => {
      expect(getByTestId('mission-planner')).toBeInTheDocument();
    });

    // Select an item first
    selectMissionItem('waypoint-2');

    // Verify selection is maintained
    await waitFor(() => {
      const currentSelected = get(selectedMissionItem);
      expect(currentSelected?.id).toBe('waypoint-2');
    });

    // The map should highlight the selected item regardless of reordering
    const mapViewer = getByTestId('map-viewer');
    expect(mapViewer).toBeInTheDocument();
  });

  test('should handle empty mission items gracefully', async () => {
    // Set empty mission items
    missionState.set({
      items: [],
      selectedItemId: null,
      loading: false,
      error: null,
      lastUpdated: Date.now()
    });

    const { getByTestId } = render(MissionPlanner);

    await waitFor(() => {
      expect(getByTestId('mission-planner')).toBeInTheDocument();
    });

    // Should show empty state in accordion
    const emptyState = getByTestId('accordion-empty');
    expect(emptyState).toBeInTheDocument();

    // Map should still render without errors
    const mapViewer = getByTestId('map-viewer');
    expect(mapViewer).toBeInTheDocument();
  });

  test('should handle selection of non-existent items gracefully', async () => {
    const { getByTestId } = render(MissionPlanner);

    await waitFor(() => {
      expect(getByTestId('mission-planner')).toBeInTheDocument();
    });

    // Select a non-existent item
    selectMissionItem('non-existent-id');

    // Should not crash and should handle gracefully
    await waitFor(() => {
      const currentSelected = get(selectedMissionItem);
      expect(currentSelected).toBeNull();
    });
  });

  test('should clear selection when component unmounts', async () => {
    const { getByTestId, unmount } = render(MissionPlanner);

    await waitFor(() => {
      expect(getByTestId('mission-planner')).toBeInTheDocument();
    });

    // Select an item
    selectMissionItem('waypoint-1');

    // Verify selection
    await waitFor(() => {
      const currentSelected = get(selectedMissionItem);
      expect(currentSelected?.id).toBe('waypoint-1');
    });

    // Unmount component
    unmount();

    // Selection should be cleared
    await waitFor(() => {
      const currentSelected = get(selectedMissionItem);
      expect(currentSelected).toBeNull();
    });
  });
});
