<!--
  Plugin Container Component for the Modular C2 Frontend
  Dynamically loads and manages plugin components with lifecycle management
  Requirements: 1.2
-->
<script lang="ts">
  import { onDestroy, createEventDispatcher } from 'svelte';
  import { getPluginById } from '../../stores/plugins';
  import { showNotification } from '../../stores/notifications';
  import type { Plugin } from '../../types/plugin';

  // Import plugin components
  import MissionPlanner from '../../plugins/mission-planner/MissionPlanner.svelte';
  import SdrDashboard from '../../plugins/sdr-suite/SdrDashboard.svelte';
  import DroneConfigDashboard from '../../plugins/drone-config/DroneConfigDashboard.svelte';

  // Props
  export let pluginId: string;

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    load: { pluginId: string };
    error: { pluginId: string; error: Error };
    unload: { pluginId: string };
  }>();

  // Component state
  interface PluginContainerState {
    loading: boolean;
    loaded: boolean;
    error: Error | null;
    plugin: Plugin | null;
    component: typeof MissionPlanner | typeof SdrDashboard | typeof DroneConfigDashboard | null;
    retryCount: number;
  }

  let state: PluginContainerState = {
    loading: false,
    loaded: false,
    error: null,
    plugin: null,
    component: null,
    retryCount: 0
  };

  // Plugin component registry
  const PLUGIN_COMPONENTS: Record<
    string,
    typeof MissionPlanner | typeof SdrDashboard | typeof DroneConfigDashboard
  > = {
    'mission-planner': MissionPlanner,
    'sdr-suite': SdrDashboard,
    'drone-config': DroneConfigDashboard
  };

  // Maximum retry attempts for plugin loading
  const MAX_RETRY_ATTEMPTS = 3;
  const RETRY_DELAY_MS = 1000;

  /**
   * NASA JPL Rule 4: Split function - Validate plugin for loading
   */
  function validatePlugin(id: string): Plugin {
    const plugin = getPluginById(id);
    if (!plugin) {
      throw new Error(`Plugin not found: ${id}`);
    }

    if (!plugin.enabled) {
      throw new Error(`Plugin is disabled: ${plugin.name}`);
    }

    const PluginComponent = PLUGIN_COMPONENTS[id];
    if (!PluginComponent) {
      throw new Error(`Plugin component not registered: ${id}`);
    }

    return plugin;
  }

  /**
   * NASA JPL Rule 4: Split function - Handle successful plugin load
   */
  function handleLoadSuccess(id: string, plugin: Plugin): void {
    const PluginComponent = PLUGIN_COMPONENTS[id];

    state = {
      ...state,
      loading: false,
      loaded: true,
      error: null,
      plugin,
      component: PluginComponent,
      retryCount: 0
    };

    console.log(`Plugin loaded successfully: ${plugin.name}`);
    dispatch('load', { pluginId: id });

    showNotification({
      type: 'success',
      message: 'Plugin Loaded',
      details: `${plugin.name} is now active`
    });
  }

  /**
   * NASA JPL Rule 4: Split function - Handle plugin load error
   */
  function handleLoadError(id: string, error: unknown): Error {
    const pluginError = error instanceof Error ? error : new Error('Unknown plugin loading error');

    console.error(`Failed to load plugin ${id}:`, pluginError);

    state = {
      ...state,
      loading: false,
      loaded: false,
      error: pluginError,
      component: null
    };

    dispatch('error', { pluginId: id, error: pluginError });

    showNotification({
      type: 'error',
      message: 'Plugin Load Failed',
      details: `Failed to load ${id}: ${pluginError.message}`
    });

    return pluginError;
  }

  /**
   * Load plugin component based on plugin ID
   * NASA JPL Rule 4: Function refactored to be ≤60 lines
   * @param id - Plugin ID to load
   */
  async function loadPlugin(id: string): Promise<void> {
    console.log(`Loading plugin: ${id}`);

    // Reset state
    state = {
      ...state,
      loading: true,
      loaded: false,
      error: null,
      component: null
    };

    try {
      // Validate plugin can be loaded
      const plugin = validatePlugin(id);

      // Simulate async loading delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Handle successful load
      handleLoadSuccess(id, plugin);
    } catch (error) {
      // Handle error and re-throw
      throw handleLoadError(id, error);
    }
  }

  /**
   * Unload current plugin
   */
  function unloadPlugin(): void {
    if (state.plugin) {
      console.log(`Unloading plugin: ${state.plugin.id}`);

      // Dispatch unload event
      dispatch('unload', { pluginId: state.plugin.id });

      // Reset state
      state = {
        loading: false,
        loaded: false,
        error: null,
        plugin: null,
        component: null,
        retryCount: 0
      };
    }
  }

  /**
   * Retry loading plugin with exponential backoff
   */
  async function retryLoadPlugin(): Promise<void> {
    if (state.retryCount >= MAX_RETRY_ATTEMPTS) {
      console.error(`Maximum retry attempts reached for plugin: ${pluginId}`);
      showNotification({
        type: 'error',
        message: 'Plugin Load Failed',
        details: `Failed to load ${pluginId} after ${MAX_RETRY_ATTEMPTS} attempts`
      });
      return;
    }

    state.retryCount++;
    const delay = RETRY_DELAY_MS * Math.pow(2, state.retryCount - 1);

    console.log(
      `Retrying plugin load (attempt ${state.retryCount}/${MAX_RETRY_ATTEMPTS}) in ${delay}ms...`
    );

    showNotification({
      type: 'info',
      message: 'Retrying Plugin Load',
      details: `Attempt ${state.retryCount} of ${MAX_RETRY_ATTEMPTS}`
    });

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      await loadPlugin(pluginId);
    } catch (error) {
      console.error(`Retry attempt ${state.retryCount} failed:`, error);
      // Error handling is already done in loadPlugin
    }
  }

  /**
   * Handle plugin error recovery
   */
  function handleErrorRecovery(): void {
    console.log('Attempting plugin error recovery...');
    retryLoadPlugin();
  }

  // Reactive statement to load plugin when pluginId changes
  $: if (pluginId) {
    // Unload previous plugin if different
    if (state.plugin && state.plugin.id !== pluginId) {
      unloadPlugin();
    }

    // Load new plugin if not already loaded
    if (!state.loaded || (state.plugin && state.plugin.id !== pluginId)) {
      loadPlugin(pluginId).catch((error) => {
        console.error('Plugin loading failed:', error);
        // Error handling is already done in loadPlugin
      });
    }
  }

  // Cleanup on component destroy
  onDestroy(() => {
    unloadPlugin();
  });
