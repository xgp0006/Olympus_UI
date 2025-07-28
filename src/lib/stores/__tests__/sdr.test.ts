/**
 * SDR Store Tests
 * Tests for the SDR store functionality
 */
import { get } from 'svelte/store';
import { vi } from 'vitest';
import { sdrStore, sdrState, currentFFTData, sdrConnectionStatus } from '../sdr';
import type { FFTData, SdrSettings } from '$lib/plugins/sdr-suite/types';

// Mock Tauri utilities
vi.mock('$lib/utils/tauri', () => ({
  setupResilientEventListener: vi.fn().mockResolvedValue(() => {}),
  SdrCommands: {
    getSdrState: vi.fn().mockResolvedValue({
      connected: false,
      recording: false,
      settings: {
        centerFrequency: 100000000,
        sampleRate: 2048000,
        gain: 20,
        bandwidth: 1000000
      },
      error: null
    }),
    startSdr: vi.fn(),
    stopSdr: vi.fn(),
    updateSdrSettings: vi.fn(),
    setCenterFrequency: vi.fn(),
    setSampleRate: vi.fn(),
    setGain: vi.fn(),
    setBandwidth: vi.fn(),
    startRecording: vi.fn(),
    stopRecording: vi.fn()
  }
}));

describe('SDR Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('initializes with default state', () => {
    const state = get(sdrStore);

    expect(state.state.connected).toBe(false);
    expect(state.state.recording).toBe(false);
    expect(state.state.settings.centerFrequency).toBe(100000000);
    expect(state.currentData).toBeNull();
    expect(state.dataHistory).toEqual([]);
  });

  test('initializes event listeners', async () => {
    const { setupResilientEventListener } = await import('$lib/utils/tauri');

    await sdrStore.initialize();

    expect(setupResilientEventListener).toHaveBeenCalledWith(
      'sdr-fft-data',
      expect.any(Function),
      expect.any(Object)
    );

    expect(setupResilientEventListener).toHaveBeenCalledWith(
      'sdr-state-changed',
      expect.any(Function),
      expect.any(Object)
    );
  });

  test('syncs state from backend', async () => {
    const { SdrCommands } = await import('$lib/utils/tauri');

    await sdrStore.syncState();

    expect(SdrCommands.getSdrState).toHaveBeenCalled();
  });

  test('starts SDR with current settings', async () => {
    const { SdrCommands } = await import('$lib/utils/tauri');

    await sdrStore.start();

    expect(SdrCommands.startSdr).toHaveBeenCalled();
  });

  test('stops SDR', async () => {
    const { SdrCommands } = await import('$lib/utils/tauri');

    await sdrStore.stop();

    expect(SdrCommands.stopSdr).toHaveBeenCalled();
  });

  test('updates settings', async () => {
    const { SdrCommands } = await import('$lib/utils/tauri');
    const newSettings: Partial<SdrSettings> = {
      centerFrequency: 144000000,
      gain: 30
    };

    await sdrStore.updateSettings(newSettings);

    expect(SdrCommands.updateSdrSettings).toHaveBeenCalledWith(newSettings);
  });

  test('sets center frequency', async () => {
    const { SdrCommands } = await import('$lib/utils/tauri');
    const frequency = 144000000;

    await sdrStore.setCenterFrequency(frequency);

    expect(SdrCommands.setCenterFrequency).toHaveBeenCalledWith(frequency);
  });

  test('sets sample rate', async () => {
    const { SdrCommands } = await import('$lib/utils/tauri');
    const sampleRate = 1024000;

    await sdrStore.setSampleRate(sampleRate);

    expect(SdrCommands.setSampleRate).toHaveBeenCalledWith(sampleRate);
  });

  test('sets gain', async () => {
    const { SdrCommands } = await import('$lib/utils/tauri');
    const gain = 30;

    await sdrStore.setGain(gain);

    expect(SdrCommands.setGain).toHaveBeenCalledWith(gain);
  });

  test('sets bandwidth', async () => {
    const { SdrCommands } = await import('$lib/utils/tauri');
    const bandwidth = 2000000;

    await sdrStore.setBandwidth(bandwidth);

    expect(SdrCommands.setBandwidth).toHaveBeenCalledWith(bandwidth);
  });

  test('starts recording', async () => {
    const { SdrCommands } = await import('$lib/utils/tauri');
    const filename = 'test_recording.wav';

    await sdrStore.startRecording(filename);

    expect(SdrCommands.startRecording).toHaveBeenCalledWith(filename);
  });

  test('stops recording', async () => {
    const { SdrCommands } = await import('$lib/utils/tauri');

    await sdrStore.stopRecording();

    expect(SdrCommands.stopRecording).toHaveBeenCalled();
  });

  test('clears data history', () => {
    // Add some mock data first
    const mockFFTData: FFTData = {
      frequencies: [1, 2, 3],
      magnitudes: [-50, -60, -70],
      timestamp: Date.now(),
      sampleRate: 2048000,
      centerFrequency: 100000000
    };

    // Simulate adding data to history
    sdrStore.subscribe((state) => {
      if (state.dataHistory.length === 0) {
        // Add mock data
        state.dataHistory.push(mockFFTData);
      }
    });

    sdrStore.clearHistory();

    const state = get(sdrStore);
    expect(state.dataHistory).toEqual([]);
  });

  test('clears error', () => {
    sdrStore.clearError();

    const state = get(sdrStore);
    expect(state.lastError).toBeNull();
  });

  test('derived stores work correctly', () => {
    const state = get(sdrState);
    const fftData = get(currentFFTData);
    const connectionStatus = get(sdrConnectionStatus);

    expect(state).toBeDefined();
    expect(state.connected).toBe(false);
    expect(fftData).toBeNull();
    expect(connectionStatus).toBeDefined();
    expect(connectionStatus.connected).toBe(false);
  });

  test('handles errors gracefully', async () => {
    const { SdrCommands } = await import('$lib/utils/tauri');

    // Mock an error
    vi.mocked(SdrCommands.startSdr).mockRejectedValue(new Error('Device not found'));

    await sdrStore.start();

    const state = get(sdrStore);
    expect(state.lastError).toContain('Start failed');
  });

  test('cleanup removes event listeners', async () => {
    const mockUnlisten = vi.fn();
    const { setupResilientEventListener } = await import('$lib/utils/tauri');

    // Mock the unlisten function
    vi.mocked(setupResilientEventListener).mockResolvedValue(mockUnlisten);

    // Initialize first to set up listeners
    await sdrStore.initialize();

    // Then cleanup
    sdrStore.cleanup();

    // The cleanup should have been called
    expect(mockUnlisten).toHaveBeenCalled();
  });
});
