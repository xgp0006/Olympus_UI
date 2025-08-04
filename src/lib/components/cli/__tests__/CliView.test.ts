/**
 * CliView Component Tests
 * Tests CLI terminal interface functionality
 * Requirements: 2.1, 2.5, 2.7
 */

import { render, waitFor } from '@testing-library/svelte';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import CliView from '../CliView.svelte';
import { theme } from '../../../stores/theme';
import { createMockTheme, createMockTerminal } from '../../../test-utils/mock-factories';

// Mock xterm.js
const mockTerminal = createMockTerminal();
const mockFitAddon = {
  fit: vi.fn(),
  dispose: vi.fn()
};

vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn(() => mockTerminal)
}));

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn(() => mockFitAddon)
}));

// Mock Tauri API
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn()
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn()
}));

// Mock theme store
vi.mock('../../../stores/theme', () => ({
  theme: { subscribe: vi.fn() },
  themeLoading: { subscribe: vi.fn() },
  themeError: { subscribe: vi.fn() },
  loadTheme: vi.fn(),
  reloadTheme: vi.fn(),
  getThemeState: vi.fn(),
  clearThemeError: vi.fn(),
  setTheme: vi.fn(),
  themeState: { subscribe: vi.fn() }
}));

describe('CliView Component', () => {
  const mockTheme = createMockTheme();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup theme store mock
    vi.mocked(theme.subscribe).mockImplementation((callback) => {
      callback(mockTheme);
      return () => {};
    });

    // Reset terminal mock
    Object.assign(mockTerminal, createMockTerminal());
  });

  test('renders CLI container', () => {
    render(CliView);

    const container = document.querySelector('.cli-container');
    expect(container).toBeInTheDocument();
  });

  test('initializes terminal with correct configuration', async () => {
    const { Terminal } = await import('@xterm/xterm');

    render(CliView);

    await waitFor(() => {
      expect(Terminal).toHaveBeenCalledWith({
        fontFamily: mockTheme.typography.font_family_mono,
        fontSize: parseInt(mockTheme.typography.font_size_base),
        theme: {
          background: mockTheme.components.cli.background,
          foreground: mockTheme.components.cli.text_color,
          cursor: mockTheme.components.cli.cursor_color,
          cursorAccent: mockTheme.components.cli.background
        }
      });
    });
  });

  test('loads fit addon and opens terminal', async () => {
    const { FitAddon } = await import('@xterm/addon-fit');

    render(CliView);

    await waitFor(() => {
      expect(FitAddon).toHaveBeenCalled();
      expect(mockTerminal.loadAddon).toHaveBeenCalledWith(mockFitAddon);
      expect(mockTerminal.open).toHaveBeenCalled();
      expect(mockFitAddon.fit).toHaveBeenCalled();
    });
  });

  test('writes welcome message on initialization', async () => {
    render(CliView);

    await waitFor(() => {
      expect(mockTerminal.writeln).toHaveBeenCalledWith(
        'Welcome to Aerospace C2 Command Line Interface'
      );
      expect(mockTerminal.writeln).toHaveBeenCalledWith('Type "help" for available commands');
    });
  });

  test('sets up CLI output event listener', async () => {
    const { listen } = await import('@tauri-apps/api/event');
    const mockUnlisten = vi.fn();
    vi.mocked(listen).mockResolvedValue(mockUnlisten);

    render(CliView);

    await waitFor(() => {
      expect(listen).toHaveBeenCalledWith('cli-output', expect.any(Function));
    });
  });

  test('handles CLI output events for stdout', async () => {
    const { listen } = await import('@tauri-apps/api/event');
    let eventHandler: (event: any) => void;

    vi.mocked(listen).mockImplementation((eventName, handler) => {
      eventHandler = handler;
      return Promise.resolve(vi.fn());
    });

    render(CliView);

    await waitFor(() => {
      expect(listen).toHaveBeenCalled();
    });

    // Simulate stdout event
    eventHandler!({
      payload: { line: 'Test output', stream: 'stdout' }
    });

    expect(mockTerminal.writeln).toHaveBeenCalledWith('Test output');
  });

  test('handles CLI output events for stderr with red styling', async () => {
    const { listen } = await import('@tauri-apps/api/event');
    let eventHandler: (event: any) => void;

    vi.mocked(listen).mockImplementation((eventName, handler) => {
      eventHandler = handler;
      return Promise.resolve(vi.fn());
    });

    render(CliView);

    await waitFor(() => {
      expect(listen).toHaveBeenCalled();
    });

    // Simulate stderr event
    eventHandler!({
      payload: { line: 'Error message', stream: 'stderr' }
    });

    expect(mockTerminal.writeln).toHaveBeenCalledWith('\x1b[31mError message\x1b[0m');
  });

  test('handles user input and sends commands to backend', async () => {
    const { invoke } = await import('@tauri-apps/api/tauri');
    let onDataCallback: (data: string) => void;

    mockTerminal.onData.mockImplementation((callback) => {
      onDataCallback = callback;
    });

    // Mock buffer for getting current line
    const mockLine = {
      translateToString: vi.fn(() => 'test command')
    };
    mockTerminal.buffer = {
      active: {
        getLine: vi.fn(() => mockLine),
        cursorY: 0
      }
    };

    render(CliView);

    await waitFor(() => {
      expect(mockTerminal.onData).toHaveBeenCalled();
    });

    // Simulate Enter key press
    onDataCallback!('\r');

    expect(invoke).toHaveBeenCalledWith('run_cli_command', { command: 'test command' });
  });

  test('handles user input without current line gracefully', async () => {
    const { invoke } = await import('@tauri-apps/api/tauri');
    let onDataCallback: (data: string) => void;

    mockTerminal.onData.mockImplementation((callback) => {
      onDataCallback = callback;
    });

    // Mock buffer with no current line
    mockTerminal.buffer = {
      active: {
        getLine: vi.fn(() => ({
          translateToString: vi.fn(() => '')
        })),
        cursorY: 0
      }
    };

    render(CliView);

    await waitFor(() => {
      expect(mockTerminal.onData).toHaveBeenCalled();
    });

    // Simulate Enter key press
    onDataCallback!('\r');

    expect(invoke).not.toHaveBeenCalled();
  });

  test('ignores non-Enter key presses', async () => {
    const { invoke } = await import('@tauri-apps/api/tauri');
    let onDataCallback: (data: string) => void;

    mockTerminal.onData.mockImplementation((callback) => {
      onDataCallback = callback;
    });

    render(CliView);

    await waitFor(() => {
      expect(mockTerminal.onData).toHaveBeenCalled();
    });

    // Simulate other key presses
    onDataCallback!('a');
    onDataCallback!('\t');
    onDataCallback!('\x1b[A'); // Arrow up

    expect(invoke).not.toHaveBeenCalled();
  });

  test('cleans up resources on component destroy', async () => {
    const { listen } = await import('@tauri-apps/api/event');
    const mockUnlisten = vi.fn();
    vi.mocked(listen).mockResolvedValue(mockUnlisten);

    const { unmount } = render(CliView);

    await waitFor(() => {
      expect(listen).toHaveBeenCalled();
    });

    unmount();

    expect(mockUnlisten).toHaveBeenCalled();
    expect(mockTerminal.dispose).toHaveBeenCalled();
  });

  test('handles event listener setup failure gracefully', async () => {
    const { listen } = await import('@tauri-apps/api/event');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(listen).mockRejectedValue(new Error('Failed to setup listener'));

    render(CliView);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to setup CLI event listener:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  test('updates terminal theme when theme changes', async () => {
    const { rerender } = render(CliView);

    // Change theme
    const newTheme = createMockTheme();
    newTheme.components.cli = {
      background: '#111111',
      text_color: '#eeeeee',
      cursor_color: '#ff0000',
      cursor_shape: 'block'
    };

    vi.mocked(theme.subscribe).mockImplementation((callback) => {
      callback(newTheme);
      return () => {};
    });

    rerender({});

    // Should create new terminal with updated theme
    await waitFor(() => {
      expect(mockTerminal.loadAddon).toHaveBeenCalled();
    });
  });

  test('handles terminal initialization error', async () => {
    const { Terminal } = await import('@xterm/xterm');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(Terminal).mockImplementation(() => {
      throw new Error('Terminal initialization failed');
    });

    render(CliView);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  test('handles fit addon initialization error', async () => {
    const { FitAddon } = await import('@xterm/addon-fit');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(FitAddon).mockImplementation(() => {
      throw new Error('FitAddon initialization failed');
    });

    render(CliView);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  test('applies correct CSS classes', () => {
    render(CliView);

    const container = document.querySelector('.cli-container');
    expect(container).toHaveClass('cli-container');
    expect(container).toHaveStyle({
      width: '100%',
      height: '100%',
      overflow: 'hidden'
    });
  });

  test('handles multiple rapid commands', async () => {
    const { invoke } = await import('@tauri-apps/api/tauri');
    let onDataCallback: (data: string) => void;

    mockTerminal.onData.mockImplementation((callback) => {
      onDataCallback = callback;
    });

    const mockLine = {
      translateToString: vi
        .fn()
        .mockReturnValueOnce('command1')
        .mockReturnValueOnce('command2')
        .mockReturnValueOnce('command3')
    };

    mockTerminal.buffer = {
      active: {
        getLine: vi.fn(() => mockLine),
        cursorY: 0
      }
    };

    render(CliView);

    await waitFor(() => {
      expect(mockTerminal.onData).toHaveBeenCalled();
    });

    // Send multiple commands rapidly
    onDataCallback!('\r');
    onDataCallback!('\r');
    onDataCallback!('\r');

    expect(invoke).toHaveBeenCalledTimes(3);
    expect(invoke).toHaveBeenNthCalledWith(1, 'run_cli_command', { command: 'command1' });
    expect(invoke).toHaveBeenNthCalledWith(2, 'run_cli_command', { command: 'command2' });
    expect(invoke).toHaveBeenNthCalledWith(3, 'run_cli_command', { command: 'command3' });
  });

  test('trims whitespace from commands', async () => {
    const { invoke } = await import('@tauri-apps/api/tauri');
    let onDataCallback: (data: string) => void;

    mockTerminal.onData.mockImplementation((callback) => {
      onDataCallback = callback;
    });

    const mockLine = {
      translateToString: vi.fn(() => '  test command  ')
    };

    mockTerminal.buffer = {
      active: {
        getLine: vi.fn(() => mockLine),
        cursorY: 0
      }
    };

    render(CliView);

    await waitFor(() => {
      expect(mockTerminal.onData).toHaveBeenCalled();
    });

    onDataCallback!('\r');

    expect(invoke).toHaveBeenCalledWith('run_cli_command', { command: 'test command' });
  });
});
