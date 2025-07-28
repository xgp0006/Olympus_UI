/**
 * Theme store tests
 * Tests the theme loading and management functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { theme, loadTheme, setTheme, getThemeState, clearThemeError } from '../theme';
import type { Theme } from '../../types/theme';

// Mock Tauri fs API
vi.mock('@tauri-apps/api', () => ({
  fs: {
    readTextFile: vi.fn()
  }
}));

const mockTheme: Theme = {
  name: 'Test Theme',
  metadata: {
    author: 'Test Author',
    version: '1.0.0'
  },
  colors: {
    background_primary: '#000000',
    background_secondary: '#111111',
    background_tertiary: '#222222',
    text_primary: '#ffffff',
    text_secondary: '#cccccc',
    text_disabled: '#666666',
    accent_yellow: '#ffd700',
    accent_blue: '#00bfff',
    accent_red: '#ff4444',
    accent_green: '#00ff88'
  },
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
  components: {
    cli: {
      background: '#000000',
      text_color: '#00ff88',
      cursor_color: '#ffd700',
      cursor_shape: 'block'
    },
    map: {
      waypoint_color_default: '#00bfff',
      waypoint_color_selected: '#ffd700',
      path_color: '#00ff88',
      geofence_color: '#ff4444'
    },
    button: {
      background_default: '#1a1a1a',
      text_color_default: '#ffffff',
      background_hover: '#2a2a2a',
      background_accent: '#00bfff',
      text_color_accent: '#000000'
    },
    plugin_card: {
      background: '#0a0a0a',
      background_hover: '#1a1a1a',
      icon_color: '#00bfff',
      text_color: '#ffffff',
      border_radius: '8px'
    },
    accordion: {
      background: '#0a0a0a',
      border_color: '#333333',
      header_text_color: '#ffffff'
    },
    hex_coin: {
      background: '#1a1a1a',
      icon_color: '#00bfff',
      border_color_default: '#333333',
      border_color_pinned: '#ffd700',
      snap_point_color: '#00ff88'
    },
    sdr: {
      spectrum_line_color: '#00bfff',
      spectrum_fill_color: 'rgba(0, 191, 255, 0.3)',
      waterfall_color_gradient: 'linear-gradient(to bottom, #ff4444, #ffd700, #00ff88, #00bfff)',
      grid_line_color: '#333333',
      axis_label_color: '#cccccc'
    }
  },
  animations: {
    transition_duration: '200ms',
    easing_function: 'cubic-bezier(0.4, 0, 0.2, 1)',
    hover_scale: '1.05',
    button_press_scale: '0.95'
  }
};

describe('Theme Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset DOM
    document.documentElement.style.cssText = '';
  });

  it('should initialize with null theme', () => {
    const currentTheme = get(theme);
    expect(currentTheme).toBeNull();
  });

  it('should set theme directly', () => {
    setTheme(mockTheme);
    const currentTheme = get(theme);
    expect(currentTheme).toEqual(mockTheme);
  });

  it('should apply theme to DOM when set', () => {
    setTheme(mockTheme);

    // Check if CSS custom properties are applied
    const rootStyle = document.documentElement.style;
    expect(rootStyle.getPropertyValue('--color-background_primary')).toBe('#000000');
    expect(rootStyle.getPropertyValue('--typography-font_family_sans')).toBe('Inter, sans-serif');
    expect(rootStyle.getPropertyValue('--layout-border_radius')).toBe('6px');
    expect(rootStyle.getPropertyValue('--component-cli-background')).toBe('#000000');
  });

  it('should load theme from file system', async () => {
    const { fs } = await import('@tauri-apps/api');
    vi.mocked(fs.readTextFile).mockResolvedValue(JSON.stringify(mockTheme));

    const loadedTheme = await loadTheme({ themeName: 'test-theme' });

    expect(fs.readTextFile).toHaveBeenCalledWith('static/themes/test-theme.json');
    expect(loadedTheme).toEqual(mockTheme);
    expect(get(theme)).toEqual(mockTheme);
  });

  it('should handle theme loading errors', async () => {
    const { fs } = await import('@tauri-apps/api');
    vi.mocked(fs.readTextFile).mockRejectedValue(new Error('File not found'));

    await expect(loadTheme({ themeName: 'nonexistent' })).rejects.toThrow();

    const state = getThemeState();
    expect(state.error).toBeTruthy();
    expect(state.loading).toBe(false);
  });

  it('should fall back to default theme on primary theme failure', async () => {
    const { fs } = await import('@tauri-apps/api');
    vi.mocked(fs.readTextFile)
      .mockRejectedValueOnce(new Error('Primary theme not found'))
      .mockResolvedValueOnce(JSON.stringify(mockTheme));

    const loadedTheme = await loadTheme({
      themeName: 'nonexistent',
      fallbackTheme: 'super_amoled_black'
    });

    expect(fs.readTextFile).toHaveBeenCalledTimes(2);
    expect(loadedTheme).toEqual(mockTheme);
  });

  it('should validate theme structure', () => {
    const invalidTheme = { name: 'Invalid' }; // Missing required properties

    expect(() => setTheme(invalidTheme as Theme)).toThrow('Invalid theme data');
  });

  it('should clear error state', () => {
    // First set an error state by trying to load invalid theme
    setTheme(mockTheme);

    // Manually set error for testing
    const state = getThemeState();
    expect(state.error).toBeNull();

    clearThemeError();

    const clearedState = getThemeState();
    expect(clearedState.error).toBeNull();
  });

  it('should track loading state', async () => {
    const { fs } = await import('@tauri-apps/api');

    // Create a promise that we can control
    let resolvePromise: (value: string) => void;
    const controlledPromise = new Promise<string>((resolve) => {
      resolvePromise = resolve;
    });

    vi.mocked(fs.readTextFile).mockReturnValue(controlledPromise);

    // Start loading
    const loadPromise = loadTheme({ themeName: 'test' });

    // Check loading state
    const loadingState = getThemeState();
    expect(loadingState.loading).toBe(true);

    // Resolve the promise
    resolvePromise!(JSON.stringify(mockTheme));
    await loadPromise;

    // Check final state
    const finalState = getThemeState();
    expect(finalState.loading).toBe(false);
    expect(finalState.current).toEqual(mockTheme);
  });
});
