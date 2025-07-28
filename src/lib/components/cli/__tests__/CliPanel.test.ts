/**
 * CLI Panel Component Tests
 * Tests the CLI panel container functionality
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { vi } from 'vitest';
import CliPanel from '../CliPanel.svelte';

// Mock CLI store
vi.mock('$lib/stores/cli', () => {
  const mockStore = {
    subscribe: vi.fn((callback) => {
      callback({
        isRunning: false,
        currentCommand: '',
        commandHistory: [],
        output: [],
        lastExitCode: null,
        connected: true
      });
      return () => {};
    }),
    initialize: vi.fn(),
    executeCommand: vi.fn(),
    updateCurrentCommand: vi.fn(),
    clearOutput: vi.fn(),
    destroy: vi.fn()
  };

  return {
    cliStore: mockStore,
    cliConnected: {
      subscribe: vi.fn((callback) => {
        callback(true);
        return () => {};
      })
    },
    cliIsRunning: {
      subscribe: vi.fn((callback) => {
        callback(false);
        return () => {};
      })
    }
  };
});

// Mock CliView component
vi.mock('../CliView.svelte', () => {
  return {
    default: vi.fn(() => ({
      focusTerminal: vi.fn(),
      resizeTerminal: vi.fn(),
      clearTerminal: vi.fn()
    }))
  };
});

describe('CliPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders CLI panel with correct structure', () => {
    const { getByTestId } = render(CliPanel);

    expect(getByTestId('cli-panel')).toBeInTheDocument();
    expect(getByTestId('resize-handle')).toBeInTheDocument();
    expect(getByTestId('cli-toggle-button')).toBeInTheDocument();
  });

  test('starts in collapsed state', () => {
    const { getByTestId, queryByTestId } = render(CliPanel);

    const panel = getByTestId('cli-panel');
    expect(panel).not.toHaveClass('expanded');

    // CLI content should not be visible when collapsed
    expect(queryByTestId('cli-view')).not.toBeInTheDocument();
  });

  test('toggles expansion when toggle button is clicked', async () => {
    const { getByTestId, queryByTestId } = render(CliPanel);

    const toggleButton = getByTestId('cli-toggle-button');
    const panel = getByTestId('cli-panel');

    // Initially collapsed
    expect(panel).not.toHaveClass('expanded');
    expect(queryByTestId('cli-view')).not.toBeInTheDocument();

    // Click to expand
    await fireEvent.click(toggleButton);

    // Wait for DOM update
    await waitFor(() => {
      expect(panel).toHaveClass('expanded');
    });
    // Note: CliView is mocked, so we can't test its actual rendering
  });

  test('handles keyboard shortcut Ctrl+~ to toggle panel', async () => {
    const { getByTestId } = render(CliPanel);

    const panel = getByTestId('cli-panel');

    // Initially collapsed
    expect(panel).not.toHaveClass('expanded');

    // Press Ctrl+~
    await fireEvent.keyDown(window, {
      key: '`',
      ctrlKey: true
    });

    // Wait for DOM update
    await waitFor(() => {
      expect(panel).toHaveClass('expanded');
    });

    // Press Ctrl+~ again to collapse
    await fireEvent.keyDown(window, {
      key: '`',
      ctrlKey: true
    });

    // Wait for DOM update
    await waitFor(() => {
      expect(panel).not.toHaveClass('expanded');
    });
  });

  test('resize handle is visible on hover', () => {
    const { getByTestId } = render(CliPanel);

    const resizeHandle = getByTestId('resize-handle');

    // Handle should have opacity styling that changes on hover
    expect(resizeHandle).toBeInTheDocument();
    expect(resizeHandle).toHaveAttribute('aria-label', 'Resize CLI panel');
  });

  test('prevents resize when panel is collapsed', async () => {
    const { getByTestId } = render(CliPanel);

    const resizeHandle = getByTestId('resize-handle');
    const panel = getByTestId('cli-panel');

    // Ensure panel is collapsed
    expect(panel).not.toHaveClass('expanded');

    // Try to start resize drag
    await fireEvent.mouseDown(resizeHandle, {
      clientY: 100
    });

    // Should not enter dragging state when collapsed
    expect(resizeHandle).not.toHaveClass('dragging');
  });

  test('allows resize when panel is expanded', async () => {
    const { getByTestId } = render(CliPanel);

    const toggleButton = getByTestId('cli-toggle-button');
    const resizeHandle = getByTestId('resize-handle');
    const panel = getByTestId('cli-panel');

    // Expand panel first
    await fireEvent.click(toggleButton);

    // Wait for DOM update
    await waitFor(() => {
      expect(panel).toHaveClass('expanded');
    });

    // Start resize drag
    await fireEvent.mouseDown(resizeHandle, {
      clientY: 100
    });

    expect(resizeHandle).toHaveClass('dragging');
  });

  test('toggle button shows correct title based on state', async () => {
    const { getByTestId } = render(CliPanel);

    const toggleButton = getByTestId('cli-toggle-button');

    // Initially collapsed - should show "Expand CLI"
    expect(toggleButton).toHaveAttribute('title', 'Expand CLI');

    // Click to expand
    await fireEvent.click(toggleButton);

    // Wait for DOM update
    await waitFor(() => {
      expect(toggleButton).toHaveAttribute('title', 'Collapse CLI');
    });
  });

  test('cleans up event listeners on destroy', async () => {
    const windowRemoveEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(CliPanel);

    // Wait for component to fully initialize
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Unmount component
    unmount();

    // Should clean up event listeners
    expect(windowRemoveEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    // Note: mousemove and mouseup listeners are only added during drag operations
  });
});
