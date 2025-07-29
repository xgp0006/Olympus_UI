/**
 * Tauri Command Utilities
 * Provides safe wrappers for Tauri command invocation with error handling
 * Requirements: 6.1 - Safe API invocation with comprehensive error handling
 */
import { TauriApi, type TauriInvoke, type TauriListen } from './tauri-context';
import { showError, showWarning, showInfo } from '../stores/notifications';

// Re-export UnlistenFn for convenience
export type UnlistenFn = (() => void) | null;

// Track if we've already shown the Tauri not available notification
let tauriNotAvailableNotified = false;

/**
 * Tauri error interface for structured error handling
 */
export interface TauriError {
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * API invocation options for customizing error handling behavior
 */
export interface ApiInvocationOptions {
  showNotification?: boolean;
  notificationTitle?: string;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
  suppressConsoleError?: boolean;
}

/**
 * Default options for API invocation
 */
const DEFAULT_API_OPTIONS: Required<ApiInvocationOptions> = {
  showNotification: true,
  notificationTitle: 'Operation Failed',
  retryAttempts: 0,
  retryDelay: 1000,
  timeout: 30000, // 30 seconds
  suppressConsoleError: false
};

/**
 * Parse Tauri error into structured format
 * @param error - Raw error from Tauri
 * @returns Structured TauriError
 */
function parseTauriError(error: unknown): TauriError {
  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'TAURI_ERROR',
      details: error
    };
  }

  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>;
    return {
      message:
        (typeof errorObj.message === 'string' ? errorObj.message : null) ||
        'Unknown error occurred',
      code: (typeof errorObj.code === 'string' ? errorObj.code : null) || 'UNKNOWN',
      details: errorObj
    };
  }

  return {
    message: String(error) || 'Unknown error occurred',
    code: 'UNKNOWN',
    details: error
  };
}

/**
 * Create timeout promise for command execution
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise that rejects after timeout
 */
