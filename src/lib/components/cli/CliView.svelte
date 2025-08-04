<!--
  Simplified CLI View Component using xterm.js
  Provides a full-featured terminal interface with backend integration
  Requirements: 2.1, 2.5, 2.6, 2.7, 2.8, 6.6, 6.7, 6.8
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { TauriApi, type UnlistenFn } from '$lib/utils/tauri-context';
  import { theme } from '$lib/stores/theme';
  import type { Theme } from '$lib/types/theme';
  import { BoundedArray } from '$lib/utils/bounded-array';

  // Browser-only imports
  let Terminal: any;
  let FitAddon: any;
  let WebLinksAddon: any;

  // Props
  export let height: number = 200;
  export let autoFocus: boolean = true;

  // Terminal instance and addons
  let terminal: any | null = null;
  let fitAddon: any | null = null;
  let webLinksAddon: any | null = null;
  let terminalElement: HTMLElement;

  // Event listeners
  let cliOutputUnlisten: UnlistenFn | null = null;
  let cliTerminatedUnlisten: UnlistenFn | null = null;

  // State with bounded memory (NASA JPL Rule 2)
  let isInitialized = false;
  let currentCommand = '';
  const commandHistory = new BoundedArray<string>(100); // Max 100 commands
  let historyIndex = -1;

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
        selection: '#ffffff40'
      };
    }

    return {
      background: currentTheme.components?.cli?.background || '#000000',
      foreground: currentTheme.components?.cli?.text_color || '#ffffff',
      cursor: currentTheme.components?.cli?.cursor_color || '#ffffff',
      cursorAccent: currentTheme.components?.cli?.background || '#000000',
      selection: (currentTheme.colors?.accent_blue || '#339af0') + '40'
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
      // Create terminal instance with Nerd Font support
      terminal = new Terminal({
        fontFamily:
          currentTheme?.typography?.font_family_mono ||
          'FiraCode Nerd Font, JetBrainsMono Nerd Font, JetBrains Mono, Fira Code, Consolas, monospace',
        fontSize: parseInt(currentTheme?.typography?.font_size_sm || '14'),
        cursorBlink: true,
        cursorStyle: 'bar',
        scrollback: 1000,
        theme: createTerminalTheme(currentTheme),
        // Enable ligatures for better code display
        fontLigatures: true
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

      // Write welcome message with icons (Requirement 2.5)
      terminal.writeln('\x1b[36m 🚀 Welcome to Aerospace C2 Command Line Interface\x1b[0m');
      terminal.writeln('\x1b[90m💡 Type "help" for available commands\x1b[0m');
      terminal.write('\r\n\x1b[32m❯\x1b[0m ');

      // Set up input handling
      setupInputHandling();

      // Set up event listeners for backend communication (Requirements 2.6, 6.7, 6.8)
      await setupEventListeners();

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

    terminal.onData((data: string) => {
      const code = data.charCodeAt(0);

      switch (code) {
        case 13: // Enter - execute command (Requirement 2.8)
          handleEnterKey();
          break;
        case 127: // Backspace
          handleBackspace();
          break;
        case 27: // Escape sequences (arrow keys)
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
   * Handles Enter key press - executes command (Requirement 2.8, 6.6)
   */
  async function handleEnterKey() {
    if (!terminal) return;

    terminal.write('\r\n');

    if (currentCommand.trim()) {
      // Add to history with bounded storage (NASA JPL Rule 2)
      commandHistory.push(currentCommand.trim());
      historyIndex = commandHistory.length;

      // Execute command via Tauri (Requirement 6.6)
      try {
        const context = TauriApi.getContext();
        
        if (!context.isAvailable) {
          // Browser-only mode - provide helpful message
          terminal.writeln('\x1b[90m🌐 Browser-only mode: CLI commands require the desktop application\x1b[0m');
          terminal.write('\x1b[32m❯\x1b[0m ');
        } else {
          const result = await TauriApi.invoke('run_cli_command', {
            command: currentCommand.trim()
          });
          if (result === undefined) {
            throw new Error('Command execution failed - no response from backend');
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        terminal.writeln(`\x1b[31mError: ${errorMessage}\x1b[0m`);
        terminal.write('\x1b[32m❯\x1b[0m ');
      }
    } else {
      terminal.write('\x1b[32m❯\x1b[0m ');
    }

    // Reset command
    currentCommand = '';
  }

  /**
   * Handles backspace key
   */
  function handleBackspace() {
    if (!terminal || currentCommand.length === 0) return;

    currentCommand = currentCommand.slice(0, -1);
    terminal.write('\b \b');
  }

  /**
   * Handles escape sequences (arrow keys for history)
   */
  function handleEscapeSequence(data: string) {
    if (!terminal) return;

    if (data === '\x1b[A') {
      // Up arrow - previous command
      navigateHistory(-1);
    } else if (data === '\x1b[B') {
      // Down arrow - next command
      navigateHistory(1);
    }
  }

  /**
   * Handles Ctrl+C - interrupt current command
   */
  function handleCtrlC() {
    if (!terminal) return;

    terminal.write('^C\r\n\x1b[32m❯\x1b[0m ');
    currentCommand = '';
  }

  /**
   * Handles Ctrl+L - clear screen
   */
  function handleCtrlL() {
    if (!terminal) return;

    terminal.clear();
    terminal.write('\x1b[32m❯\x1b[0m ' + currentCommand);
  }

  /**
   * Handles regular character input
   */
  function handleCharacterInput(char: string) {
    if (!terminal) return;

    currentCommand += char;
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
      terminal.write('\r\x1b[K\x1b[32m❯\x1b[0m ');

      // Update history index and command
      historyIndex = newIndex;
      currentCommand = commandHistory.at(historyIndex) || '';

      // Write historical command
      terminal.write(currentCommand);
    } else if (newIndex === commandHistory.length) {
      // Clear to empty command
      terminal.write('\r\x1b[K\x1b[32m❯\x1b[0m ');
      historyIndex = commandHistory.length;
      currentCommand = '';
    }
  }

  /**
   * Sets up event listeners for backend communication (Requirements 2.6, 6.7, 6.8)
   */
  async function setupEventListeners() {
    const context = TauriApi.getContext();
    
    // Skip if Tauri not available
    if (!context.isAvailable) {
      console.debug('CLI event listeners: Skipped in browser-only mode');
      return;
    }

    try {
      // Listen for CLI output (Requirement 2.6, 6.7)
      cliOutputUnlisten = await TauriApi.listen<{ line: string; stream: 'stdout' | 'stderr' }>(
        'cli-output',
        (payload) => {
          try {
            const { line, stream } = payload;

            if (!terminal) return;

            // Sanitize output to prevent terminal escape sequence injection
            // eslint-disable-next-line no-control-regex
            const sanitizedLine = line.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

            // Visually distinguish between stdout and stderr (Requirement 2.7)
            if (stream === 'stderr') {
              terminal.writeln(`\x1b[31m${sanitizedLine}\x1b[0m`); // Red text for stderr
            } else {
              terminal.writeln(sanitizedLine); // Normal text for stdout
            }
          } catch (error) {
            console.error('Error handling CLI output:', error);
          }
        }
      );

      // Listen for CLI termination (Requirement 6.8)
      cliTerminatedUnlisten = await TauriApi.listen<{ code: number }>(
        'cli-terminated',
        (payload) => {
          const { code } = payload;

          if (!terminal) return;

          if (code === 0) {
            terminal.writeln(`\x1b[32mProcess completed successfully\x1b[0m`);
          } else {
            terminal.writeln(`\x1b[31mProcess exited with code ${code}\x1b[0m`);
          }

          terminal.write('\x1b[32m❯\x1b[0m ');
        }
      );
    } catch (error) {
      console.error('Failed to setup event listeners:', error);
    }
  }

  /**
   * Updates terminal theme when theme changes
   */
  function updateTerminalTheme(currentTheme: Theme | null) {
    if (!terminal || !isInitialized) return;

    try {
      terminal.options.theme = createTerminalTheme(currentTheme);
      terminal.options.fontFamily =
        currentTheme?.typography?.font_family_mono || 'Consolas, "Courier New", monospace';
      terminal.options.fontSize = parseInt(currentTheme?.typography?.font_size_sm || '14');
      terminal.refresh(0, terminal.rows - 1);
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
      terminal.write('$ ');
      currentCommand = '';
    }
  }

  // Reactive statements
  $: if ($theme && isInitialized) {
    updateTerminalTheme($theme);
  }

  // Lifecycle
  onMount(async () => {
    // Only load xterm in browser environment
    if (browser && terminalElement) {
      // Dynamically import xterm modules to avoid SSR issues
      const [terminalModule, fitModule, webLinksModule] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@xterm/addon-web-links')
      ]);

      Terminal = terminalModule.Terminal;
      FitAddon = fitModule.FitAddon;
      WebLinksAddon = webLinksModule.WebLinksAddon;

      await initializeTerminal($theme);
    }
  });

  onDestroy(() => {
    // Clean up event listeners (NASA JPL Rule 2: Bounded memory)
    if (cliOutputUnlisten) {
      cliOutputUnlisten();
      cliOutputUnlisten = null;
    }
    if (cliTerminatedUnlisten) {
      cliTerminatedUnlisten();
      cliTerminatedUnlisten = null;
    }

    // Dispose addons first
    if (fitAddon) {
      fitAddon.dispose();
      fitAddon = null;
    }
    if (webLinksAddon) {
      webLinksAddon.dispose();
      webLinksAddon = null;
    }

    // Dispose terminal
    if (terminal) {
      terminal.dispose();
      terminal = null;
    }

    // Clear command history
    commandHistory.clear();
    currentCommand = '';
    historyIndex = -1;
    isInitialized = false;
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
