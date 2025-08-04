/**
 * Theme store implementation for the Modular C2 Frontend
 * Provides centralized theme management with Tauri integration
 * Requirements: 3.1, 3.2, 3.3
 */

import { writable, derived, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { Theme, ThemeState, ThemeLoadOptions } from '../types/theme';

// Default theme configuration
const DEFAULT_THEME_NAME = 'super_amoled_black';
const THEME_PATH_PREFIX = 'static/themes/';

/**
 * Internal theme state store
 */
const themeState: Writable<ThemeState> = writable({
  current: null,
  loading: false,
  error: null,
  lastLoaded: 0
});

/**
 * Public theme store - exposes only the current theme
 */
export const theme = derived(themeState, ($state) => $state.current);

/**
 * Theme loading state store
 */
export const themeLoading = derived(themeState, ($state) => $state.loading);

/**
 * Theme error state store
 */
export const themeError = derived(themeState, ($state) => $state.error);

/**
 * NASA JPL Rule 4: Split function - Validate theme metadata
 */
function validateThemeMetadata(metadata: Record<string, unknown>): boolean {
  if (!metadata || typeof metadata !== 'object' || !metadata.author || !metadata.version) {
    console.error('Theme validation failed: invalid metadata structure');
    return false;
  }
  return true;
}

/**
 * NASA JPL Rule 4: Split function - Validate theme colors
 */
function validateThemeColors(colors: Record<string, unknown>): boolean {
  if (!colors || typeof colors !== 'object') {
    console.error('Theme validation failed: invalid colors structure');
    return false;
  }
  const requiredColors = [
    'background_primary',
    'background_secondary',
    'background_tertiary',
    'text_primary',
    'text_secondary',
    'text_disabled',
    'accent_yellow',
    'accent_blue',
    'accent_red',
    'accent_green'
  ];
  for (const color of requiredColors) {
    if (!(color in colors)) {
      console.error(`Theme validation failed: missing color '${color}'`);
      return false;
    }
  }
  return true;
}

/**
 * NASA JPL Rule 4: Split function - Validate theme typography
 */
function validateThemeTypography(typography: Record<string, unknown>): boolean {
  if (!typography || typeof typography !== 'object') {
    console.error('Theme validation failed: invalid typography structure');
    return false;
  }
  const requiredTypography = [
    'font_family_sans',
    'font_family_mono',
    'font_size_base',
    'font_size_lg',
    'font_size_sm'
  ];
  for (const typo of requiredTypography) {
    if (!(typo in typography)) {
      console.error(`Theme validation failed: missing typography '${typo}'`);
      return false;
    }
  }
  return true;
}

/**
 * NASA JPL Rule 4: Split function - Validate theme layout
 */
function validateThemeLayout(layout: Record<string, unknown>): boolean {
  if (!layout || typeof layout !== 'object') {
    console.error('Theme validation failed: invalid layout structure');
    return false;
  }
  const requiredLayout = ['border_radius', 'border_width', 'spacing_unit'];
  for (const layoutProp of requiredLayout) {
    if (!(layoutProp in layout)) {
      console.error(`Theme validation failed: missing layout '${layoutProp}'`);
      return false;
    }
  }
  return true;
}

/**
 * NASA JPL Rule 4: Split function - Validate theme components
 */
function validateThemeComponents(components: Record<string, unknown>): boolean {
  if (!components || typeof components !== 'object') {
    console.error('Theme validation failed: invalid components structure');
    return false;
  }

  const requiredComponents = ['cli', 'map', 'button', 'plugin_card', 'accordion', 'hex_coin'];
  const optionalComponents = ['sdr', 'dashboard'];

  for (const component of requiredComponents) {
    if (!(component in components)) {
      console.error(`Theme validation failed: missing required component '${component}'`);
      return false;
    }
  }

  for (const component of optionalComponents) {
    if (component in components) {
      const componentData = components[component] as Record<string, unknown>;
      if (!componentData || typeof componentData !== 'object') {
        console.error(`Theme validation failed: invalid optional component '${component}'`);
        return false;
      }
    }
  }

  return true;
}

/**
 * Validates theme object structure
 * NASA JPL Rule 4: Function refactored to be ≤60 lines (111 → 30 lines)
 * @param themeData - Theme data to validate
 * @returns boolean indicating if theme is valid
 */
function validateTheme(themeData: unknown): themeData is Theme {
  if (!themeData || typeof themeData !== 'object') {
    return false;
  }

  const data = themeData as Record<string, unknown>;

  // Check required top-level properties
  const requiredProps = ['name', 'metadata', 'colors', 'typography', 'layout', 'components'];
  for (const prop of requiredProps) {
    if (!(prop in data)) {
      console.error(`Theme validation failed: missing property '${prop}'`);
      return false;
    }
  }

  // Validate each section using helper functions
  return (
    validateThemeMetadata(data.metadata as Record<string, unknown>) &&
    validateThemeColors(data.colors as Record<string, unknown>) &&
    validateThemeTypography(data.typography as Record<string, unknown>) &&
    validateThemeLayout(data.layout as Record<string, unknown>) &&
    validateThemeComponents(data.components as Record<string, unknown>)
  );
}

/**
 * Applies theme to CSS custom properties on the root element
 * @param themeData - Theme data to apply
 */
function applyThemeToRoot(themeData: Theme): void {
  // Only apply theme in browser context
  if (!browser) {
    return;
  }

  const root = document.documentElement;

  // Apply colors
  Object.entries(themeData.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });

  // Apply typography
  Object.entries(themeData.typography).forEach(([key, value]) => {
    root.style.setProperty(`--typography-${key}`, value);
  });

  // Apply layout
  Object.entries(themeData.layout).forEach(([key, value]) => {
    root.style.setProperty(`--layout-${key}`, value);
  });

  // Apply component-specific variables
  Object.entries(themeData.components).forEach(([component, properties]) => {
    if (properties && typeof properties === 'object') {
      Object.entries(properties).forEach(([key, value]) => {
        if (typeof value === 'string') {
          root.style.setProperty(`--component-${component}-${key}`, value);
        }
      });
    }
  });

  // Apply animations if present
  if (themeData.animations) {
    Object.entries(themeData.animations).forEach(([key, value]) => {
      root.style.setProperty(`--animation-${key}`, value);
    });
  }
  // Apply responsive properties if present
  if (themeData.responsive) {
    Object.entries(themeData.responsive).forEach(([breakpoint, properties]) => {
      Object.entries(properties).forEach(([key, value]) => {
        root.style.setProperty(`--responsive-${breakpoint}-${key}`, value);
      });
    });
  }

  // Apply touch properties if present
  if (themeData.touch) {
    Object.entries(themeData.touch).forEach(([key, value]) => {
      root.style.setProperty(`--touch-${key}`, value);
    });
  }

  console.log(`Theme '${themeData.name}' applied to root element`);
}