function createTimeoutPromise(timeoutMs: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

/**
 * Generic Tauri command wrapper with comprehensive error handling
 * @param command - The Tauri command name
 * @param args - Command arguments
 * @param options - API invocation options
 * @returns Promise with typed result
 */
export async function invokeTauriCommand<TResult>(
  command: string,
  args?: Record<string, unknown>,
  options: ApiInvocationOptions = {}
): Promise<TResult> {
  const opts = { ...DEFAULT_API_OPTIONS, ...options };
  let lastError: TauriError;

  // Check Tauri availability first
  if (!TauriApi.isAvailable()) {
    const error = new Error('Tauri runtime not available');
    if (opts.showNotification && !tauriNotAvailableNotified) {
      showWarning('Tauri Not Available', 'Some features require the desktop application');
      tauriNotAvailableNotified = true;
    }
    throw error;
  }

  for (let attempt = 0; attempt <= opts.retryAttempts; attempt++) {
    try {
      // Use safe invoke with proper error handling
      const result = await TauriApi.invoke<TResult>(command, args);
      if (result === undefined) {
        throw new Error('Command failed: No result returned');
      }

      // Apply timeout if needed
      const timeoutPromise = createTimeoutPromise(opts.timeout);
      const finalResult = await Promise.race([Promise.resolve(result), timeoutPromise]);

      // Log successful retry if this wasn't the first attempt
      if (attempt > 0) {
        console.log(`Tauri command '${command}' succeeded on attempt ${attempt + 1}`);
        if (opts.showNotification) {
          showInfo(`Operation succeeded`, `${command} completed after ${attempt + 1} attempts`);
        }
      }

      return finalResult;
    } catch (error) {
      lastError = parseTauriError(error);

      if (!opts.suppressConsoleError) {
        console.error(`Tauri command '${command}' failed (attempt ${attempt + 1}):`, lastError);
      }

      // If this is not the last attempt, wait before retrying
      if (attempt < opts.retryAttempts) {
        console.log(`Retrying '${command}' in ${opts.retryDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, opts.retryDelay));
        continue;
      }

      // Final attempt failed, handle error
      if (opts.showNotification) {
        const title = opts.notificationTitle || `Command Failed: ${command}`;
        const details =
          opts.retryAttempts > 0
            ? `Failed after ${opts.retryAttempts + 1} attempts: ${lastError.message}`
            : lastError.message;

        showError(title, details);
      }

      // Throw structured error
      throw new Error(`Backend operation failed: ${lastError.message}`);
    }
  }

  // This should never be reached, but TypeScript requires it
  throw new Error(`Backend operation failed: ${lastError!.message}`);
}

/**
 * Safe Tauri command invocation that returns null on error
 * @param command - The Tauri command name
 * @param args - Command arguments
 * @param options - API invocation options
 * @returns Promise with typed result or null on error
 */
export async function safeTauriInvoke<TResult>(
  command: string,
  args?: Record<string, unknown>,
  options: ApiInvocationOptions = {}
): Promise<TResult | null> {
  try {
    return await invokeTauriCommand<TResult>(command, args, options);
  } catch (error) {
    // Error handling is already done in invokeTauriCommand
    return null;
  }
}

/**
 * Batch execute multiple Tauri commands with error handling
 * @param commands - Array of command configurations
 * @param options - Global options for all commands
 * @returns Promise with array of results (null for failed commands)
 */
export async function batchTauriInvoke<TResult = unknown>(
  commands: Array<{
    command: string;
    args?: Record<string, unknown>;
    options?: ApiInvocationOptions;
  }>,
  globalOptions: ApiInvocationOptions = {}
): Promise<Array<TResult | null>> {
  const results = await Promise.allSettled(
    commands.map(({ command, args, options }) =>
      safeTauriInvoke<TResult>(command, args, { ...globalOptions, ...options })
    )
  );

  return results.map((result) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return null;
  });
}

/**
 * Execute Tauri command with circuit breaker pattern
 * Prevents cascading failures by temporarily disabling commands after repeated failures
 */
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold = 5,
    private readonly recoveryTimeout = 30000 // 30 seconds
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - operation blocked');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.warn(`Circuit breaker opened after ${this.failureCount} failures`);
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';
  }
}

/**
 * Global circuit breakers for different command categories
 */
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create circuit breaker for command category
 * @param category - Command category (e.g., 'plugin', 'cli', 'mission', 'sdr')
 * @returns Circuit breaker instance
 */
function getCircuitBreaker(category: string): CircuitBreaker {
  if (!circuitBreakers.has(category)) {
    circuitBreakers.set(category, new CircuitBreaker());
  }
  return circuitBreakers.get(category)!;
}

/**
 * Execute Tauri command with circuit breaker protection
 * @param command - The Tauri command name
 * @param args - Command arguments
 * @param category - Command category for circuit breaker grouping
 * @param options - API invocation options
 * @returns Promise with typed result
 */
export async function protectedTauriInvoke<TResult>(
  command: string,
  args?: Record<string, unknown>,
  category: string = 'default',
  options: ApiInvocationOptions = {}
): Promise<TResult> {
  const circuitBreaker = getCircuitBreaker(category);

  return circuitBreaker.execute(async () => {
    return invokeTauriCommand<TResult>(command, args, options);
  });
}

/**
 * Reset circuit breaker for a specific category
 * @param category - Command category to reset
 */
export function resetCircuitBreaker(category: string): void {
  const circuitBreaker = circuitBreakers.get(category);
  if (circuitBreaker) {
    circuitBreaker.reset();
    console.log(`Circuit breaker reset for category: ${category}`);
  }
}

/**
 * Get circuit breaker status for monitoring
 * @returns Map of category to circuit breaker state
 */
export function getCircuitBreakerStatus(): Map<string, string> {
  const status = new Map<string, string>();
  circuitBreakers.forEach((breaker, category) => {
    status.set(category, breaker.getState());
  });
  return status;
}

/**
 * Event listener options for customizing behavior
 */
export interface EventListenerOptions {
  showErrorNotifications?: boolean;
  errorNotificationTitle?: string;
  maxErrorsBeforeDisable?: number;
  errorCooldownMs?: number;
  enableLogging?: boolean;
}

/**
 * Default options for event listeners
 */
const DEFAULT_EVENT_OPTIONS: Required<EventListenerOptions> = {
  showErrorNotifications: true,
  errorNotificationTitle: 'Event Handler Error',
  maxErrorsBeforeDisable: 10,
  errorCooldownMs: 5000,
  enableLogging: true
};

/**
 * Event listener error tracking
 */
const eventErrorTracking = new Map<
  string,
  {
    errorCount: number;
    lastErrorTime: number;
    disabled: boolean;
  }
>();

/**
 * Enhanced event listener setup with comprehensive error handling
 * @param eventName - The event name to listen for
 * @param handler - Event handler function
 * @param options - Event listener options
 * @returns Promise with unlisten function
 */
export async function setupEventListener<T>(
  eventName: string,
  handler: (payload: T) => void,
  options: EventListenerOptions = {}
): Promise<UnlistenFn> {
  const opts = { ...DEFAULT_EVENT_OPTIONS, ...options };

  // Check Tauri availability
  if (!TauriApi.isAvailable()) {
    if (opts.enableLogging) {
      console.warn(`Event listener setup skipped for '${eventName}': Tauri not available`);
    }
    return null;
  }

  // Initialize error tracking for this event
  if (!eventErrorTracking.has(eventName)) {
    eventErrorTracking.set(eventName, {
      errorCount: 0,
      lastErrorTime: 0,
      disabled: false
    });
  }

  try {
    const unlisten = await TauriApi.listen<T>(eventName, (payload) => {
      const tracking = eventErrorTracking.get(eventName)!;

      // Check if event handler is disabled due to too many errors
      if (tracking.disabled) {
        const timeSinceLastError = Date.now() - tracking.lastErrorTime;
        if (timeSinceLastError < opts.errorCooldownMs) {
          if (opts.enableLogging) {
            console.warn(`Event handler for '${eventName}' is disabled due to errors`);
          }
          return;
        } else {
          // Re-enable after cooldown
          tracking.disabled = false;
          tracking.errorCount = 0;
          if (opts.enableLogging) {
            console.log(`Event handler for '${eventName}' re-enabled after cooldown`);
          }
        }
      }

      try {
        handler(payload);

        // Reset error count on successful handling
        if (tracking.errorCount > 0) {
          tracking.errorCount = 0;
          if (opts.enableLogging) {
            console.log(`Event handler for '${eventName}' recovered from errors`);
          }
        }
      } catch (error) {
        tracking.errorCount++;
        tracking.lastErrorTime = Date.now();

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (opts.enableLogging) {
          console.error(
            `Event handler error for '${eventName}' (${tracking.errorCount}/${opts.maxErrorsBeforeDisable}):`,
            error
          );
        }

        // Show notification for first few errors
        if (opts.showErrorNotifications && tracking.errorCount <= 3) {
          showError(opts.errorNotificationTitle, `Error in ${eventName} handler: ${errorMessage}`);
        }

        // Disable handler if too many errors
        if (tracking.errorCount >= opts.maxErrorsBeforeDisable) {
          tracking.disabled = true;

          if (opts.enableLogging) {
            console.error(
              `Event handler for '${eventName}' disabled after ${tracking.errorCount} errors`
            );
          }

          if (opts.showErrorNotifications) {
            showError(
              'Event Handler Disabled',
              `Handler for '${eventName}' disabled due to repeated errors. Will retry after cooldown.`
            );
          }
        }
      }
    });

    if (opts.enableLogging) {
      console.log(`Event listener setup for '${eventName}'`);
    }

    return unlisten || null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (opts.enableLogging) {
      console.error(`Failed to setup event listener for '${eventName}':`, error);
    }

    if (opts.showErrorNotifications) {
      showError(
        'Event Listener Setup Failed',
        `Failed to setup listener for '${eventName}': ${errorMessage}`
      );
    }

    throw error;
  }
}

/**
 * Get event error statistics for monitoring
 * @returns Map of event name to error statistics
 */
export function getEventErrorStats(): Map<
  string,
  { errorCount: number; disabled: boolean; lastErrorTime: number }
> {
  return new Map(eventErrorTracking);
}

/**
 * Reset event error tracking for a specific event
 * @param eventName - Event name to reset
 */
export function resetEventErrorTracking(eventName: string): void {
  const tracking = eventErrorTracking.get(eventName);
  if (tracking) {
    tracking.errorCount = 0;
    tracking.disabled = false;
    tracking.lastErrorTime = 0;
    console.log(`Event error tracking reset for '${eventName}'`);
  }
}

/**
 * Reset all event error tracking
 */
export function resetAllEventErrorTracking(): void {
  eventErrorTracking.clear();
  console.log('All event error tracking reset');
}

/**
 * Resilient event listener setup with retry logic
 * @param eventName - The event name to listen for
 * @param handler - Event handler function
 * @param options - Retry options
 * @returns Promise with unlisten function
 */
export async function setupResilientEventListener<T>(
  eventName: string,
  handler: (payload: T) => void,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    backoffMultiplier?: number;
    errorHandler?: (error: Error) => void;
  } = {}
): Promise<UnlistenFn> {
  const { maxRetries = 3, retryDelay = 1000, backoffMultiplier = 2 } = options;

  let retryCount = 0;
  let currentDelay = retryDelay;

  const attemptSetup = async (): Promise<UnlistenFn> => {
    try {
      return await setupEventListener(eventName, handler, {
        showErrorNotifications: true,
        enableLogging: true,
        ...options
      });
    } catch (error) {
      console.error(`Event listener setup failed (attempt ${retryCount + 1}):`, error);

      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`Retrying in ${currentDelay}ms...`);

        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        currentDelay *= backoffMultiplier;

        return attemptSetup();
      } else {
        throw new Error(`Failed to setup event listener after ${maxRetries} attempts`);
      }
    }
  };

  return attemptSetup();
}

/**
 * CLI-specific command wrappers with enhanced error handling
 */
export const CliCommands = {
  /**
   * Execute a CLI command
   * @param command - The command to execute
   * @param options - API invocation options
   */
  async runCommand(command: string, options: ApiInvocationOptions = {}): Promise<void> {
    return protectedTauriInvoke<void>('run_cli_command', { command }, 'cli', {
      notificationTitle: 'CLI Command Failed',
      retryAttempts: 1,
      ...options
    });
  },

  /**
   * Get CLI command history
   * @param options - API invocation options
   * @returns Array of command history
   */
  async getHistory(options: ApiInvocationOptions = {}): Promise<string[]> {
    return protectedTauriInvoke<string[]>('get_cli_history', undefined, 'cli', {
      notificationTitle: 'Failed to Load CLI History',
      showNotification: false, // History loading failures are less critical
      ...options
    });
  },

  /**
   * Safely execute a CLI command (returns null on error)
   * @param command - The command to execute
   * @param options - API invocation options
   */
  async safeRunCommand(command: string, options: ApiInvocationOptions = {}): Promise<boolean> {
    const result = await safeTauriInvoke<void>(
      'run_cli_command',
      { command },
      {
        notificationTitle: 'CLI Command Failed',
        retryAttempts: 1,
        ...options
      }
    );
    return result !== null;
  }
};

/**
 * Plugin interface
 */
export interface Plugin {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
}

/**
 * Plugin-specific command wrappers with enhanced error handling
 */
export const PluginCommands = {
  /**
   * Load available plugins
   * @param options - API invocation options
   */
  async getLoadedPlugins(options: ApiInvocationOptions = {}): Promise<Plugin[]> {
    return protectedTauriInvoke<Plugin[]>('get_loaded_plugins', undefined, 'plugin', {
      notificationTitle: 'Failed to Load Plugins',
      retryAttempts: 2,
      ...options
    });
  },

  /**
   * Load a specific plugin
   * @param pluginId - The plugin ID to load
   * @param options - API invocation options
   */
  async loadPlugin(pluginId: string, options: ApiInvocationOptions = {}): Promise<void> {
    return protectedTauriInvoke<void>('load_plugin', { name: pluginId }, 'plugin', {
      notificationTitle: `Failed to Load Plugin: ${pluginId}`,
      retryAttempts: 1,
      ...options
    });
  },

  /**
   * Unload a plugin
   * @param pluginId - The plugin ID to unload
   * @param options - API invocation options
   */
  async unloadPlugin(pluginId: string, options: ApiInvocationOptions = {}): Promise<void> {
    return protectedTauriInvoke<void>('unload_plugin', { name: pluginId }, 'plugin', {
      notificationTitle: `Failed to Unload Plugin: ${pluginId}`,
      ...options
    });
  },

  /**
   * Toggle plugin enabled state
   * @param pluginId - The plugin ID
   * @param enabled - Whether to enable or disable
   * @param options - API invocation options
   */
  async togglePlugin(
    pluginId: string,
    enabled: boolean,
    options: ApiInvocationOptions = {}
  ): Promise<void> {
    return protectedTauriInvoke<void>(
      'toggle_plugin',
      {
        plugin_id: pluginId,
        enabled
      },
      'plugin',
      {
        notificationTitle: `Failed to ${enabled ? 'Enable' : 'Disable'} Plugin: ${pluginId}`,
        ...options
      }
    );
  },

  /**
   * Safely load available plugins (returns empty array on error)
   * @param options - API invocation options
   */
  async safeGetLoadedPlugins(options: ApiInvocationOptions = {}): Promise<Plugin[]> {
    const result = await safeTauriInvoke<Plugin[]>('get_loaded_plugins', undefined, {
      notificationTitle: 'Failed to Load Plugins',
      retryAttempts: 2,
      ...options
    });
    return result || [];
  }
};

/**
 * Mission planning interfaces - imported from plugin types
 */
import type { WaypointParams, MissionItem } from '../plugins/mission-planner/types';

/**
 * Mission planning command wrappers with enhanced error handling
 */
export const MissionCommands = {
  /**
   * Update waypoint parameters
   * @param waypointId - The waypoint ID
   * @param params - New waypoint parameters
   * @param options - API invocation options
   */
  async updateWaypointParams(
    waypointId: string,
    params: WaypointParams,
    options: ApiInvocationOptions = {}
  ): Promise<void> {
    return protectedTauriInvoke<void>(
      'update_waypoint_params',
      {
        waypoint_id: waypointId,
        params
      },
      'mission',
      {
        notificationTitle: 'Failed to Update Waypoint',
        retryAttempts: 1,
        ...options
      }
    );
  },

  /**
   * Reorder mission items
   * @param itemId - The item ID to reorder
   * @param newIndex - The new index position
   * @param options - API invocation options
   */
  async reorderMissionItem(
    itemId: string,
    newIndex: number,
    options: ApiInvocationOptions = {}
  ): Promise<void> {
    return protectedTauriInvoke<void>(
      'reorder_mission_item',
      {
        item_id: itemId,
        new_index: newIndex
      },
      'mission',
      {
        notificationTitle: 'Failed to Reorder Mission Item',
        ...options
      }
    );
  },

  /**
   * Get mission data
   * @param options - API invocation options
   * @returns Array of mission items
   */
  async getMissionData(options: ApiInvocationOptions = {}): Promise<MissionItem[]> {
    return protectedTauriInvoke<MissionItem[]>('get_mission_data', undefined, 'mission', {
      notificationTitle: 'Failed to Load Mission Data',
      retryAttempts: 2,
      ...options
    });
  },

  /**
   * Save mission to backend
   * @param name - Mission name
   * @param items - Mission items
   * @param options - API invocation options
   * @returns Mission ID
   */
  async saveMission(
    name: string,
    items: MissionItem[],
    options: ApiInvocationOptions = {}
  ): Promise<string> {
    return protectedTauriInvoke<string>(
      'save_mission',
      {
        name,
        items
      },
      'mission',
      {
        notificationTitle: 'Failed to Save Mission',
        retryAttempts: 1,
        ...options
      }
    );
  },

  /**
   * Load mission by ID
   * @param missionId - Mission ID
   * @param options - API invocation options
   * @returns Mission data
   */
  async loadMissionById(
    missionId: string,
    options: ApiInvocationOptions = {}
  ): Promise<{ id: string; name: string; items: MissionItem[] }> {
    return protectedTauriInvoke<{ id: string; name: string; items: MissionItem[] }>(
      'load_mission_by_id',
      {
        mission_id: missionId
      },
      'mission',
      {
        notificationTitle: 'Failed to Load Mission',
        retryAttempts: 2,
        ...options
      }
    );
  },

  /**
   * Get list of saved missions
   * @param options - API invocation options
   * @returns Array of mission metadata
   */
  async getMissionList(
    options: ApiInvocationOptions = {}
  ): Promise<Array<{ id: string; name: string; created_at: string; updated_at: string }>> {
    return protectedTauriInvoke<
      Array<{ id: string; name: string; created_at: string; updated_at: string }>
    >('get_mission_list', undefined, 'mission', {
      notificationTitle: 'Failed to Load Mission List',
      retryAttempts: 2,
      showNotification: false, // List loading failures are less critical
      ...options
    });
  },

  /**
   * Delete mission
   * @param missionId - Mission ID to delete
   * @param options - API invocation options
   */
  async deleteMission(missionId: string, options: ApiInvocationOptions = {}): Promise<void> {
    return protectedTauriInvoke<void>(
      'delete_mission',
      {
        mission_id: missionId
      },
      'mission',
      {
        notificationTitle: 'Failed to Delete Mission',
        ...options
      }
    );
  },

  /**
   * Safely get mission data (returns empty array on error)
   * @param options - API invocation options
   */
  async safeGetMissionData(options: ApiInvocationOptions = {}): Promise<MissionItem[]> {
    const result = await safeTauriInvoke<MissionItem[]>('get_mission_data', undefined, {
      notificationTitle: 'Failed to Load Mission Data',
      retryAttempts: 2,
      ...options
    });
    return result || [];
  }
};

/**
 * SDR Suite interfaces - imported from plugin types
 */
import type { SdrSettings, SdrState } from '../plugins/sdr-suite/types';

/**
 * SDR Suite command wrappers with enhanced error handling
 */
export const SdrCommands = {
  /**
   * Start SDR device
   * @param settings - SDR configuration settings
   * @param options - API invocation options
   */
  async startSdr(settings: SdrSettings, options: ApiInvocationOptions = {}): Promise<void> {
    return protectedTauriInvoke<void>('sdr_start', { settings }, 'sdr', {
      notificationTitle: 'Failed to Start SDR',
      retryAttempts: 1,
      timeout: 10000, // SDR operations may take longer
      ...options
    });
  },

  /**
   * Stop SDR device
   * @param options - API invocation options
   */
  async stopSdr(options: ApiInvocationOptions = {}): Promise<void> {
    return protectedTauriInvoke<void>('sdr_stop', undefined, 'sdr', {
      notificationTitle: 'Failed to Stop SDR',
      timeout: 5000,
      ...options
    });
  },

  /**
   * Update SDR settings
   * @param settings - New SDR settings
   * @param options - API invocation options
   */
  async updateSdrSettings(
    settings: Partial<SdrSettings>,
    options: ApiInvocationOptions = {}
  ): Promise<void> {
    return protectedTauriInvoke<void>('sdr_update_settings', { settings }, 'sdr', {
      notificationTitle: 'Failed to Update SDR Settings',
      ...options
    });
  },

  /**
   * Get current SDR state
   * @param options - API invocation options
   * @returns Current SDR state
   */
  async getSdrState(options: ApiInvocationOptions = {}): Promise<SdrState> {
    return protectedTauriInvoke<SdrState>('sdr_get_state', undefined, 'sdr', {
      notificationTitle: 'Failed to Get SDR State',
      retryAttempts: 2,
      showNotification: false, // State queries are frequent and less critical
      ...options
    });
  },

  /**
   * Get available SDR devices
   * @param options - API invocation options
   * @returns Array of available SDR devices
   */
  async getAvailableDevices(
    options: ApiInvocationOptions = {}
  ): Promise<Array<{ id: string; name: string; type: string }>> {
    return protectedTauriInvoke<Array<{ id: string; name: string; type: string }>>(
      'sdr_get_devices',
      undefined,
      'sdr',
      {
        notificationTitle: 'Failed to Get SDR Devices',
        retryAttempts: 2,
        showNotification: false, // Device detection is non-critical in browser
        ...options
      }
    );
  },

  /**
   * Set center frequency
   * @param frequency - Center frequency in Hz
   * @param options - API invocation options
   */
  async setCenterFrequency(frequency: number, options: ApiInvocationOptions = {}): Promise<void> {
    return protectedTauriInvoke<void>('sdr_set_center_frequency', { frequency }, 'sdr', {
      notificationTitle: 'Failed to Set Center Frequency',
      showNotification: false, // Frequent parameter changes
      ...options
    });
  },

  /**
   * Set sample rate
   * @param sampleRate - Sample rate in Hz
   * @param options - API invocation options
   */
  async setSampleRate(sampleRate: number, options: ApiInvocationOptions = {}): Promise<void> {
    return protectedTauriInvoke<void>('sdr_set_sample_rate', { sample_rate: sampleRate }, 'sdr', {
      notificationTitle: 'Failed to Set Sample Rate',
      showNotification: false, // Frequent parameter changes
      ...options
    });
  },

  /**
   * Set gain
   * @param gain - Gain value in dB
   * @param options - API invocation options
   */
  async setGain(gain: number, options: ApiInvocationOptions = {}): Promise<void> {
    return protectedTauriInvoke<void>('sdr_set_gain', { gain }, 'sdr', {
      notificationTitle: 'Failed to Set Gain',
      showNotification: false, // Frequent parameter changes
      ...options
    });
  },

  /**
   * Set bandwidth
   * @param bandwidth - Bandwidth in Hz
   * @param options - API invocation options
   */
  async setBandwidth(bandwidth: number, options: ApiInvocationOptions = {}): Promise<void> {
    return protectedTauriInvoke<void>('sdr_set_bandwidth', { bandwidth }, 'sdr', {
      notificationTitle: 'Failed to Set Bandwidth',
      showNotification: false, // Frequent parameter changes
      ...options
    });
  },

  /**
   * Start recording to file
   * @param filename - Output filename
   * @param format - Recording format (e.g., 'wav', 'raw')
   * @param options - API invocation options
   */
  async startRecording(
    filename: string,
    format: string = 'wav',
    options: ApiInvocationOptions = {}
  ): Promise<void> {
    return protectedTauriInvoke<void>('sdr_start_recording', { filename, format }, 'sdr', {
      notificationTitle: 'Failed to Start Recording',
      ...options
    });
  },

  /**
   * Stop recording
   * @param options - API invocation options
   */
  async stopRecording(options: ApiInvocationOptions = {}): Promise<void> {
    return protectedTauriInvoke<void>('sdr_stop_recording', undefined, 'sdr', {
      notificationTitle: 'Failed to Stop Recording',
      ...options
    });
  },

  /**
   * Safely get available SDR devices (returns empty array on error)
   * @param options - API invocation options
   */
  async safeGetAvailableDevices(
    options: ApiInvocationOptions = {}
  ): Promise<Array<{ id: string; name: string; type: string }>> {
    const result = await safeTauriInvoke<Array<{ id: string; name: string; type: string }>>(
      'sdr_get_devices',
      undefined,
      {
        notificationTitle: 'Failed to Get SDR Devices',
        retryAttempts: 2,
        ...options
      }
    );
    return result || [];
  }
};

/**
 * Performance monitoring for Tauri commands
 * @param operation - The operation to monitor
 * @param operationName - Name for logging
 * @returns Promise with operation result
 */
export async function measureTauriPerformance<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  const startTime = performance.now();

  return operation().finally(() => {
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`${operationName} took ${duration.toFixed(2)}ms`);

    // Warn if operation takes > 100ms
    if (duration > 100) {
      console.warn(`Slow operation detected: ${operationName} (${duration.toFixed(2)}ms)`);

      // Show warning notification for very slow operations (> 5 seconds)
      if (duration > 5000) {
        showWarning(
          'Slow Operation Detected',
          `${operationName} took ${(duration / 1000).toFixed(1)} seconds to complete`
        );
      }
    }
  });
}

/**
 * Health check for Tauri backend connectivity
 * @returns Promise with health status
 */
export async function checkBackendHealth(): Promise<{
  healthy: boolean;
  latency: number;
  error?: string;
}> {
  const startTime = performance.now();

  // Check Tauri availability first
  if (!TauriApi.isAvailable()) {
    const latency = performance.now() - startTime;
    return { healthy: false, latency, error: 'Tauri runtime not available' };
  }

  try {
    // Use a simple command to test connectivity
    await invokeTauriCommand<void>('ping', undefined, {
      timeout: 5000,
      showNotification: false,
      suppressConsoleError: true
    });

    const latency = performance.now() - startTime;
    return { healthy: true, latency };
  } catch (error) {
    const latency = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { healthy: false, latency, error: errorMessage };
  }
}

/**
 * Initialize API monitoring and health checks
 * @param intervalMs - Health check interval in milliseconds (default: 30 seconds)
 * @returns Cleanup function to stop monitoring
 */
export function initializeApiMonitoring(intervalMs: number = 30000): () => void {
  let consecutiveFailures = 0;
  const maxConsecutiveFailures = 3;

  const performHealthCheck = async () => {
    const health = await checkBackendHealth();

    if (health.healthy) {
      if (consecutiveFailures > 0) {
        console.log('Backend connection restored');
        showInfo('Connection Restored', 'Backend connection is healthy again');
        consecutiveFailures = 0;
      }
    } else {
      consecutiveFailures++;
      console.warn(
        `Backend health check failed (${consecutiveFailures}/${maxConsecutiveFailures}):`,
        health.error
      );

      if (consecutiveFailures >= maxConsecutiveFailures) {
        showError(
          'Backend Connection Issues',
          `Backend is not responding after ${consecutiveFailures} attempts. Some features may not work properly.`
        );
      }
    }
  };

  // Perform initial health check
  performHealthCheck();

  // Set up periodic health checks
  const healthCheckInterval = window.setInterval(performHealthCheck, intervalMs);

  console.log(`API monitoring initialized with ${intervalMs}ms interval`);

  // Return cleanup function
  return () => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      console.log('API monitoring stopped');
    }
  };
}

/**
 * Get comprehensive API status for debugging and monitoring
 * @returns API status information
 */
export async function getApiStatus(): Promise<{
  health: Awaited<ReturnType<typeof checkBackendHealth>>;
  circuitBreakers: Map<string, string>;
  eventErrors: Map<string, { errorCount: number; disabled: boolean; lastErrorTime: number }>;
}> {
  const health = await checkBackendHealth();
  const circuitBreakers = getCircuitBreakerStatus();
  const eventErrors = getEventErrorStats();

  return {
    health,
    circuitBreakers,
    eventErrors
  };
}

/**
 * Reset all API error tracking and circuit breakers
 * Useful for recovery after system issues
 */
export function resetAllApiErrorTracking(): void {
  // Reset all circuit breakers
  circuitBreakers.forEach((breaker, _category) => {
    breaker.reset();
  });

  // Reset event error tracking
  resetAllEventErrorTracking();

  console.log('All API error tracking reset');
  showInfo('API Status Reset', 'All error tracking and circuit breakers have been reset');
}

/**
 * Graceful shutdown of API utilities
 * Cleans up resources and pending operations
 */
export function shutdownApiUtilities(): void {
  // Clear all circuit breakers
  circuitBreakers.clear();

  // Reset event error tracking
  resetAllEventErrorTracking();

  console.log('API utilities shut down gracefully');
}
