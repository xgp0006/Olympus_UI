/**
 * Tauri Context Detection and Safe API Access
 * Provides aerospace-grade browser compatibility for Tauri APIs
 * Requirements: Browser compatibility with dynamic imports and proper fallbacks
 */

import { browser } from '$app/environment';

/**
 * Tauri context detection result
 */
export interface TauriContext {
  isAvailable: boolean;
  isMockMode: boolean;
  error?: string;
}

/**
 * Cached context detection result
 */
let cachedContext: TauriContext | null = null;

/**
 * Detect if running in Tauri context
 * Uses multiple detection methods for reliability
 * @returns Tauri context information
 */
export function detectTauriContext(): TauriContext {
  // Return cached result if available
  if (cachedContext !== null) {
    return cachedContext;
  }

  // SSR always returns unavailable
  if (!browser) {
    cachedContext = {
      isAvailable: false,
      isMockMode: true,
      error: 'Running in SSR context'
    };
    return cachedContext;
  }

  try {
    // Primary detection: Check for actual Tauri runtime (not just mock)
    if (
      typeof window !== 'undefined' &&
      '__TAURI__' in window &&
      typeof (window as any).__TAURI__?.invoke === 'function'
    ) {
      cachedContext = {
        isAvailable: true,
        isMockMode: false
      };
      return cachedContext;
    }

    // Secondary detection: Check for Tauri-specific window properties with actual functionality
    if (
      typeof window !== 'undefined' &&
      '__TAURI_IPC__' in window &&
      typeof (window as any).__TAURI_IPC__ === 'object'
    ) {
      cachedContext = {
        isAvailable: true,
        isMockMode: false
      };
      return cachedContext;
    }

    // Tertiary detection: Check user agent for Tauri
    if (typeof navigator !== 'undefined' && navigator.userAgent.includes('Tauri')) {
      cachedContext = {
        isAvailable: true,
        isMockMode: false
      };
      return cachedContext;
    }

    // Not in Tauri context
    cachedContext = {
      isAvailable: false,
      isMockMode: true,
      error: 'Tauri runtime not detected'
    };
    return cachedContext;
  } catch (error) {
    // Detection failed
    cachedContext = {
      isAvailable: false,
      isMockMode: true,
      error: error instanceof Error ? error.message : 'Context detection failed'
    };
    return cachedContext;
  }
}

/**
 * Safe dynamic import of Tauri API modules
 * @param module - Module name (e.g., 'tauri', 'event', 'window')
 * @returns Module exports or null if unavailable
 */
export async function importTauriModule<T = any>(module: string): Promise<T | null> {
  // Early exit for SSR
  if (!browser) {
    return null;
  }

  // Early exit if not in actual Tauri runtime (more robust check)
  if (typeof window === 'undefined') {
    return null;
  }

  // Check if we're in actual Tauri app (not just dev environment with __TAURI__ mock)
  const isTauriApp =
    '__TAURI__' in window && typeof (window as any).__TAURI__?.invoke === 'function';

  if (!isTauriApp) {
    return null;
  }

  try {
    const moduleExports = await import(`@tauri-apps/api/${module}`);
    return moduleExports;
  } catch (error) {
    // Only log errors if we're actually in a Tauri context
    console.error(`Failed to import Tauri module '${module}':`, error);
    return null;
  }
}

/**
 * Safe Tauri command invocation with fallback
 * @param command - Command name
 * @param args - Command arguments
 * @param fallback - Fallback value if Tauri unavailable
 * @returns Command result or fallback
 */
export async function invokeTauriSafe<T>(
  command: string,
  args?: Record<string, unknown>,
  fallback?: T
): Promise<T | undefined> {
  const tauriModule = await importTauriModule<{ invoke: (cmd: string, args?: any) => Promise<T> }>(
    'tauri'
  );

  if (!tauriModule?.invoke) {
    console.debug(`Tauri invoke not available for command '${command}', using fallback`);
    return fallback;
  }

  try {
    return await tauriModule.invoke(command, args);
  } catch (error) {
    console.error(`Tauri command '${command}' failed:`, error);
    return fallback;
  }
}

/**
 * Safe Tauri event listener setup
 * @param event - Event name
 * @param handler - Event handler
 * @returns Cleanup function or null
 */
