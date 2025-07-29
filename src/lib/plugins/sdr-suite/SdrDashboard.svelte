<!--
  SDR Suite Plugin Dashboard Component
  Main component for the SDR Suite plugin with spectrum and waterfall views
  Mobile-first responsive design with touch optimization
  Requirements: 5.1, 5.4, 4.1
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { isMobile, isTablet, currentBreakpoint } from '$lib/utils/responsive';
  import { sdrStore, currentFFTData, sdrState, sdrConnectionStatus } from '$lib/stores/sdr';
  import SpectrumVisualizer from './SpectrumVisualizer.svelte';
  import Waterfall from './Waterfall.svelte';
  import SdrControls from './SdrControls.svelte';

  // ===== STATE =====
  let showControls = true;
  let isInitialized = false;

  // Responsive state
  $: isMobileDevice = $isMobile;
  $: isTabletDevice = $isTablet;
  $: breakpoint = $currentBreakpoint;

  // ===== REACTIVE STATEMENTS =====
  $: fftData = $currentFFTData;
  $: connectionStatus = $sdrConnectionStatus;
  $: currentState = $sdrState;

  // ===== FUNCTIONS =====

  /**
   * Toggle controls panel visibility
   */
  function toggleControls(): void {
    showControls = !showControls;
  }

  /**
   * Clear any errors
   */
  function clearError(): void {
    sdrStore.clearError();
  }

  // ===== LIFECYCLE =====
  onMount(async () => {
    try {
      console.log('Initializing SDR Suite plugin...');

      // Initialize the SDR store and event listeners
      await sdrStore.initialize();
      isInitialized = true;

      // Auto-hide controls on mobile for more screen space
      if (isMobileDevice) {
        showControls = false;
      }

      console.log('SDR Suite plugin loaded and initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SDR Suite plugin:', error);
    }
  });

  onDestroy(() => {
    // Cleanup SDR store event listeners
    sdrStore.cleanup();
    console.log('SDR Suite plugin cleanup completed');
  });
</script>

<div
  class="sdr-dashboard"
  class:mobile={isMobileDevice}
  class:tablet={isTabletDevice}
  class:controls-hidden={!showControls}
  data-testid="sdr-dashboard"
