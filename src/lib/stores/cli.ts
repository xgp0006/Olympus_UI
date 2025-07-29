/**
 * CLI Store for managing command line interface state
 * Handles command history, execution state, and backend communication
 */
import { writable, derived } from 'svelte/store';
import { setupEventListener, CliCommands } from '$lib/utils/tauri';
import type { UnlistenFn } from '@tauri-apps/api/event';

// Types
export interface CliOutput {
  line: string;
  stream: 'stdout' | 'stderr';
  timestamp: number;
}

export interface CliState {
  isRunning: boolean;
  currentCommand: string;
  commandHistory: string[];
  output: CliOutput[];
  lastExitCode: number | null;
  connected: boolean;
}

export interface CliTermination {
  code: number;
}

// Initial state
const initialState: CliState = {
  isRunning: false,
  currentCommand: '',
  commandHistory: [],
  output: [],
  lastExitCode: null,
  connected: false
};

/**
 * NASA JPL Rule 4: Split - CLI store context
 */
interface CliStoreContext {
  update: (updater: (state: CliState) => CliState) => void;
  subscribe: (run: (value: CliState) => void) => (() => void);
  cliOutputUnlisten: UnlistenFn | null;
  cliTerminatedUnlisten: UnlistenFn | null;
}

/**
 * NASA JPL Rule 4: Split - Initialize CLI event listeners
 */
async function initializeCliListeners(ctx: CliStoreContext): Promise<void> {
  try {
    // Set up CLI output event listener
    ctx.cliOutputUnlisten = await setupEventListener<CliOutput>(
      'cli-output',
      (payload) => {
        const output = {
          ...payload,
          timestamp: Date.now()
        };

        ctx.update((state) => ({
          ...state,
          output: [...state.output, output],
          connected: true
        }));
      },
      {
        showErrorNotifications: false,
        enableLogging: true
      }
    );

    // Set up CLI termination event listener
    ctx.cliTerminatedUnlisten = await setupEventListener<CliTermination>(
      'cli-terminated',
      (payload) => {
        ctx.update((state) => ({
          ...state,
          isRunning: false,
          lastExitCode: payload.code
        }));
      },
      {
        showErrorNotifications: false,
        enableLogging: true
      }
    );

    ctx.update((state) => ({ ...state, connected: true }));
    console.log('CLI store initialized successfully');
  } catch (error) {
    console.error('Failed to initialize CLI store:', error);
    ctx.update((state) => ({ ...state, connected: false }));
    throw error;
  }
}

/**
 * NASA JPL Rule 4: Split - Execute CLI command
 */
async function executeCliCommand(
  ctx: CliStoreContext,
  command: string
): Promise<void> {
  if (!command.trim()) {
    return;
  }

  try {
    ctx.update((state) => ({
      ...state,
      isRunning: true,
      currentCommand: command,
      commandHistory: [...state.commandHistory, command],
      lastExitCode: null
    }));

    await CliCommands.runCommand(command.trim());
  } catch (error) {
    console.error('Failed to execute CLI command:', error);

    const errorOutput: CliOutput = {
      line: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      stream: 'stderr',
      timestamp: Date.now()
    };

    ctx.update((state) => ({
      ...state,
      isRunning: false,
      output: [...state.output, errorOutput],
      lastExitCode: 1
    }));

    throw error;
  }
}

/**
 * NASA JPL Rule 4: Split - Cleanup CLI listeners
 */
function cleanupCliListeners(ctx: CliStoreContext): void {
  if (ctx.cliOutputUnlisten) {
    ctx.cliOutputUnlisten();
    ctx.cliOutputUnlisten = null;
  }
  if (ctx.cliTerminatedUnlisten) {
    ctx.cliTerminatedUnlisten();
    ctx.cliTerminatedUnlisten = null;
  }

  ctx.update((state) => ({ ...state, connected: false }));
}

