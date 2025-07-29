/**
 * Plugin store implementation for the Modular C2 Frontend
 * Provides plugin state management and backend integration
 * Requirements: 1.2, 1.3
 */

import { writable, derived, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { Plugin } from '../types/plugin';
import { showNotification } from './notifications';

/**
 * Plugin state interface
 */
interface PluginState {
  plugins: Plugin[];
  activePlugin: string | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number;
}

/**
 * Internal plugin state store
 */
const pluginState: Writable<PluginState> = writable({
  plugins: [],
  activePlugin: null,
  loading: false,
  error: null,
  lastUpdated: 0
});

/**
 * Public plugin store - exposes only the plugins array
 */
export const plugins = derived(pluginState, ($state) => $state.plugins);

/**
 * Active plugin store - exposes the currently active plugin ID
 */
export const activePlugin = derived(pluginState, ($state) => $state.activePlugin);

/**
 * Plugin loading state store
 */
export const pluginLoading = derived(pluginState, ($state) => $state.loading);

/**
 * Plugin error state store
 */
export const pluginError = derived(pluginState, ($state) => $state.error);

/**
 * Event listener cleanup function
 */
let pluginEventUnlisten: (() => void) | null = null;

// Import Tauri context utilities
import { TauriApi } from '../utils/tauri-context';

/**
 * Safely invoke Tauri command with error handling and browser context detection
 * @param command - Tauri command name
 * @param args - Command arguments
 * @returns Promise resolving to command result or null on error
 */
async function safeInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!browser) {
    console.warn(`Tauri command '${command}' called in SSR context, returning null`);
    return null;
  }

  // Check if Tauri API is available before attempting to invoke
  if (!TauriApi.isAvailable()) {
    console.warn(
      `Tauri command '${command}' called in browser context without Tauri runtime, returning null`
    );
    return null;
  }

  try {
    const result = await TauriApi.invoke<T>(command, args);
    if (result === undefined) {
      throw new Error('Command returned undefined');
    }
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Only log errors and show notifications if we're in a Tauri context
    // In browser-only context, silently fail to avoid noise
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      console.error(`Tauri command '${command}' failed:`, errorMessage);

      showNotification({
        type: 'error',
        message: `Command failed: ${command}`,
        details: errorMessage
      });
    }

    return null;
  }
}

/**
 * Mock plugins for development/fallback
 */
const MOCK_PLUGINS: Plugin[] = [
  {
    id: 'mission-planner',
    name: 'Mission Planner',
    description:
      'Plan and visualize aerospace missions with interactive mapping and waypoint management.',
    enabled: true,
    version: '1.0.0',
    author: 'Modular C2 Team',
    category: 'mission'
  },
  {
    id: 'sdr-suite',
    name: 'SDR Suite',
    description:
      'Software Defined Radio visualization and analysis tools for RF spectrum monitoring.',
    enabled: true,
    version: '1.0.0',
    author: 'Modular C2 Team',
    category: 'communication'
  }
];

/**
 * Load plugins from the backend
 * @returns Promise resolving to loaded plugins array
 */
