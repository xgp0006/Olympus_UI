/**
 * Fixed theme store implementation
 */
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { Theme, ThemeState } from '../types/theme';

// Theme state
const themeState = writable<ThemeState>({
  current: null,
  loading: false,
  error: null,
  lastLoaded: 0
});

// Derived stores
export const theme = derived(themeState, ($state) => $state.current);
export const themeLoading = derived(themeState, ($state) => $state.loading);
export const themeError = derived(themeState, ($state) => $state.error);

// Simple theme loader that works
export async function loadThemeFixed(
  themeName: string = 'super_amoled_black_responsive'
): Promise<Theme | null> {
  console.log('[ThemeFix] loadThemeFixed called with:', themeName);

  // Only load in browser
  if (!browser) {
    console.log('[ThemeFix] Not in browser, returning null');
    return null;
  }

  // Update loading state
  themeState.update((s) => ({ ...s, loading: true, error: null }));

  try {
    // Wait a bit to ensure dev server is ready
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Use the simplest path that works
    const path = `/themes/${themeName}.json`;
    console.log('[ThemeFix] Fetching from:', path);

    const response = await fetch(path);
    console.log('[ThemeFix] Response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const themeData = await response.json();
    console.log('[ThemeFix] Theme loaded:', themeData.name);

    // Apply to DOM
    if (typeof document !== 'undefined') {
      const root = document.documentElement;

      // Apply colors
      Object.entries(themeData.colors).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value as string);
      });

      // Apply typography
      Object.entries(themeData.typography).forEach(([key, value]) => {
        root.style.setProperty(`--typography-${key}`, value as string);
      });

      // Apply layout
      Object.entries(themeData.layout).forEach(([key, value]) => {
        root.style.setProperty(`--layout-${key}`, value as string);
      });
    }

    // Update state
    themeState.update((s) => ({
      current: themeData,
      loading: false,
      error: null,
      lastLoaded: Date.now()
    }));

    return themeData;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ThemeFix] Error loading theme:', errorMsg);

    themeState.update((s) => ({
      ...s,
      loading: false,
      error: errorMsg
    }));

    // Try fallback
    if (themeName !== 'super_amoled_black') {
      console.log('[ThemeFix] Trying fallback theme...');
      return loadThemeFixed('super_amoled_black');
    }

    return null;
  }
}
