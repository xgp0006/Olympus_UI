/**
 * Mock Factories - Factory functions for creating test data
 * Provides consistent mock data for testing
 */

import { vi } from 'vitest';
import type { Plugin } from '$lib/types/plugin';
import type { MissionItem } from '$lib/plugins/mission-planner/types';
import type { Notification } from '$lib/stores/notifications';
import type { SdrSettings, FFTData } from '$lib/plugins/sdr-suite/types';
import type { Theme } from '$lib/types/theme';

// Define SdrDevice interface locally since it's not exported
interface SdrDevice {
  id: string;
  name: string;
  driver: string;
  serial: string;
  available: boolean;
}

/**
 * Plugin mock factory
 * Supports both new signature (overrides object) and legacy signature (id, name, overrides)
 */
export function createMockPlugin(
  idOrOverrides?: string | Partial<Plugin>,
  name?: string,
  overrides?: Partial<Plugin>
): Plugin {
  // Handle legacy signature: createMockPlugin(id, name, overrides)
  if (typeof idOrOverrides === 'string') {
    return {
      id: idOrOverrides,
      name: name || 'Test Plugin',
      description: 'A test plugin for unit testing',
      icon: 'test-icon',
      enabled: true,
      ...overrides
    };
  }

  // Handle new signature: createMockPlugin(overrides)
  const pluginOverrides = idOrOverrides || {};
  return {
    id: 'test-plugin',
    name: 'Test Plugin',
    description: 'A test plugin for unit testing',
    icon: 'test-icon',
    enabled: true,
    ...pluginOverrides
  };
}

/**
 * NASA JPL Rule 4: Split function - Create default theme colors
 */
function createDefaultThemeColors(): Theme['colors'] {
  return {
    background_primary: '#000000',
    background_secondary: '#111111',
    background_tertiary: '#222222',
    text_primary: '#ffffff',
    text_secondary: '#cccccc',
    text_disabled: '#666666',
    accent_yellow: '#ffff00',
    accent_blue: '#00bfff',
    accent_red: '#ff4444',
    accent_green: '#44ff44'
  };
}

/**
 * NASA JPL Rule 4: Split function - Create default theme components
 */
function createDefaultThemeComponents(): Theme['components'] {
  return {
    cli: {
      background: '#000000',
      text_color: '#ffffff',
      cursor_color: '#00bfff',
      cursor_shape: 'block'
    },
    map: {
      waypoint_color_default: '#00bfff',
      waypoint_color_selected: '#ffff00',
      path_color: '#44ff44',
      geofence_color: '#ff4444'
    },
    button: {
      background_default: '#222222',
      text_color_default: '#ffffff',
      background_hover: '#333333',
      background_accent: '#00bfff',
      text_color_accent: '#ffffff'
    },
    plugin_card: {
      background: '#111111',
      background_hover: '#222222',
      icon_color: '#00bfff',
      text_color: '#ffffff',
      border_radius: '8px'
    },
    accordion: {
      background: '#111111',
      border_color: '#333333',
      header_text_color: '#ffffff'
    },
    hex_coin: {
      background: '#222222',
      icon_color: '#00bfff',
      border_color_default: '#666666',
      border_color_pinned: '#00bfff',
      snap_point_color: '#ffff00'
    },
    sdr: {
      spectrum_line_color: '#00bfff',
      spectrum_fill_color: 'rgba(0, 191, 255, 0.3)',
      waterfall_color_gradient:
        'linear-gradient(to right, #000080, #0000ff, #00ffff, #ffff00, #ff0000)',
      grid_line_color: '#333333',
      axis_label_color: '#cccccc'
    }
  };
}

/**
 * Theme mock factory
 * NASA JPL Rule 4: Function refactored to be ≤60 lines
 */
export function createMockTheme(overrides: Partial<Theme> = {}): Theme {
  return {
    name: 'Super AMOLED Black',
    metadata: {
      author: 'Test Author',
      version: '1.0.0'
    },
    colors: createDefaultThemeColors(),
    typography: {
      font_family_sans: 'Inter, sans-serif',
      font_family_mono: 'JetBrains Mono, monospace',
      font_size_base: '14px',
      font_size_lg: '18px',
      font_size_sm: '12px'
    },
    layout: {
      border_radius: '6px',
      border_width: '1px',
      spacing_unit: '8px'
    },
    components: createDefaultThemeComponents(),
    animations: {
      transition_duration: '200ms',
      easing_function: 'cubic-bezier(0.4, 0, 0.2, 1)',
      hover_scale: '1.02',
      button_press_scale: '0.98'
    },
    ...overrides
  };
}

/**
 * Mission item mock factory
 * Supports both new signature (overrides object) and legacy signature (type, params, overrides)
 */