/**
 * NASA JPL Rule 4: Split function - Create default theme colors
 */
function createDefaultColors(): Theme['colors'] {
  return {
    background_primary: '#000000',
    background_secondary: '#1a1a1a',
    background_tertiary: '#2a2a2a',
    text_primary: '#ffffff',
    text_secondary: '#b0b0b0',
    text_disabled: '#666666',
    accent_yellow: '#ffd700',
    accent_blue: '#00bfff',
    accent_red: '#ff4444',
    accent_green: '#00ff00'
  };
}

/**
 * NASA JPL Rule 4: Split function - Create default theme components
 */
function createDefaultComponents(): Theme['components'] {
  return {
    cli: {
      background: '#0a0a0a',
      text_color: '#00ff00',
      cursor_color: '#00ff00',
      cursor_shape: 'block'
    },
    map: {
      waypoint_color_default: '#ffd700',
      waypoint_color_selected: '#00ff00',
      path_color: '#00bfff',
      geofence_color: '#ff4444'
    },
    button: {
      background_default: '#333333',
      text_color_default: '#ffffff',
      background_hover: '#444444',
      background_accent: '#00bfff',
      text_color_accent: '#000000'
    },
    plugin_card: {
      background: '#1a1a1a',
      background_hover: '#2a2a2a',
      icon_color: '#00bfff',
      text_color: '#ffffff',
      border_radius: '6px'
    },
    accordion: {
      background: '#1a1a1a',
      border_color: '#333333',
      header_text_color: '#ffffff'
    },
    hex_coin: {
      background: '#ffd700',
      icon_color: '#000000',
      border_color_default: '#ffed4e',
      border_color_pinned: '#00ff00',
      snap_point_color: '#00bfff'
    },
    sdr: {
      spectrum_line_color: '#00ff00',
      spectrum_fill_color: 'rgba(0, 255, 0, 0.2)',
      waterfall_color_gradient: 'viridis',
      grid_line_color: '#003366',
      axis_label_color: '#00bfff'
    }
  };
}