export async function listenTauriSafe<T>(
  event: string,
  handler: (payload: T) => void
): Promise<(() => void) | null> {
  const eventModule = await importTauriModule<{
    listen: (event: string, handler: (event: { payload: T }) => void) => Promise<() => void>;
  }>('event');

  if (!eventModule?.listen) {
    console.debug(`Tauri event listener not available for event '${event}'`);
    return null;
  }

  try {
    const unlisten = await eventModule.listen(event, (event) => {
      handler(event.payload);
    });
    return unlisten;
  } catch (error) {
    console.error(`Failed to setup Tauri event listener for '${event}':`, error);
    return null;
  }
}

/**
 * Safe Tauri event emission
 * @param event - Event name
 * @param payload - Event payload
 * @returns Success status
 */
export async function emitTauriSafe(event: string, payload?: unknown): Promise<boolean> {
  const eventModule = await importTauriModule<{
    emit: (event: string, payload?: unknown) => Promise<void>;
  }>('event');

  if (!eventModule?.emit) {
    console.debug(`Tauri event emitter not available for event '${event}'`);
    return false;
  }

  try {
    await eventModule.emit(event, payload);
    return true;
  } catch (error) {
    console.error(`Failed to emit Tauri event '${event}':`, error);
    return false;
  }
}

/**
 * Get safe asset URL with proper protocol
 * @param path - Asset path
 * @returns Safe asset URL
 */
export async function getAssetUrl(path: string): Promise<string> {
  const context = detectTauriContext();

  if (!context.isAvailable) {
    // In browser, return standard path
    return path.startsWith('/') ? path : `/${path}`;
  }

  const tauriModule = await importTauriModule<{
    convertFileSrc: (path: string) => string;
  }>('tauri');

  if (!tauriModule?.convertFileSrc) {
    // Fallback to standard path
    return path.startsWith('/') ? path : `/${path}`;
  }

  try {
    return tauriModule.convertFileSrc(path);
  } catch (error) {
    console.error(`Failed to convert asset URL '${path}':`, error);
    return path.startsWith('/') ? path : `/${path}`;
  }
}

/**
 * Check if specific Tauri API is available
 * @param api - API name (e.g., 'fs', 'dialog', 'notification')
 * @returns Availability status
 */
export async function isTauriApiAvailable(api: string): Promise<boolean> {
  const context = detectTauriContext();

  if (!context.isAvailable) {
    return false;
  }

  // Additional runtime check before attempting import
  if (typeof window === 'undefined' || !('__TAURI__' in window)) {
    return false;
  }

  try {
    const module = await import(`@tauri-apps/api/${api}`);
    return module !== null && typeof module === 'object';
  } catch {
    return false;
  }
}

/**
 * Reset cached context (useful for testing)
 */
export function resetTauriContext(): void {
  cachedContext = null;
}

/**
 * Tauri API wrapper with comprehensive fallback support
 */
export const TauriApi = {
  /**
   * Invoke command with automatic fallback
   */
  async invoke<T>(
    command: string,
    args?: Record<string, unknown>,
    fallback?: T
  ): Promise<T | undefined> {
    return invokeTauriSafe(command, args, fallback);
  },

  /**
   * Setup event listener with automatic cleanup
   */
  async listen<T>(event: string, handler: (payload: T) => void): Promise<(() => void) | null> {
    return listenTauriSafe(event, handler);
  },

  /**
   * Emit event safely
   */
  async emit(event: string, payload?: unknown): Promise<boolean> {
    return emitTauriSafe(event, payload);
  },

  /**
   * Get context information
   */
  getContext(): TauriContext {
    return detectTauriContext();
  },

  /**
   * Check if running in Tauri
   */
  isAvailable(): boolean {
    return detectTauriContext().isAvailable;
  },

  /**
   * Check if running in mock mode
   */
  isMockMode(): boolean {
    return detectTauriContext().isMockMode;
  }
};

// Export type-safe Tauri modules
export type TauriInvoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
export type TauriListen = <T>(event: string, handler: (payload: T) => void) => Promise<() => void>;
export type TauriEmit = (event: string, payload?: unknown) => Promise<void>;
export type UnlistenFn = (() => void) | null;
