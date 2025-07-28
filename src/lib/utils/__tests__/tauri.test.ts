/**
 * Tests for Tauri utilities with safe API invocation
 * Requirements: 6.1 - Safe API invocation with comprehensive error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { invoke } from '@tauri-apps/api/tauri';
import { listen, type Event } from '@tauri-apps/api/event';
import * as notifications from '../../stores/notifications';
import {
  invokeTauriCommand,
  safeTauriInvoke,
  batchTauriInvoke,
  protectedTauriInvoke,
  setupEventListener,
  resetCircuitBreaker,
  getCircuitBreakerStatus,
  checkBackendHealth,
  resetAllApiErrorTracking,
  CliCommands,
  PluginCommands,
  MissionCommands,
  SdrCommands,
  type ApiInvocationOptions
} from '../tauri';
import type { SdrSettings } from '../../plugins/sdr-suite/types';

// Mock Tauri API
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn()
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn()
}));

// Mock notifications
vi.mock('../../stores/notifications', () => ({
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn()
}));

describe('Tauri Safe API Invocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAllApiErrorTracking();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('invokeTauriCommand', () => {
    it('should successfully invoke a command', async () => {
      const mockResult = { success: true };
      vi.mocked(invoke).mockResolvedValue(mockResult);

      const result = await invokeTauriCommand('test_command', { arg: 'value' });

      expect(invoke).toHaveBeenCalledWith('test_command', { arg: 'value' });
      expect(result).toEqual(mockResult);
    });

    it('should handle command errors with notification', async () => {
      const mockError = new Error('Command failed');
      vi.mocked(invoke).mockRejectedValue(mockError);

      await expect(invokeTauriCommand('test_command')).rejects.toThrow(
        'Backend operation failed: Command failed'
      );
      expect(notifications.showError).toHaveBeenCalledWith('Operation Failed', 'Command failed');
    });

    it('should retry failed commands when configured', async () => {
      const mockError = new Error('Temporary failure');
      vi.mocked(invoke)
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValue({ success: true });

      const options: ApiInvocationOptions = {
        retryAttempts: 2,
        retryDelay: 100
      };

      const result = await invokeTauriCommand('test_command', {}, options);

      expect(invoke).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ success: true });
      expect(notifications.showInfo).toHaveBeenCalledWith(
        'Operation succeeded',
        'test_command completed after 3 attempts'
      );
    });

    it('should timeout long-running commands', async () => {
      vi.mocked(invoke).mockImplementation(() => new Promise(() => {})); // Never resolves

      const options: ApiInvocationOptions = {
        timeout: 100
      };

      await expect(invokeTauriCommand('slow_command', {}, options)).rejects.toThrow(
        'Operation timed out after 100ms'
      );
    });

    it('should suppress notifications when configured', async () => {
      const mockError = new Error('Command failed');
      vi.mocked(invoke).mockRejectedValue(mockError);

      const options: ApiInvocationOptions = {
        showNotification: false
      };

      await expect(invokeTauriCommand('test_command', {}, options)).rejects.toThrow();
      expect(notifications.showError).not.toHaveBeenCalled();
    });
  });

  describe('safeTauriInvoke', () => {
    it('should return result on success', async () => {
      const mockResult = { data: 'test' };
      vi.mocked(invoke).mockResolvedValue(mockResult);

      const result = await safeTauriInvoke('test_command');

      expect(result).toEqual(mockResult);
    });

    it('should return null on error', async () => {
      const mockError = new Error('Command failed');
      vi.mocked(invoke).mockRejectedValue(mockError);

      const result = await safeTauriInvoke('test_command');

      expect(result).toBeNull();
      expect(notifications.showError).toHaveBeenCalled();
    });
  });

  describe('batchTauriInvoke', () => {
    it('should execute multiple commands in parallel', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce('result1')
        .mockResolvedValueOnce('result2')
        .mockRejectedValueOnce(new Error('Command 3 failed'));

      const commands = [{ command: 'command1' }, { command: 'command2' }, { command: 'command3' }];

      const results = await batchTauriInvoke(commands);

      expect(results).toEqual(['result1', 'result2', null]);
      expect(invoke).toHaveBeenCalledTimes(3);
    });
  });

  describe('protectedTauriInvoke', () => {
    it('should use circuit breaker protection', async () => {
      const mockError = new Error('Service unavailable');
      vi.mocked(invoke).mockRejectedValue(mockError);

      // Trigger circuit breaker by failing multiple times
      for (let i = 0; i < 5; i++) {
        await expect(protectedTauriInvoke('failing_command', {}, 'test')).rejects.toThrow();
      }

      // Circuit breaker should now be open
      const status = getCircuitBreakerStatus();
      expect(status.get('test')).toBe('OPEN');

      // Next call should be blocked by circuit breaker
      await expect(protectedTauriInvoke('failing_command', {}, 'test')).rejects.toThrow(
        'Circuit breaker is OPEN'
      );
    });

    it('should reset circuit breaker on manual reset', async () => {
      const mockError = new Error('Service unavailable');
      vi.mocked(invoke).mockRejectedValue(mockError);

      // Trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        await expect(protectedTauriInvoke('failing_command', {}, 'test')).rejects.toThrow();
      }

      expect(getCircuitBreakerStatus().get('test')).toBe('OPEN');

      // Reset circuit breaker
      resetCircuitBreaker('test');
      expect(getCircuitBreakerStatus().get('test')).toBe('CLOSED');
    });
  });

  describe('setupEventListener', () => {
    it('should setup event listener successfully', async () => {
      const mockUnlisten = vi.fn();
      const mockHandler = vi.fn();

      vi.mocked(listen).mockResolvedValue(mockUnlisten);

      const unlisten = await setupEventListener('test-event', mockHandler);

      expect(listen).toHaveBeenCalledWith('test-event', expect.any(Function));
      expect(unlisten).toBe(mockUnlisten);
    });

    it('should handle event listener setup errors', async () => {
      const mockError = new Error('Failed to setup listener');
      vi.mocked(listen).mockRejectedValue(mockError);

      await expect(setupEventListener('test-event', vi.fn())).rejects.toThrow(mockError);
      expect(notifications.showError).toHaveBeenCalledWith(
        'Event Listener Setup Failed',
        "Failed to setup listener for 'test-event': Failed to setup listener"
      );
    });

    it('should handle errors in event handler', async () => {
      const mockUnlisten = vi.fn();
      const mockHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });

      let eventCallback: (event: Event<unknown>) => void;
      vi.mocked(listen).mockImplementation((eventName, callback) => {
        eventCallback = callback;
        return Promise.resolve(mockUnlisten);
      });

      await setupEventListener('test-event', mockHandler);

      // Simulate event
      eventCallback!({ payload: 'test-data', event: 'test-event', windowLabel: 'main', id: 1 });

      expect(mockHandler).toHaveBeenCalledWith('test-data');
      expect(notifications.showError).toHaveBeenCalledWith(
        'Event Handler Error',
        'Error in test-event handler: Handler error'
      );
    });

    it('should disable event handler after too many errors', async () => {
      const mockUnlisten = vi.fn();
      const mockHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });

      let eventCallback: (event: Event<unknown>) => void;
      vi.mocked(listen).mockImplementation((eventName, callback) => {
        eventCallback = callback;
        return Promise.resolve(mockUnlisten);
      });

      await setupEventListener('test-event', mockHandler, {
        maxErrorsBeforeDisable: 3
      });

      // Trigger multiple errors
      for (let i = 0; i < 5; i++) {
        eventCallback!({
          payload: `test-data-${i}`,
          event: 'test-event',
          windowLabel: 'main',
          id: i
        });
      }

      expect(mockHandler).toHaveBeenCalledTimes(3); // Should stop after 3 errors
      expect(notifications.showError).toHaveBeenCalledWith(
        'Event Handler Disabled',
        "Handler for 'test-event' disabled due to repeated errors. Will retry after cooldown."
      );
    });
  });

  describe('checkBackendHealth', () => {
    it('should return healthy status on successful ping', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      const health = await checkBackendHealth();

      expect(health.healthy).toBe(true);
      expect(health.latency).toBeGreaterThan(0);
      expect(health.error).toBeUndefined();
    });

    it('should return unhealthy status on failed ping', async () => {
      const mockError = new Error('Backend unavailable');
      vi.mocked(invoke).mockRejectedValue(mockError);

      const health = await checkBackendHealth();

      expect(health.healthy).toBe(false);
      expect(health.latency).toBeGreaterThan(0);
      expect(health.error).toBe('Backend operation failed: Backend unavailable');
    });
  });

  describe('Command Wrappers', () => {
    describe('CliCommands', () => {
      it('should run CLI command with error handling', async () => {
        vi.mocked(invoke).mockResolvedValue(undefined);

        await CliCommands.runCommand('test command');

        expect(invoke).toHaveBeenCalledWith('run_cli_command', { command: 'test command' });
      });

      it('should safely run CLI command', async () => {
        vi.mocked(invoke).mockRejectedValue(new Error('Command failed'));

        const result = await CliCommands.safeRunCommand('test command');

        expect(result).toBe(false);
        expect(notifications.showError).toHaveBeenCalled();
      });
    });

    describe('PluginCommands', () => {
      it('should load plugins with error handling', async () => {
        const mockPlugins = [
          { id: 'test', name: 'Test Plugin', description: 'Test', icon: 'test', enabled: true }
        ];
        vi.mocked(invoke).mockResolvedValue(mockPlugins);

        const result = await PluginCommands.getLoadedPlugins();

        expect(result).toEqual(mockPlugins);
        expect(invoke).toHaveBeenCalledWith('get_loaded_plugins', undefined);
      });

      it('should safely load plugins', async () => {
        vi.mocked(invoke).mockRejectedValue(new Error('Failed to load'));

        const result = await PluginCommands.safeGetLoadedPlugins();

        expect(result).toEqual([]);
        expect(notifications.showError).toHaveBeenCalled();
      });
    });

    describe('MissionCommands', () => {
      it('should update waypoint parameters', async () => {
        vi.mocked(invoke).mockResolvedValue(undefined);

        const params = { lat: 37.7749, lng: -122.4194, alt: 100 };
        await MissionCommands.updateWaypointParams('waypoint-1', params);

        expect(invoke).toHaveBeenCalledWith('update_waypoint_params', {
          waypoint_id: 'waypoint-1',
          params
        });
      });

      it('should safely get mission data', async () => {
        vi.mocked(invoke).mockRejectedValue(new Error('Failed to load'));

        const result = await MissionCommands.safeGetMissionData();

        expect(result).toEqual([]);
      });
    });

    describe('SdrCommands', () => {
      it('should start SDR with extended timeout', async () => {
        vi.mocked(invoke).mockResolvedValue(undefined);

        const settings: SdrSettings = {
          centerFrequency: 100000000,
          sampleRate: 2048000,
          gain: 20,
          bandwidth: 2048000
        };
        await SdrCommands.startSdr(settings);

        expect(invoke).toHaveBeenCalledWith('sdr_start', { settings });
      });

      it('should safely get available devices', async () => {
        vi.mocked(invoke).mockRejectedValue(new Error('No devices'));

        const result = await SdrCommands.safeGetAvailableDevices();

        expect(result).toEqual([]);
      });
    });
  });
});
