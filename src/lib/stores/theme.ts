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
 * Validates theme object structure
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

  // Check metadata structure
  const metadata = data.metadata as Record<string, unknown>;
  if (!metadata || typeof metadata !== 'object' || !metadata.author || !metadata.version) {
    console.error('Theme validation failed: invalid metadata structure');
    return false;
  }

  // Check colors structure
  const colors = data.colors as Record<string, unknown>;
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

  // Check typography structure
  const typography = data.typography as Record<string, unknown>;
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

  // Check layout structure
  const layout = data.layout as Record<string, unknown>;
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

  // Check components structure
  const components = data.components as Record<string, unknown>;
  if (!components || typeof components !== 'object') {
    console.error('Theme validation failed: invalid components structure');
    return false;
  }
  // Check required components - 'sdr' and 'dashboard' are optional for basic themes
  const requiredComponents = ['cli', 'map', 'button', 'plugin_card', 'accordion', 'hex_coin'];
  const optionalComponents = ['sdr', 'dashboard'];
  
  for (const component of requiredComponents) {
    if (!(component in components)) {
      console.error(`Theme validation failed: missing required component '${component}'`);
      return false;
    }
  }
  
  // Validate optional components if present
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
 * Loads a hardcoded default theme as last resort
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
    colors: {
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
    },
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
    components: {
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
    },
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
 * Loads theme from file system
 * @param themeName - Name of the theme to load
 * @returns Promise resolving to the loaded theme
 */
