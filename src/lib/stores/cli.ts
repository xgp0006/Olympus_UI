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

// Create the main CLI store
function createCliStore() {
  const { subscribe, set, update } = writable<CliState>(initialState);

  // Event listeners
  let cliOutputUnlisten: UnlistenFn | null = null;
  let cliTerminatedUnlisten: UnlistenFn | null = null;

  return {
    subscribe,

    /**
     * Initialize CLI store and set up event listeners
     */
    async initialize(): Promise<void> {
      try {
        // Set up CLI output event listener
        cliOutputUnlisten = await setupEventListener<CliOutput>(
          'cli-output',
          (payload) => {
            const output = {
              ...payload,
              timestamp: Date.now()
            };

            update((state) => ({
              ...state,
              output: [...state.output, output],
              connected: true
            }));
          },
          {
            showErrorNotifications: false, // CLI errors are handled internally
            enableLogging: true
          }
        );

        // Set up CLI termination event listener
        cliTerminatedUnlisten = await setupEventListener<CliTermination>(
          'cli-terminated',
          (payload) => {
            update((state) => ({
              ...state,
              isRunning: false,
              lastExitCode: payload.code
            }));
          },
          {
            showErrorNotifications: false, // CLI errors are handled internally
            enableLogging: true
          }
        );

        update((state) => ({ ...state, connected: true }));
        console.log('CLI store initialized successfully');
      } catch (error) {
        console.error('Failed to initialize CLI store:', error);
        update((state) => ({ ...state, connected: false }));
        throw error;
      }
    },

    /**
     * Execute a CLI command
     */
    async executeCommand(command: string): Promise<void> {
      if (!command.trim()) {
        return;
      }

      try {
        update((state) => ({
          ...state,
          isRunning: true,
          currentCommand: command,
          commandHistory: [...state.commandHistory, command],
          lastExitCode: null
        }));

        await CliCommands.runCommand(command.trim());
      } catch (error) {
        console.error('Failed to execute CLI command:', error);

        // Add error to output
        const errorOutput: CliOutput = {
          line: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          stream: 'stderr',
          timestamp: Date.now()
        };

        update((state) => ({
          ...state,
          isRunning: false,
          output: [...state.output, errorOutput],
          lastExitCode: 1
        }));

        throw error;
      }
    },

    /**
     * Clear command history
     */
    clearHistory(): void {
      update((state) => ({
        ...state,
        commandHistory: []
      }));
    },

    /**
     * Clear output buffer
     */
    clearOutput(): void {
      update((state) => ({
        ...state,
        output: []
      }));
    },

    /**
     * Get command from history
     */
    getHistoryCommand(index: number): string | null {
      let currentState: CliState;
      const unsubscribe = subscribe((state) => {
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
      update((state) => ({
        ...state,
        currentCommand: command
      }));
    },

    /**
     * Cleanup event listeners
     */
    destroy(): void {
      if (cliOutputUnlisten) {
        cliOutputUnlisten();
        cliOutputUnlisten = null;
      }
      if (cliTerminatedUnlisten) {
        cliTerminatedUnlisten();
        cliTerminatedUnlisten = null;
      }

      update((state) => ({ ...state, connected: false }));
    },

    /**
     * Reset store to initial state
     */
    reset(): void {
      set(initialState);
    }
  };
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
