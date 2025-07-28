/**
 * Waypoint Item Component Tests
 * Requirements: 4.8, 4.9, 6.9
 */

import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { vi } from 'vitest';
import WaypointItem from '../WaypointItem.svelte';
import type { MissionItem } from '../types';

// Mock mission store
vi.mock('$lib/stores/mission', () => ({
  updateWaypointParams: vi.fn()
}));

describe('WaypointItem', () => {
  const mockWaypoint: MissionItem = {
    id: 'waypoint-1',
    type: 'waypoint',
    name: 'Test Waypoint',
    params: { lat: 37.7749, lng: -122.4194, alt: 150, speed: 10 },
    position: { lat: 37.7749, lng: -122.4194, alt: 150 }
  };

  const mockTakeoff: MissionItem = {
    id: 'takeoff-1',
    type: 'takeoff',
    name: 'Takeoff Point',
    params: { lat: 37.7749, lng: -122.4194, alt: 100, speed: 5 },
    position: { lat: 37.7749, lng: -122.4194, alt: 100 }
  };

  const mockLoiter: MissionItem = {
    id: 'loiter-1',
    type: 'loiter',
    name: 'Loiter Point',
    params: { lat: 37.7749, lng: -122.4194, alt: 200, speed: 8, action: 'loiter' },
    position: { lat: 37.7749, lng: -122.4194, alt: 200 }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders without errors', () => {
    const { getByTestId } = render(WaypointItem, {
      props: { item: mockWaypoint, isSelected: false }
    });

    expect(getByTestId('waypoint-item-waypoint-1')).toBeInTheDocument();
  });

  test('displays item information correctly', () => {
    const { getByTestId } = render(WaypointItem, {
      props: { item: mockWaypoint, isSelected: false }
    });

    const itemElement = getByTestId('waypoint-item-waypoint-1');

    // Check item name
    expect(itemElement).toHaveTextContent('Test Waypoint');

    // Check item type
    expect(itemElement).toHaveTextContent('WAYPOINT');

    // Check coordinates
    expect(itemElement).toHaveTextContent('37.7749, -122.4194');

    // Check altitude
    expect(itemElement).toHaveTextContent('150m');
  });

  test('toggles edit mode when edit button is clicked', async () => {
    const { container } = render(WaypointItem, {
      props: { item: mockWaypoint, isSelected: true }
    });

    const editButton = container.querySelector('.edit-button');
    expect(editButton).toBeInTheDocument();

    // Initially not in edit mode
    expect(container.querySelector('.parameter-editor')).not.toBeInTheDocument();

    // Click edit button
    await fireEvent.click(editButton!);

    // Should now be in edit mode
    expect(container.querySelector('.parameter-editor')).toBeInTheDocument();
  });

  test('displays correct parameters for waypoint type', async () => {
    const { container } = render(WaypointItem, {
      props: { item: mockWaypoint, isSelected: true }
    });

    // Enter edit mode
    const editButton = container.querySelector('.edit-button');
    await fireEvent.click(editButton!);

    // Check that waypoint-specific parameters are shown
    expect(container.querySelector('label[for="waypoint-1-lat"]')).toHaveTextContent('Latitude');
    expect(container.querySelector('label[for="waypoint-1-lng"]')).toHaveTextContent('Longitude');
    expect(container.querySelector('label[for="waypoint-1-alt"]')).toHaveTextContent('Altitude');
    expect(container.querySelector('label[for="waypoint-1-speed"]')).toHaveTextContent('Speed');
  });

  test('displays correct parameters for takeoff type', async () => {
    const { container } = render(WaypointItem, {
      props: { item: mockTakeoff, isSelected: true }
    });

    // Enter edit mode
    const editButton = container.querySelector('.edit-button');
    await fireEvent.click(editButton!);

    // Check that takeoff-specific parameters are shown
    expect(container.querySelector('label[for="takeoff-1-speed"]')).toHaveTextContent('Climb Rate');
  });

  test('displays action selector for loiter type', async () => {
    const { container } = render(WaypointItem, {
      props: { item: mockLoiter, isSelected: true }
    });

    // Enter edit mode
    const editButton = container.querySelector('.edit-button');
    await fireEvent.click(editButton!);

    // Check that action selector is shown
    const actionSelect = container.querySelector('select[id="loiter-1-action"]');
    expect(actionSelect).toBeInTheDocument();
    expect(actionSelect).toHaveValue('loiter');
  });

  test('handles parameter changes', async () => {
    const { container } = render(WaypointItem, {
      props: { item: mockWaypoint, isSelected: true }
    });

    // Enter edit mode
    const editButton = container.querySelector('.edit-button');
    await fireEvent.click(editButton!);

    // Change latitude
    const latInput = container.querySelector('input[id="waypoint-1-lat"]') as HTMLInputElement;
    expect(latInput).toBeInTheDocument();

    await fireEvent.input(latInput, { target: { value: '38.0000' } });

    // Check that changes indicator appears
    expect(container.querySelector('.changes-indicator')).toBeInTheDocument();
  });

  test('validates parameters correctly', async () => {
    const { container } = render(WaypointItem, {
      props: { item: mockWaypoint, isSelected: true }
    });

    // Enter edit mode
    const editButton = container.querySelector('.edit-button');
    await fireEvent.click(editButton!);

    // Enter invalid latitude
    const latInput = container.querySelector('input[id="waypoint-1-lat"]') as HTMLInputElement;
    await fireEvent.input(latInput, { target: { value: '95' } });

    // Try to save
    const saveButton = container.querySelector('.save-button');
    await fireEvent.click(saveButton!);

    // Should show error
    await waitFor(() => {
      expect(container.querySelector('.error-message')).toBeInTheDocument();
      expect(container.querySelector('.error-message')).toHaveTextContent(
        'Latitude must be between -90 and 90 degrees'
      );
    });
  });

  test('saves changes successfully', async () => {
    const { updateWaypointParams } = await import('$lib/stores/mission');
    const { container, component } = render(WaypointItem, {
      props: { item: mockWaypoint, isSelected: true }
    });

    const updateHandler = vi.fn();
    component.$on('update', updateHandler);

    // Enter edit mode
    const editButton = container.querySelector('.edit-button');
    await fireEvent.click(editButton!);

    // Change altitude
    const altInput = container.querySelector('input[id="waypoint-1-alt"]') as HTMLInputElement;
    await fireEvent.input(altInput, { target: { value: '200' } });

    // Save changes
    const saveButton = container.querySelector('.save-button');
    await fireEvent.click(saveButton!);

    await waitFor(() => {
      expect(updateWaypointParams).toHaveBeenCalledWith('waypoint-1', {
        lat: 37.7749,
        lng: -122.4194,
        alt: 200,
        speed: 10
      });
    });

    expect(updateHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: {
          itemId: 'waypoint-1',
          params: expect.objectContaining({ alt: 200 })
        }
      })
    );
  });

  test('handles save errors gracefully', async () => {
    const { updateWaypointParams } = await import('$lib/stores/mission');
    vi.mocked(updateWaypointParams).mockRejectedValue(new Error('Save failed'));

    const { container, component } = render(WaypointItem, {
      props: { item: mockWaypoint, isSelected: true }
    });

    const errorHandler = vi.fn();
    component.$on('error', errorHandler);

    // Enter edit mode
    const editButton = container.querySelector('.edit-button');
    await fireEvent.click(editButton!);

    // Change altitude
    const altInput = container.querySelector('input[id="waypoint-1-alt"]') as HTMLInputElement;
    await fireEvent.input(altInput, { target: { value: '200' } });

    // Try to save
    const saveButton = container.querySelector('.save-button');
    await fireEvent.click(saveButton!);

    await waitFor(() => {
      expect(container.querySelector('.error-message')).toBeInTheDocument();
      expect(container.querySelector('.error-message')).toHaveTextContent('Save failed');
    });

    expect(errorHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: 'Save failed'
      })
    );
  });

  test('cancels changes correctly', async () => {
    const { container } = render(WaypointItem, {
      props: { item: mockWaypoint, isSelected: true }
    });

    // Enter edit mode
    const editButton = container.querySelector('.edit-button');
    await fireEvent.click(editButton!);

    // Change altitude
    const altInput = container.querySelector('input[id="waypoint-1-alt"]') as HTMLInputElement;
    await fireEvent.input(altInput, { target: { value: '200' } });

    // Verify changes indicator is shown
    expect(container.querySelector('.changes-indicator')).toBeInTheDocument();

    // Cancel changes
    const cancelButton = container.querySelector('.cancel-button');
    await fireEvent.click(cancelButton!);

    // Should exit edit mode and revert changes
    expect(container.querySelector('.parameter-editor')).not.toBeInTheDocument();
  });

  test('handles keyboard shortcuts', async () => {
    const { updateWaypointParams } = await import('$lib/stores/mission');
    const { container } = render(WaypointItem, {
      props: { item: mockWaypoint, isSelected: true }
    });

    // Enter edit mode
    const editButton = container.querySelector('.edit-button');
    await fireEvent.click(editButton!);

    // Change altitude
    const altInput = container.querySelector('input[id="waypoint-1-alt"]') as HTMLInputElement;
    await fireEvent.input(altInput, { target: { value: '200' } });

    // Test Ctrl+Enter to save
    const parameterEditor = container.querySelector('.parameter-editor');
    await fireEvent.keyDown(parameterEditor!, { key: 'Enter', ctrlKey: true });

    await waitFor(() => {
      expect(updateWaypointParams).toHaveBeenCalled();
    });
  });

  test('handles escape key to cancel', async () => {
    const { container } = render(WaypointItem, {
      props: { item: mockWaypoint, isSelected: true }
    });

    // Enter edit mode
    const editButton = container.querySelector('.edit-button');
    await fireEvent.click(editButton!);

    // Change altitude
    const altInput = container.querySelector('input[id="waypoint-1-alt"]') as HTMLInputElement;
    await fireEvent.input(altInput, { target: { value: '200' } });

    // Test Escape to cancel
    const parameterEditor = container.querySelector('.parameter-editor');
    await fireEvent.keyDown(parameterEditor!, { key: 'Escape' });

    // Should exit edit mode
    expect(container.querySelector('.parameter-editor')).not.toBeInTheDocument();
  });

  test('handles minimize button click', async () => {
    const { container, component } = render(WaypointItem, {
      props: { item: mockWaypoint, isSelected: true }
    });

    const minimizeHandler = vi.fn();
    component.$on('minimize', minimizeHandler);

    const minimizeButton = container.querySelector('.minimize-button');
    await fireEvent.click(minimizeButton!);

    expect(minimizeHandler).toHaveBeenCalled();
  });

  test('disables inputs while saving', async () => {
    const { updateWaypointParams } = await import('$lib/stores/mission');

    // Mock a slow save operation
    vi.mocked(updateWaypointParams).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const { container } = render(WaypointItem, {
      props: { item: mockWaypoint, isSelected: true }
    });

    // Enter edit mode
    const editButton = container.querySelector('.edit-button');
    await fireEvent.click(editButton!);

    // Change altitude
    const altInput = container.querySelector('input[id="waypoint-1-alt"]') as HTMLInputElement;
    await fireEvent.input(altInput, { target: { value: '200' } });

    // Start save
    const saveButton = container.querySelector('.save-button');
    await fireEvent.click(saveButton!);

    // Inputs should be disabled during save
    expect(altInput).toBeDisabled();
    expect(container.querySelector('.cancel-button')).toBeDisabled();
  });

  test('formats coordinates correctly', () => {
    const { container } = render(WaypointItem, {
      props: { item: mockWaypoint, isSelected: false }
    });

    // Check coordinate formatting
    expect(container).toHaveTextContent('37.7749, -122.4194');
  });
});