/**
 * Loads a hardcoded default theme as last resort
 * NASA JPL Rule 4: Function refactored to be ≤60 lines
 * @returns Promise resolving to default theme
 */
async function loadDefaultTheme(): Promise<Theme> {
  console.log('Loading hardcoded default theme...');

  const defaultTheme: Theme = {
    name: 'default_fallback',
    metadata: {
      author: 'System',
      version: '1.0.0',
      description: 'Emergency fallback theme'
    },
    colors: createDefaultColors(),
    typography: {
      font_family_sans: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      font_family_mono: "'JetBrains Mono', 'Consolas', 'Monaco', monospace",
      font_size_base: '14px',
      font_size_lg: '16px',
      font_size_sm: '12px'
    },
    layout: {
      border_radius: '6px',
      border_width: '1px',
      spacing_unit: '8px'
    },
    components: createDefaultComponents(),
    animations: {
      transition_duration: '200ms',
      easing_function: 'ease-in-out',
      hover_scale: '1.05',
      button_press_scale: '0.98'
    }
  };

  return defaultTheme;
}

/**
 * NASA JPL Rule 4: Split function - Load theme from Tauri context
 */
async function loadThemeFromTauri(themePath: string): Promise<string | null> {
  // Import Tauri context detection
  const { detectTauriContext } = await import('../utils/tauri-context');
  const context = detectTauriContext();
  
  // Only attempt Tauri loading if actually in Tauri environment
  if (!context.isAvailable || context.isMockMode) {
    console.debug('[loadThemeFromTauri] Skipping - not in Tauri environment');
    return null;
  }

  try {
    const tauriModule = await import('@tauri-apps/api/tauri');
    if (!tauriModule?.convertFileSrc) {
      throw new Error('Tauri convertFileSrc not available');
    }

    const assetUrl = tauriModule.convertFileSrc(themePath);
    console.log(`[loadThemeFromTauri] Loading via asset protocol: ${assetUrl}`);
    
    const response = await fetch(assetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Asset protocol fetch failed: ${response.status} ${response.statusText}`);
    }

    const content = await response.text();
    console.log(`[loadThemeFromTauri] Successfully loaded theme via asset protocol`);
    return content;
  } catch (error) {
    console.warn('[loadThemeFromTauri] Asset protocol failed:', error);
    return null;
  }
}

/**
 * NASA JPL Rule 4: Split function - Generate theme fallback paths
 */
function generateThemePaths(themeName: string): string[] {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const basePath = currentPath.endsWith('/') ? currentPath.slice(0, -1) : currentPath;

  return [
    `/static/themes/${themeName}.json`,
    `/themes/${themeName}.json`,
    `./themes/${themeName}.json`,
    `themes/${themeName}.json`,
    `${basePath}/themes/${themeName}.json`
  ].filter(Boolean);
}

/**
 * NASA JPL Rule 4: Split function - Try loading theme from fallback paths
 */
async function tryFallbackPaths(fallbackPaths: string[]): Promise<string | null> {
  let lastError: Error | null = null;
  
  console.log(`[tryFallbackPaths] Attempting ${fallbackPaths.length} paths:`, fallbackPaths);

  for (let i = 0; i < fallbackPaths.length; i++) {
    const fallbackPath = fallbackPaths[i];
    console.log(`[tryFallbackPaths] Trying path ${i + 1}/${fallbackPaths.length}: ${fallbackPath}`);
    
    try {
      const response = await fetch(fallbackPath, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache'
        },
        mode: 'cors',
        credentials: 'same-origin'
      });

      if (response.ok) {
        console.log(`[tryFallbackPaths] ✅ Successfully loaded from: ${fallbackPath}`);
        return await response.text();
      }

      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      console.debug(`[tryFallbackPaths] ❌ Failed: ${fallbackPath} - ${lastError.message}`);
    } catch (fetchError) {
      lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
      console.debug(`[tryFallbackPaths] ❌ Error: ${fallbackPath} - ${lastError.message}`);
      
      if (i === fallbackPaths.length - 1) {
        console.debug(`[tryFallbackPaths] All ${fallbackPaths.length} fetch attempts failed. Last error: ${lastError.message}`);
      }
    }
  }

  return null;
}

/**
 * NASA JPL Rule 4: Split function - Build error details for debugging
 */
function buildErrorDetails(
  themeName: string,
  fallbackPaths: string[],
  lastError: Error | null
): string {
  const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'unknown';
  const windowHref = typeof window !== 'undefined' ? window.location.href : 'unknown';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'unknown';

  return [
    '[loadThemeFromFile] All fetch attempts failed',
    `Theme name: ${themeName}`,
    `Development mode: ${isDev}`,
    `Paths tried: ${fallbackPaths.join(', ')}`,
    `Last error: ${lastError?.message || 'Unknown error'}`,
    `Window location: ${windowHref}`,
    `Origin: ${currentOrigin}`,
    `Protocol: ${protocol}`,
    isDev ? 'Dev server context - ensure static/themes/ directory exists and is accessible' : ''
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * NASA JPL Rule 4: Split function - Smart theme loading strategy
 */
async function determineLoadingStrategy(): Promise<'tauri' | 'browser'> {
  // Import Tauri context detection
  const { detectTauriContext } = await import('../utils/tauri-context');
  const context = detectTauriContext();
  
  // Use Tauri loading only if actually in Tauri environment
  if (context.isAvailable && !context.isMockMode) {
    console.log('[determineLoadingStrategy] Using Tauri asset protocol');
    return 'tauri';
  }
  
  console.log('[determineLoadingStrategy] Using browser fetch');
  return 'browser';
}

/**
 * Loads theme from file system with smart environment detection
 * NASA JPL Rule 4: Function refactored to be ≤60 lines
 * @param themeName - Name of the theme to load
 * @returns Promise resolving to the loaded theme
 */
async function loadThemeFromFile(themeName: string): Promise<Theme> {
  const themePath = `${THEME_PATH_PREFIX}${themeName}.json`;

  try {
    console.log(`[loadThemeFromFile] Loading theme: ${themeName}`);
    console.log(`[loadThemeFromFile] Browser environment: ${browser}`);

    if (!browser) {
      throw new Error('Theme loading is only supported in browser context');
    }

    // Add initial delay for dev server readiness only in development
    const win = window as any;
    const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    if (isDev && !win.__theme_init_delay__) {
      win.__theme_init_delay__ = true;
      console.log('[loadThemeFromFile] Adding dev server readiness delay');
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    let themeContent: string | undefined;
    const strategy = await determineLoadingStrategy();

    if (strategy === 'tauri') {
      // Try Tauri asset protocol first
      themeContent = (await loadThemeFromTauri(themePath)) || undefined;
      
      // If Tauri failed, fall back to browser fetch
      if (!themeContent) {
        console.log('[loadThemeFromFile] Tauri failed, falling back to browser fetch');
        const fallbackPaths = generateThemePaths(themeName);
        themeContent = (await tryFallbackPaths(fallbackPaths)) || undefined;
      }
    } else {
      // Use browser fetch directly (no asset protocol attempts)
      console.log('[loadThemeFromFile] Using direct browser fetch');
      const fallbackPaths = generateThemePaths(themeName);
      themeContent = (await tryFallbackPaths(fallbackPaths)) || undefined;
    }

    if (!themeContent) {
      const fallbackPaths = generateThemePaths(themeName);
      const errorDetails = buildErrorDetails(themeName, fallbackPaths, null);
      console.error(errorDetails);
      throw new Error('Failed to fetch theme from all sources');
    }

    const themeData = JSON.parse(themeContent);

    if (!validateTheme(themeData)) {
      throw new Error(`Invalid theme structure in ${themePath}`);
    }

    console.log(`[loadThemeFromFile] Successfully loaded theme: ${themeData.name}`);
    return themeData;
  } catch (error) {
    console.error(`[loadThemeFromFile] Failed to load theme '${themeName}':`, error);
    throw error;
  }
}

/**
 * NASA JPL Rule 4: Split function - Attempt to load theme with fallbacks
 */
async function attemptThemeLoad(themeName: string, fallbackTheme: string): Promise<Theme> {
  try {
    // Try to load the requested theme
    console.log(`[loadTheme] Attempting to load primary theme: ${themeName}`);
    return await loadThemeFromFile(themeName);
  } catch (primaryError) {
    console.log(`Loading fallback theme '${fallbackTheme}'`);

    if (themeName !== fallbackTheme) {
      try {
        return await loadThemeFromFile(fallbackTheme);
      } catch (fallbackError) {
        const errorMsg =
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        console.log('Loading hardcoded default theme...');
        try {
          return await loadDefaultTheme();
        } catch (defaultError) {
          throw new Error(
            `Failed to load both primary theme '${themeName}' and fallback theme '${fallbackTheme}': ${errorMsg}`
          );
        }
      }
    } else {
      // If primary and fallback are the same, try the hardcoded default
      console.log('Loading hardcoded default theme...');
      try {
        return await loadDefaultTheme();
      } catch (defaultError) {
        throw new Error(
          `Failed to load theme '${themeName}': ${primaryError instanceof Error ? primaryError.message : String(primaryError)}`
        );
      }
    }
  }
}

/**
 * NASA JPL Rule 4: Split function - Update theme state on success
 */
function updateThemeStateSuccess(themeData: Theme): void {
  themeState.update((state) => ({
    ...state,
    current: themeData,
    loading: false,
    error: null,
    lastLoaded: Date.now()
  }));
}

/**
 * NASA JPL Rule 4: Split function - Update theme state on error
 */
function updateThemeStateError(errorMessage: string): void {
  themeState.update((state) => ({
    ...state,
    loading: false,
    error: errorMessage
  }));
}

/**
 * Main theme loading function
 * NASA JPL Rule 4: Function refactored to be ≤60 lines
 * @param options - Theme loading options
 * @returns Promise resolving to the loaded theme
 */
export async function loadTheme(options: ThemeLoadOptions = {}): Promise<Theme> {
  console.log('[loadTheme] Starting theme load with options:', options);
  console.log('[loadTheme] Browser environment:', browser);

  const {
    themeName = DEFAULT_THEME_NAME,
    fallbackTheme = DEFAULT_THEME_NAME,
    validateTheme: shouldValidate = true
  } = options;

  // Set loading state
  themeState.update((state) => ({
    ...state,
    loading: true,
    error: null
  }));

  try {
    // Attempt to load theme with fallback logic
    const themeData = await attemptThemeLoad(themeName, fallbackTheme);

    // Additional validation if requested
    if (shouldValidate && !validateTheme(themeData)) {
      throw new Error(`Theme validation failed for '${(themeData as any)?.name || 'unknown'}'`);
    }

    // Apply theme to DOM
    applyThemeToRoot(themeData);

    // Update store state on success
    updateThemeStateSuccess(themeData);

    console.log(`Successfully loaded theme: ${themeData.name}`);
    return themeData;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown theme loading error';

    // Update error state
    updateThemeStateError(errorMessage);

    console.error('Theme loading failed:', errorMessage);
    throw error;
  }
}

/**
 * Reloads the current theme
 * @returns Promise resolving to the reloaded theme
 */
export async function reloadTheme(): Promise<Theme | null> {
  let currentTheme: Theme | null = null;

  const unsubscribe = themeState.subscribe((state) => {
    currentTheme = state.current;
  });
  unsubscribe();

  if (!currentTheme) {
    console.warn('No current theme to reload, loading default theme');
    return loadTheme();
  }

  // TypeScript assertion since we know currentTheme is not null after the check
  const themeName = (currentTheme as Theme).name;
  return loadTheme({ themeName });
}

/**
 * Gets the current theme state
 * @returns Current theme state
 */
export function getThemeState(): ThemeState {
  let state: ThemeState | undefined;
  const unsubscribe = themeState.subscribe((s) => (state = s));
  unsubscribe();
  return state!;
}

/**
 * Clears theme error state
 */
export function clearThemeError(): void {
  themeState.update((state) => ({
    ...state,
    error: null
  }));
}

/**
 * Sets a custom theme (for testing or dynamic themes)
 * @param themeData - Theme data to set
 */
export function setTheme(themeData: Theme): void {
  if (!validateTheme(themeData)) {
    throw new Error('Invalid theme data provided to setTheme');
  }

  applyThemeToRoot(themeData);

  themeState.update((state) => ({
    ...state,
    current: themeData,
    loading: false,
    error: null,
    lastLoaded: Date.now()
  }));
}

// Export the theme state store for advanced use cases
export { themeState };
