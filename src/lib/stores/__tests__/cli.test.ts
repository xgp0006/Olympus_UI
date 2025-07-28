/**
 * CLI Store Tests
 * Tests the CLI store functionality and backend integration
 * Requirements: 2.6, 2.8, 6.6, 6.7, 6.8
 */

import { vi } from 'vitest';
import { get } from 'svelte/store';
import { cliStore, type CliOutput } from '../cli';

// Mock Tauri utilities
vi.mock('$lib/utils/tauri', () => ({
  setupEventListener: vi.fn(),
  CliCommands: {
    runCommand: vi.fn()
  }
}));

// Import mocked modules
import { setupEventListener, CliCommands } from '$lib/utils/tauri';

describe('CLI Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cliStore.reset();
  });

  afterEach(() => {
    cliStore.destroy();
  });

  test('initializes with correct default state', () => {
    const state = get(cliStore);

    expect(state).toEqual({
      isRunning: false,
      currentCommand: '',
      commandHistory: [],
      output: [],
      lastExitCode: null,
      connected: false
    });
  });

  test('initializes event listeners correctly', async () => {
    const mockUnlisten = vi.fn();
    vi.mocked(setupEventListener).mockResolvedValue(mockUnlisten);

    await cliStore.initialize();

    // Should set up two event listeners
    expect(setupEventListener).toHaveBeenCalledTimes(2);
    expect(setupEventListener).toHaveBeenCalledWith(
      'cli-output',
      expect.any(Function),
      expect.any(Function)
    );
    expect(setupEventListener).toHaveBeenCalledWith(
      'cli-terminated',
      expect.any(Function),
      expect.any(Function)
    );

    // Should mark as connected
    const state = get(cliStore);
    expect(state.connected).toBe(true);
  });

  test('handles CLI output events correctly', async () => {
    let outputHandler: (payload: CliOutput) => void;

    vi.mocked(setupEventListener).mockImplementation((eventName, handler) => {
      if (eventName === 'cli-output') {
        outputHandler = handler;
      }
      return Promise.resolve(vi.fn());
    });

    await cliStore.initialize();

    // Simulate CLI output event
    const mockOutput: CliOutput = {
      line: 'test output',
      stream: 'stdout',
      timestamp: Date.now()
    };

    outputHandler!(mockOutput);

    const state = get(cliStore);
    expect(state.output).toHaveLength(1);
    expect(state.output[0].line).toBe('test output');
    expect(state.output[0].stream).toBe('stdout');
    expect(state.connected).toBe(true);
  });

  test('handles CLI termination events correctly', async () => {
    let terminationHandler: (payload: { code: number }) => void;

    vi.mocked(setupEventListener).mockImplementation((eventName, handler) => {
      if (eventName === 'cli-terminated') {
        terminationHandler = handler;
      }
      return Promise.resolve(vi.fn());
    });

    await cliStore.initialize();

    // Set running state first
    await cliStore.executeCommand('test command');

    // Simulate CLI termination event
    terminationHandler!({ code: 0 });

    const state = get(cliStore);
    expect(state.isRunning).toBe(false);
    expect(state.lastExitCode).toBe(0);
  });

  test('executes commands correctly', async () => {
    vi.mocked(CliCommands.runCommand).mockResolvedValue();

    const command = 'test command';
    await cliStore.executeCommand(command);

    expect(CliCommands.runCommand).toHaveBeenCalledWith(command);

    const state = get(cliStore);
    expect(state.isRunning).toBe(true);
    expect(state.currentCommand).toBe(command);
    expect(state.commandHistory).toContain(command);
    expect(state.lastExitCode).toBeNull();
  });

  test('handles command execution errors correctly', async () => {
    const errorMessage = 'Command failed';
    vi.mocked(CliCommands.runCommand).mockRejectedValue(new Error(errorMessage));

    await expect(cliStore.executeCommand('failing command')).rejects.toThrow();

    const state = get(cliStore);
    expect(state.isRunning).toBe(false);
    expect(state.lastExitCode).toBe(1);
    expect(state.output).toHaveLength(1);
    expect(state.output[0].line).toContain(errorMessage);
    expect(state.output[0].stream).toBe('stderr');
  });

  test('updates current command correctly', () => {
    const command = 'partial command';
    cliStore.updateCurrentCommand(command);

    const state = get(cliStore);
    expect(state.currentCommand).toBe(command);
  });

  test('clears history correctly', async () => {
    vi.mocked(CliCommands.runCommand).mockResolvedValue();

    // Add some commands to history
    await cliStore.executeCommand('command 1');
    await cliStore.executeCommand('command 2');

    let state = get(cliStore);
    expect(state.commandHistory).toHaveLength(2);

    cliStore.clearHistory();

    state = get(cliStore);
    expect(state.commandHistory).toHaveLength(0);
  });

  test('clears output correctly', async () => {
    // Initialize to set up event listeners
    vi.mocked(setupEventListener).mockResolvedValue(vi.fn());
    await cliStore.initialize();

    // Manually add some output
    const mockOutput: CliOutput = {
      line: 'test output',
      stream: 'stdout',
      timestamp: Date.now()
    };

    // Simulate output event
    let outputHandler: (payload: CliOutput) => void;
    vi.mocked(setupEventListener).mockImplementation((eventName, handler) => {
      if (eventName === 'cli-output') {
        outputHandler = handler;
      }
      return Promise.resolve(vi.fn());
    });

    await cliStore.initialize();
    outputHandler!(mockOutput);

    let state = get(cliStore);
    expect(state.output).toHaveLength(1);

    cliStore.clearOutput();

    state = get(cliStore);
    expect(state.output).toHaveLength(0);
  });

  test('retrieves history command correctly', async () => {
    vi.mocked(CliCommands.runCommand).mockResolvedValue();

    await cliStore.executeCommand('command 1');
    await cliStore.executeCommand('command 2');

    expect(cliStore.getHistoryCommand(0)).toBe('command 1');
    expect(cliStore.getHistoryCommand(1)).toBe('command 2');
    expect(cliStore.getHistoryCommand(2)).toBeNull();
    expect(cliStore.getHistoryCommand(-1)).toBeNull();
  });

  test('cleans up event listeners on destroy', async () => {
    const mockUnlisten1 = vi.fn();
    const mockUnlisten2 = vi.fn();

    vi.mocked(setupEventListener)
      .mockResolvedValueOnce(mockUnlisten1)
      .mockResolvedValueOnce(mockUnlisten2);

    await cliStore.initialize();

    cliStore.destroy();

    expect(mockUnlisten1).toHaveBeenCalled();
    expect(mockUnlisten2).toHaveBeenCalled();

    const state = get(cliStore);
    expect(state.connected).toBe(false);
  });

  test('resets to initial state correctly', async () => {
    vi.mocked(CliCommands.runCommand).mockResolvedValue();

    // Modify state
    await cliStore.executeCommand('test command');
    cliStore.updateCurrentCommand('partial');

    let state = get(cliStore);
    expect(state.commandHistory).toHaveLength(1);
    expect(state.currentCommand).toBe('partial');

    cliStore.reset();

    state = get(cliStore);
    expect(state).toEqual({
      isRunning: false,
      currentCommand: '',
      commandHistory: [],
      output: [],
      lastExitCode: null,
      connected: false
    });
  });
});
