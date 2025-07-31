/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { 
  droneTelemetryStore,
  latestTelemetry,
  telemetryHistory,
  telemetryRate,
  startTelemetryStream,
  stopTelemetryStream,
  setTelemetryOptions,
  getTelemetryStats
} from '../../stores/drone-telemetry';
import { 
  createMockTelemetryPacket,
  createMockAttitudeTelemetry,
  createMockGPSTelemetry,
  createMockBatteryTelemetry,
  createMockMotorTelemetry,
  createMockSystemTelemetry,
  createMockTelemetryStream
} from '../utils/mockDroneData';
import * as notificationStore from '$lib/stores/notifications';
import * as tauriUtils from '$lib/utils/tauri';
import type { TelemetrySubscriptionOptions } from '../../types/drone-types';

// Mock dependencies
vi.mock('$lib/stores/notifications', () => ({
  showNotification: vi.fn()
}));

vi.mock('$lib/utils/tauri', () => ({
  setupEventListener: vi.fn(),
  invoke: vi.fn(),
  emit: vi.fn()
}));

describe('drone-telemetry store', () => {
  let telemetryHandlers: Map<string, Function> = new Map();
  let mockUnlisten: () => void;
  let telemetryStreamCleanup: (() => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    telemetryHandlers.clear();
    
    // Reset store state
    stopTelemetryStream();
    
    // Mock Tauri setupEventListener
    mockUnlisten = vi.fn();
    vi.mocked(tauriUtils.setupEventListener).mockImplementation((event: string, handler: Function) => {
      telemetryHandlers.set(event, handler);
      return Promise.resolve(mockUnlisten);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (telemetryStreamCleanup) {
      telemetryStreamCleanup();
      telemetryStreamCleanup = null;
    }
  });

  describe('Initial State', () => {
    it('should start with null telemetry', () => {
      const state = get(droneTelemetryStore);
      expect(state.streaming).toBe(false);
      expect(state.errors).toEqual([]);
      
      expect(get(latestTelemetry)).toBeNull();
      expect(get(telemetryHistory).telemetry).toEqual([]);
      expect(get(telemetryRate)).toBe(0);
    });
  });

  describe('Starting Telemetry', () => {
    it('should start telemetry stream successfully', async () => {
      vi.mocked(tauriUtils.safeInvoke).mockResolvedValue({ success: true });
      
      await startTelemetryStream();
      
      expect(get(droneTelemetryStore).streaming).toBe(true);
      expect(tauriUtils.safeInvoke).toHaveBeenCalledWith('start_telemetry', 
        expect.objectContaining({
          rateHz: 10 // Default rate
        })
      );
      
      // Should setup listener
      expect(tauriUtils.listen).toHaveBeenCalledWith('telemetry_packet', expect.any(Function));
    });

    it('should accept custom telemetry options', async () => {
      vi.mocked(tauriUtils.safeInvoke).mockResolvedValue({ success: true });
      
      const options: TelemetrySubscriptionOptions = {
        attitude: true,
        gps: true,
        battery: true,
        motors: false,
        system: true,
        rateHz: 20
      };
      
      await startTelemetryStream(options);
      
      expect(tauriUtils.safeInvoke).toHaveBeenCalledWith('start_telemetry', options);
    });

    it('should handle start failures', async () => {
      vi.mocked(tauriUtils.safeInvoke).mockRejectedValue(new Error('Failed to start'));
      
      await startTelemetryStream();
      
      const state = get(droneTelemetryStore);
      expect(state.streaming).toBe(false);
      expect(state.errors).toContain('Failed to start telemetry stream');
      
      expect(notificationStore.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Failed to start telemetry')
        })
      );
    });

    it('should prevent multiple simultaneous starts', async () => {
      vi.mocked(tauriUtils.safeInvoke).mockResolvedValue({ success: true });
      
      await startTelemetryStream();
      await startTelemetryStream(); // Second call
      
      // Should only start once
      expect(tauriUtils.safeInvoke).toHaveBeenCalledTimes(1);
    });
  });

  describe('Receiving Telemetry', () => {
    beforeEach(async () => {
      vi.mocked(tauriUtils.safeInvoke).mockResolvedValue({ success: true });
      await startTelemetryStream();
    });

    it('should update latest telemetry on packet receive', async () => {
      const mockPacket = createMockTelemetryPacket();
      const handler = telemetryHandlers.get('telemetry_packet');
      
      handler?.(mockPacket);
      
      expect(get(latestTelemetry)).toEqual(mockPacket);
    });

    it('should maintain telemetry history', async () => {
      const handler = telemetryHandlers.get('telemetry_packet');
      
      // Send multiple packets
      for (let i = 0; i < 5; i++) {
        const packet = createMockTelemetryPacket({
          timestamp: Date.now() + i * 100
        });
        handler?.(packet);
      }
      
      const history = get(telemetryHistory);
      const telemetryPackets = history.telemetry;
      expect(telemetryPackets).toHaveLength(5);
      expect(telemetryPackets[0].timestamp).toBeLessThan(telemetryPackets[4].timestamp);
    });

    it('should limit history size', async () => {
      const handler = telemetryHandlers.get('telemetry_packet');
      const maxHistory = 100; // Default max
      
      // Send more packets than max
      for (let i = 0; i < maxHistory + 50; i++) {
        handler?.(createMockTelemetryPacket());
      }
      
      const history = get(telemetryHistory);
      expect(history).toHaveLength(maxHistory);
    });

    it('should calculate telemetry rate', async () => {
      vi.useFakeTimers();
      const handler = telemetryHandlers.get('telemetry_packet');
      
      // Send packets at 10Hz
      const interval = setInterval(() => {
        handler?.(createMockTelemetryPacket());
      }, 100);
      
      // Wait for rate calculation
      vi.advanceTimersByTime(1000);
      
      const rate = get(telemetryRate);
      expect(rate).toBeCloseTo(10, 1);
      
      clearInterval(interval);
      vi.useRealTimers();
    });
  });

  describe('Stopping Telemetry', () => {
    beforeEach(async () => {
      vi.mocked(tauriUtils.safeInvoke).mockResolvedValue({ success: true });
      await startTelemetryStream();
    });

    it('should stop telemetry stream', async () => {
      await stopTelemetryStream();
      
      expect(get(droneTelemetryStore).streaming).toBe(false);
      expect(tauriUtils.safeInvoke).toHaveBeenCalledWith('stop_telemetry');
      expect(mockUnlisten).toHaveBeenCalled();
    });

    it('should clear telemetry data on stop', async () => {
      // Add some telemetry
      const handler = telemetryHandlers.get('telemetry_packet');
      handler?.(createMockTelemetryPacket());
      
      expect(get(latestTelemetry)).not.toBeNull();
      expect(get(telemetryHistory).telemetry.length).toBeGreaterThan(0);
      
      await stopTelemetryStream();
      
      expect(get(latestTelemetry)).toBeNull();
      expect(get(telemetryHistory).telemetry).toEqual([]);
      expect(get(telemetryRate)).toBe(0);
    });

    it('should handle stop errors gracefully', async () => {
      vi.mocked(tauriUtils.safeInvoke).mockRejectedValue(new Error('Stop failed'));
      
      await stopTelemetryStream();
      
      // Should still update state
      expect(get(droneTelemetryStore).streaming).toBe(false);
    });
  });

  describe('Telemetry Options', () => {
    it('should update telemetry options while streaming', async () => {
      vi.mocked(tauriUtils.safeInvoke).mockResolvedValue({ success: true });
      
      await startTelemetryStream();
      
      const newOptions: TelemetrySubscriptionOptions = {
        attitude: true,
        gps: false,
        battery: true,
        motors: true,
        system: true,
        rateHz: 30
      };
      
      await setTelemetryOptions(newOptions);
      
      expect(tauriUtils.safeInvoke).toHaveBeenCalledWith('update_telemetry_options', newOptions);
    });

    it('should not update options when not streaming', async () => {
      const newOptions: TelemetrySubscriptionOptions = {
        rateHz: 30
      };
      
      await setTelemetryOptions(newOptions);
      
      expect(tauriUtils.safeInvoke).not.toHaveBeenCalledWith('update_telemetry_options');
    });
  });

  describe('Telemetry Statistics', () => {
    beforeEach(async () => {
      vi.mocked(tauriUtils.safeInvoke).mockResolvedValue({ success: true });
      await startTelemetryStream();
    });

    it('should calculate telemetry statistics', async () => {
      const handler = telemetryHandlers.get('telemetry_packet');
      
      // Send packets with varying values
      const packets = [
        createMockTelemetryPacket({
          battery: createMockBatteryTelemetry({ voltage: 16000 }),
          attitude: createMockAttitudeTelemetry({ roll: 0.1 })
        }),
        createMockTelemetryPacket({
          battery: createMockBatteryTelemetry({ voltage: 16500 }),
          attitude: createMockAttitudeTelemetry({ roll: -0.1 })
        }),
        createMockTelemetryPacket({
          battery: createMockBatteryTelemetry({ voltage: 17000 }),
          attitude: createMockAttitudeTelemetry({ roll: 0 })
        })
      ];
      
      packets.forEach(p => handler?.(p));
      
      const stats = getTelemetryStats();
      
      expect(stats.packetCount).toBe(3);
      expect(stats.averageRate).toBeGreaterThan(0);
      expect(stats.batteryStats).toBeDefined();
      expect(stats.batteryStats?.averageVoltage).toBeCloseTo(16.5, 1);
      expect(stats.attitudeStats).toBeDefined();
      expect(stats.attitudeStats?.maxRoll).toBeCloseTo(0.1, 3);
      expect(stats.attitudeStats?.minRoll).toBeCloseTo(-0.1, 3);
    });

    it('should handle empty statistics', () => {
      const stats = getTelemetryStats();
      
      expect(stats.packetCount).toBe(0);
      expect(stats.averageRate).toBe(0);
      expect(stats.batteryStats).toBeUndefined();
      expect(stats.attitudeStats).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      vi.mocked(tauriUtils.safeInvoke).mockResolvedValue({ success: true });
      await startTelemetryStream();
    });

    it('should handle malformed telemetry packets', () => {
      const handler = telemetryHandlers.get('telemetry_packet');
      
      // Send invalid packet
      handler?.({ invalid: 'data' });
      
      // Should not crash
      expect(get(latestTelemetry)).toBeNull();
    });

    it('should detect and report telemetry dropouts', async () => {
      vi.useFakeTimers();
      const handler = telemetryHandlers.get('telemetry_packet');
      
      // Send initial packet
      handler?.(createMockTelemetryPacket());
      
      // Simulate dropout (no packets for timeout period)
      vi.advanceTimersByTime(5000); // 5 second timeout
      
      const state = get(droneTelemetryStore);
      expect(state.errors).toContain('Telemetry timeout');
      
      expect(notificationStore.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('Telemetry timeout')
        })
      );
      
      vi.useRealTimers();
    });

    it('should recover from telemetry dropouts', async () => {
      vi.useFakeTimers();
      const handler = telemetryHandlers.get('telemetry_packet');
      
      // Simulate dropout
      vi.advanceTimersByTime(5000);
      expect(get(droneTelemetryStore).errors.length).toBeGreaterThan(0);
      
      // Resume telemetry
      handler?.(createMockTelemetryPacket());
      
      // Error should clear
      expect(get(droneTelemetryStore).errors).toEqual([]);
      
      vi.useRealTimers();
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      vi.mocked(tauriUtils.safeInvoke).mockResolvedValue({ success: true });
      await startTelemetryStream();
    });

    it('should track processing latency', async () => {
      const handler = telemetryHandlers.get('telemetry_packet');
      
      const packet = createMockTelemetryPacket({
        timestamp: Date.now() - 50 // 50ms ago
      });
      
      const startTime = performance.now();
      handler?.(packet);
      const processingTime = performance.now() - startTime;
      
      expect(processingTime).toBeLessThan(10); // Should process quickly
      
      const stats = getTelemetryStats();
      expect(stats.latency).toBeDefined();
      expect(stats.latency).toBeGreaterThanOrEqual(0);
    });

    it('should warn on high latency', async () => {
      const handler = telemetryHandlers.get('telemetry_packet');
      
      // Send packet with high latency
      const packet = createMockTelemetryPacket({
        timestamp: Date.now() - 500 // 500ms old
      });
      
      handler?.(packet);
      
      expect(notificationStore.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('High telemetry latency')
        })
      );
    });
  });

  describe('Data Filtering', () => {
    beforeEach(async () => {
      vi.mocked(tauriUtils.safeInvoke).mockResolvedValue({ success: true });
    });

    it('should filter telemetry based on options', async () => {
      await startTelemetryStream({
        attitude: true,
        gps: false,
        battery: true,
        motors: false,
        system: true,
        rateHz: 10
      });
      
      const handler = telemetryHandlers.get('telemetry_packet');
      const packet = createMockTelemetryPacket();
      
      handler?.(packet);
      
      const latest = get(latestTelemetry);
      expect(latest?.attitude).toBeDefined();
      expect(latest?.battery).toBeDefined();
      expect(latest?.system).toBeDefined();
      
      // GPS and motors should be filtered out
      expect(latest?.gps).toBeUndefined();
      expect(latest?.motors).toBeUndefined();
    });
  });

  describe('Derived Stores', () => {
    beforeEach(async () => {
      vi.mocked(tauriUtils.safeInvoke).mockResolvedValue({ success: true });
      await startTelemetryStream();
    });

    it('should update telemetryRate reactively', async () => {
      vi.useFakeTimers();
      const handler = telemetryHandlers.get('telemetry_packet');
      
      let rateUpdates = 0;
      const unsubscribe = telemetryRate.subscribe(() => rateUpdates++);
      
      // Send packets
      const interval = setInterval(() => {
        handler?.(createMockTelemetryPacket());
      }, 100);
      
      vi.advanceTimersByTime(2000);
      
      expect(rateUpdates).toBeGreaterThan(1); // Should update multiple times
      expect(get(telemetryRate)).toBeGreaterThan(0);
      
      clearInterval(interval);
      unsubscribe();
      vi.useRealTimers();
    });

    it('should maintain sorted telemetry history', () => {
      const handler = telemetryHandlers.get('telemetry_packet');
      
      // Send packets out of order
      const packets = [
        createMockTelemetryPacket({ timestamp: 1000 }),
        createMockTelemetryPacket({ timestamp: 3000 }),
        createMockTelemetryPacket({ timestamp: 2000 })
      ];
      
      packets.forEach(p => handler?.(p));
      
      const history = get(telemetryHistory).telemetry;
      expect(history[0].timestamp).toBe(1000);
      expect(history[1].timestamp).toBe(2000);
      expect(history[2].timestamp).toBe(3000);
    });
  });

  describe('Memory Management', () => {
    it('should clean up old telemetry data', async () => {
      vi.mocked(tauriUtils.safeInvoke).mockResolvedValue({ success: true });
      await startTelemetryStream();
      
      const handler = telemetryHandlers.get('telemetry_packet');
      
      // Fill history
      for (let i = 0; i < 200; i++) {
        handler?.(createMockTelemetryPacket());
      }
      
      // Check memory usage
      const history = get(telemetryHistory).telemetry;
      expect(history.length).toBeLessThanOrEqual(100); // Max history size
      
      // Stop should free memory
      await stopTelemetryStream();
      expect(get(telemetryHistory).telemetry).toEqual([]);
    });
  });

  describe('Integration with Mock Stream', () => {
    it('should work with mock telemetry stream', async () => {
      vi.mocked(tauriUtils.safeInvoke).mockResolvedValue({ success: true });
      await startTelemetryStream();
      
      const handler = telemetryHandlers.get('telemetry_packet');
      let packetCount = 0;
      
      // Use mock stream utility
      telemetryStreamCleanup = createMockTelemetryStream((packet: any) => {
        handler?.(packet);
        packetCount++;
      }, 50); // 20Hz
      
      // Wait for some packets
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(packetCount).toBeGreaterThan(5);
      expect(get(latestTelemetry)).not.toBeNull();
      expect(get(telemetryRate)).toBeGreaterThan(0);
    });
  });
});