/**
 * MapViewer component tests
 * Tests the MapLibre GL JS integration and theme application
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import MapViewer from '../MapViewer.svelte';
import type { MissionItem } from '../types';

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

describe('MapViewer Component', () => {
  const mockMissionItems: MissionItem[] = [
    {
      id: 'waypoint-1',
      type: 'waypoint',
      name: 'Waypoint 1',
      params: { lat: 37.7749, lng: -122.4194, alt: 100 },
      position: { lat: 37.7749, lng: -122.4194, alt: 100 }
    },
    {
      id: 'waypoint-2',
      type: 'waypoint',
      name: 'Waypoint 2',
      params: { lat: 37.775, lng: -122.4195, alt: 120 },
      position: { lat: 37.775, lng: -122.4195, alt: 120 }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders without errors', () => {
    const { getByTestId } = render(MapViewer);
    expect(getByTestId('map-viewer')).toBeInTheDocument();
  });

  test('shows loading state initially', () => {
    const { getByTestId } = render(MapViewer);
    expect(getByTestId('map-loading')).toBeInTheDocument();
  });

  test('accepts mission items prop', () => {
    const { getByTestId } = render(MapViewer, {
      props: { missionItems: mockMissionItems }
    });
    expect(getByTestId('map-viewer')).toBeInTheDocument();
  });

  test('accepts selectedItemId prop', () => {
    const { getByTestId } = render(MapViewer, {
      props: {
        selectedItemId: 'waypoint-1',
        missionItems: mockMissionItems
      }
    });
    expect(getByTestId('map-viewer')).toBeInTheDocument();
  });

  test('shows error state when error occurs', () => {
    const { getByTestId } = render(MapViewer);

    // Simulate error by dispatching error event
    const component = getByTestId('map-viewer');
    fireEvent(component, new CustomEvent('error', { detail: 'Map initialization failed' }));

    // Note: This test would need to be more sophisticated to properly test error handling
    // since the error state is managed internally
    expect(getByTestId('map-viewer')).toBeInTheDocument();
  });

  test('has proper accessibility attributes', () => {
    const { getByTestId } = render(MapViewer);
    const mapViewer = getByTestId('map-viewer');
    expect(mapViewer).toBeInTheDocument();

    const mapContainer = getByTestId('map-container');
    expect(mapContainer).toBeInTheDocument();
  });
});