export function createMockMissionItem(
  typeOrOverrides?: string | Partial<MissionItem>,
  params?: { lat: number; lng: number; alt: number; speed?: number },
  overrides?: Partial<MissionItem>
): MissionItem {
  // Handle legacy signature: createMockMissionItem(type, params, overrides)
  if (typeof typeOrOverrides === 'string') {
    const baseParams = params || { lat: 37.7749, lng: -122.4194, alt: 100, speed: 5 };
    return {
      id: 'mission-item-1',
      type: typeOrOverrides as MissionItem['type'],
      name: `Test ${typeOrOverrides.charAt(0).toUpperCase() + typeOrOverrides.slice(1)}`,
      params: baseParams,
      position: {
        lat: baseParams.lat,
        lng: baseParams.lng,
        alt: baseParams.alt
      },
      ...overrides
    };
  }

  // Handle new signature: createMockMissionItem(overrides)
  const itemOverrides = typeOrOverrides || {};
  return {
    id: 'mission-item-1',
    type: 'waypoint',
    name: 'Test Waypoint',
    params: {
      lat: 37.7749,
      lng: -122.4194,
      alt: 100,
      speed: 5
    },
    position: {
      lat: 37.7749,
      lng: -122.4194,
      alt: 100
    },
    ...itemOverrides
  };
}

/**
 * Waypoint parameters mock factory
 */
export function createMockWaypointParams(
  overrides: Partial<{ lat: number; lng: number; alt: number; speed?: number }> = {}
): { lat: number; lng: number; alt: number; speed?: number } {
  return {
    lat: 37.7749,
    lng: -122.4194,
    alt: 100,
    speed: 5,
    ...overrides
  };
}

/**
 * Notification mock factory
 */
export function createMockNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notification-1',
    type: 'info',
    message: 'Test notification',
    timestamp: Date.now(),
    timeout: 5000,
    ...overrides
  };
}

/**
 * SDR settings mock factory
 */
export function createMockSdrSettings(overrides: Partial<SdrSettings> = {}): SdrSettings {
  return {
    centerFrequency: 100000000,
    sampleRate: 2048000,
    gain: 20,
    bandwidth: 2048000,
    ...overrides
  };
}

/**
 * SDR device mock factory
 */
export function createMockSdrDevice(overrides: Partial<SdrDevice> = {}): SdrDevice {
  return {
    id: 'rtl-sdr-0',
    name: 'RTL-SDR Device',
    driver: 'rtlsdr',
    serial: '00000001',
    available: true,
    ...overrides
  };
}

/**
 * FFT data mock factory
 */
export function createMockFFTData(overrides: Partial<FFTData> = {}): FFTData {
  const frequencies = Array.from({ length: 1024 }, (_, i) => 100000000 + i * 2000);
  const magnitudes = Array.from({ length: 1024 }, () => Math.random() * -80 - 20);

  return {
    frequencies,
    magnitudes,
    timestamp: Date.now(),
    centerFrequency: 100000000,
    sampleRate: 2048000,
    ...overrides
  };
}

/**
 * Mock Tauri API
 */
export function createMockTauriApi() {
  return {
    invoke: vi.fn(),
    listen: vi.fn(),
    emit: vi.fn(),
    fs: {
      readTextFile: vi.fn(),
      writeTextFile: vi.fn(),
      exists: vi.fn()
    },
    event: {
      listen: vi.fn(),
      emit: vi.fn()
    }
  };
}

/**
 * Mock xterm.js Terminal
 */
export function createMockTerminal() {
  return {
    open: vi.fn(),
    write: vi.fn(),
    writeln: vi.fn(),
    clear: vi.fn(),
    dispose: vi.fn(),
    onData: vi.fn(),
    onResize: vi.fn(),
    loadAddon: vi.fn(),
    buffer: {
      active: {
        cursorY: 0,
        getLine: vi.fn(() => ({
          translateToString: vi.fn(() => 'test command')
        }))
      }
    },
    cols: 80,
    rows: 24
  };
}

/**
 * Mock MapLibre GL Map
 */
export function createMockMap() {
  return {
    on: vi.fn(),
    off: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    removeSource: vi.fn(),
    setCenter: vi.fn(),
    setZoom: vi.fn(),
    flyTo: vi.fn(),
    getSource: vi.fn(),
    getLayer: vi.fn(),
    resize: vi.fn(),
    remove: vi.fn()
  };
}

/**
 * Mock DOM elements
 */
export function createMockHTMLElement(tagName = 'div'): HTMLElement {
  const element = document.createElement(tagName);

  // Add common methods that might be called in tests
  vi.spyOn(element, 'addEventListener');
  vi.spyOn(element, 'removeEventListener');
  vi.spyOn(element, 'dispatchEvent');

  return element;
}

/**
 * Mock Canvas context for spectrum/waterfall visualizations
 */
export function createMockCanvasContext() {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn()
    })),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(4),
      width: 1,
      height: 1
    })),
    putImageData: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '12px Arial',
    textAlign: 'left',
    textBaseline: 'top'
  };
}

/**
 * Mock ResizeObserver
 */
export function createMockResizeObserver() {
  return vi.fn().mockImplementation((_callback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }));
}

/**
 * Mock IntersectionObserver
 */
export function createMockIntersectionObserver() {
  return vi.fn().mockImplementation((_callback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }));
}

/**
 * Mock performance API
 */
export function createMockPerformance() {
  return {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn()
  };
}
