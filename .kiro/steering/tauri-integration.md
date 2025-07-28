# Tauri Integration & Backend Communication Standards

## Overview

This document defines the standards and patterns for integrating the Svelte frontend with the Rust backend through Tauri's command and event system. All backend communication must follow these patterns to ensure consistency, reliability, and maintainability.

## Tauri Architecture Understanding

### Communication Flow

```
Svelte Frontend ←→ Tauri Bridge ←→ Rust Backend
     │                   │              │
     │                   │              ├── Plugin Management
     │                   │              ├── CLI Execution
     │                   │              ├── Mission Planning
     │                   │              └── System State
     │                   │
     ├── Commands ────────┤
     └── Events ──────────┤
```

### Core Principles

- **Frontend**: Pure visualization and user input layer
- **Backend**: All mission-critical logic and data processing
- **Tauri Bridge**: Type-safe communication layer with error handling
- **Event-Driven**: Real-time updates through event system

## Command Patterns

### Standard Command Structure

#### Frontend Command Invocation

```typescript
// MANDATORY: Use this pattern for all Tauri command calls
import { invoke } from '@tauri-apps/api/tauri';

/**
 * Generic Tauri command wrapper with error handling
 * @param command - The Tauri command name
 * @param args - Command arguments
 * @returns Promise with typed result
 */
async function invokeTauriCommand<TResult, TArgs = Record<string, unknown>>(
  command: string,
  args?: TArgs
): Promise<TResult> {
  try {
    const result = await invoke<TResult>(command, args);
    return result;
  } catch (error) {
    console.error(`Tauri command '${command}' failed:`, error);

    // Convert Tauri error to application error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Backend operation failed: ${errorMessage}`);
  }
}
```

#### Plugin Management Commands

```typescript
// Plugin system command patterns
interface Plugin {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
}

// Load available plugins
export async function loadPlugins(): Promise<Plugin[]> {
  return invokeTauriCommand<Plugin[]>('get_loaded_plugins');
}

// Enable/disable plugin
export async function togglePlugin(pluginId: string, enabled: boolean): Promise<void> {
  return invokeTauriCommand<void, { plugin_id: string; enabled: boolean }>('toggle_plugin', {
    plugin_id: pluginId,
    enabled
  });
}

// Load specific plugin
export async function loadPlugin(pluginId: string): Promise<void> {
  return invokeTauriCommand<void, { name: string }>('load_plugin', {
    name: pluginId
  });
}

// Unload plugin
export async function unloadPlugin(pluginId: string): Promise<void> {
  return invokeTauriCommand<void, { name: string }>('unload_plugin', {
    name: pluginId
  });
}
```

#### CLI Command Execution

```typescript
// CLI execution patterns
interface CliOutput {
  line: string;
  stream: 'stdout' | 'stderr';
}

interface CliTermination {
  code: number;
}

// Execute CLI command
export async function runCliCommand(command: string): Promise<void> {
  return invokeTauriCommand<void, { command: string }>('run_cli_command', {
    command
  });
}

// Get CLI history
export async function getCliHistory(): Promise<string[]> {
  return invokeTauriCommand<string[]>('get_cli_history');
}
```

#### Mission Planning Commands

```typescript
// Mission planning command patterns
interface WaypointParams {
  lat: number;
  lng: number;
  alt: number;
  speed?: number;
  action?: string;
}

interface MissionItem {
  id: string;
  type: 'takeoff' | 'waypoint' | 'loiter' | 'land';
  name: string;
  params: WaypointParams;
  position?: {
    lat: number;
    lng: number;
    alt: number;
  };
}

// Update waypoint parameters
export async function updateWaypointParams(
  waypointId: string,
  params: WaypointParams
): Promise<void> {
  return invokeTauriCommand<void, { waypoint_id: string; params: WaypointParams }>(
    'update_waypoint_params',
    {
      waypoint_id: waypointId,
      params
    }
  );
}

// Reorder mission items
export async function reorderMissionItem(itemId: string, newIndex: number): Promise<void> {
  return invokeTauriCommand<void, { item_id: string; new_index: number }>('reorder_mission_item', {
    item_id: itemId,
    new_index: newIndex
  });
}

