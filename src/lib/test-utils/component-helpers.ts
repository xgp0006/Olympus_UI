/**
 * Component Testing Helpers
 * Provides utilities for testing Svelte components consistently
 */

import { render, type RenderOptions, type RenderResult } from '@testing-library/svelte';
import { vi } from 'vitest';
import type { SvelteComponent } from 'svelte';

/**
 * Enhanced render function with common setup
 */
export function renderComponent<T extends SvelteComponent>(
  Component: any,
  options: RenderOptions<T> = {}
): RenderResult<T> {
  // Set up common test environment
  const defaultOptions: RenderOptions<T> = {
    ...options
  };

  return render(Component, defaultOptions);
}

/**
 * Render component with theme provider wrapper
 */
export function renderWithTheme<T extends SvelteComponent>(
  Component: any,
  options: RenderOptions<T> = {}
): RenderResult<T> {
  // Mock theme store
  vi.doMock('$lib/stores/theme', () => ({
    theme: {
      subscribe: vi.fn((callback) => {
        callback(mockTheme);
        return vi.fn(); // unsubscribe function
      })
    }
  }));

  return renderComponent(Component, options);
}

/**
 * Render component with error boundary
 */
export function renderWithErrorBoundary<T extends SvelteComponent>(
  Component: any,
  options: RenderOptions<T> = {}
): RenderResult<T> {
  // This would wrap the component with ErrorBoundary in a real implementation
  return renderComponent(Component, options);
}

/**
 * Mock theme data for testing
 */
export const mockTheme = {
  name: 'test-theme',
  metadata: {
    author: 'Test',
    version: '1.0.0'
  },
  colors: {
    background_primary: '#000000',
    background_secondary: '#111111',
    background_tertiary: '#222222',
    text_primary: '#ffffff',
    text_secondary: '#cccccc',
    text_disabled: '#666666',
    accent_yellow: '#ffff00',
    accent_blue: '#0066ff',
    accent_red: '#ff0000',
    accent_green: '#00ff00'
  },
  typography: {
    font_family_sans: 'Arial, sans-serif',
    font_family_mono: 'Courier, monospace',
    font_size_base: '14px',
    font_size_lg: '16px',
    font_size_sm: '12px'
  },
  layout: {
    border_radius: '4px',
    border_width: '1px',
    spacing_unit: '8px'
  },
  components: {
    cli: {
      background: '#000000',
      text_color: '#ffffff',
      cursor_color: '#ffffff',
      cursor_shape: 'block'
    },
    map: {
      waypoint_color_default: '#0066ff',
      waypoint_color_selected: '#ffff00',
      path_color: '#00ff00',
      geofence_color: '#ff0000'
    },
    button: {
      background_default: '#333333',
      text_color_default: '#ffffff',
      background_hover: '#444444',
      background_accent: '#0066ff',
      text_color_accent: '#ffffff'
    },
    plugin_card: {
      background: '#111111',
      background_hover: '#222222',
      icon_color: '#ffffff',
      text_color: '#ffffff',
      border_radius: '8px'
    },
    accordion: {
      background: '#111111',
      border_color: '#333333',
      header_text_color: '#ffffff'
    },
    hex_coin: {
      background: '#333333',
      icon_color: '#ffffff',
      border_color_default: '#666666',
      border_color_pinned: '#ffff00',
      snap_point_color: '#0066ff'
    }
  }
};

/**
 * Wait for component to be fully rendered
 */
export async function waitForComponentReady(container: HTMLElement): Promise<void> {
  // Wait for any pending updates
  await new Promise((resolve) => setTimeout(resolve, 0));

  // Wait for any animations to complete
  await new Promise((resolve) => setTimeout(resolve, 100));
}

/**
 * Get component by test ID with better error messages
 */
export function getByTestIdSafe(container: HTMLElement, testId: string): HTMLElement {
  const element = container.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
  if (!element) {
    throw new Error(
      `Element with test ID "${testId}" not found. Available test IDs: ${getAvailableTestIds(container).join(', ')}`
    );
  }
  return element;
}

/**
 * Get all available test IDs in container
 */
export function getAvailableTestIds(container: HTMLElement): string[] {
  const elements = container.querySelectorAll('[data-testid]');
  return Array.from(elements)
    .map((el) => el.getAttribute('data-testid'))
    .filter(Boolean) as string[];
}

/**
 * Mock Svelte store for testing
 */
export function createMockStore<T>(initialValue: T) {
  let value = initialValue;
  const subscribers = new Set<(value: T) => void>();

  return {
    subscribe: vi.fn((callback: (value: T) => void) => {
      subscribers.add(callback);
      callback(value);
      return vi.fn(() => subscribers.delete(callback));
    }),
    set: vi.fn((newValue: T) => {
      value = newValue;
      subscribers.forEach((callback) => callback(value));
    }),
    update: vi.fn((updater: (value: T) => T) => {
      value = updater(value);
      subscribers.forEach((callback) => callback(value));
    }),
    get: () => value
  };
}

/**
 * Mock event dispatcher for testing
 */
export function createMockEventDispatcher() {
  const events = new Map<string, ReturnType<typeof vi.fn>>();

  return {
    dispatch: vi.fn((type: string, detail?: unknown) => {
      const handler = events.get(type);
      if (handler) {
        handler({ type, detail });
      }
    }),
    on: (type: string, handler: ReturnType<typeof vi.fn>) => {
      events.set(type, handler);
    },
    getDispatchedEvents: (type?: string) => {
      if (type) {
        const handler = events.get(type);
        return handler ? handler.mock.calls : [];
      }
      return Array.from(events.entries()).reduce(
        (acc, [eventType, handler]) => {
          acc[eventType] = handler.mock.calls;
          return acc;
        },
        {} as Record<string, unknown[]>
      );
    }
  };
}
