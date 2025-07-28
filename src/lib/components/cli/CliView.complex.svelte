<!--
  CLI View Component using xterm.js
  Provides a full-featured terminal interface with theme integration
  Requirements: 2.1, 2.5, 2.7, 2.6, 2.8, 6.6, 6.7, 6.8
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Terminal } from '@xterm/xterm';
  import { FitAddon } from '@xterm/addon-fit';
  import { WebLinksAddon } from '@xterm/addon-web-links';
  import { theme } from '$lib/stores/theme';
  import { cliStore, type CliOutput } from '$lib/stores/cli';
  import type { Theme } from '$lib/types/theme';

  // Props
  export let height: number = 200;
  export let autoFocus: boolean = true;

  // Terminal instance and addons
  let terminal: Terminal | null = null;
  let fitAddon: FitAddon | null = null;
  let webLinksAddon: WebLinksAddon | null = null;
  let terminalElement: HTMLElement;

  // State
  let isInitialized = false;
  let currentCommand = '';
  let historyIndex = -1;

  // Subscribe to CLI store
  let commandHistory: string[] = [];

  // Reactive subscriptions
  $: commandHistory = $cliStore.commandHistory;

  /**
   * Creates terminal theme configuration from current theme
   */
  function createTerminalTheme(currentTheme: Theme | null) {
    if (!currentTheme) {
      return {
        background: '#000000',
        foreground: '#ffffff',
        cursor: '#ffffff',
        cursorAccent: '#000000',
        selection: '#ffffff40',
        black: '#000000',
        red: '#ff6b6b',
        green: '#51cf66',
        yellow: '#ffd43b',
        blue: '#339af0',
        magenta: '#f06292',
        cyan: '#22d3ee',
        white: '#ffffff',
        brightBlack: '#495057',
        brightRed: '#ff8787',
        brightGreen: '#69db7c',
        brightYellow: '#ffe066',
        brightBlue: '#4dabf7',
        brightMagenta: '#f48fb1',
        brightCyan: '#67e8f9',
        brightWhite: '#f8f9fa'
      };
    }

    return {
      background: currentTheme.components.cli.background || '#000000',
      foreground: currentTheme.components.cli.text_color || '#ffffff',
      cursor: currentTheme.components.cli.cursor_color || '#ffffff',
      cursorAccent: currentTheme.components.cli.background || '#000000',
      selection: (currentTheme.colors.accent_blue || '#339af0') + '40',
      black: currentTheme.colors.background_primary || '#000000',
      red: currentTheme.colors.accent_red || '#ff6b6b',
      green: currentTheme.colors.accent_green || '#51cf66',
      yellow: currentTheme.colors.accent_yellow || '#ffd43b',
      blue: currentTheme.colors.accent_blue || '#339af0',
      magenta: currentTheme.colors.accent_red || '#f06292',
      cyan: currentTheme.colors.accent_blue || '#22d3ee',
      white: currentTheme.colors.text_primary || '#ffffff',
      brightBlack: currentTheme.colors.text_disabled || '#495057',
      brightRed: currentTheme.colors.accent_red || '#ff8787',
      brightGreen: currentTheme.colors.accent_green || '#69db7c',
      brightYellow: currentTheme.colors.accent_yellow || '#ffe066',
      brightBlue: currentTheme.colors.accent_blue || '#4dabf7',
      brightMagenta: currentTheme.colors.accent_red || '#f48fb1',
      brightCyan: currentTheme.colors.accent_blue || '#67e8f9',
      brightWhite: currentTheme.colors.text_primary || '#f8f9fa'
    };
  }

  /**
   * Initializes the terminal with proper configuration
   */
  async function initializeTerminal(currentTheme: Theme | null) {
    if (!terminalElement || terminal) {
      return;
    }

    try {
      // Create terminal instance
      terminal = new Terminal({
        fontFamily:
          currentTheme?.typography?.font_family_mono || 'Consolas, "Courier New", monospace',
        fontSize: parseInt(currentTheme?.typography?.font_size_sm || '14'),
        fontWeight: 'normal',
        fontWeightBold: 'bold',
        lineHeight: 1.2,
        letterSpacing: 0,
        cursorBlink: true,
        cursorStyle: currentTheme?.components?.cli?.cursor_shape === 'block' ? 'block' : 'bar',
        cursorWidth: 1,
        scrollback: 1000,
        tabStopWidth: 4,
        theme: createTerminalTheme(currentTheme),
        allowProposedApi: true
      });

      // Create and load addons
      fitAddon = new FitAddon();
      webLinksAddon = new WebLinksAddon();

      terminal.loadAddon(fitAddon);
      terminal.loadAddon(webLinksAddon);

      // Open terminal in DOM element
      terminal.open(terminalElement);

      // Fit terminal to container
      fitAddon.fit();

      // Write welcome message
      terminal.writeln('\x1b[36mWelcome to Aerospace C2 Command Line Interface\x1b[0m');
      terminal.writeln('\x1b[90mType "help" for available commands\x1b[0m');
      terminal.write('\r\n$ ');

      // Set up input handling
      setupInputHandling();

      // Set up CLI integration with backend
      await setupCliIntegration();

      // Focus terminal if requested
      if (autoFocus) {
        terminal.focus();
      }

      isInitialized = true;
      console.log('Terminal initialized successfully');
    } catch (error) {
      console.error('Failed to initialize terminal:', error);
      throw error;
    }
  }

  /**
   * Sets up terminal input handling
   */
  function setupInputHandling() {
    if (!terminal) return;

    terminal.onData((data) => {
      const code = data.charCodeAt(0);

      // Handle special keys
      switch (code) {
        case 13: // Enter
          handleEnterKey();
          break;
        case 127: // Backspace
          handleBackspace();
          break;
        case 27: // Escape sequences (arrow keys, etc.)
          handleEscapeSequence(data);
          break;
        case 3: // Ctrl+C
          handleCtrlC();
          break;
        case 12: // Ctrl+L
          handleCtrlL();
          break;
        default:
          // Regular character input
          if (code >= 32 && code <= 126) {
            handleCharacterInput(data);
          }
          break;
      }
    });
  }

  /**
   * Handles Enter key press - executes command
   */
  async function handleEnterKey() {
    if (!terminal) return;

    terminal.write('\r\n');

    if (currentCommand.trim()) {
      // Update history index
      historyIndex = commandHistory.length + 1;

      // Execute command through CLI store
      try {
        await cliStore.executeCommand(currentCommand.trim());
      } catch (error) {
        // Error handling is managed by the store
        console.error('Command execution failed:', error);
      }
    }

    // Reset command and show new prompt
    currentCommand = '';
    cliStore.updateCurrentCommand('');
    terminal.write('$ ');
  }

  /**
   * Handles backspace key
   */
  function handleBackspace() {
    if (!terminal || currentCommand.length === 0) return;

    currentCommand = currentCommand.slice(0, -1);
    cliStore.updateCurrentCommand(currentCommand);
    terminal.write('\b \b');
  }

  /**
   * Handles escape sequences (arrow keys, etc.)
   */
  function handleEscapeSequence(data: string) {
    if (!terminal) return;

    if (data === '\x1b[A') {
      // Up arrow
      navigateHistory(-1);
    } else if (data === '\x1b[B') {
      // Down arrow
      navigateHistory(1);
    }
    // Note: Left/Right arrow navigation within command line could be added here
  }

  /**
   * Handles Ctrl+C - interrupt current command
   */
  function handleCtrlC() {
    if (!terminal) return;

    terminal.write('^C\r\n$ ');
    currentCommand = '';
    cliStore.updateCurrentCommand('');
  }

  /**
   * Handles Ctrl+L - clear screen
   */
  function handleCtrlL() {
    if (!terminal) return;

    terminal.clear();
    cliStore.clearOutput();
    terminal.write('$ ' + currentCommand);
  }

  /**
   * Handles regular character input
   */
  function handleCharacterInput(char: string) {
    if (!terminal) return;

    currentCommand += char;
    cliStore.updateCurrentCommand(currentCommand);
    terminal.write(char);
  }

  /**
   * Navigates command history
   */
  function navigateHistory(direction: number) {
    if (!terminal || commandHistory.length === 0) return;

    const newIndex = historyIndex + direction;

    if (newIndex >= 0 && newIndex < commandHistory.length) {
      // Clear current line
      terminal.write('\r\x1b[K$ ');

      // Update history index and command
      historyIndex = newIndex;
      currentCommand = commandHistory[historyIndex];

      // Write historical command
      terminal.write(currentCommand);
    } else if (newIndex === commandHistory.length) {
      // Clear to empty command
      terminal.write('\r\x1b[K$ ');
      historyIndex = commandHistory.length;
      currentCommand = '';
    }
  }

  /**
   * Sets up CLI store and handles output display
   */
  async function setupCliIntegration() {
    try {
      // Initialize CLI store (sets up event listeners)
      await cliStore.initialize();

      // Subscribe to CLI output for terminal display
      const unsubscribeOutput = cliStore.subscribe((state) => {
        if (!terminal) return;

        // Display new output (only the latest entry to avoid duplicates)
        if (state.output.length > 0) {
          const latestOutput = state.output[state.output.length - 1];
          if (latestOutput && latestOutput.timestamp > (lastOutputTimestamp || 0)) {
            displayCliOutput(latestOutput);
            lastOutputTimestamp = latestOutput.timestamp;
          }
        }

        // Handle process termination
        if (
          state.lastExitCode !== null &&
          !state.isRunning &&
          state.lastExitCode !== lastProcessedExitCode
        ) {
          displayProcessTermination(state.lastExitCode);
          lastProcessedExitCode = state.lastExitCode;
        }
      });

      // Store unsubscribe function for cleanup
      cliStoreUnsubscribe = unsubscribeOutput;
    } catch (error) {
      console.error('Failed to setup CLI integration:', error);
    }
  }

  // Track last output timestamp to avoid duplicates
  let lastOutputTimestamp = 0;
  let lastProcessedExitCode: number | null = null;
  let cliStoreUnsubscribe: (() => void) | null = null;

  /**
   * Display CLI output in terminal
   */
  function displayCliOutput(output: CliOutput) {
    if (!terminal) return;

    // Apply different styling based on stream type
    if (output.stream === 'stderr') {
      terminal.writeln(`\x1b[31m${output.line}\x1b[0m`); // Red text for stderr
    } else {
      terminal.writeln(output.line); // Normal text for stdout
    }
  }

  /**
   * Display process termination message
   */
  function displayProcessTermination(exitCode: number) {
    if (!terminal) return;

    if (exitCode === 0) {
      terminal.writeln(`\x1b[32mProcess completed successfully\x1b[0m`);
    } else {
      terminal.writeln(`\x1b[31mProcess exited with code ${exitCode}\x1b[0m`);
    }

    terminal.write('$ ');
  }

  /**
   * Updates terminal theme when theme changes
   */
  function updateTerminalTheme(currentTheme: Theme | null) {
    if (!terminal || !isInitialized) return;

    try {
      // Update terminal options
      terminal.options.theme = createTerminalTheme(currentTheme);
      terminal.options.fontFamily =
        currentTheme?.typography?.font_family_mono || 'Consolas, "Courier New", monospace';
      terminal.options.fontSize = parseInt(currentTheme?.typography?.font_size_sm || '14');
      terminal.options.cursorStyle =
        currentTheme?.components?.cli?.cursor_shape === 'block' ? 'block' : 'bar';

      // Refresh terminal display
      terminal.refresh(0, terminal.rows - 1);

      console.log('Terminal theme updated');
    } catch (error) {
      console.error('Failed to update terminal theme:', error);
    }
  }

  /**
   * Resizes terminal to fit container
   */
  export function resizeTerminal() {
    if (fitAddon && isInitialized) {
      try {
        fitAddon.fit();
      } catch (error) {
        console.error('Failed to resize terminal:', error);
      }
    }
  }

  /**
   * Focuses the terminal
   */
  export function focusTerminal() {
    if (terminal && isInitialized) {
      terminal.focus();
    }
  }

  /**
   * Clears the terminal
   */
  export function clearTerminal() {
    if (terminal && isInitialized) {
      terminal.clear();
      cliStore.clearOutput();
      terminal.write('$ ');
      currentCommand = '';
      cliStore.updateCurrentCommand('');
    }
  }

  // Reactive statements
  $: if ($theme && isInitialized) {
    updateTerminalTheme($theme);
  }

  // Lifecycle
  onMount(async () => {
    // Wait for DOM element to be available
    if (terminalElement) {
      await initializeTerminal($theme);
    }
  });

  onDestroy(() => {
    // Clean up CLI store subscription
    if (cliStoreUnsubscribe) {
      cliStoreUnsubscribe();
    }

    // Clean up CLI store
    cliStore.destroy();

    // Dispose terminal
    if (terminal) {
      terminal.dispose();
    }
  });