// Get mission data
export async function getMissionData(): Promise<MissionItem[]> {
  return invokeTauriCommand<MissionItem[]>('get_mission_data');
}
```

## Event Patterns

### Event Listening Setup

```typescript
// MANDATORY: Use this pattern for all event listeners
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { onMount, onDestroy } from 'svelte';

interface EventSetup<T> {
  eventName: string;
  handler: (payload: T) => void;
  errorHandler?: (error: Error) => void;
}

/**
 * Generic event listener setup with cleanup
 * @param setup - Event configuration
 * @returns Cleanup function
 */
async function setupEventListener<T>(setup: EventSetup<T>): Promise<UnlistenFn> {
  try {
    const unlisten = await listen<T>(setup.eventName, (event) => {
      try {
        setup.handler(event.payload);
      } catch (error) {
        console.error(`Event handler error for '${setup.eventName}':`, error);
        if (setup.errorHandler) {
          setup.errorHandler(error instanceof Error ? error : new Error('Unknown error'));
        }
      }
    });

    return unlisten;
  } catch (error) {
    console.error(`Failed to setup event listener for '${setup.eventName}':`, error);
    throw error;
  }
}
```

### Plugin System Events

```typescript
// Plugin system event patterns
let pluginUnlisten: UnlistenFn | null = null;

onMount(async () => {
  // Listen for plugin changes
  pluginUnlisten = await setupEventListener<string[]>({
    eventName: 'plugins-changed',
    handler: (pluginIds) => {
      console.log('Plugins changed:', pluginIds);
      // Update plugin store
      updatePluginStore(pluginIds);
    },
    errorHandler: (error) => {
      showNotification({
        type: 'error',
        message: 'Failed to handle plugin changes',
        details: error.message
      });
    }
  });
});

onDestroy(() => {
  if (pluginUnlisten) {
    pluginUnlisten();
  }
});
```

### CLI Events

```typescript
// CLI event patterns
let cliOutputUnlisten: UnlistenFn | null = null;
let cliTerminatedUnlisten: UnlistenFn | null = null;

onMount(async () => {
  // Listen for CLI output
  cliOutputUnlisten = await setupEventListener<CliOutput>({
    eventName: 'cli-output',
    handler: (output) => {
      // Write to terminal with proper styling
      writeToTerminal(output.line, output.stream);
    }
  });

  // Listen for CLI termination
  cliTerminatedUnlisten = await setupEventListener<CliTermination>({
    eventName: 'cli-terminated',
    handler: (termination) => {
      console.log(`CLI process terminated with code: ${termination.code}`);
      // Update CLI state
      updateCliState({ running: false, exitCode: termination.code });
    }
  });
});

onDestroy(() => {
  if (cliOutputUnlisten) cliOutputUnlisten();
  if (cliTerminatedUnlisten) cliTerminatedUnlisten();
});
```

### SDR Events

```typescript
// SDR event patterns for real-time data
interface FFTData {
  frequencies: number[];
  magnitudes: number[];
  timestamp: number;
}

let sdrUnlisten: UnlistenFn | null = null;

onMount(async () => {
  // Listen for SDR FFT data
  sdrUnlisten = await setupEventListener<FFTData>({
    eventName: 'sdr-fft-data',
    handler: (fftData) => {
      // Update spectrum visualization
      updateSpectrumDisplay(fftData);
      updateWaterfallDisplay(fftData);
    },
    errorHandler: (error) => {
      console.error('SDR data processing error:', error);
      // Show error in SDR interface
      showSdrError(error.message);
    }
  });
});

onDestroy(() => {
  if (sdrUnlisten) {
    sdrUnlisten();
  }
});
```

## Error Handling Patterns

### Command Error Handling

```typescript
// MANDATORY: Implement comprehensive error handling for all commands
interface TauriError {
  message: string;
  code?: string;
  details?: unknown;
}

