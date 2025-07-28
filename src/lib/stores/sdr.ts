/**
 * SDR Store
 * Manages SDR state, settings, and real-time data streams
 */
import { writable, derived } from 'svelte/store';
import { setupResilientEventListener, SdrCommands } from '$lib/utils/tauri';
import type { FFTData, SdrSettings, SdrState } from '$lib/plugins/sdr-suite/types';
import type { UnlistenFn } from '@tauri-apps/api/event';

// ===== INTERFACES =====

interface SdrStoreState {
  state: SdrState;
  currentData: FFTData | null;
  dataHistory: FFTData[];
  isConnecting: boolean;
  lastError: string | null;
  lastUpdate: number;
}

interface SdrDataStream {
  data: FFTData | null;
  timestamp: number;
  error: string | null;
  connected: boolean;
  dataRate: number; // Data points per second
}

// ===== STORE CREATION =====

/**
 * Creates the main SDR store
 */
function createSdrStore() {
  const initialState: SdrStoreState = {
    state: {
      connected: false,
      recording: false,
      settings: {
        centerFrequency: 100000000, // 100 MHz
        sampleRate: 2048000, // 2.048 MHz
        gain: 20,
        bandwidth: 1000000 // 1 MHz
      },
      error: null
    },
    currentData: null,
    dataHistory: [],
    isConnecting: false,
    lastError: null,
    lastUpdate: Date.now()
  };

  const { subscribe, update } = writable<SdrStoreState>(initialState);

  // Event listeners
  let fftUnlisten: UnlistenFn | null = null;
  let stateUnlisten: UnlistenFn | null = null;

  return {
    subscribe,

    /**
     * Initialize SDR event listeners
     */
    async initialize(): Promise<void> {
      try {
        console.log('Initializing SDR store event listeners...');

        // Set up FFT data event listener
        fftUnlisten = await setupResilientEventListener<FFTData>(
          'sdr-fft-data',
          (fftData) => {
            update((state) => {
              // Add to history (keep last 100 data points for performance)
              const newHistory = [fftData, ...state.dataHistory.slice(0, 99)];

              return {
                ...state,
                currentData: fftData,
                dataHistory: newHistory,
                lastError: null,
                lastUpdate: Date.now()
              };
            });
          },
          {
            maxRetries: 5,
            retryDelay: 1000,
            errorHandler: (error) => {
              update((state) => ({
                ...state,
                lastError: `FFT data stream error: ${error.message}`,
                lastUpdate: Date.now()
              }));
            }
          }
        );

        // Set up SDR state change event listener
        stateUnlisten = await setupResilientEventListener<Partial<SdrState>>(
          'sdr-state-changed',
          (stateChange) => {
            update((state) => ({
              ...state,
              state: { ...state.state, ...stateChange },
              lastError: null,
              lastUpdate: Date.now()
            }));
          },
          {
            maxRetries: 5,
            retryDelay: 1000,
            errorHandler: (error) => {
              update((state) => ({
                ...state,
                lastError: `State change error: ${error.message}`,
                lastUpdate: Date.now()
              }));
            }
          }
        );

        // Sync initial state from backend
        await this.syncState();

        console.log('SDR store initialized successfully');
      } catch (error) {
        console.error('Failed to initialize SDR store:', error);
        update((state) => ({
          ...state,
          lastError: `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          lastUpdate: Date.now()
        }));
      }
    },

    /**
     * Cleanup event listeners
     */
    cleanup(): void {
      try {
        if (fftUnlisten) {
          fftUnlisten();
          fftUnlisten = null;
        }
        if (stateUnlisten) {
          stateUnlisten();
          stateUnlisten = null;
        }
        console.log('SDR store cleanup completed');
      } catch (error) {
        console.error('Error during SDR store cleanup:', error);
      }
    },

    /**
     * Sync state from backend
     */
    async syncState(): Promise<void> {
      try {
        const backendState = await SdrCommands.getSdrState();
        update((state) => ({
          ...state,
          state: backendState,
          lastError: null,
          lastUpdate: Date.now()
        }));
      } catch (error) {
        console.error('Failed to sync SDR state:', error);
        update((state) => ({
          ...state,
          lastError: `State sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          lastUpdate: Date.now()
        }));
      }
    },

    /**
     * Start SDR with current settings
     */
    async start(): Promise<void> {
      try {
        update((state) => ({ ...state, isConnecting: true, lastError: null }));

        const currentState = await new Promise<SdrStoreState>((resolve) => {
          const unsubscribe = subscribe((state) => {
            resolve(state);
            unsubscribe();
          });
        });

        await SdrCommands.startSdr(currentState.state.settings);

        update((state) => ({
          ...state,
          isConnecting: false,
          state: { ...state.state, connected: true },
          lastUpdate: Date.now()
        }));
      } catch (error) {
        console.error('Failed to start SDR:', error);
        update((state) => ({
          ...state,
          isConnecting: false,
          lastError: `Start failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          lastUpdate: Date.now()
        }));
      }
    },

    /**
     * Stop SDR
     */
    async stop(): Promise<void> {
      try {
        await SdrCommands.stopSdr();

        update((state) => ({
          ...state,
          state: { ...state.state, connected: false, recording: false },
          currentData: null,
          lastUpdate: Date.now()
        }));
      } catch (error) {
        console.error('Failed to stop SDR:', error);
        update((state) => ({
          ...state,
          lastError: `Stop failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          lastUpdate: Date.now()
        }));
      }
    },

    /**
     * Update SDR settings
     */
    async updateSettings(newSettings: Partial<SdrSettings>): Promise<void> {
      try {
        await SdrCommands.updateSdrSettings(newSettings);

        update((state) => ({
          ...state,
          state: {
            ...state.state,
            settings: { ...state.state.settings, ...newSettings }
          },
          lastError: null,
          lastUpdate: Date.now()
        }));
      } catch (error) {
        console.error('Failed to update SDR settings:', error);
        update((state) => ({
          ...state,
          lastError: `Settings update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          lastUpdate: Date.now()
        }));
      }
    },

    /**
     * Set center frequency
     */
    async setCenterFrequency(frequency: number): Promise<void> {
      try {
        await SdrCommands.setCenterFrequency(frequency);
        await this.syncState();
      } catch (error) {
        console.error('Failed to set center frequency:', error);
        update((state) => ({
          ...state,
          lastError: `Frequency change failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          lastUpdate: Date.now()
        }));
      }
    },

    /**
     * Set sample rate
     */
    async setSampleRate(sampleRate: number): Promise<void> {
      try {
        await SdrCommands.setSampleRate(sampleRate);
        await this.syncState();
      } catch (error) {
        console.error('Failed to set sample rate:', error);
        update((state) => ({
          ...state,
          lastError: `Sample rate change failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          lastUpdate: Date.now()
        }));
      }
    },

    /**
     * Set gain
     */
    async setGain(gain: number): Promise<void> {
      try {
        await SdrCommands.setGain(gain);
        await this.syncState();
      } catch (error) {
        console.error('Failed to set gain:', error);
        update((state) => ({
          ...state,
          lastError: `Gain change failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          lastUpdate: Date.now()
        }));
      }
    },

    /**
     * Set bandwidth
     */
    async setBandwidth(bandwidth: number): Promise<void> {
      try {
        await SdrCommands.setBandwidth(bandwidth);
        await this.syncState();
      } catch (error) {
        console.error('Failed to set bandwidth:', error);
        update((state) => ({
          ...state,
          lastError: `Bandwidth change failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          lastUpdate: Date.now()
        }));
      }
    },

    /**
     * Start recording
     */
    async startRecording(filename?: string): Promise<void> {
      try {
        const recordingFilename = filename || `sdr_recording_${Date.now()}.wav`;
        await SdrCommands.startRecording(recordingFilename);
        await this.syncState();
      } catch (error) {
        console.error('Failed to start recording:', error);
        update((state) => ({
          ...state,
          lastError: `Recording start failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          lastUpdate: Date.now()
        }));
      }
    },

    /**
     * Stop recording
     */
    async stopRecording(): Promise<void> {
      try {
        await SdrCommands.stopRecording();
        await this.syncState();
      } catch (error) {
        console.error('Failed to stop recording:', error);
        update((state) => ({
          ...state,
          lastError: `Recording stop failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          lastUpdate: Date.now()
        }));
      }
    },

    /**
     * Clear data history
     */
    clearHistory(): void {
      update((state) => ({
        ...state,
        dataHistory: [],
        lastUpdate: Date.now()
      }));
    },

    /**
     * Clear error
     */
    clearError(): void {
      update((state) => ({
        ...state,
        lastError: null,
        lastUpdate: Date.now()
      }));
    }
  };
}

// ===== STORE INSTANCES =====

export const sdrStore = createSdrStore();

// ===== DERIVED STORES =====

/**
 * Derived store for current SDR state
 */
export const sdrState = derived(sdrStore, ($sdrStore) => $sdrStore.state);

/**
 * Derived store for current FFT data
 */
export const currentFFTData = derived(sdrStore, ($sdrStore) => $sdrStore.currentData);

/**
 * Derived store for data stream status
 */
export const sdrDataStream = derived(sdrStore, ($sdrStore): SdrDataStream => {
  const now = Date.now();
  const timeSinceLastUpdate = now - $sdrStore.lastUpdate;

  // Calculate approximate data rate based on recent history
  let dataRate = 0;
  if ($sdrStore.dataHistory.length >= 2) {
    const recentData = $sdrStore.dataHistory.slice(0, 10);
    const timeSpan = recentData[0]?.timestamp - recentData[recentData.length - 1]?.timestamp;
    if (timeSpan > 0) {
      dataRate = (recentData.length - 1) / (timeSpan / 1000); // Data points per second
    }
  }

  return {
    data: $sdrStore.currentData,
    timestamp: $sdrStore.lastUpdate,
    error: $sdrStore.lastError,
    connected: $sdrStore.state.connected && timeSinceLastUpdate < 5000, // Consider disconnected if no data for 5s
    dataRate
  };
});

/**
 * Derived store for connection status
 */
export const sdrConnectionStatus = derived([sdrStore], ([$sdrStore]) => ({
  connected: $sdrStore.state.connected,
  connecting: $sdrStore.isConnecting,
  error: $sdrStore.lastError,
  lastUpdate: $sdrStore.lastUpdate
}));

/**
 * Derived store for recording status
 */
export const sdrRecordingStatus = derived(sdrStore, ($sdrStore) => ({
  recording: $sdrStore.state.recording,
  connected: $sdrStore.state.connected
}));

/**
 * Derived store for settings
 */
export const sdrSettings = derived(sdrStore, ($sdrStore) => $sdrStore.state.settings);

/**
 * Throttled FFT data for performance-sensitive components
 */
export const throttledFFTData = derived(currentFFTData, ($currentFFTData) => {
  // Simple pass-through for now - throttling can be implemented at component level
  return $currentFFTData;
});
