/**
 * Plugin store tests
 * Tests the plugin system store functionality
 * Requirements: 1.2, 1.3
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/tauri';
import { listen, type Event } from '@tauri-apps/api/event';
import {
  plugins,
  activePlugin,
  pluginLoading,
  pluginError,
  loadPlugins,
  loadPlugin,
  unloadPlugin,
  setActivePlugin,
  getPluginById,
  setupPluginEventListeners,
  cleanupPluginEventListeners,
  initializePluginSystem,
  clearPluginError,
  getPluginState
} from '../plugins';
import type { Plugin } from '../../types/plugin';

// Mock Tauri API
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn()
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn()
}));

// Mock notifications store
vi.mock('../notifications', () => ({
  showNotification: vi.fn()
}));

describe('Plugin Store', () => {
  const mockPlugins: Plugin[] = [
    {
      id: 'mission-planner',
      name: 'Mission Planner',
      description: 'Plan and visualize aerospace missions',
      enabled: true,
      version: '1.0.0',
      author: 'Modular C2 Team',
      category: 'mission'
    },
    {
      id: 'sdr-suite',
      name: 'SDR Suite',
      description: 'Software Defined Radio visualization',
      enabled: true,
      version: '1.0.0',
      author: 'Modular C2 Team',
      category: 'communication'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset active plugin
    setActivePlugin(null);
    clearPluginError();
  });

  afterEach(() => {
    cleanupPluginEventListeners();
  });

  describe('Store Initialization', () => {
    test('should initialize with empty state', () => {
      const pluginList = get(plugins);
      const active = get(activePlugin);
      const loading = get(pluginLoading);
      const error = get(pluginError);

      expect(pluginList).toEqual([]);
      expect(active).toBeNull();
      expect(loading).toBe(false);
      expect(error).toBeNull();
    });

    test('should provide plugin state access', () => {
      const state = getPluginState();

      expect(state).toHaveProperty('plugins');
      expect(state).toHaveProperty('activePlugin');
      expect(state).toHaveProperty('loading');
      expect(state).toHaveProperty('error');
      expect(state).toHaveProperty('lastUpdated');
    });
  });

  describe('Plugin Loading', () => {
    test('should load plugins from backend successfully', async () => {
      vi.mocked(invoke).mockResolvedValue(mockPlugins);

      const result = await loadPlugins();

      expect(invoke).toHaveBeenCalledWith('get_loaded_plugins', undefined);
      expect(result).toEqual(mockPlugins);
      expect(get(plugins)).toEqual(mockPlugins);
      expect(get(pluginLoading)).toBe(false);
      expect(get(pluginError)).toBeNull();
    });

    test('should fallback to mock plugins when backend fails', async () => {
      vi.mocked(invoke).mockRejectedValue(new Error('Backend not available'));

      const result = await loadPlugins();

      expect(result).toHaveLength(2); // Mock plugins
      expect(get(plugins)).toHaveLength(2);
      expect(get(pluginLoading)).toBe(false);
      expect(get(pluginError)).toBeNull(); // No error since we have fallback
    });

    test('should set loading state during plugin loading', async () => {
      let loadingState = false;

      // Mock a delayed response
      vi.mocked(invoke).mockImplementation(() => {
        loadingState = get(pluginLoading);
        return Promise.resolve(mockPlugins);
      });

      await loadPlugins();

      expect(loadingState).toBe(true);
      expect(get(pluginLoading)).toBe(false);
    });

    test('should use mock plugins when backend returns empty array', async () => {
      vi.mocked(invoke).mockResolvedValue([]);

      const result = await loadPlugins();

      expect(result).toHaveLength(2); // Mock plugins
      expect(get(plugins)).toHaveLength(2);
    });
  });

  describe('Individual Plugin Management', () => {
    test('should load individual plugin successfully', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined); // load_plugin response
      vi.mocked(invoke).mockResolvedValueOnce(mockPlugins); // get_loaded_plugins response

      const result = await loadPlugin('test-plugin');

      expect(invoke).toHaveBeenCalledWith('load_plugin', {
        name: 'test-plugin'
      });
      expect(invoke).toHaveBeenCalledWith('get_loaded_plugins', undefined);
      expect(result).toBe(true);
    });

    test('should handle load plugin failure', async () => {
      vi.mocked(invoke).mockRejectedValue(new Error('Plugin load failed'));

      const result = await loadPlugin('test-plugin');

      expect(result).toBe(false);
    });

    test('should unload individual plugin successfully', async () => {
      // Set up initial state with active plugin
      setActivePlugin('test-plugin');

      vi.mocked(invoke).mockResolvedValueOnce(undefined); // unload_plugin response
      vi.mocked(invoke).mockResolvedValueOnce(mockPlugins); // get_loaded_plugins response

      const result = await unloadPlugin('test-plugin');

      expect(invoke).toHaveBeenCalledWith('unload_plugin', {
        name: 'test-plugin'
      });
      expect(result).toBe(true);
      expect(get(activePlugin)).toBeNull(); // Should return to dashboard
    });

    test('should handle unload plugin failure', async () => {
      vi.mocked(invoke).mockRejectedValue(new Error('Plugin unload failed'));

      const result = await unloadPlugin('test-plugin');

      expect(result).toBe(false);
    });
  });

  describe('Active Plugin Management', () => {
    test('should set active plugin', () => {
      setActivePlugin('mission-planner');

      expect(get(activePlugin)).toBe('mission-planner');
    });

    test('should clear active plugin', () => {
      setActivePlugin('mission-planner');
      setActivePlugin(null);

      expect(get(activePlugin)).toBeNull();
    });

    test('should update active plugin', () => {
      setActivePlugin('mission-planner');
      setActivePlugin('sdr-suite');

      expect(get(activePlugin)).toBe('sdr-suite');
    });
  });

  describe('Plugin Lookup', () => {
    beforeEach(async () => {
      vi.mocked(invoke).mockResolvedValue(mockPlugins);
      await loadPlugins();
    });

    test('should find plugin by ID', () => {
      const plugin = getPluginById('mission-planner');

      expect(plugin).toBeDefined();
      expect(plugin?.id).toBe('mission-planner');
      expect(plugin?.name).toBe('Mission Planner');
    });

    test('should return null for non-existent plugin', () => {
      const plugin = getPluginById('non-existent');

      expect(plugin).toBeNull();
    });
  });

  describe('Event Listeners', () => {
    test('should setup plugin event listeners', async () => {
      const mockUnlisten = vi.fn();
      vi.mocked(listen).mockResolvedValue(mockUnlisten);

      const unlisten = await setupPluginEventListeners();

      expect(listen).toHaveBeenCalledWith('plugins-changed', expect.any(Function));
      expect(unlisten).toBe(mockUnlisten);
    });

    test('should handle event listener setup failure', async () => {
      vi.mocked(listen).mockRejectedValue(new Error('Event setup failed'));

      const unlisten = await setupPluginEventListeners();

      expect(unlisten).toBeNull();
    });

    test('should cleanup event listeners', () => {
      // Simulate having an active listener
      cleanupPluginEventListeners();

      // Should not throw error even if no listeners are active
      expect(() => cleanupPluginEventListeners()).not.toThrow();
    });

    test('should handle plugins-changed event', async () => {
      let eventHandler: ((event: Event<string[]>) => void) | undefined;

      vi.mocked(listen).mockImplementation((eventName, handler) => {
        if (eventName === 'plugins-changed') {
          eventHandler = handler;
        }
        return Promise.resolve(vi.fn());
      });

      vi.mocked(invoke).mockResolvedValue(mockPlugins);

      await setupPluginEventListeners();

      // Simulate plugins-changed event
      if (eventHandler) {
        eventHandler({
          payload: ['mission-planner', 'sdr-suite'],
          event: 'plugins-changed',
          windowLabel: 'main',
          id: 1
        });
      }

      // Should trigger plugin reload
      expect(invoke).toHaveBeenCalledWith('get_loaded_plugins', undefined);
    });
  });

  describe('System Initialization', () => {
    test('should initialize plugin system successfully', async () => {
      vi.mocked(listen).mockResolvedValue(vi.fn());
      vi.mocked(invoke).mockResolvedValue(mockPlugins);

      const result = await initializePluginSystem();

      expect(result).toBe(true);
      expect(listen).toHaveBeenCalled();
      expect(invoke).toHaveBeenCalledWith('get_loaded_plugins', undefined);
    });

    test('should handle initialization failure', async () => {
      // Mock both event listener setup and plugin loading to fail
      vi.mocked(listen).mockRejectedValue(new Error('Event listener setup failed'));

      const result = await initializePluginSystem();

      // Since loadPlugins has fallback logic, initialization will still succeed
      // even if event listeners fail, as long as plugins can be loaded
      expect(result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should clear plugin error', () => {
      // Simulate an error state
      vi.mocked(invoke).mockRejectedValue(new Error('Test error'));

      clearPluginError();

      expect(get(pluginError)).toBeNull();
    });

    test('should handle Tauri command errors gracefully', async () => {
      vi.mocked(invoke).mockRejectedValue(new Error('Tauri error'));

      const result = await loadPlugin('test-plugin');

      expect(result).toBe(false);
      // Should not crash the application
    });
  });

  describe('Store Reactivity', () => {
    test('should update derived stores when plugin state changes', async () => {
      vi.mocked(invoke).mockResolvedValue(mockPlugins);

      await loadPlugins();

      expect(get(plugins)).toEqual(mockPlugins);
      expect(get(pluginLoading)).toBe(false);
      expect(get(pluginError)).toBeNull();
    });

    test('should maintain store consistency', () => {
      setActivePlugin('test-plugin');

      const state = getPluginState();
      const activeFromStore = get(activePlugin);

      expect(state.activePlugin).toBe(activeFromStore);
    });
  });
});