async function handleTauriCommand<T>(
  commandFn: () => Promise<T>,
  operationName: string
): Promise<T | null> {
  try {
    return await commandFn();
  } catch (error) {
    console.error(`${operationName} failed:`, error);

    // Parse Tauri error
    let errorMessage = 'Unknown error occurred';
    let errorCode = 'UNKNOWN';

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      const tauriError = error as TauriError;
      errorMessage = tauriError.message || errorMessage;
      errorCode = tauriError.code || errorCode;
    }

    // Show user-friendly notification
    showNotification({
      type: 'error',
      title: `${operationName} Failed`,
      message: errorMessage,
      code: errorCode
    });

    return null;
  }
}

// Usage example
const plugins = await handleTauriCommand(() => loadPlugins(), 'Load Plugins');
```

### Event Error Recovery

```typescript
// MANDATORY: Implement error recovery for event listeners
interface EventRecovery {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
}

async function setupResilientEventListener<T>(
  setup: EventSetup<T>,
  recovery: EventRecovery = { maxRetries: 3, retryDelay: 1000, backoffMultiplier: 2 }
): Promise<UnlistenFn> {
  let retryCount = 0;
  let currentDelay = recovery.retryDelay;

  const attemptSetup = async (): Promise<UnlistenFn> => {
    try {
      return await setupEventListener(setup);
    } catch (error) {
      console.error(`Event listener setup failed (attempt ${retryCount + 1}):`, error);

      if (retryCount < recovery.maxRetries) {
        retryCount++;
        console.log(`Retrying in ${currentDelay}ms...`);

        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        currentDelay *= recovery.backoffMultiplier;

        return attemptSetup();
      } else {
        throw new Error(`Failed to setup event listener after ${recovery.maxRetries} attempts`);
      }
    }
  };

  return attemptSetup();
}
```

## State Synchronization Patterns

### Frontend State Management

```typescript
// MANDATORY: Use this pattern for backend state synchronization
import { writable, derived } from 'svelte/store';

interface BackendState {
  plugins: Plugin[];
  missionItems: MissionItem[];
  cliState: {
    running: boolean;
    history: string[];
  };
  lastUpdate: number;
}

// Create synchronized store
function createBackendStore() {
  const { subscribe, set, update } = writable<BackendState>({
    plugins: [],
    missionItems: [],
    cliState: { running: false, history: [] },
    lastUpdate: Date.now()
  });

  return {
    subscribe,

    // Sync plugins from backend
    syncPlugins: async () => {
      const plugins = await loadPlugins();
      if (plugins) {
        update((state) => ({
          ...state,
          plugins,
          lastUpdate: Date.now()
        }));
      }
    },

    // Sync mission data from backend
    syncMissionData: async () => {
      const missionItems = await getMissionData();
      if (missionItems) {
        update((state) => ({
          ...state,
          missionItems,
          lastUpdate: Date.now()
        }));
      }
    },

    // Update specific plugin
    updatePlugin: (pluginId: string, updates: Partial<Plugin>) => {
      update((state) => ({
        ...state,
        plugins: state.plugins.map((plugin) =>
          plugin.id === pluginId ? { ...plugin, ...updates } : plugin
        ),
        lastUpdate: Date.now()
      }));
    }
  };
}

export const backendStore = createBackendStore();
```

### Real-time Data Handling

```typescript
// MANDATORY: Use this pattern for real-time data streams
interface DataStream<T> {
  data: T | null;
  timestamp: number;
  error: string | null;
  connected: boolean;
}

function createDataStream<T>(eventName: string) {
  const { subscribe, set, update } = writable<DataStream<T>>({
    data: null,
    timestamp: 0,
    error: null,
    connected: false
  });

  let unlisten: UnlistenFn | null = null;

  const connect = async () => {
    try {
      unlisten = await setupEventListener<T>({
        eventName,
        handler: (data) => {
          update((state) => ({
            ...state,
            data,
            timestamp: Date.now(),
            error: null,
            connected: true
          }));
        },
        errorHandler: (error) => {
          update((state) => ({
            ...state,
            error: error.message,
            connected: false
          }));
        }
      });

      update((state) => ({ ...state, connected: true, error: null }));
    } catch (error) {
      update((state) => ({
        ...state,
        error: error instanceof Error ? error.message : 'Connection failed',
        connected: false
      }));
    }
  };

  const disconnect = () => {
    if (unlisten) {
      unlisten();
      unlisten = null;
    }
    update((state) => ({ ...state, connected: false }));
  };

  return {
    subscribe,
    connect,
    disconnect
  };
}