/**
 * NASA JPL Rule 4: Split function - Create CLI core methods
 */
function createCliCoreMethods(ctx: CliStoreContext, subscribe: (run: (value: CliState) => void) => (() => void)) {
  return {
    subscribe,

    async initialize(): Promise<void> {
      await initializeCliListeners(ctx);
    },

    async executeCommand(command: string): Promise<void> {
      await executeCliCommand(ctx, command);
    },

    destroy(): void {
      cleanupCliListeners(ctx);
    }
  };
}

/**
 * NASA JPL Rule 4: Split function - Create CLI utility methods
 */
function createCliUtilityMethods(ctx: CliStoreContext, update: (updater: (state: CliState) => CliState) => void, set: (value: CliState) => void, subscribe: (run: (value: CliState) => void) => (() => void)) {
  return {
    /**
     * Clear command history
     */
    clearHistory(): void {
      update((state: CliState) => ({
        ...state,
        commandHistory: []
      }));
    },

    /**
     * Clear output buffer
     */
    clearOutput(): void {
      update((state: CliState) => ({
        ...state,
        output: []
      }));
    },

    /**
     * Get command from history
     */
    getHistoryCommand(index: number): string | null {
      let currentState: CliState;
      const unsubscribe = subscribe((state: CliState) => {
        currentState = state;
      });
      unsubscribe();

      if (index >= 0 && index < currentState!.commandHistory.length) {
        return currentState!.commandHistory[index];
      }
      return null;
    },

    /**
     * Update current command (for input tracking)
     */
    updateCurrentCommand(command: string): void {
      update((state: CliState) => ({
        ...state,
        currentCommand: command
      }));
    },

    /**
     * Reset store to initial state
     */
    reset(): void {
      set(initialState);
    }
  };
}

/**
 * NASA JPL Rule 4: Split function - Create CLI store methods
 * Function refactored to be ≤60 lines (69 → 15 lines)
 */
function createCliStoreMethods(ctx: CliStoreContext, update: (updater: (state: CliState) => CliState) => void, set: (value: CliState) => void, subscribe: (run: (value: CliState) => void) => (() => void)) {
  return {
    ...createCliCoreMethods(ctx, subscribe),
    ...createCliUtilityMethods(ctx, update, set, subscribe)
  };
}

/**
 * Creates the main CLI store
 * NASA JPL Rule 4: Function refactored to be ≤60 lines (83 → 22 lines)
 */
function createCliStore() {
  const { subscribe, set, update } = writable<CliState>(initialState);

  // Event listeners
  let cliOutputUnlisten: UnlistenFn | null = null;
  let cliTerminatedUnlisten: UnlistenFn | null = null;

  // Create context for extracted functions
  const ctx = {
    update,
    subscribe,
    cliOutputUnlisten,
    cliTerminatedUnlisten
  } as CliStoreContext;

  return createCliStoreMethods(ctx, update, set, subscribe);
}

// Export the CLI store instance
export const cliStore = createCliStore();

// Derived stores for specific data
export const cliHistory = derived(cliStore, ($cli) => $cli.commandHistory);
export const cliOutput = derived(cliStore, ($cli) => $cli.output);
export const cliIsRunning = derived(cliStore, ($cli) => $cli.isRunning);
export const cliConnected = derived(cliStore, ($cli) => $cli.connected);
export const cliLastExitCode = derived(cliStore, ($cli) => $cli.lastExitCode);

// Utility functions
export function formatCliOutput(output: CliOutput): string {
  const timestamp = new Date(output.timestamp).toLocaleTimeString();
  const prefix = output.stream === 'stderr' ? '[ERROR]' : '[INFO]';
  return `${timestamp} ${prefix} ${output.line}`;
}

export function getLastNCommands(n: number): string[] {
  let history: string[] = [];
  const unsubscribe = cliHistory.subscribe((h) => {
    history = h;
  });
  unsubscribe();

  return history.slice(-n);
}
