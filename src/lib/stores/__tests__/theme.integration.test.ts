/**
 * Theme Store Integration Tests
 * Tests theme store functionality with real theme loading
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  theme,
  themeLoading,
  themeError,
  loadTheme,
  setTheme,
  clearThemeError,
  getThemeState
} from '../theme';
import { createMockTheme } from '../../test-utils/mock-factories';

// Mock Tauri fs API
vi.mock('@tauri-apps/api', () => ({
  fs: {
    readTextFile: vi.fn()
  }
}));

// Mock browser environment
vi.mock('$app/environment', () => ({
  browser: true
}));

// Mock Tauri IPC
Object.defineProperty(window, '__TAURI_IPC__', {
  value: vi.fn(),
  writable: true
});

describe('Theme Store Integration', () => {
  const mockTheme = createMockTheme({
    name: 'Test Theme',
    colors: {
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
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    clearThemeError();

    // Reset DOM
    document.documentElement.style.cssText = '';
  });

  test('loads theme successfully', async () => {
    const { fs } = await import('@tauri-apps/api');
    vi.mocked(fs.readTextFile).mockResolvedValue(JSON.stringify(mockTheme));

    const result = await loadTheme({ themeName: 'test-theme' });

    expect(result).toEqual(mockTheme);
    expect(get(theme)).toEqual(mockTheme);
    expect(get(themeLoading)).toBe(false);
    expect(get(themeError)).toBeNull();
  });

  test('applies theme to DOM correctly', async () => {
    const { fs } = await import('@tauri-apps/api');
    vi.mocked(fs.readTextFile).mockResolvedValue(JSON.stringify(mockTheme));

    await loadTheme({ themeName: 'test-theme' });

    // Check that CSS custom properties are applied
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--color-background_primary')).toBe('#000000');
    expect(root.style.getPropertyValue('--color-text_primary')).toBe('#ffffff');
    expect(root.style.getPropertyValue('--typography-font_family_sans')).toBe(
      mockTheme.typography.font_family_sans
    );
  });

  test('handles theme loading error', async () => {
    const { fs } = await import('@tauri-apps/api');
    const error = new Error('Theme file not found');
    vi.mocked(fs.readTextFile).mockRejectedValue(error);

    await expect(
      loadTheme({
        themeName: 'nonexistent-theme',
        fallbackTheme: 'nonexistent-theme' // Prevent fallback to default
      })
    ).rejects.toThrow();

    expect(get(themeLoading)).toBe(false);
    expect(get(themeError)).toBe('Theme file not found');
  });

  test('falls back to default theme on error', async () => {
    const { fs } = await import('@tauri-apps/api');
    const defaultTheme = createMockTheme({ name: 'Default Theme' });

    vi.mocked(fs.readTextFile)
      .mockRejectedValueOnce(new Error('Primary theme failed'))
      .mockResolvedValueOnce(JSON.stringify(defaultTheme));

    const result = await loadTheme({
      themeName: 'failing-theme',
      fallbackTheme: 'default-theme'
    });

    expect(result).toEqual(defaultTheme);
    expect(get(theme)).toEqual(defaultTheme);
  });

  test('validates theme structure', async () => {
    const { fs } = await import('@tauri-apps/api');
    const invalidTheme = { name: 'Invalid Theme' }; // Missing required properties

    vi.mocked(fs.readTextFile).mockResolvedValue(JSON.stringify(invalidTheme));

    await expect(loadTheme({ themeName: 'invalid-theme' })).rejects.toThrow();
    expect(get(themeError)).toContain('Invalid theme structure');
  });

  test('sets loading state during theme loading', async () => {
    const { fs } = await import('@tauri-apps/api');

    // Create a promise that we can control
    let resolveTheme: (value: string) => void;
    const themePromise = new Promise<string>((resolve) => {
      resolveTheme = resolve;
    });

    vi.mocked(fs.readTextFile).mockReturnValue(themePromise);

    // Start loading
    const loadPromise = loadTheme({ themeName: 'test-theme' });

    // Check loading state
    expect(get(themeLoading)).toBe(true);
    expect(get(themeError)).toBeNull();

    // Resolve the theme
    resolveTheme!(JSON.stringify(mockTheme));
    await loadPromise;

    // Check final state
    expect(get(themeLoading)).toBe(false);
    expect(get(theme)).toEqual(mockTheme);
  });

  test('setTheme works correctly', () => {
    setTheme(mockTheme);

    expect(get(theme)).toEqual(mockTheme);
    expect(get(themeLoading)).toBe(false);
    expect(get(themeError)).toBeNull();

    // Check DOM application
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--color-background_primary')).toBe('#000000');
  });

  test('setTheme validates theme data', () => {
    const invalidTheme = { name: 'Invalid' } as any;

    expect(() => setTheme(invalidTheme)).toThrow('Invalid theme data provided to setTheme');
  });

  test('clearThemeError works correctly', async () => {
    const { fs } = await import('@tauri-apps/api');
    vi.mocked(fs.readTextFile).mockRejectedValue(new Error('Test error'));

    // Create an error
    try {
      await loadTheme({ themeName: 'failing-theme' });
    } catch {
      // Expected to fail
    }

    expect(get(themeError)).toBeTruthy();

    // Clear the error
    clearThemeError();
    expect(get(themeError)).toBeNull();
  });

  test('getThemeState returns current state', async () => {
    const { fs } = await import('@tauri-apps/api');
    vi.mocked(fs.readTextFile).mockResolvedValue(JSON.stringify(mockTheme));

    await loadTheme({ themeName: 'test-theme' });

    const state = getThemeState();
    expect(state.current).toEqual(mockTheme);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.lastLoaded).toBeGreaterThan(0);
  });

  test('applies component-specific CSS variables', async () => {
    const { fs } = await import('@tauri-apps/api');
    vi.mocked(fs.readTextFile).mockResolvedValue(JSON.stringify(mockTheme));

    await loadTheme({ themeName: 'test-theme' });

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--component-cli-background')).toBe(
      mockTheme.components.cli.background
    );
    expect(root.style.getPropertyValue('--component-button-background_default')).toBe(
      mockTheme.components.button.background_default
    );
  });

  test('applies animation variables when present', async () => {
    const { fs } = await import('@tauri-apps/api');
    const themeWithAnimations = {
      ...mockTheme,
      animations: {
        transition_duration: '300ms',
        easing_function: 'ease-in-out',
        hover_scale: '1.05',
        button_press_scale: '0.95'
      }
    };

    vi.mocked(fs.readTextFile).mockResolvedValue(JSON.stringify(themeWithAnimations));

    await loadTheme({ themeName: 'animated-theme' });

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--animation-transition_duration')).toBe('300ms');
    expect(root.style.getPropertyValue('--animation-easing_function')).toBe('ease-in-out');
  });

  test('handles multiple theme loading operations', async () => {
    const { fs } = await import('@tauri-apps/api');
    vi.mocked(fs.readTextFile).mockResolvedValue(JSON.stringify(mockTheme));

    // Load themes sequentially to avoid race conditions
    const result1 = await loadTheme({ themeName: 'theme1' });
    const result2 = await loadTheme({ themeName: 'theme2' });

    expect(result1).toEqual(mockTheme);
    expect(result2).toEqual(mockTheme);
    expect(get(theme)).toEqual(mockTheme);
    expect(get(themeLoading)).toBe(false);
  });

  test('preserves theme state across multiple operations', async () => {
    const { fs } = await import('@tauri-apps/api');
    vi.mocked(fs.readTextFile).mockResolvedValue(JSON.stringify(mockTheme));

    // Load theme
    await loadTheme({ themeName: 'test-theme' });
    const initialState = getThemeState();

    // Clear error (should not affect other state)
    clearThemeError();
    const afterClearState = getThemeState();

    expect(afterClearState.current).toEqual(initialState.current);
    expect(afterClearState.loading).toEqual(initialState.loading);
    expect(afterClearState.lastLoaded).toEqual(initialState.lastLoaded);
  });
});