async function loadThemeFromFile(themeName: string): Promise<Theme> {
  const themePath = `${THEME_PATH_PREFIX}${themeName}.json`;

  try {
    console.log(`Loading theme from: ${themePath}`);
    console.log(`Browser environment: ${browser}`);
    console.log(`Window.__TAURI__ exists: ${'__TAURI__' in (typeof window !== 'undefined' ? window : {})}`);

    let themeContent: string | undefined;

    // Only load themes in browser context
    if (!browser) {
      throw new Error('Theme loading is only supported in browser context');
    }
    
    // Add a small delay on first load to ensure dev server is ready
    const win = window as any;
    if (typeof window !== 'undefined' && !win.__theme_init_delay__) {
      win.__theme_init_delay__ = true;
      console.log('[loadThemeFromFile] Adding initial delay for dev server readiness');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const isBrowser = browser && typeof window !== 'undefined';
    
    if (isBrowser) {
      // Check if we're in a Tauri context
      if ('__TAURI__' in window) {
        // Use Tauri's asset protocol for secure file access
        const { convertFileSrc } = await import('@tauri-apps/api/tauri');
        const assetUrl = convertFileSrc(themePath);

        // Fetch the theme file using the asset protocol
        const response = await fetch(assetUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch theme via asset protocol: ${response.statusText}`);
        }
        themeContent = await response.text();
      } else {
        // In regular browser, use multiple fallback paths with better URL construction
        const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const basePath = currentPath.endsWith('/') ? currentPath.slice(0, -1) : currentPath;
        
        const fallbackPaths = [
          `/themes/${themeName}.json`, // Primary path from root
          `./themes/${themeName}.json`, // Relative path
          `themes/${themeName}.json`, // Without leading slash
          `/static/themes/${themeName}.json`, // Full static path
          `${basePath}/themes/${themeName}.json`, // Current path + themes
          `${currentOrigin}/themes/${themeName}.json`, // Absolute URL from origin
          `${currentOrigin}/static/themes/${themeName}.json`, // Absolute static path
          // For Vite/SvelteKit dev server
          `/@fs${process.cwd ? process.cwd() : ''}/static/themes/${themeName}.json`
        ].filter(Boolean); // Remove any empty paths

        let lastError: Error | null = null;
        let fetchSuccess = false;

        // Try each path with better error handling
        for (let i = 0; i < fallbackPaths.length; i++) {
          const fallbackPath = fallbackPaths[i];
          try {
            console.log(`[Attempt ${i + 1}/${fallbackPaths.length}] Loading theme from: ${fallbackPath}`);
            
            // Add retry logic for each path
            let retries = 3;
            while (retries > 0) {
              try {
                const response = await fetch(fallbackPath, {
                  method: 'GET',
                  headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                  },
                  mode: 'cors',
                  credentials: 'same-origin'
                });
                
                if (response.ok) {
                  themeContent = await response.text();
                  fetchSuccess = true;
                  console.log(`[Success] Theme loaded from: ${fallbackPath}`);
                  break;
                } else {
                  lastError = new Error(`HTTP ${response.status}: ${response.statusText} for ${fallbackPath}`);
                  console.warn(`HTTP error: ${lastError.message}`);
                }
                break; // Don't retry on HTTP errors
              } catch (fetchError) {
                retries--;
                lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
                console.warn(`Fetch error (${3 - retries}/3) for ${fallbackPath}:`, lastError.message);
                
                if (retries > 0) {
                  // Wait before retry
                  await new Promise(resolve => setTimeout(resolve, 200));
                }
              }
            }
            
            if (fetchSuccess) break;
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.error(`[Attempt ${i + 1}/${fallbackPaths.length}] Failed to fetch theme from ${fallbackPath}:`, error);
          }
        }

        if (!fetchSuccess || !themeContent) {
          // Provide detailed error information
          const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
          const errorDetails = [
            '[loadThemeFromFile] All fetch attempts failed',
            `Theme name: ${themeName}`,
            `Development mode: ${isDev}`,
            `Paths tried: ${fallbackPaths.join(', ')}`,
            `Last error: ${lastError?.message || 'Unknown error'}`,
            `Window location: ${(typeof window !== 'undefined' && window.location?.href) || 'unknown'}`,
            `Origin: ${currentOrigin || 'unknown'}`,
            `Protocol: ${(typeof window !== 'undefined' && window.location?.protocol) || 'unknown'}`,
            isDev ? 'Dev server context - ensure static/themes/ directory exists and is accessible' : ''
          ].filter(Boolean).join('\n');
          
          console.error(errorDetails);
          throw new Error(`Failed to fetch`);
        }
      }
    }

    if (!themeContent) {
      throw new Error('No theme content loaded');
    }
    
    const themeData = JSON.parse(themeContent);

    if (!validateTheme(themeData)) {
      throw new Error(`Invalid theme structure in ${themePath}`);
    }

    return themeData;
  } catch (error) {
    console.error(`Failed to load theme from ${themePath}:`, error);
    throw error;
  }
}

/**
 * Main theme loading function
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
    let themeData: Theme;

    try {
      // Try to load the requested theme
      console.log(`[loadTheme] Attempting to load primary theme: ${themeName}`);
      themeData = await loadThemeFromFile(themeName);
    } catch (primaryError) {
      console.warn(
        `[loadTheme] Failed to load primary theme '${themeName}', trying fallback '${fallbackTheme}'`
      );

      if (themeName !== fallbackTheme) {
        try {
          themeData = await loadThemeFromFile(fallbackTheme);
        } catch (fallbackError) {
          const errorMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
          // Try loading a hardcoded default theme as last resort
          console.warn('Attempting to load hardcoded default theme as last resort...');
          try {
            themeData = await loadDefaultTheme();
          } catch (defaultError) {
            throw new Error(
              `Failed to load both primary theme '${themeName}' and fallback theme '${fallbackTheme}': ${errorMsg}`
            );
          }
        }
      } else {
        // If primary and fallback are the same, still try the hardcoded default
        console.warn('Primary and fallback themes are the same, loading hardcoded default theme...');
        try {
          themeData = await loadDefaultTheme();
        } catch (defaultError) {
          throw new Error(
            `Failed to load theme '${themeName}': ${primaryError instanceof Error ? primaryError.message : String(primaryError)}`
          );
        }
      }
    }

    // Additional validation if requested
    if (shouldValidate && !validateTheme(themeData)) {
      throw new Error(
        `Theme validation failed for '${(themeData as { name?: string })?.name || 'unknown'}'`
      );
    }

    // Apply theme to DOM
    applyThemeToRoot(themeData);

    // Update store state
    themeState.update((state) => ({
      ...state,
      current: themeData,
      loading: false,
      error: null,
      lastLoaded: Date.now()
    }));

    console.log(`Successfully loaded theme: ${themeData.name}`);
    return themeData;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown theme loading error';

    // Update error state
    themeState.update((state) => ({
      ...state,
      loading: false,
      error: errorMessage
    }));

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
