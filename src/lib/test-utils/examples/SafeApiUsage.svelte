<!--
  Safe API Usage Example Component
  Demonstrates proper Tauri API usage patterns for testing
-->

<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { safeTauriInvoke } from '$lib/utils/tauri';
  import { showNotification } from '$lib/stores/notifications';

  export let command: string = '';
  export let args: Record<string, unknown> = {};
  export let autoLoad: boolean = true;

  const dispatch = createEventDispatcher<{
    loaded: { data: unknown };
    error: { error: string };
    success: { result: unknown };
  }>();

  let loading = false;
  let error: string | null = null;
  let data: unknown = null;

  async function executeCommand() {
    if (!command) {
      error = 'No command specified';
      return;
    }

    try {
      loading = true;
      error = null;

      const result = await safeTauriInvoke(command, args);
      
      if (result !== null) {
        data = result;
        dispatch('loaded', { data: result });
        dispatch('success', { result });
        
        showNotification({
          type: 'success',
          message: `Command ${command} executed successfully`
        });
      } else {
        throw new Error('Command returned null result');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      error = errorMessage;
      dispatch('error', { error: errorMessage });
      
      showNotification({
        type: 'error',
        message: `Command ${command} failed: ${errorMessage}`
      });
    } finally {
      loading = false;
    }
  }

  function handleRetry() {
    executeCommand();
  }

  function handleClear() {
    data = null;
    error = null;
  }

  onMount(() => {
    if (autoLoad && command) {
      executeCommand();
    }
  });
</script>

<div class="safe-api-usage" data-testid="safe-api-usage">
  <div class="header">
    <h3>Safe API Usage Example</h3>
    <div class="command-info">
      <span class="command-name" data-testid="command-name">{command || 'No command'}</span>
      {#if Object.keys(args).length > 0}
        <span class="args-info" data-testid="args-info">
          with {Object.keys(args).length} argument{Object.keys(args).length === 1 ? '' : 's'}
        </span>
      {/if}
    </div>
  </div>

  <div class="content">
    {#if loading}
      <div class="loading-state" data-testid="loading">
        <div class="spinner"></div>
        <span>Executing command...</span>
      </div>
    {:else if error}
      <div class="error-state" data-testid="error" role="alert">
        <div class="error-icon">⚠️</div>
        <div class="error-content">
          <h4>Command Failed</h4>
          <p class="error-message">{error}</p>
          <button class="retry-button" on:click={handleRetry} data-testid="retry-button">
            Retry
          </button>
        </div>
      </div>
    {:else if data}
      <div class="success-state" data-testid="success">
        <div class="success-icon">✅</div>
        <div class="success-content">
          <h4>Command Successful</h4>
          <pre class="data-display" data-testid="data-display">{JSON.stringify(data, null, 2)}</pre>
        </div>
      </div>
    {:else}
      <div class="empty-state" data-testid="empty">
        <div class="empty-icon">📭</div>
        <p>No data available</p>
        {#if command}
          <button class="execute-button" on:click={executeCommand} data-testid="execute-button">
            Execute Command
          </button>
        {/if}
      </div>
    {/if}
  </div>

  <div class="actions">
    <button 
      class="action-button secondary" 
      on:click={handleClear} 
      disabled={loading}
      data-testid="clear-button"
    >
      Clear
    </button>
    
    <button 
      class="action-button primary" 
      on:click={executeCommand} 
      disabled={loading || !command}
      data-testid="execute-button-main"
    >
      {loading ? 'Executing...' : 'Execute'}
    </button>
  </div>
</div>

<style>
  .safe-api-usage {
    background-color: var(--color-background_secondary, #111111);
    border: 1px solid var(--color-background_tertiary, #222222);
    border-radius: var(--layout-border_radius, 4px);
    padding: var(--layout-spacing_unit, 8px);
    color: var(--color-text_primary, #ffffff);
    font-family: var(--typography-font_family_sans, Arial, sans-serif);
  }

  .header {
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--color-background_tertiary, #222222);
    padding-bottom: 0.5rem;
  }

  .header h3 {
    margin: 0 0 0.5rem 0;
    color: var(--color-text_primary, #ffffff);
  }

  .command-info {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    font-size: 0.875rem;
  }

  .command-name {
    background-color: var(--color-accent_blue, #0066ff);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: var(--layout-border_radius, 4px);
    font-family: var(--typography-font_family_mono, monospace);
  }

  .args-info {
    color: var(--color-text_secondary, #cccccc);
  }

  .content {
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    color: var(--color-text_secondary, #cccccc);
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-background_tertiary, #222222);
    border-top: 3px solid var(--color-accent_blue, #0066ff);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-state {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    background-color: rgba(255, 0, 0, 0.1);
    border: 1px solid var(--color-accent_red, #ff0000);
    border-radius: var(--layout-border_radius, 4px);
    padding: 1rem;
    width: 100%;
  }

  .error-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .error-content h4 {
    margin: 0 0 0.5rem 0;
    color: var(--color-accent_red, #ff0000);
  }

  .error-message {
    margin: 0 0 1rem 0;
    color: var(--color-text_primary, #ffffff);
  }

  .retry-button {
    background-color: var(--color-accent_red, #ff0000);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: var(--layout-border_radius, 4px);
    cursor: pointer;
    font-size: 0.875rem;
  }

  .retry-button:hover {
    background-color: rgba(255, 0, 0, 0.8);
  }

  .success-state {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    background-color: rgba(0, 255, 0, 0.1);
    border: 1px solid var(--color-accent_green, #00ff00);
    border-radius: var(--layout-border_radius, 4px);
    padding: 1rem;
    width: 100%;
  }

  .success-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .success-content h4 {
    margin: 0 0 0.5rem 0;
    color: var(--color-accent_green, #00ff00);
  }

  .data-display {
    background-color: var(--color-background_primary, #000000);
    border: 1px solid var(--color-background_tertiary, #222222);
    border-radius: var(--layout-border_radius, 4px);
    padding: 0.5rem;
    font-family: var(--typography-font_family_mono, monospace);
    font-size: 0.75rem;
    color: var(--color-text_primary, #ffffff);
    overflow-x: auto;
    max-width: 100%;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    color: var(--color-text_disabled, #666666);
  }

  .empty-icon {
    font-size: 2rem;
  }

  .execute-button {
    background-color: var(--color-accent_blue, #0066ff);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: var(--layout-border_radius, 4px);
    cursor: pointer;
  }

  .execute-button:hover {
    background-color: rgba(0, 102, 255, 0.8);
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    border-top: 1px solid var(--color-background_tertiary, #222222);
    padding-top: 1rem;
  }

  .action-button {
    padding: 0.5rem 1rem;
    border-radius: var(--layout-border_radius, 4px);
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background-color 0.2s;
  }

  .action-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-button.primary {
    background-color: var(--color-accent_blue, #0066ff);
    color: white;
  }

  .action-button.primary:hover:not(:disabled) {
    background-color: rgba(0, 102, 255, 0.8);
  }

  .action-button.secondary {
    background-color: var(--color-background_tertiary, #222222);
    color: var(--color-text_primary, #ffffff);
    border: 1px solid var(--color-background_tertiary, #222222);
  }

  .action-button.secondary:hover:not(:disabled) {
    background-color: var(--color-background_primary, #000000);
  }
</style>