>
  <div class="sdr-header">
    <div class="sdr-title-section">
      <h1 class="sdr-title">SDR Suite</h1>
      <div class="sdr-status">
        <div
          class="status-indicator {connectionStatus.connected ? 'connected' : 'disconnected'}"
        ></div>
        <span class="status-text">
          {#if connectionStatus.connecting}
            Connecting...
          {:else if connectionStatus.connected}
            Connected
          {:else}
            Disconnected
          {/if}
        </span>
      </div>
    </div>

    <div class="sdr-info">
      <div class="frequency-display">
        <span class="frequency-label">Center Frequency:</span>
        <span class="frequency-value"
          >{(currentState.settings.centerFrequency / 1000000).toFixed(3)} MHz</span
        >
      </div>
      <div class="sample-rate-display">
        <span class="sample-rate-label">Sample Rate:</span>
        <span class="sample-rate-value"
          >{(currentState.settings.sampleRate / 1000000).toFixed(3)} MS/s</span
        >
      </div>
      <button
        class="controls-toggle"
        on:click={toggleControls}
        data-testid="controls-toggle"
        title={showControls ? 'Hide Controls' : 'Show Controls'}
      >
        {showControls ? '◀' : '▶'} Controls
      </button>
    </div>
  </div>

  {#if connectionStatus.error}
    <div class="error-banner" data-testid="sdr-error">
      <div class="error-icon">⚠️</div>
      <span class="error-message">{connectionStatus.error}</span>
      <button class="error-dismiss" on:click={clearError} title="Dismiss error">✕</button>
    </div>
  {/if}

  {#if !isInitialized}
    <div class="loading-banner" data-testid="sdr-loading">
      <div class="loading-spinner"></div>
      <span class="loading-message">Initializing SDR Suite...</span>
    </div>
  {/if}

  <div class="sdr-content">
    <div class="visualization-area">
      <div class="spectrum-container">
        <SpectrumVisualizer data={fftData} />
      </div>
      <div class="waterfall-container">
        <Waterfall data={fftData} />
      </div>
    </div>

    {#if showControls}
      <div class="controls-panel" data-testid="controls-panel">
        <SdrControls />
      </div>
    {/if}
  </div>
</div>

<style>
  .sdr-dashboard {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background-color: var(--color-background_primary);
    color: var(--color-text_primary);
  }

  .sdr-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--responsive-mobile-panel_padding, 12px);
    background-color: var(--color-background_secondary);
    border-bottom: var(--layout-border_width) solid var(--component-sdr-grid_line_color);
    flex-wrap: wrap;
    gap: var(--layout-spacing_unit);
  }

  .sdr-title-section {
    display: flex;
    align-items: center;
    gap: calc(var(--layout-spacing_unit) * 2);
  }

  .sdr-title {
    font-size: var(--typography-font_size_lg);
    font-weight: 600;
    margin: 0;
    color: var(--color-text_primary);
  }

  .sdr-status {
    display: flex;
    align-items: center;
    gap: calc(var(--layout-spacing_unit) / 2);
  }

  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    transition: background-color var(--animations-transition_duration)
      var(--animations-easing_function);
  }

  .status-indicator.connected {
    background-color: var(--color-accent_green);
  }

  .status-indicator.disconnected {
    background-color: var(--color-accent_red);
  }

  .status-text {
    font-size: var(--typography-font_size_sm);
    color: var(--color-text_secondary);
    font-family: var(--typography-font_family_mono);
  }

  .sdr-info {
    display: flex;
    gap: var(--layout-spacing_unit);
    align-items: center;
    flex-wrap: wrap;
  }

  .frequency-display,
  .sample-rate-display {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .controls-toggle {
    padding: var(--responsive-mobile-button-mobile_padding, 12px 16px);
    background-color: var(--color-background_tertiary);
    border: var(--layout-border_width) solid var(--component-sdr-grid_line_color);
    border-radius: var(--layout-border_radius);
    color: var(--color-text_primary);
    font-size: var(--responsive-mobile-font_size_sm, 14px);
    cursor: pointer;
    transition: all var(--animations-mobile_transition_duration, 150ms);
    min-height: var(--responsive-mobile-touch_target_min, 44px);
    white-space: nowrap;
  }

  .controls-toggle:hover {
    background-color: var(--color-background_primary);
    border-color: var(--color-accent_blue);
  }

  .controls-toggle:focus {
    outline: 2px solid var(--color-accent_blue);
    outline-offset: 2px;
  }

  .frequency-label,
  .sample-rate-label {
    font-size: var(--typography-font_size_sm);
    color: var(--component-sdr-axis_label_color);
    margin-bottom: calc(var(--layout-spacing_unit) / 4);
  }

  .frequency-value,
  .sample-rate-value {
    font-size: var(--typography-font_size_base);
    font-family: var(--typography-font_family_mono);
    color: var(--color-accent_blue);
    font-weight: 600;
  }

  .error-banner {
    display: flex;
    align-items: center;
    gap: var(--layout-spacing_unit);
    padding: var(--layout-spacing_unit);
    background-color: var(--color-accent_red);
    color: white;
    border-bottom: var(--layout-border_width) solid var(--component-sdr-grid_line_color);
  }

  .error-icon {
    font-size: var(--typography-font_size_base);
  }

  .error-message {
    font-size: var(--typography-font_size_sm);
    font-weight: 500;
    flex: 1;
  }

  .error-dismiss {
    background: none;
    border: none;
    color: white;
    font-size: var(--typography-font_size_base);
    cursor: pointer;
    padding: calc(var(--layout-spacing_unit) / 4);
    border-radius: var(--layout-border_radius);
    opacity: 0.8;
    transition: opacity var(--animations-transition_duration) var(--animations-easing_function);
  }

  .error-dismiss:hover {
    opacity: 1;
    background-color: rgba(255, 255, 255, 0.1);
  }

  .loading-banner {
    display: flex;
    align-items: center;
    gap: var(--layout-spacing_unit);
    padding: var(--layout-spacing_unit);
    background-color: var(--color-background_tertiary);
    color: var(--color-text_secondary);
    border-bottom: var(--layout-border_width) solid var(--component-sdr-grid_line_color);
  }

  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--color-text_disabled);
    border-top: 2px solid var(--color-accent_blue);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .loading-message {
    font-size: var(--typography-font_size_sm);
    font-weight: 500;
  }

  .sdr-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--layout-spacing_unit);
    padding: var(--responsive-mobile-panel_padding, 12px);
    overflow: hidden;
  }

  .visualization-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--layout-spacing_unit);
    overflow: hidden;
  }

  .spectrum-container {
    height: 35%;
    min-height: 150px;
  }

  .waterfall-container {
    flex: 1;
    min-height: 150px;
  }

  .controls-panel {
    width: 100%;
    max-height: 250px;
    overflow-y: auto;
    order: -1;
    background-color: var(--color-background_secondary);
    border-radius: var(--layout-border_radius);
    padding: var(--responsive-mobile-panel_padding, 12px);
  }

  /* Tablet responsive design */
  @media (min-width: 768px) {
    .sdr-header {
      padding: var(--responsive-tablet-panel_padding, 16px);
      flex-wrap: nowrap;
    }

    .sdr-info {
      gap: calc(var(--layout-spacing_unit) * 2);
      flex-wrap: nowrap;
    }

    .sdr-content {
      flex-direction: row;
      padding: var(--responsive-tablet-panel_padding, 16px);
    }

    .visualization-area {
      flex: 1;
    }

    .controls-panel {
      width: var(--responsive-tablet-sdr-tablet_controls_width, 300px);
      max-height: none;
      order: 0;
    }

    .spectrum-container {
      height: 40%;
      min-height: 180px;
    }

    .waterfall-container {
      min-height: 180px;
    }

    .controls-toggle {
      padding: var(--responsive-tablet-button-tablet_padding, 10px 14px);
      font-size: var(--responsive-tablet-font_size_sm, 13px);
      min-height: var(--responsive-tablet-touch_target_min, 40px);
    }
  }

  /* Desktop responsive design */
  @media (min-width: 1024px) {
    .sdr-header {
      padding: var(--responsive-desktop-panel_padding, 20px);
    }

    .sdr-info {
      gap: calc(var(--layout-spacing_unit) * 3);
    }

    .sdr-content {
      padding: var(--responsive-desktop-panel_padding, 20px);
    }

    .controls-panel {
      width: var(--responsive-desktop-sdr-desktop_controls_width, 250px);
    }

    .spectrum-container {
      height: 40%;
      min-height: 200px;
    }

    .waterfall-container {
      min-height: 200px;
    }

    .controls-toggle {
      padding: var(--responsive-desktop-button-desktop_padding, 8px 12px);
      font-size: var(--responsive-desktop-font_size_sm, 12px);
      min-height: var(--responsive-desktop-touch_target_min, 32px);
    }
  }

  /* Mobile-specific adjustments */
  .sdr-dashboard.mobile .sdr-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .sdr-dashboard.mobile .sdr-info {
    width: 100%;
    justify-content: space-between;
  }

  .sdr-dashboard.mobile .frequency-display,
  .sdr-dashboard.mobile .sample-rate-display {
    align-items: flex-start;
  }

  .sdr-dashboard.mobile .controls-toggle {
    width: 100%;
    justify-content: center;
  }

  /* Touch optimization */
  @media (hover: none) and (pointer: coarse) {
    .controls-toggle {
      padding: calc(var(--responsive-mobile-button-mobile_padding, 12px) * 1.2);
      font-size: var(--responsive-mobile-font_size_base, 16px);
    }

    .frequency-label,
    .sample-rate-label {
      font-size: var(--responsive-mobile-font_size_sm, 14px);
    }

    .frequency-value,
    .sample-rate-value {
      font-size: var(--responsive-mobile-font_size_base, 16px);
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .controls-toggle {
      transition-duration: var(--animations-reduced_motion_duration, 0ms);
    }
  }
</style>