</script>

<div class="cli-view" style="height: {height}px" data-testid="cli-view">
  <div
    class="terminal-container"
    bind:this={terminalElement}
    data-testid="terminal-container"
  ></div>
</div>

<style>
  .cli-view {
    width: 100%;
    overflow: hidden;
    background-color: var(--component-cli-background);
  }

  .terminal-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  /* Import xterm.js CSS */
  :global(.xterm) {
    height: 100% !important;
    width: 100% !important;
  }

  :global(.xterm-viewport) {
    overflow-y: auto;
    background-color: var(--component-cli-background) !important;
  }

  :global(.xterm-screen) {
    background-color: var(--component-cli-background) !important;
  }

  :global(.xterm-cursor-layer) {
    z-index: 1;
  }

  :global(.xterm-selection-layer) {
    z-index: 2;
  }

  /* Scrollbar styling for terminal */
  :global(.xterm-viewport::-webkit-scrollbar) {
    width: 8px;
  }

  :global(.xterm-viewport::-webkit-scrollbar-track) {
    background: var(--color-background_secondary);
  }

  :global(.xterm-viewport::-webkit-scrollbar-thumb) {
    background: var(--color-text_disabled);
    border-radius: 4px;
  }

  :global(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
    background: var(--color-text_secondary);
  }
</style>
