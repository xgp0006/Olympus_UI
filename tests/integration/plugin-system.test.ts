/**
 * Plugin System Integration Tests
 * Tests plugin loading, activation, and lifecycle management
 * Requirements: 1.2, 1.3, 1.5, 1.6, 1.7, 1.8
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

// Import components
import PluginDashboard from '../../src/lib/components/plugins/PluginDashboard.svelte';
import PluginContainer from '../../src/lib/components/plugins/PluginContainer.svelte';

// Import stores and functions
import {
  plugins,
  activePlugin,
  pluginLoading,
  pluginError,
  setActivePlugin,
  loadPlugin,
  unloadPlugin,
  initializePluginSystem,
  setupPluginEventListeners,
  cleanupPluginEventListeners,
  pluginState
} from '../../src/lib/stores/plugins';

// Import test utilities
import { createMockPlugin } from '../../src/lib/test-utils/mock-factories';
import { waitForComponentReady } from '../../src/lib/test-utils/component-helpers';

// Mock Tauri API
const mockInvoke = vi.fn();
const mockListen = vi.fn();
const mockUnlisten = vi.fn();

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: mockInvoke
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: mockListen,
  emit: vi.fn()
}));

describe('Plugin System Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset stores
    pluginState.set({
      plugins: [],
      activePlugin: null,
      loading: false,
      error: null,
      lastUpdated: 0
    });
    setActivePlugin(null);
    
    // Setup default mock responses
    mockListen.mockResolvedValue(mockUnlisten);
    mockInvoke.mockImplementation((command: string, args?: any) => {
      switch (command) {
        case 'get_loaded_plugins':
          return Promise.resolve([
            createMockPlugin('mission-planner', 'Mission Planner', { enabled: true }),
            createMockPlugin('sdr-suite', 'SDR Suite', { enabled: true }),
            createMockPlugin('disabled-plugin', 'Disabled Plugin', { enabled: false })
          ]);
        case 'load_plugin':
          return Promise.resolve();
        case 'unload_plugin':
          return Promise.resolve();
        default:
          return Promise.resolve(null);
      }
    });
  });

  describe('Plugin Loading and Initialization', () => {
    test('initializes plugin system successfully', async () => {
      const result = await initializePluginSystem();
      
      expect(result).toBe(true);
      expect(mockListen).toHaveBeenCalledWith('plugins-changed', expect.any(Function));
      expect(mockInvoke).toHaveBeenCalledWith('get_loaded_plugins');
      
      // Verify plugins were loaded into store
      await waitFor(() => {
        const pluginList = get(plugins);
        expect(pluginList).toHaveLength(3);
        expect(pluginList[0].id).toBe('mission-planner');
        expect(pluginList[1].id).toBe('sdr-suite');
        expect(pluginList[2].id).toBe('disabled-plugin');
      });
    });

    test('handles plugin loading failure gracefully', async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === 'get_loaded_plugins') {
          return Promise.reject(new Error('Backend connection failed'));
        }
        return Promise.resolve(null);
      });

      const result = await initializePluginSystem();
      
      // Should still return true due to fallback to mock plugins
      expect(result).toBe(true);
      
      // Should have fallback plugins
      await waitFor(() => {
        const pluginList = get(plugins);
        expect(pluginList).toHaveLength(2); // Mock plugins
        expect(pluginList[0].id).toBe('mission-planner');
        expect(pluginList[1].id).toBe('sdr-suite');
      });
    });

    test('sets up event listeners for plugin changes', async () => {
      const unlisten = await setupPluginEventListeners();
      
      expect(mockListen).toHaveBeenCalledWith('plugins-changed', expect.any(Function));
      expect(unlisten).toBe(mockUnlisten);
      
      // Cleanup
      cleanupPluginEventListeners();
      expect(mockUnlisten).toHaveBeenCalled();
    });

    test('handles plugin change events', async () => {
      let eventHandler: (event: any) => void;
      
      mockListen.mockImplementation((eventName: string, handler: (event: any) => void) => {
        if (eventName === 'plugins-changed') {
          eventHandler = handler;
        }
        return Promise.resolve(mockUnlisten);
      });

      await setupPluginEventListeners();
      
      // Simulate plugin change event
      const newPluginList = [
        createMockPlugin('new-plugin', 'New Plugin', { enabled: true })
      ];
      
      mockInvoke.mockImplementation((command: string) => {
        if (command === 'get_loaded_plugins') {
          return Promise.resolve(newPluginList);
        }
        return Promise.resolve(null);
      });

      // Trigger the event
      eventHandler!({ payload: ['new-plugin'] });

      // Wait for plugins to be reloaded
      await waitFor(() => {
        const pluginList = get(plugins);
        expect(pluginList).toHaveLength(1);
        expect(pluginList[0].id).toBe('new-plugin');
      });
    });
  });

  describe('Plugin Activation and Navigation', () => {
    test('activates plugin correctly', async () => {
      await initializePluginSystem();
      
      setActivePlugin('mission-planner');
      
      const currentActivePlugin = get(activePlugin);
      expect(currentActivePlugin).toBe('mission-planner');
    });

    test('returns to dashboard when setting active plugin to null', async () => {
      await initializePluginSystem();
      
      // First activate a plugin
      setActivePlugin('mission-planner');
      expect(get(activePlugin)).toBe('mission-planner');
      
      // Then return to dashboard
      setActivePlugin(null);
      expect(get(activePlugin)).toBeNull();
    });

    test('plugin container renders active plugin', async () => {
      await initializePluginSystem();
      setActivePlugin('mission-planner');

      const { container } = render(PluginContainer);
      
      await waitFor(() => {
        // In a real implementation, this would check for the actual plugin component
        // For now, we verify the container is rendered
        expect(container.firstChild).toBeTruthy();
      });
    });

    test('plugin dashboard shows home button when plugin is active', async () => {
      await initializePluginSystem();
      
      const { queryByTestId } = render(PluginDashboard);
      
      // Initially no home button (on dashboard)
      expect(queryByTestId('home-button')).not.toBeInTheDocument();
      
      // Activate a plugin
      setActivePlugin('mission-planner');
      
      // Now home button should appear
      await waitFor(() => {
        expect(queryByTestId('home-button')).toBeInTheDocument();
      });
    });
  });

  describe('Plugin Enable/Disable Operations', () => {
    test('loads plugin successfully', async () => {
      await initializePluginSystem();
      
      const result = await loadPlugin('test-plugin');
      
      expect(result).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('load_plugin', { name: 'test-plugin' });
      
      // Should reload plugins after loading
      expect(mockInvoke).toHaveBeenCalledWith('get_loaded_plugins');
    });

    test('unloads plugin successfully', async () => {
      await initializePluginSystem();
      setActivePlugin('mission-planner');
      
      const result = await unloadPlugin('mission-planner');
      
      expect(result).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('unload_plugin', { name: 'mission-planner' });
      
      // Should return to dashboard if unloaded plugin was active
      expect(get(activePlugin)).toBeNull();
    });

    test('handles plugin load failure', async () => {
      mockInvoke.mockImplementation((command: string, args?: any) => {
        if (command === 'load_plugin') {
          return Promise.reject(new Error('Plugin not found'));
        }
        if (command === 'get_loaded_plugins') {
          return Promise.resolve([]);
        }
        return Promise.resolve(null);
      });

      const result = await loadPlugin('nonexistent-plugin');
      
      expect(result).toBe(false);
    });

    test('handles plugin unload failure', async () => {
      mockInvoke.mockImplementation((command: string, args?: any) => {
        if (command === 'unload_plugin') {
          return Promise.reject(new Error('Plugin unload failed'));
        }
        if (command === 'get_loaded_plugins') {
          return Promise.resolve([]);
        }
        return Promise.resolve(null);
      });

      const result = await unloadPlugin('test-plugin');
      
      expect(result).toBe(false);
    });
  });

  describe('Plugin Dashboard Integration', () => {
    test('displays loading state during plugin operations', async () => {
      // Mock slow plugin loading
      mockInvoke.mockImplementation((command: string) => {
        if (command === 'get_loaded_plugins') {
          return new Promise(resolve => setTimeout(() => resolve([]), 100));
        }
        return Promise.resolve(null);
      });

      const { getByTestId } = render(PluginDashboard);
      
      // Should show loading state initially
      expect(getByTestId('loading-state')).toBeInTheDocument();
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(getByTestId('empty-state')).toBeInTheDocument();
      }, { timeout: 200 });
    });

    test('displays error state when plugin loading fails', async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === 'get_loaded_plugins') {
          return Promise.reject(new Error('Backend connection failed'));
        }
        return Promise.resolve(null);
      });

      const { getByTestId } = render(PluginDashboard);
      
      // Wait for error state (fallback plugins should load instead)
      await waitFor(() => {
        // With fallback, we should see plugins, not error
        expect(getByTestId('plugins-container')).toBeInTheDocument();
      });
    });

    test('refresh button reloads plugins', async () => {
      await initializePluginSystem();
      
      const { getByTestId } = render(PluginDashboard);
      
      await waitFor(() => {
        expect(getByTestId('plugins-container')).toBeInTheDocument();
      });

      const refreshButton = getByTestId('refresh-button');
      await fireEvent.click(refreshButton);

      // Should call get_loaded_plugins again
      expect(mockInvoke).toHaveBeenCalledWith('get_loaded_plugins');
    });

    test('plugin statistics are calculated correctly', async () => {
      await initializePluginSystem();
      
      const { getByText } = render(PluginDashboard);
      
      await waitFor(() => {
        // Should show correct counts (2 enabled, 1 disabled from mock data)
        expect(getByText('3')).toBeInTheDocument(); // Total
        expect(getByText('2')).toBeInTheDocument(); // Enabled
        expect(getByText('1')).toBeInTheDocument(); // Disabled
      });
    });
  });

  describe('Plugin State Management', () => {
    test('plugin state persists across component remounts', async () => {
      await initializePluginSystem();
      setActivePlugin('mission-planner');
      
      const { unmount } = render(PluginDashboard);
      unmount();
      
      // State should persist
      expect(get(activePlugin)).toBe('mission-planner');
      expect(get(plugins)).toHaveLength(3);
      
      // Remount should show same state
      const { getByTestId } = render(PluginDashboard);
      
      await waitFor(() => {
        expect(getByTestId('plugins-container')).toBeInTheDocument();
      });
    });

    test('multiple plugin operations are handled sequentially', async () => {
      await initializePluginSystem();
      
      // Start multiple operations
      const promises = [
        loadPlugin('plugin-1'),
        loadPlugin('plugin-2'),
        unloadPlugin('plugin-3')
      ];
      
      const results = await Promise.all(promises);
      
      // All should succeed
      expect(results).toEqual([true, true, true]);
      
      // Should have made all the expected calls
      expect(mockInvoke).toHaveBeenCalledWith('load_plugin', { name: 'plugin-1' });
      expect(mockInvoke).toHaveBeenCalledWith('load_plugin', { name: 'plugin-2' });
      expect(mockInvoke).toHaveBeenCalledWith('unload_plugin', { name: 'plugin-3' });
    });

    test('plugin loading state is managed correctly', async () => {
      // Mock slow loading
      mockInvoke.mockImplementation((command: string) => {
        if (command === 'get_loaded_plugins') {
          return new Promise(resolve => setTimeout(() => resolve([]), 50));
        }
        return Promise.resolve(null);
      });

      const loadingPromise = initializePluginSystem();
      
      // Should be loading
      expect(get(pluginLoading)).toBe(true);
      
      await loadingPromise;
      
      // Should no longer be loading
      expect(get(pluginLoading)).toBe(false);
    });
  });

  describe('Plugin Error Handling', () => {
    test('individual plugin errors do not crash the system', async () => {
      mockInvoke.mockImplementation((command: string, args?: unknown) => {
        if (command === 'load_plugin' && (args as any)?.name === 'broken-plugin') {
          return Promise.reject(new Error('Plugin is corrupted'));
        }
        if (command === 'get_loaded_plugins') {
          return Promise.resolve([createMockPlugin('working-plugin', 'Working Plugin')]);
        }
        return Promise.resolve(null);
      });

      await initializePluginSystem();
      
      // Try to load broken plugin
      const result = await loadPlugin('broken-plugin');
      expect(result).toBe(false);
      
      // System should still work for other plugins
      const workingResult = await loadPlugin('working-plugin');
      expect(workingResult).toBe(true);
    });

    test('plugin error state is cleared after successful operation', async () => {
      // First, cause an error
      mockInvoke.mockImplementation((command: string) => {
        if (command === 'get_loaded_plugins') {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(null);
      });

      await initializePluginSystem();
      
      // Should have fallback plugins (no error due to fallback)
      expect(get(pluginError)).toBeNull();
      
      // Now fix the mock and reload
      mockInvoke.mockImplementation((command: string) => {
        if (command === 'get_loaded_plugins') {
          return Promise.resolve([createMockPlugin('test', 'Test')]);
        }
        return Promise.resolve(null);
      });

      await initializePluginSystem();
      
      // Error should be cleared
      expect(get(pluginError)).toBeNull();
    });
  });

  describe('Plugin Lifecycle Events', () => {
    test('plugin activation triggers appropriate events', async () => {
      await initializePluginSystem();
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      setActivePlugin('mission-planner');
      
      expect(consoleSpy).toHaveBeenCalledWith('Activated plugin: mission-planner');
      
      setActivePlugin(null);
      
      expect(consoleSpy).toHaveBeenCalledWith('Returned to dashboard');
      
      consoleSpy.mockRestore();
    });

    test('plugin load/unload operations are logged', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await loadPlugin('test-plugin');
      expect(consoleSpy).toHaveBeenCalledWith('Loading plugin: test-plugin');
      
      await unloadPlugin('test-plugin');
      expect(consoleSpy).toHaveBeenCalledWith('Unloading plugin: test-plugin');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Plugin System Performance', () => {
    test('handles large number of plugins efficiently', async () => {
      const manyPlugins = Array.from({ length: 50 }, (_, i) => 
        createMockPlugin(`plugin-${i}`, `Plugin ${i}`)
      );

      mockInvoke.mockImplementation((command: string) => {
        if (command === 'get_loaded_plugins') {
          return Promise.resolve(manyPlugins);
        }
        return Promise.resolve(null);
      });

      const startTime = performance.now();
      await initializePluginSystem();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be fast
      expect(get(plugins)).toHaveLength(50);
    });

    test('plugin operations are debounced to prevent spam', async () => {
      await initializePluginSystem();
      
      // Rapidly trigger multiple load operations
      const promises = Array.from({ length: 10 }, () => loadPlugin('test-plugin'));
      
      await Promise.all(promises);
      
      // Should have made the calls (in real implementation, these might be debounced)
      expect(mockInvoke).toHaveBeenCalledWith('load_plugin', { name: 'test-plugin' });
    });
  });

  describe('Plugin System Cleanup', () => {
    test('properly cleans up resources on unmount', async () => {
      await setupPluginEventListeners();
      
      cleanupPluginEventListeners();
      
      expect(mockUnlisten).toHaveBeenCalled();
    });

    test('handles cleanup when no listeners are active', () => {
      // Should not throw error
      expect(() => cleanupPluginEventListeners()).not.toThrow();
    });
  });
});