</script>

<div class="plugin-container" data-testid="plugin-container" data-plugin-id={pluginId}>
  {#if state.loading}
    <!-- Loading State -->
    <div class="plugin-loading" data-testid="plugin-loading">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <h3 class="loading-title">Loading Plugin</h3>
        <p class="loading-message">
          {#if state.plugin}
            Loading {state.plugin.name}...
          {:else}
            Initializing plugin system...
          {/if}
        </p>
        {#if state.retryCount > 0}
          <p class="retry-info">
            Retry attempt {state.retryCount} of {MAX_RETRY_ATTEMPTS}
          </p>
        {/if}
      </div>
    </div>
  {:else if state.error}
    <!-- Error State -->
    <div class="plugin-error" data-testid="plugin-error">
      <div class="error-content">
        <div class="error-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
            />
          </svg>
        </div>

        <h3 class="error-title">Plugin Load Error</h3>
        <p class="error-message">{state.error.message}</p>

        <div class="error-details">
          <p><strong>Plugin ID:</strong> {pluginId}</p>
          {#if state.plugin}
            <p><strong>Plugin Name:</strong> {state.plugin.name}</p>
          {/if}
          <p><strong>Retry Count:</strong> {state.retryCount}/{MAX_RETRY_ATTEMPTS}</p>
        </div>

        <div class="error-actions">
          {#if state.retryCount < MAX_RETRY_ATTEMPTS}
            <button class="retry-button" on:click={handleErrorRecovery} data-testid="retry-button">
              <svg class="retry-icon" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
                />
              </svg>
              Retry Loading
            </button>
          {/if}

          <button
            class="back-button"
            on:click={() => window.history.back()}
            data-testid="back-button"
          >
            <svg class="back-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
            Go Back
          </button>
        </div>
      </div>
    </div>
  {:else if state.loaded && state.component}
    <!-- Plugin Component -->
    <div class="plugin-content" data-testid="plugin-content">
      <svelte:component this={state.component} />
    </div>
  {:else}
    <!-- Empty State -->
    <div class="plugin-empty" data-testid="plugin-empty">
      <div class="empty-content">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
        </div>
        <h3 class="empty-title">No Plugin Selected</h3>
        <p class="empty-message">Select a plugin from the dashboard to get started.</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .plugin-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--color-background_primary);
    overflow: hidden;
  }

  /* Loading State */
  .plugin-loading {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: calc(var(--layout-spacing_unit) * 4);
  }

  .loading-content {
    text-align: center;
    max-width: 400px;
  }

  .loading-spinner {
    width: 48px;
    height: 48px;
    border: 3px solid var(--color-text_disabled);
    border-top: 3px solid var(--color-accent_blue);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto calc(var(--layout-spacing_unit) * 2);
  }

  .loading-title {
    font-size: var(--typography-font_size_lg);
    color: var(--color-text_primary);
    margin-bottom: var(--layout-spacing_unit);
    font-weight: 600;
  }

  .loading-message {
    color: var(--color-text_secondary);
    margin-bottom: var(--layout-spacing_unit);
    line-height: 1.5;
  }

  .retry-info {
    color: var(--color-accent_yellow);
    font-size: var(--typography-font_size_sm);
    font-weight: 500;
    margin: 0;
  }

  /* Error State */
  .plugin-error {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: calc(var(--layout-spacing_unit) * 4);
  }

  .error-content {
    text-align: center;
    max-width: 500px;
    background-color: var(--color-background_secondary);
    padding: calc(var(--layout-spacing_unit) * 3);
    border-radius: var(--layout-border_radius);
    border-left: 4px solid var(--color-accent_red);
  }

  .error-icon {
    width: 48px;
    height: 48px;
    color: var(--color-accent_red);
    margin: 0 auto calc(var(--layout-spacing_unit) * 2);
  }

  .error-title {
    font-size: var(--typography-font_size_lg);
    color: var(--color-accent_red);
    margin-bottom: var(--layout-spacing_unit);
    font-weight: 600;
  }

  .error-message {
    color: var(--color-text_primary);
    margin-bottom: calc(var(--layout-spacing_unit) * 2);
    padding: var(--layout-spacing_unit);
    background-color: var(--color-background_tertiary);
    border-radius: var(--layout-border_radius);
    font-family: var(--typography-font_family_mono);
    font-size: var(--typography-font_size_sm);
    word-break: break-word;
  }

  .error-details {
    text-align: left;
    margin-bottom: calc(var(--layout-spacing_unit) * 2);
    padding: var(--layout-spacing_unit);
    background-color: var(--color-background_primary);
    border-radius: var(--layout-border_radius);
  }

  .error-details p {
    color: var(--color-text_secondary);
    font-size: var(--typography-font_size_sm);
    margin-bottom: calc(var(--layout-spacing_unit) / 2);
    line-height: 1.4;
  }

  .error-details p:last-child {
    margin-bottom: 0;
  }

  .error-details strong {
    color: var(--color-text_primary);
  }

  .error-actions {
    display: flex;
    gap: var(--layout-spacing_unit);
    justify-content: center;
    flex-wrap: wrap;
  }

  .retry-button,
  .back-button {
    display: flex;
    align-items: center;
    gap: calc(var(--layout-spacing_unit) / 2);
    padding: calc(var(--layout-spacing_unit) * 1.5) calc(var(--layout-spacing_unit) * 2);
    border-radius: var(--layout-border_radius);
    cursor: pointer;
    font-family: inherit;
    font-size: var(--typography-font_size_sm);
    font-weight: 500;
    transition: all var(--animation-transition_duration);
    border: none;
  }

  .retry-button {
    background-color: var(--color-accent_blue);
    color: white;
  }

  .retry-button:hover {
    background-color: var(--color-accent_blue);
    filter: brightness(1.1);
    transform: scale(var(--animation-hover_scale));
  }

  .back-button {
    background-color: var(--color-background_tertiary);
    color: var(--color-text_secondary);
    border: var(--layout-border_width) solid var(--color-text_disabled);
  }

  .back-button:hover {
    background-color: var(--color-background_primary);
    color: var(--color-text_primary);
    border-color: var(--color-text_secondary);
    transform: scale(var(--animation-hover_scale));
  }

  .retry-icon,
  .back-icon {
    width: 16px;
    height: 16px;
  }

  /* Plugin Content */
  .plugin-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Empty State */
  .plugin-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: calc(var(--layout-spacing_unit) * 4);
  }

  .empty-content {
    text-align: center;
    max-width: 400px;
  }

  .empty-icon {
    width: 64px;
    height: 64px;
    color: var(--color-text_disabled);
    margin: 0 auto calc(var(--layout-spacing_unit) * 2);
  }

  .empty-title {
    font-size: var(--typography-font_size_lg);
    color: var(--color-text_secondary);
    margin-bottom: var(--layout-spacing_unit);
    font-weight: 600;
  }

  .empty-message {
    color: var(--color-text_disabled);
    line-height: 1.5;
    margin: 0;
  }

  /* Animations */
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .plugin-loading,
    .plugin-error,
    .plugin-empty {
      padding: calc(var(--layout-spacing_unit) * 2);
    }

    .error-content {
      padding: calc(var(--layout-spacing_unit) * 2);
    }

    .error-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .retry-button,
    .back-button {
      justify-content: center;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .loading-spinner {
      animation: none;
    }

    .retry-button:hover,
    .back-button:hover {
      transform: none;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .error-content {
      border-width: 2px;
    }

    .retry-button,
    .back-button {
      border: 2px solid currentColor;
    }
  }
</style>
