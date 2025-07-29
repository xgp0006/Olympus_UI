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
 * NASA JPL Rule 4: Split - Store state and listeners
 */
interface SdrStoreContext {
  update: (updater: (state: SdrStoreState) => SdrStoreState) => void;
  subscribe: (run: (value: SdrStoreState) => void) => (() => void);
  fftUnlisten: UnlistenFn | null;
  stateUnlisten: UnlistenFn | null;
}

/**
 * NASA JPL Rule 4: Split - Setup FFT data event listener
 */
async function setupFFTDataListener(ctx: SdrStoreContext): Promise<void> {
  ctx.fftUnlisten = await setupResilientEventListener<FFTData>(
    'sdr-fft-data',
    (fftData) => {
      ctx.update((state) => {
        // NASA JPL Rule 2: Bounded array - keep last 100 data points
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
        ctx.update((state) => ({
          ...state,
          lastError: `FFT data stream error: ${error.message}`,
          lastUpdate: Date.now()
        }));
      }
    }
  );
}

/**
 * NASA JPL Rule 4: Split - Setup SDR state change event listener
 */
async function setupStateChangeListener(ctx: SdrStoreContext): Promise<void> {
  ctx.stateUnlisten = await setupResilientEventListener<Partial<SdrState>>(
    'sdr-state-changed',
    (stateChange) => {
      ctx.update((state) => ({
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
        ctx.update((state) => ({
          ...state,
          lastError: `State change error: ${error.message}`,
          lastUpdate: Date.now()
        }));
      }
    }
  );
}

/**
 * NASA JPL Rule 4: Split - Initialize SDR event listeners
 * Function refactored to be ≤60 lines (66 → 18 lines)
 */
async function initializeSdrListeners(ctx: SdrStoreContext): Promise<void> {
  try {
    console.log('Initializing SDR store event listeners...');

    // Set up FFT data and state change event listeners
    await setupFFTDataListener(ctx);
    await setupStateChangeListener(ctx);

    console.log('SDR store initialized successfully');
  } catch (error) {
    console.error('Failed to initialize SDR store:', error);
    ctx.update((state) => ({
      ...state,
      lastError: `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastUpdate: Date.now()
    }));
  }
}

/**
 * NASA JPL Rule 4: Split - Cleanup event listeners
 */
function cleanupSdrListeners(ctx: SdrStoreContext): void {
  try {
    if (ctx.fftUnlisten) {
      ctx.fftUnlisten();
      ctx.fftUnlisten = null;
    }
    if (ctx.stateUnlisten) {
      ctx.stateUnlisten();
      ctx.stateUnlisten = null;
    }
    console.log('SDR store cleanup completed');
  } catch (error) {
    console.error('Error during SDR store cleanup:', error);
  }
}

/**
 * NASA JPL Rule 4: Split - Sync state from backend
 */
async function syncSdrState(ctx: SdrStoreContext): Promise<void> {
  try {
    const backendState = await SdrCommands.getSdrState();
    ctx.update((state) => ({
      ...state,
      state: backendState,
      lastError: null,
      lastUpdate: Date.now()
    }));
  } catch (error) {
    console.error('Failed to sync SDR state:', error);
    ctx.update((state) => ({
      ...state,
      lastError: `State sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastUpdate: Date.now()
    }));
  }
}

/**
 * NASA JPL Rule 4: Split - Start SDR
 */
async function startSdr(ctx: SdrStoreContext, currentSettings: SdrSettings): Promise<void> {
  try {
    ctx.update((state) => ({ ...state, isConnecting: true, lastError: null }));
    await SdrCommands.startSdr(currentSettings);
    ctx.update((state) => ({
      ...state,
      isConnecting: false,
      state: { ...state.state, connected: true },
      lastUpdate: Date.now()
    }));
  } catch (error) {
    console.error('Failed to start SDR:', error);
    ctx.update((state) => ({
      ...state,
      isConnecting: false,
      lastError: `Start failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastUpdate: Date.now()
    }));
  }
}

/**
 * NASA JPL Rule 4: Split - Stop SDR
 */
async function stopSdr(ctx: SdrStoreContext): Promise<void> {
  try {
    await SdrCommands.stopSdr();
    ctx.update((state) => ({
      ...state,
      state: { ...state.state, connected: false, recording: false },
      currentData: null,
      lastUpdate: Date.now()
    }));
  } catch (error) {
    console.error('Failed to stop SDR:', error);
    ctx.update((state) => ({
      ...state,
      lastError: `Stop failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastUpdate: Date.now()
    }));
  }
}

/**
 * NASA JPL Rule 4: Split - Update SDR settings
 */
async function updateSdrSettings(
  ctx: SdrStoreContext,
  newSettings: Partial<SdrSettings>
): Promise<void> {
  try {
    await SdrCommands.updateSdrSettings(newSettings);
    ctx.update((state) => ({
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
    ctx.update((state) => ({
      ...state,
      lastError: `Settings update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastUpdate: Date.now()
    }));
  }
}

/**
 * NASA JPL Rule 4: Split - Set SDR parameter with error handling
 */
async function setSdrParameter(
  ctx: SdrStoreContext,
  paramName: string,
  setter: () => Promise<void>,
  syncState: () => Promise<void>
): Promise<void> {
  try {
    await setter();
    await syncState();
  } catch (error) {
    console.error(`Failed to set ${paramName}:`, error);
    ctx.update((state) => ({
      ...state,
      lastError: `${paramName} change failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastUpdate: Date.now()
    }));
  }
}

/**
 * NASA JPL Rule 4: Split - Recording operations
 */
async function startSdrRecording(
  ctx: SdrStoreContext,
  filename: string | undefined,
  syncState: () => Promise<void>
): Promise<void> {
  try {
    const recordingFilename = filename || `sdr_recording_${Date.now()}.wav`;
    await SdrCommands.startRecording(recordingFilename);
    await syncState();
  } catch (error) {
    console.error('Failed to start recording:', error);
    ctx.update((state) => ({
      ...state,
      lastError: `Recording start failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastUpdate: Date.now()
    }));
  }
}

async function stopSdrRecording(
  ctx: SdrStoreContext,
  syncState: () => Promise<void>
): Promise<void> {
  try {
    await SdrCommands.stopRecording();
    await syncState();
  } catch (error) {
    console.error('Failed to stop recording:', error);
    ctx.update((state) => ({
      ...state,
      lastError: `Recording stop failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastUpdate: Date.now()
    }));
  }
}

/**
 * NASA JPL Rule 4: Split function - Create SDR core methods
 */
function createSdrCoreMethods(ctx: SdrStoreContext, subscribe: any) {
  return {
    subscribe,

    async initialize(): Promise<void> {
      await initializeSdrListeners(ctx);
      await syncSdrState(ctx);
    },

    cleanup(): void {
      cleanupSdrListeners(ctx);
    },

    async syncState(): Promise<void> {
      await syncSdrState(ctx);
    },

    async start(): Promise<void> {
      const currentState = await new Promise<SdrStoreState>((resolve) => {
        const unsubscribe = subscribe((state: SdrStoreState) => {
          resolve(state);
          unsubscribe();
        });
      });
      await startSdr(ctx, currentState.state.settings);
    },

    async stop(): Promise<void> {
      await stopSdr(ctx);
    }
  };
}

/**
 * NASA JPL Rule 4: Split function - Create SDR configuration methods
 */
function createSdrConfigMethods(ctx: SdrStoreContext) {
  return {
    async updateSettings(newSettings: Partial<SdrSettings>): Promise<void> {
      await updateSdrSettings(ctx, newSettings);
    },

    async setCenterFrequency(frequency: number): Promise<void> {
      await setSdrParameter(
        ctx,
        'Frequency',
        () => SdrCommands.setCenterFrequency(frequency),
        () => syncSdrState(ctx)
      );
    },

    async setSampleRate(sampleRate: number): Promise<void> {
      await setSdrParameter(
        ctx,
        'Sample rate',
        () => SdrCommands.setSampleRate(sampleRate),
        () => syncSdrState(ctx)
      );
    },

    async setGain(gain: number): Promise<void> {
      await setSdrParameter(
        ctx,
        'Gain',
        () => SdrCommands.setGain(gain),
        () => syncSdrState(ctx)
      );
    },

    async setBandwidth(bandwidth: number): Promise<void> {
      await setSdrParameter(
        ctx,
        'Bandwidth',
        () => SdrCommands.setBandwidth(bandwidth),
        () => syncSdrState(ctx)
      );
    }
  };
}

/**
 * NASA JPL Rule 4: Split function - Create SDR recording and utility methods
 */
function createSdrUtilityMethods(ctx: SdrStoreContext, update: any) {
  return {
    async startRecording(filename?: string): Promise<void> {
      await startSdrRecording(ctx, filename, () => syncSdrState(ctx));
    },

    async stopRecording(): Promise<void> {
      await stopSdrRecording(ctx, () => syncSdrState(ctx));
    },

    /**
     * Clear data history
     */
    clearHistory(): void {
      update((state: SdrStoreState) => ({
        ...state,
        dataHistory: [],
        lastUpdate: Date.now()
      }));
    },

    /**
     * Clear error
     */
    clearError(): void {
      update((state: SdrStoreState) => ({
        ...state,
        lastError: null,
        lastUpdate: Date.now()
      }));
    }
  };
}

/**
 * Creates the main SDR store
 * NASA JPL Rule 4: Function refactored to be ≤60 lines (134 → 28 lines)
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

  // Create context for extracted functions
  const ctx = {
    update,
    subscribe,
    fftUnlisten,
    stateUnlisten
  } as SdrStoreContext;

  // Combine all method groups
  return {
    ...createSdrCoreMethods(ctx, subscribe),
    ...createSdrConfigMethods(ctx),
    ...createSdrUtilityMethods(ctx, update)
  };
}

// ===== STORE INSTANCES =====

export const sdrStore = createSdrStore();

// ===== DERIVED STORES =====

/**
 * Derived store for current SDR state
 */
export const sdrState = derived(sdrStore, ($sdrStore: any) => $sdrStore.state);

/**
 * Derived store for current FFT data
 */
export const currentFFTData = derived(sdrStore, ($sdrStore: any) => $sdrStore.currentData);

/**
 * Derived store for data stream status
 */
export const sdrDataStream = derived(sdrStore, ($sdrStore: any): SdrDataStream => {
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
export const sdrConnectionStatus = derived([sdrStore], ([$sdrStore]: [any]) => ({
  connected: $sdrStore.state.connected,
  connecting: $sdrStore.isConnecting,
  error: $sdrStore.lastError,
  lastUpdate: $sdrStore.lastUpdate
}));

/**
 * Derived store for recording status
 */
export const sdrRecordingStatus = derived(sdrStore, ($sdrStore: any) => ({
  recording: $sdrStore.state.recording,
  connected: $sdrStore.state.connected
}));

/**
 * Derived store for settings
 */
export const sdrSettings = derived(sdrStore, ($sdrStore: any) => $sdrStore.state.settings);

/**
 * Throttled FFT data for performance-sensitive components
 */
export const throttledFFTData = derived(currentFFTData, ($currentFFTData) => {
  // Simple pass-through for now - throttling can be implemented at component level
  return $currentFFTData;
});