// Usage for SDR data stream
export const sdrDataStream = createDataStream<FFTData>('sdr-fft-data');
```

## Performance Optimization

### Command Batching

```typescript
// MANDATORY: Use batching for multiple related commands
interface BatchCommand {
  command: string;
  args?: Record<string, unknown>;
}

async function executeBatchCommands(commands: BatchCommand[]): Promise<unknown[]> {
  // Execute commands in parallel where possible
  const promises = commands.map(({ command, args }) =>
    invokeTauriCommand(command, args).catch((error) => ({ error: error.message }))
  );

  return Promise.all(promises);
}

// Usage example
const results = await executeBatchCommands([
  { command: 'get_loaded_plugins' },
  { command: 'get_mission_data' },
  { command: 'get_cli_history' }
]);
```

### Event Throttling

```typescript
// MANDATORY: Throttle high-frequency events
function throttleEventHandler<T>(
  handler: (data: T) => void,
  throttleMs: number = 16 // ~60fps
): (data: T) => void {
  let lastCall = 0;
  let timeoutId: number | null = null;

  return (data: T) => {
    const now = Date.now();

    if (now - lastCall >= throttleMs) {
      lastCall = now;
      handler(data);
    } else if (!timeoutId) {
      timeoutId = window.setTimeout(
        () => {
          lastCall = Date.now();
          handler(data);
          timeoutId = null;
        },
        throttleMs - (now - lastCall)
      );
    }
  };
}

// Usage for high-frequency SDR data
const throttledSdrHandler = throttleEventHandler<FFTData>(
  (fftData) => updateSpectrumDisplay(fftData),
  16 // 60fps max
);
```

## Testing Patterns

### Command Testing

```typescript
// MANDATORY: Mock Tauri commands in tests
import { vi } from 'vitest';
import { invoke } from '@tauri-apps/api/tauri';

// Mock Tauri
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn()
}));

describe('Tauri Command Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('loadPlugins handles success correctly', async () => {
    const mockPlugins: Plugin[] = [
      { id: 'test', name: 'Test Plugin', description: 'Test', icon: 'test', enabled: true }
    ];

    vi.mocked(invoke).mockResolvedValue(mockPlugins);

    const result = await loadPlugins();

    expect(invoke).toHaveBeenCalledWith('get_loaded_plugins');
    expect(result).toEqual(mockPlugins);
  });

  test('loadPlugins handles error correctly', async () => {
    const mockError = new Error('Backend error');
    vi.mocked(invoke).mockRejectedValue(mockError);

    await expect(loadPlugins()).rejects.toThrow('Backend operation failed: Backend error');
  });
});
```

### Event Testing

```typescript
// MANDATORY: Test event handling
import { listen } from '@tauri-apps/api/event';

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn()
}));

describe('Event Handling', () => {
  test('handles CLI output events correctly', async () => {
    const mockUnlisten = vi.fn();
    const mockEventHandler = vi.fn();

    vi.mocked(listen).mockImplementation((eventName, handler) => {
      // Simulate event
      setTimeout(() => {
        handler({
          payload: { line: 'test output', stream: 'stdout' }
        });
      }, 0);

      return Promise.resolve(mockUnlisten);
    });

    const unlisten = await setupEventListener({
      eventName: 'cli-output',
      handler: mockEventHandler
    });

    // Wait for event to be processed
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockEventHandler).toHaveBeenCalledWith({
      line: 'test output',
      stream: 'stdout'
    });

    // Cleanup
    unlisten();
    expect(mockUnlisten).toHaveBeenCalled();
  });
});
```

This comprehensive Tauri integration guide ensures consistent, reliable, and maintainable communication between the Svelte frontend and Rust backend while maintaining aerospace-grade reliability standards.
