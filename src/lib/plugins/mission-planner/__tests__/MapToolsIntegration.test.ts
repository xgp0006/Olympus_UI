/**
 * Integration tests for Map Tools with Mission Planner
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import MapToolsController from '../MapToolsController.svelte';
import LocationEntry from '$lib/map-features/location-entry/LocationEntry.svelte';
import type { Coordinate } from '$lib/map-features/types';

describe('MapToolsController Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with draggable container', async () => {
    const { container, getByText } = render(MapToolsController, {
      props: {
        id: 'test-map-tools',
        title: 'Test Map Tools'
      }
    });

    expect(getByText('Test Map Tools')).toBeInTheDocument();
    expect(getByText('Location Entry')).toBeInTheDocument();
    
    // Check for draggable container
    const draggableContainer = container.querySelector('.draggable-container');
    expect(draggableContainer).toBeInTheDocument();
  });

  it('should handle coordinate selection', async () => {
    let selectedCoordinate: Coordinate | null = null;
    
    const { component, getByPlaceholderText } = render(MapToolsController, {
      props: {
        id: 'test-map-tools',
        title: 'Test Map Tools'
      }
    });

    component.$on('coordinateSelect', (event: CustomEvent) => {
      selectedCoordinate = event.detail.coordinate;
    });

    // Enter coordinates
    const input = getByPlaceholderText('Enter coordinates or click on map...');
    await fireEvent.input(input, { target: { value: '37.7749, -122.4194' } });

    // Wait for debounced validation
    await waitFor(() => {
      expect(selectedCoordinate).toBeTruthy();
    }, { timeout: 500 });

    expect(selectedCoordinate).toBeTruthy();
    if (selectedCoordinate !== null) {
      expect(selectedCoordinate.format).toBe('latlong');
    }
  });

  it('should handle minimize state', async () => {
    let isMinimized = false;
    
    const { component, getByLabelText } = render(MapToolsController, {
      props: {
        id: 'test-map-tools',
        title: 'Test Map Tools'
      }
    });

    component.$on('minimize', (event: CustomEvent) => {
      isMinimized = event.detail.minimized;
    });

    // Click minimize button
    const minimizeButton = getByLabelText('Minimize');
    await fireEvent.click(minimizeButton);

    expect(isMinimized).toBe(true);
  });

  it('should persist position in localStorage', async () => {
    const { container } = render(MapToolsController, {
      props: {
        id: 'test-map-tools',
        title: 'Test Map Tools',
        initialX: 100,
        initialY: 200
      }
    });

    // Simulate drag
    const dragHandle = container.querySelector('.drag-handle');
    expect(dragHandle).toBeInTheDocument();

    // Check localStorage after mount
    await waitFor(() => {
      const stored = localStorage.getItem('draggable-test-map-tools');
      expect(stored).toBeTruthy();
    });
  });
});

describe('LocationEntry Integration', () => {
  it('should auto-detect coordinate format', async () => {
    let detectedFormat: string | null = null;
    
    const { component, getByRole } = render(LocationEntry, {
      props: {
        formats: ['latlong', 'utm', 'mgrs'],
        defaultFormat: 'latlong'
      }
    });

    component.$on('formatChange', (event: CustomEvent) => {
      detectedFormat = event.detail.format;
    });

    const input = getByRole('textbox');
    
    // Enter UTM coordinates
    await fireEvent.input(input, { target: { value: '18T 585628 4511322' } });

    await waitFor(() => {
      expect(detectedFormat).toBe('utm');
    });
  });

  it('should validate coordinates with performance metrics', async () => {
    let validationResult: any = null;
    
    const { component, getByRole } = render(LocationEntry, {
      props: {
        formats: ['latlong', 'utm', 'mgrs'],
        defaultFormat: 'latlong'
      }
    });

    component.$on('validation', (event: CustomEvent) => {
      validationResult = event.detail.result;
    });

    const input = getByRole('textbox');
    
    // Enter invalid coordinates
    await fireEvent.input(input, { target: { value: '999, 999' } });

    await waitFor(() => {
      expect(validationResult).toBeTruthy();
      expect(validationResult.valid).toBe(false);
      expect(validationResult.error).toContain('must be between');
    });
  });

  it('should handle paste events', async () => {
    let selectedCoordinate: Coordinate | null = null;
    
    const { component, getByRole } = render(LocationEntry, {
      props: {
        formats: ['latlong'],
        defaultFormat: 'latlong'
      }
    });

    component.$on('select', (event: CustomEvent) => {
      selectedCoordinate = event.detail.coordinate;
    });

    const input = getByRole('textbox');
    
    // Simulate paste
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: new DataTransfer()
    });
    Object.defineProperty(pasteEvent.clipboardData, 'getData', {
      value: () => '40.7128, -74.0060'
    });
    
    await fireEvent(input, pasteEvent);

    await waitFor(() => {
      expect(selectedCoordinate).toBeTruthy();
      expect(selectedCoordinate?.raw).toBe('40.7128, -74.0060');
    });
  });
});