<!--
  Example component demonstrating safe API invocation patterns
  Requirements: 6.1 - Safe API invocation with comprehensive error handling
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    PluginCommands,
    CliCommands,
    MissionCommands,
    setupEventListener,
    initializeApiMonitoring,
    getApiStatus,
    resetAllApiErrorTracking,
    type Plugin,
    type UnlistenFn
  } from '../tauri';
  import { showInfo, showError } from '../../stores/notifications';

  // Component state
  let plugins: Plugin[] = [];
  let loading = false;
  let apiMonitoringCleanup: (() => void) | null = null;
  let eventUnlisten: UnlistenFn | null = null;

  // Example: Safe plugin loading with error handling
  async function loadPlugins() {
    loading = true;
    try {
      // Use safe method that returns empty array on error
      plugins = await PluginCommands.safeGetLoadedPlugins({
        notificationTitle: 'Plugin Loading Failed',
        retryAttempts: 2
      });

      showInfo('Plugins Loaded', `Successfully loaded ${plugins.length} plugins`);
    } catch (error) {
      // This shouldn't happen with safe methods, but good practice
      console.error('Unexpected error loading plugins:', error);
      showError('Unexpected Error', 'Failed to load plugins');
    } finally {
      loading = false;
    }
  }

  // Example: Protected command execution with circuit breaker
  async function executeCliCommand(command: string) {
    try {
      await CliCommands.runCommand(command, {
        notificationTitle: 'Command Execution Failed',
        retryAttempts: 1,
        timeout: 10000
      });

      showInfo('Command Executed', `Successfully executed: ${command}`);
    } catch (error) {
      // Error is already handled by the safe API wrapper
      console.log('Command execution failed, but error was handled gracefully');
    }
  }

  // Example: Batch operations with error handling
  async function performBatchOperations() {
    loading = true;
    try {
      const results = await Promise.allSettled([
        PluginCommands.safeGetLoadedPlugins(),
        MissionCommands.safeGetMissionData(),
        CliCommands.getHistory({ showNotification: false })
      ]);

      const [pluginsResult] = results;

      if (pluginsResult.status === 'fulfilled') {
        plugins = pluginsResult.value;
      }

      showInfo('Batch Operations', 'Batch operations completed with graceful error handling');
    } catch (error) {
      showError('Batch Operations Failed', 'Some operations failed');
    } finally {
      loading = false;
    }
  }

  // Example: Event listener with comprehensive error handling
  async function setupPluginEventListener() {
    try {
      eventUnlisten = await setupEventListener<string[]>(
        'plugins-changed',
        (pluginIds) => {
          console.log('Plugins changed:', pluginIds);
          // Reload plugins when they change
          loadPlugins();
        },
        {
          showErrorNotifications: true,
          errorNotificationTitle: 'Plugin Event Error',
          maxErrorsBeforeDisable: 5,
          errorCooldownMs: 10000,
          enableLogging: true
        }
      );
    } catch (error) {
      showError('Event Setup Failed', 'Failed to setup plugin change listener');
    }
  }

  // Example: API health monitoring
  async function checkApiHealth() {
    try {
      const status = await getApiStatus();

      if (status.health.healthy) {
        showInfo(
          'API Health',
          `Backend is healthy (${status.health.latency.toFixed(0)}ms latency)`
        );
      } else {
        showError('API Health', `Backend is unhealthy: ${status.health.error}`);
      }

      // Log circuit breaker status
      console.log('Circuit Breaker Status:', Object.fromEntries(status.circuitBreakers));
      console.log('Event Error Stats:', Object.fromEntries(status.eventErrors));
    } catch (error) {
      showError('Health Check Failed', 'Unable to check API health');
    }
  }

  // Example: Recovery operations
  function resetApiErrorTracking() {
    resetAllApiErrorTracking();
    showInfo('API Reset', 'All API error tracking has been reset');
  }

  // Lifecycle management
  onMount(async () => {
    // Initialize API monitoring
    apiMonitoringCleanup = initializeApiMonitoring(30000); // 30 second intervals

    // Setup event listeners
    await setupPluginEventListener();

    // Load initial data
    await loadPlugins();
  });

  onDestroy(() => {
    // Cleanup resources
    if (apiMonitoringCleanup) {
      apiMonitoringCleanup();
    }

    if (eventUnlisten) {
      eventUnlisten();
    }
  });
</script>

<div class="safe-api-example">
  <h2>Safe API Usage Example</h2>

  <div class="controls">
    <button on:click={loadPlugins} disabled={loading}>
      {loading ? 'Loading...' : 'Load Plugins'}
    </button>

    <button on:click={() => executeCliCommand('help')}> Execute CLI Command </button>

    <button on:click={performBatchOperations} disabled={loading}> Batch Operations </button>

    <button on:click={checkApiHealth}> Check API Health </button>

    <button on:click={resetApiErrorTracking}> Reset Error Tracking </button>
  </div>

  <div class="plugin-list">
    <h3>Loaded Plugins ({plugins.length})</h3>
    {#each plugins as plugin (plugin.id)}
      <div class="plugin-item">
        <strong>{plugin.name}</strong>
        <span class="plugin-status" class:enabled={plugin.enabled}>
          {plugin.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>
    {/each}
  </div>
</div>

<style>
  .safe-api-example {
    padding: var(--layout-spacing_unit);
    background-color: var(--color-background_secondary);
    border-radius: var(--layout-border_radius);
  }

  .controls {
    display: flex;
    gap: var(--layout-spacing_unit);
    margin-bottom: var(--layout-spacing_unit);
    flex-wrap: wrap;
  }

  .controls button {
    padding: 0.5rem 1rem;
    background-color: var(--color-accent_blue);
    color: white;
    border: none;
    border-radius: var(--layout-border_radius);
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .controls button:hover:not(:disabled) {
    background-color: var(--color-accent_blue);
    opacity: 0.8;
  }

  .controls button:disabled {
    background-color: var(--color-text_disabled);
    cursor: not-allowed;
  }

  .plugin-list {
    margin-top: var(--layout-spacing_unit);
  }

  .plugin-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    margin-bottom: 0.25rem;
    background-color: var(--color-background_primary);
    border-radius: var(--layout-border_radius);
  }

  .plugin-status {
    padding: 0.25rem 0.5rem;
    border-radius: var(--layout-border_radius);
    font-size: 0.875rem;
    background-color: var(--color-accent_red);
    color: white;
  }

  .plugin-status.enabled {
    background-color: var(--color-accent_green);
  }

  h2,
  h3 {
    color: var(--color-text_primary);
    margin-bottom: var(--layout-spacing_unit);
  }
</style>
