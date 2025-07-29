/**
 * Test Data - Static test data and fixtures
 * Provides consistent test data across all tests
 */

import type { Plugin } from '$lib/types/plugin';
import type { MissionItem } from '$lib/plugins/mission-planner/types';
import type { Theme } from '$lib/types/theme';
import type { SdrSettings } from '$lib/plugins/sdr-suite/types';

// Define SdrDevice interface locally since it's not exported
interface SdrDevice {
  id: string;
  name: string;
  driver: string;
  serial: string;
  available: boolean;
}

/**
 * Sample plugins for testing
 */
export const TEST_PLUGINS: Plugin[] = [
  {
    id: 'mission-planner',
    name: 'Mission Planner',
    description: 'Plan and manage vehicle missions',
    icon: 'map',
    enabled: true
  },
  {
    id: 'sdr-suite',
    name: 'SDR Suite',
    description: 'Software Defined Radio tools',
    icon: 'radio',
    enabled: true
  },
  {
    id: 'telemetry-viewer',
    name: 'Telemetry Viewer',
    description: 'View real-time telemetry data',
    icon: 'chart',
    enabled: false
  }
];

/**
 * Sample mission items for testing
 */
export const TEST_MISSION_ITEMS: MissionItem[] = [
  {
    id: 'takeoff-1',
    type: 'takeoff',
    name: 'Takeoff',
    params: {
      lat: 37.7749,
      lng: -122.4194,
      alt: 50
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
      lng: -122.4094,
      alt: 100,
      speed: 5
    },
    position: {
      lat: 37.7849,
      lng: -122.4094,
      alt: 100
    }
  },
  {
    id: 'waypoint-2',
    type: 'waypoint',
    name: 'Waypoint 2',
    params: {
      lat: 37.7949,
      lng: -122.3994,
      alt: 120,
      speed: 7
    },
    position: {
      lat: 37.7949,
      lng: -122.3994,
      alt: 120
    }
  },
  {
    id: 'land-1',
    type: 'land',
    name: 'Landing',
    params: {
      lat: 37.7749,
      lng: -122.4194,
      alt: 0
    },
    position: {
      lat: 37.7749,
      lng: -122.4194,
      alt: 0
    }
  }
];

/**
 * Sample theme for testing
 */
export const TEST_THEME: Theme = {
  name: 'test-theme',
  metadata: {
    author: 'Test Suite',
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
    },
    sdr: {
      spectrum_line_color: '#0066ff',
      spectrum_fill_color: '#003366',
      waterfall_color_gradient:
        'linear-gradient(to right, #000000, #0066ff, #00ffff, #ffff00, #ff0000)',
      grid_line_color: '#333333',
      axis_label_color: '#cccccc'
    }
  },
  animations: {
    transition_duration: '0.2s',
    easing_function: 'ease-in-out',
    hover_scale: '1.05',
    button_press_scale: '0.95'
  }
};

/**
 * Sample SDR devices for testing
 */
export const TEST_SDR_DEVICES: SdrDevice[] = [
  {
    id: 'rtl-sdr-0',
    name: 'RTL-SDR Device #0',
    driver: 'rtlsdr',
    serial: '00000001',
    available: true
  },
  {
    id: 'rtl-sdr-1',
    name: 'RTL-SDR Device #1',
    driver: 'rtlsdr',
    serial: '00000002',
    available: false
  },
  {
    id: 'hackrf-0',
    name: 'HackRF One',
    driver: 'hackrf',
    serial: 'HRF001',
    available: true
  }
];

/**
 * Sample SDR settings for testing
 */
export const TEST_SDR_SETTINGS: SdrSettings = {
  centerFrequency: 100000000, // 100 MHz
  sampleRate: 2048000, // 2.048 MS/s
  gain: 20, // 20 dB
  bandwidth: 2048000 // 2.048 MHz
};

/**
 * Sample CLI commands for testing
 */
export const TEST_CLI_COMMANDS = [
  'help',
  'status',
  'plugin list',
  'plugin load mission-planner',
  'mission create',
  'mission add-waypoint 37.7749 -122.4194 100',
  'sdr start',
  'sdr stop',
  'sdr tune 100000000'
];

/**
 * Sample CLI output for testing
 */
export const TEST_CLI_OUTPUT = [
  { line: 'Aerospace C2 Command Line Interface v1.0.0', stream: 'stdout' as const },
  { line: 'Type "help" for available commands', stream: 'stdout' as const },
  { line: 'Available commands:', stream: 'stdout' as const },
  { line: '  help - Show this help message', stream: 'stdout' as const },
  { line: '  status - Show system status', stream: 'stdout' as const },
  { line: '  plugin - Plugin management commands', stream: 'stdout' as const },
  { line: '  mission - Mission planning commands', stream: 'stdout' as const },
  { line: '  sdr - SDR control commands', stream: 'stdout' as const }
];

/**
 * Sample error messages for testing
 */
export const TEST_ERROR_MESSAGES = {
  PLUGIN_NOT_FOUND: 'Plugin not found',
  PLUGIN_LOAD_FAILED: 'Failed to load plugin',
  MISSION_INVALID: 'Invalid mission data',
  SDR_CONNECTION_FAILED: 'Failed to connect to SDR device',
  BACKEND_UNAVAILABLE: 'Backend service unavailable',
  VALIDATION_ERROR: 'Validation error',
  NETWORK_ERROR: 'Network connection error',
  PERMISSION_DENIED: 'Permission denied',
  FILE_NOT_FOUND: 'File not found',
  TIMEOUT_ERROR: 'Operation timed out'
};

/**
 * Sample notification data for testing
 */
export const TEST_NOTIFICATIONS = [
  {
    id: 'info-1',
    type: 'info' as const,
    message: 'System initialized successfully',
    timestamp: Date.now() - 5000,
    timeout: 5000
  },
  {
    id: 'success-1',
    type: 'success' as const,
    message: 'Plugin loaded successfully',
    timestamp: Date.now() - 3000,
    timeout: 4000
  },
  {
    id: 'warning-1',
    type: 'warning' as const,
    message: 'SDR device disconnected',
    timestamp: Date.now() - 1000,
    timeout: 6000
  },
  {
    id: 'error-1',
    type: 'error' as const,
    message: 'Failed to save mission data',
    timestamp: Date.now(),
    timeout: 0
  }
];

/**
 * Sample keyboard shortcuts for testing
 */
export const TEST_KEYBOARD_SHORTCUTS = {
  TOGGLE_CLI: { ctrlKey: true, key: '`' },
  SAVE: { ctrlKey: true, key: 's' },
  CANCEL: { key: 'Escape' },
  ENTER: { key: 'Enter' },
  CTRL_ENTER: { ctrlKey: true, key: 'Enter' },
  DELETE: { key: 'Delete' },
  BACKSPACE: { key: 'Backspace' },
  TAB: { key: 'Tab' },
  SHIFT_TAB: { shiftKey: true, key: 'Tab' }
};

/**
 * Sample viewport sizes for responsive testing
 */
export const TEST_VIEWPORTS = {
  MOBILE: { width: 375, height: 667 },
  TABLET: { width: 768, height: 1024 },
  DESKTOP: { width: 1920, height: 1080 },
  ULTRAWIDE: { width: 3440, height: 1440 }
};

/**
 * Sample performance metrics for testing
 */
export const TEST_PERFORMANCE_METRICS = {
  FAST_OPERATION: 50, // ms
  NORMAL_OPERATION: 200, // ms
  SLOW_OPERATION: 1000, // ms
  TIMEOUT_THRESHOLD: 5000 // ms
};
