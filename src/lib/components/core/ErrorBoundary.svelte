<!--
  Error Boundary Component for the Modular C2 Frontend
  Provides error containment and recovery mechanisms
  Requirements: 1.3
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { showNotification } from '../../stores/notifications';

  // Props
  export let fallbackMessage: string = 'Something went wrong. Please try refreshing the page.';
  export let showReloadButton: boolean = true;
  export let logErrors: boolean = true;

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    error: { error: Error; errorInfo?: string };
    recovery: void;
  }>();

  // State
  let hasError = false;
  let error: Error | null = null;
  let errorInfo: string | null = null;
  let errorId: string | null = null;

  // Error handling function
  function handleError(errorEvent: Error, info?: string) {
    hasError = true;
    error = errorEvent;
    errorInfo = info || null;
    errorId = `error-${Date.now()}`;

    // Log error for debugging
    if (logErrors) {
      console.error('ErrorBoundary caught error:', errorEvent);
      if (info) {
        console.error('Error info:', info);
      }
      console.error('Stack trace:', errorEvent.stack);
    }

    // Show notification
    showNotification({
      type: 'error',
      message: 'Application Error',
      details: errorEvent.message,
      timeout: 0 // Don't auto-dismiss error notifications
    });

    // Dispatch error event
    dispatch('error', { error: errorEvent, errorInfo: info });
  }

  // Recovery function
  function handleRecovery() {
    hasError = false;
    error = null;
    errorInfo = null;
    errorId = null;

    dispatch('recovery');
  }

  // Reload page function
  function reloadPage() {
    window.location.reload();
  }

  // Set up global error handlers
  onMount(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        'Promise rejection not caught by application code'
      );
    };

    // Handle global JavaScript errors
    const handleGlobalError = (event: ErrorEvent) => {
      handleError(
        new Error(`Global Error: ${event.message}`),
        `File: ${event.filename}, Line: ${event.lineno}, Column: ${event.colno}`
      );
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  });
</script>

{#if hasError}
  <div class="error-boundary" data-testid="error-boundary" data-error-id={errorId}>
    <div class="error-container">
      <div class="error-icon">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
          />
        </svg>
      </div>

      <div class="error-content">
        <h2 class="error-title">Application Error</h2>
        <p class="error-message">{fallbackMessage}</p>

        {#if error}
          <details class="error-details">
            <summary class="error-summary">Technical Details</summary>
            <div class="error-technical">
              <div class="error-section">
                <h4>Error Message:</h4>
                <code class="error-code">{error.message}</code>
              </div>

              {#if errorInfo}
                <div class="error-section">
                  <h4>Error Context:</h4>
                  <code class="error-code">{errorInfo}</code>
                </div>
              {/if}

              {#if error.stack}
                <div class="error-section">
                  <h4>Stack Trace:</h4>
                  <pre class="error-stack">{error.stack}</pre>
                </div>
              {/if}
            </div>
          </details>
        {/if}

        <div class="error-actions">
          <button
            class="recovery-button primary"
            on:click={handleRecovery}
            data-testid="recovery-button"
          >
            Try Again
          </button>

          {#if showReloadButton}
            <button
              class="recovery-button secondary"
              on:click={reloadPage}
              data-testid="reload-button"
            >
              Reload Page
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{:else}
  <slot />
{/if}

<style>
  .error-boundary {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--color-background_primary);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: calc(var(--layout-spacing_unit) * 2);
  }

  .error-container {
    max-width: 600px;
    width: 100%;
    background-color: var(--color-background_secondary);
    border-radius: var(--layout-border_radius);
    padding: calc(var(--layout-spacing_unit) * 3);
    border: var(--layout-border_width) solid var(--color-accent_red);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .error-icon {
    width: 48px;
    height: 48px;
    color: var(--color-accent_red);
    margin: 0 auto calc(var(--layout-spacing_unit) * 2);
    display: block;
  }

  .error-content {
    text-align: center;
  }

  .error-title {
    font-size: var(--typography-font_size_lg);
    color: var(--color-accent_red);
    margin-bottom: var(--layout-spacing_unit);
    font-weight: 600;
  }

  .error-message {
    color: var(--color-text_secondary);
    margin-bottom: calc(var(--layout-spacing_unit) * 2);
    line-height: 1.5;
  }

  .error-details {
    text-align: left;
    margin-bottom: calc(var(--layout-spacing_unit) * 2);
    background-color: var(--color-background_tertiary);
    border-radius: var(--layout-border_radius);
    overflow: hidden;
  }

  .error-summary {
    padding: var(--layout-spacing_unit) calc(var(--layout-spacing_unit) * 1.5);
    background-color: var(--color-background_tertiary);
    color: var(--color-text_primary);
    cursor: pointer;
    font-weight: 500;
    border-bottom: var(--layout-border_width) solid var(--color-background_primary);
  }

  .error-summary:hover {
    background-color: var(--color-background_primary);
  }

  .error-technical {
    padding: calc(var(--layout-spacing_unit) * 1.5);
    max-height: 300px;
    overflow-y: auto;
  }

  .error-section {
    margin-bottom: calc(var(--layout-spacing_unit) * 1.5);
  }

  .error-section:last-child {
    margin-bottom: 0;
  }

  .error-section h4 {
    color: var(--color-text_primary);
    font-size: var(--typography-font_size_sm);
    margin-bottom: calc(var(--layout-spacing_unit) / 2);
    font-weight: 600;
  }

  .error-code {
    display: block;
    background-color: var(--color-background_primary);
    color: var(--color-accent_red);
    padding: calc(var(--layout-spacing_unit) / 2) var(--layout-spacing_unit);
    border-radius: var(--layout-border_radius);
    font-family: var(--typography-font_family_mono);
    font-size: var(--typography-font_size_sm);
    word-break: break-word;
  }

  .error-stack {
    background-color: var(--color-background_primary);
    color: var(--color-text_secondary);
    padding: var(--layout-spacing_unit);
    border-radius: var(--layout-border_radius);
    font-family: var(--typography-font_family_mono);
    font-size: var(--typography-font_size_sm);
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 200px;
    overflow-y: auto;
  }

  .error-actions {
    display: flex;
    gap: var(--layout-spacing_unit);
    justify-content: center;
    flex-wrap: wrap;
  }

  .recovery-button {
    padding: calc(var(--layout-spacing_unit) * 1.5) calc(var(--layout-spacing_unit) * 2);
    border-radius: var(--layout-border_radius);
    cursor: pointer;
    font-family: inherit;
    font-size: var(--typography-font_size_base);
    font-weight: 500;
    transition: all var(--animation-transition_duration);
    border: var(--layout-border_width) solid transparent;
  }

  .recovery-button:hover {
    transform: scale(var(--animation-hover_scale));
  }

  .recovery-button:active {
    transform: scale(var(--animation-button_press_scale));
  }

  .recovery-button.primary {
    background-color: var(--color-accent_red);
    color: white;
  }

  .recovery-button.primary:hover {
    background-color: var(--color-accent_red);
    filter: brightness(1.1);
  }

  .recovery-button.secondary {
    background-color: transparent;
    color: var(--color-text_secondary);
    border-color: var(--color-text_disabled);
  }

  .recovery-button.secondary:hover {
    border-color: var(--color-text_secondary);
    color: var(--color-text_primary);
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .error-boundary {
      padding: var(--layout-spacing_unit);
    }

    .error-container {
      padding: calc(var(--layout-spacing_unit) * 2);
    }

    .error-actions {
      flex-direction: column;
    }

    .recovery-button {
      width: 100%;
    }
  }
</style>
