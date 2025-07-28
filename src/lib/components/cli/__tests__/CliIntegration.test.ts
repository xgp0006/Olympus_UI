/**
 * CLI Integration Tests
 * Tests the integration between CLI components and backend
 * Requirements: 2.6, 2.8, 6.6, 6.7, 6.8
 */

import { vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';
import CliView from '../CliView.svelte';
import { cliStore } from '$lib/stores/cli';

// Mock Tauri utilities
vi.mock('$lib/utils/tauri', () => ({
  setupEventListener: vi.fn(),
  CliCommands: {
    runCommand: vi.fn()
  }
}));

// Mock theme store
vi.mock('$lib/stores/theme', () => ({
  theme: {
    subscribe: vi.fn((callback) => {
      callback({
        components: {
          cli: {
            background: '#000000',
            text_color: '#ffffff',
            cursor_color: '#ffffff',
            cursor_shape: 'block'
          }
        },
        typography: {
          font_family_mono: 'Consolas',
          font_size_sm: '14px'
        }
      });
      return () => {};
    })
  }
}));

// Mock xterm.js
const mockTerminal = {
  writeln: vi.fn(),
  write: vi.fn(),
  onData: vi.fn(),
  open: vi.fn(),
  focus: vi.fn(),
  clear: vi.fn(),
  dispose: vi.fn(),
  refresh: vi.fn(),
  loadAddon: vi.fn(),
  options: {}
};

const mockFitAddon = {
  fit: vi.fn()
};

const mockWebLinksAddon = {};

vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn(() => mockTerminal)
}));

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn(() => mockFitAddon)
}));

vi.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: vi.fn(() => mockWebLinksAddon)
}));

// Import mocked modules
import { setupEventListener, CliCommands } from '$lib/utils/tauri';

describe('CLI Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cliStore.reset();
  });

  afterEach(() => {
    cliStore.destroy();
  });

  test('CLI component initializes backend connection', async () => {
    const mockUnlisten = vi.fn();
    vi.mocked(setupEventListener).mockResolvedValue(mockUnlisten);

    render(CliView, { props: { height: 200 } });

    // Wait for component initialization
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Should set up event listeners for CLI backend communication
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
  });

  test('CLI handles backend output events', async () => {
    let outputHandler: (payload: { line: string; stream: 'stdout' | 'stderr' }) => void;

    vi.mocked(setupEventListener).mockImplementation((eventName, handler) => {
      if (eventName === 'cli-output') {
        outputHandler = handler;
      }
      return Promise.resolve(vi.fn());
    });

    render(CliView, { props: { height: 200 } });

    // Wait for component initialization
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Simulate backend CLI output
    const mockOutput = {
      line: 'Hello from backend',
      stream: 'stdout' as const
    };

    outputHandler!(mockOutput);

    // Should write output to terminal
    expect(mockTerminal.writeln).toHaveBeenCalledWith('Hello from backend');
  });

  test('CLI handles backend error output', async () => {
    let outputHandler: (payload: { line: string; stream: 'stdout' | 'stderr' }) => void;

    vi.mocked(setupEventListener).mockImplementation((eventName, handler) => {
      if (eventName === 'cli-output') {
        outputHandler = handler;
      }
      return Promise.resolve(vi.fn());
    });

    render(CliView, { props: { height: 200 } });

    // Wait for component initialization
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Simulate backend CLI error output
    const mockOutput = {
      line: 'Error from backend',
      stream: 'stderr' as const
    };

    outputHandler!(mockOutput);

    // Should write error output to terminal with red color
    expect(mockTerminal.writeln).toHaveBeenCalledWith('\x1b[31mError from backend\x1b[0m');
  });

  test('CLI handles backend termination events', async () => {
    let terminationHandler: (payload: { code: number }) => void;

    vi.mocked(setupEventListener).mockImplementation((eventName, handler) => {
      if (eventName === 'cli-terminated') {
        terminationHandler = handler;
      }
      return Promise.resolve(vi.fn());
    });

    render(CliView, { props: { height: 200 } });

    // Wait for component initialization
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Simulate successful termination
    terminationHandler!({ code: 0 });

    expect(mockTerminal.writeln).toHaveBeenCalledWith(
      '\x1b[32mProcess completed successfully\x1b[0m'
    );
    expect(mockTerminal.write).toHaveBeenCalledWith('$ ');
  });

  test('CLI handles backend termination with error code', async () => {
    let terminationHandler: (payload: { code: number }) => void;

    vi.mocked(setupEventListener).mockImplementation((eventName, handler) => {
      if (eventName === 'cli-terminated') {
        terminationHandler = handler;
      }
      return Promise.resolve(vi.fn());
    });

    render(CliView, { props: { height: 200 } });

    // Wait for component initialization
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Simulate error termination
    terminationHandler!({ code: 1 });

    expect(mockTerminal.writeln).toHaveBeenCalledWith('\x1b[31mProcess exited with code 1\x1b[0m');
    expect(mockTerminal.write).toHaveBeenCalledWith('$ ');
  });

  test('CLI sends commands to backend', async () => {
    vi.mocked(CliCommands.runCommand).mockResolvedValue();
    vi.mocked(setupEventListener).mockResolvedValue(vi.fn());

    render(CliView, { props: { height: 200 } });

    // Wait for component initialization
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Simulate user input handling
    let dataHandler: (data: string) => void;
    vi.mocked(mockTerminal.onData).mockImplementation((handler) => {
      dataHandler = handler;
    });

    // Simulate typing a command and pressing Enter
    dataHandler!('t');
    dataHandler!('e');
    dataHandler!('s');
    dataHandler!('t');
    dataHandler!('\r'); // Enter key

    // Should send command to backend
    expect(CliCommands.runCommand).toHaveBeenCalledWith('test');
  });

  test('CLI store maintains connection state', async () => {
    const mockUnlisten = vi.fn();
    vi.mocked(setupEventListener).mockResolvedValue(mockUnlisten);

    render(CliView, { props: { height: 200 } });

    // Wait for component initialization
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Check that CLI store shows connected state
    const state = get(cliStore);
    expect(state.connected).toBe(true);
  });

  test('CLI component cleans up backend connections on destroy', async () => {
    const mockUnlisten1 = vi.fn();
    const mockUnlisten2 = vi.fn();

    vi.mocked(setupEventListener)
      .mockResolvedValueOnce(mockUnlisten1)
      .mockResolvedValueOnce(mockUnlisten2);

    const { unmount } = render(CliView, { props: { height: 200 } });

    // Wait for component initialization
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Unmount component
    unmount();

    // Should clean up event listeners
    expect(mockUnlisten1).toHaveBeenCalled();
    expect(mockUnlisten2).toHaveBeenCalled();

    // Should dispose terminal
    expect(mockTerminal.dispose).toHaveBeenCalled();
  });
});