export async function loadPlugins(): Promise<Plugin[]> {
  console.log('Loading plugins from backend...');

  // Set loading state
  pluginState.update((state) => ({
    ...state,
    loading: true,
    error: null
  }));

  try {
    // Try to get loaded plugins from backend
    const loadedPlugins = await safeInvoke<Plugin[]>('get_loaded_plugins');

    if (loadedPlugins && loadedPlugins.length > 0) {
      // Update store state with backend plugins
      pluginState.update((state) => ({
        ...state,
        plugins: loadedPlugins,
        loading: false,
        error: null,
        lastUpdated: Date.now()
      }));

      console.log(`Successfully loaded ${loadedPlugins.length} plugins from backend`);
      return loadedPlugins;
    } else {
      // Fallback to mock plugins if backend is not available or returns empty
      console.log('Using mock plugins for development');

      pluginState.update((state) => ({
        ...state,
        plugins: MOCK_PLUGINS,
        loading: false,
        error: null,
        lastUpdated: Date.now()
      }));

      return MOCK_PLUGINS;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown plugin loading error';

    console.log('Plugin backend unavailable, using mock plugins for development');

    // Fallback to mock plugins on error
    pluginState.update((state) => ({
      ...state,
      plugins: MOCK_PLUGINS,
      loading: false,
      error: null, // Don't show error since we have fallback
      lastUpdated: Date.now()
    }));

    return MOCK_PLUGINS;
  }
}

/**
 * Load a specific plugin
 * @param pluginName - Name of the plugin to load
 * @returns Promise resolving to success status
 */
export async function loadPlugin(pluginName: string): Promise<boolean> {
  console.log(`Loading plugin: ${pluginName}`);

  const result = await safeInvoke<void>('load_plugin', { name: pluginName });

  if (result !== null) {
    // Reload plugins to get updated state
    await loadPlugins();

    showNotification({
      type: 'success',
      message: 'Plugin loaded',
      details: `Successfully loaded plugin: ${pluginName}`
    });

    return true;
  }

  return false;
}

/**
 * Unload a specific plugin
 * @param pluginName - Name of the plugin to unload
 * @returns Promise resolving to success status
 */
export async function unloadPlugin(pluginName: string): Promise<boolean> {
  console.log(`Unloading plugin: ${pluginName}`);

  const result = await safeInvoke<void>('unload_plugin', { name: pluginName });

  if (result !== null) {
    // Reload plugins to get updated state
    await loadPlugins();

    // If the unloaded plugin was active, return to dashboard
    pluginState.update((state) => {
      if (state.activePlugin === pluginName) {
        return { ...state, activePlugin: null };
      }
      return state;
    });

    showNotification({
      type: 'success',
      message: 'Plugin unloaded',
      details: `Successfully unloaded plugin: ${pluginName}`
    });

    return true;
  }

  return false;
}

/**
 * Set the active plugin
 * @param pluginId - ID of the plugin to activate, or null for dashboard
 */
export function setActivePlugin(pluginId: string | null): void {
  pluginState.update((state) => ({
    ...state,
    activePlugin: pluginId
  }));

  if (pluginId) {
    console.log(`Activated plugin: ${pluginId}`);
  } else {
    console.log('Returned to dashboard');
  }
}

/**
 * Get plugin by ID
 * @param pluginId - ID of the plugin to find
 * @returns Plugin object or null if not found
 */
export function getPluginById(pluginId: string): Plugin | null {
  let currentPlugins: Plugin[] = [];

  const unsubscribe = plugins.subscribe((p) => {
    currentPlugins = p;
  });
  unsubscribe();

  return currentPlugins.find((plugin) => plugin.id === pluginId) || null;
}

/**
 * Setup plugin event listeners
 * @returns Promise resolving to cleanup function
 */
export async function setupPluginEventListeners(): Promise<(() => void) | null> {
  if (!browser) {
    console.warn('Plugin event listeners called in SSR context, skipping');
    return null;
  }

  try {
    // Check if Tauri is available
    if (!TauriApi.isAvailable()) {
      return null;
    }

    console.log('Setting up plugin event listeners...');

    // Listen for plugin changes from backend
    pluginEventUnlisten = await TauriApi.listen<string[]>('plugins-changed', (payload) => {
      console.log('Plugins changed event received:', payload);

      // Reload plugins when backend notifies of changes
      loadPlugins().catch((error) => {
        console.error('Failed to reload plugins after change event:', error);
      });
    });

    console.log('Plugin event listeners setup successfully');
    return pluginEventUnlisten;
  } catch (error) {
    console.error('Failed to setup plugin event listeners:', error);
    return null;
  }
}

/**
 * Cleanup plugin event listeners
 */
export function cleanupPluginEventListeners(): void {
  if (pluginEventUnlisten) {
    pluginEventUnlisten();
    pluginEventUnlisten = null;
    console.log('Plugin event listeners cleaned up');
  }
}

/**
 * Get current plugin state
 * @returns Current plugin state
 */
export function getPluginState(): PluginState {
  let state: PluginState | undefined;
  const unsubscribe = pluginState.subscribe((s) => (state = s));
  unsubscribe();
  return state!;
}

/**
 * Clear plugin error state
 */
export function clearPluginError(): void {
  pluginState.update((state) => ({
    ...state,
    error: null
  }));
}

/**
 * Initialize plugin system
 * @returns Promise resolving to initialization success
 */
export async function initializePluginSystem(): Promise<boolean> {
  try {
    console.log('Initializing plugin system...');

    // Setup event listeners
    await setupPluginEventListeners();

    // Load initial plugins
    await loadPlugins();

    console.log('Plugin system initialized successfully');
    return true;
  } catch (error) {
    console.error('Plugin system initialization failed:', error);
    return false;
  }
}

// Export the plugin state store for advanced use cases
export { pluginState };

// Convenience store for active plugin writable access
export const activePluginWritable = {
  subscribe: activePlugin.subscribe,
  set: setActivePlugin,
  update: (updater: (value: string | null) => string | null) => {
    let currentValue: string | null = null;
    const unsubscribe = activePlugin.subscribe((value) => {
      currentValue = value;
    });
    unsubscribe();

    const newValue = updater(currentValue);
    setActivePlugin(newValue);
  }
};
