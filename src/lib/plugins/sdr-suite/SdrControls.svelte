<!--
  SDR Controls Component
  Provides controls for SDR parameters and device management
  Requirements: 5.2, 5.3
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { sdrStore, sdrState, sdrConnectionStatus, sdrRecordingStatus } from '$lib/stores/sdr';
  import { SdrCommands } from '$lib/utils/tauri';
  import type { SdrSettings } from './types';

  // ===== STATE =====
  interface ControlsState {
    availableDevices: Array<{ id: string; name: string; type: string }>;
    selectedDevice: string | null;
    isLoading: boolean;
    showAdvanced: boolean;
    pendingSettings: Partial<SdrSettings>;
    validationErrors: Record<string, string>;
  }

  let state: ControlsState = {
    availableDevices: [],
    selectedDevice: null,
    isLoading: false,
    showAdvanced: false,
    pendingSettings: {},
    validationErrors: {}
  };

  // ===== REACTIVE STATEMENTS =====
  $: isConnected = $sdrConnectionStatus.connected;
  $: isConnecting = $sdrConnectionStatus.connecting;
  $: isRecording = $sdrRecordingStatus.recording;
  $: currentSettings = $sdrState.settings;

  // ===== FUNCTIONS =====

  /**
   * Load available SDR devices
   */
  async function loadAvailableDevices(): Promise<void> {
    try {
      state.isLoading = true;
      const devices = await SdrCommands.getAvailableDevices();
      state.availableDevices = devices;

      // Auto-select first device if none selected
      if (devices.length > 0 && !state.selectedDevice) {
        state.selectedDevice = devices[0].id;
      }
    } catch (error) {
      console.error('Failed to load SDR devices:', error);
    } finally {
      state.isLoading = false;
    }
  }

  /**
   * Validate settings input
   */
  function validateSettings(settings: Partial<SdrSettings>): Record<string, string> {
    const errors: Record<string, string> = {};

    if (settings.centerFrequency !== undefined) {
      if (settings.centerFrequency < 1000000 || settings.centerFrequency > 6000000000) {
        errors.centerFrequency = 'Frequency must be between 1 MHz and 6 GHz';
      }
    }

    if (settings.sampleRate !== undefined) {
      if (settings.sampleRate < 250000 || settings.sampleRate > 20000000) {
        errors.sampleRate = 'Sample rate must be between 250 kHz and 20 MHz';
      }
    }

    if (settings.gain !== undefined) {
      if (settings.gain < 0 || settings.gain > 50) {
        errors.gain = 'Gain must be between 0 and 50 dB';
      }
    }

    if (settings.bandwidth !== undefined) {
      if (settings.bandwidth < 200000 || settings.bandwidth > 20000000) {
        errors.bandwidth = 'Bandwidth must be between 200 kHz and 20 MHz';
      }
    }

    return errors;
  }

  /**
   * Handle settings change with validation
   */
  function handleSettingsChange(key: keyof SdrSettings, value: number): void {
    const newSettings = { ...state.pendingSettings, [key]: value };
    const errors = validateSettings(newSettings);

    state.pendingSettings = newSettings;
    state.validationErrors = errors;
  }

  /**
   * Handle input events safely
   */
  function handleInputChange(key: keyof SdrSettings, event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = Number(target?.value || '0');
    handleSettingsChange(key, value);
  }

  /**
   * Apply pending settings
   */
  async function applySettings(): Promise<void> {
    if (Object.keys(state.validationErrors).length > 0) {
      return;
    }

    try {
      state.isLoading = true;
      await sdrStore.updateSettings(state.pendingSettings);
      state.pendingSettings = {};
    } catch (error) {
      console.error('Failed to apply settings:', error);
    } finally {
      state.isLoading = false;
    }
  }

  /**
   * Reset pending settings
   */
  function resetSettings(): void {
    state.pendingSettings = {};
    state.validationErrors = {};
  }

  /**
   * Start SDR connection
   */
  async function handleStart(): Promise<void> {
    try {
      await sdrStore.start();
    } catch (error) {
      console.error('Failed to start SDR:', error);
    }
  }

  /**
   * Stop SDR connection
   */
  async function handleStop(): Promise<void> {
    try {
      await sdrStore.stop();
    } catch (error) {
      console.error('Failed to stop SDR:', error);
    }
  }

  /**
   * Toggle recording
   */
  async function handleToggleRecording(): Promise<void> {
    try {
      if (isRecording) {
        await sdrStore.stopRecording();
      } else {
        await sdrStore.startRecording();
      }
    } catch (error) {
      console.error('Failed to toggle recording:', error);
    }
  }

  /**
   * Format frequency for display
   */
  function formatFrequency(freq: number): string {
    if (freq >= 1000000000) {
      return `${(freq / 1000000000).toFixed(3)} GHz`;
    } else if (freq >= 1000000) {
      return `${(freq / 1000000).toFixed(3)} MHz`;
    } else if (freq >= 1000) {
      return `${(freq / 1000).toFixed(1)} kHz`;
    } else {
      return `${freq} Hz`;
    }
  }

  /**
   * Format sample rate for display
   */
  function formatSampleRate(rate: number): string {
    if (rate >= 1000000) {
      return `${(rate / 1000000).toFixed(3)} MS/s`;
    } else if (rate >= 1000) {
      return `${(rate / 1000).toFixed(1)} kS/s`;
    } else {
      return `${rate} S/s`;
    }
  }

  // ===== LIFECYCLE =====
  onMount(async () => {
    await loadAvailableDevices();
  });
</script>

<div class="sdr-controls" data-testid="sdr-controls">
  <div class="controls-header">
    <h3 class="controls-title">SDR Controls</h3>
    <div class="connection-status">
      <div class="status-indicator {isConnected ? 'connected' : 'disconnected'}"></div>
      <span class="status-text">
        {#if isConnecting}
          Connecting...
        {:else if isConnected}
          Connected
        {:else}
          Disconnected
        {/if}
      </span>
    </div>
  </div>

  <!-- Device Selection -->
  <div class="control-section">
    <label class="control-label" for="device-select">SDR Device</label>
    <select
      id="device-select"
      class="control-select"
      bind:value={state.selectedDevice}
      disabled={isConnected || state.isLoading}
      data-testid="device-select"
    >
      {#if state.isLoading}
        <option value="">Loading devices...</option>
      {:else if state.availableDevices.length === 0}
        <option value="">No devices found</option>
      {:else}
        {#each state.availableDevices as device}
          <option value={device.id}>{device.name} ({device.type})</option>
        {/each}
      {/if}
    </select>
  </div>

  <!-- Connection Controls -->
  <div class="control-section">
    <div class="button-group">
      <button
        class="control-button primary"
        disabled={isConnecting || !state.selectedDevice || state.isLoading}
        on:click={isConnected ? handleStop : handleStart}
        data-testid="connection-button"
      >
        {#if isConnecting}
          Connecting...
        {:else if isConnected}
          Stop
        {:else}
          Start
        {/if}
      </button>

      <button
        class="control-button {isRecording ? 'recording' : 'secondary'}"
        disabled={!isConnected || state.isLoading}
        on:click={handleToggleRecording}
        data-testid="recording-button"
      >
        {#if isRecording}
          ⏹️ Stop Recording
        {:else}
          🔴 Record
        {/if}
      </button>
    </div>
  </div>

  <!-- Frequency Controls -->
  <div class="control-section">
    <label class="control-label" for="center-frequency">
      Center Frequency
      <span class="current-value">{formatFrequency(currentSettings.centerFrequency)}</span>
    </label>
    <div class="input-group">
      <input
        id="center-frequency"
        type="number"
        class="control-input {state.validationErrors.centerFrequency ? 'error' : ''}"
        placeholder={currentSettings.centerFrequency.toString()}
        min="1000000"
        max="6000000000"
        step="1000000"
        disabled={state.isLoading}
        on:input={(e) => handleInputChange('centerFrequency', e)}
        data-testid="center-frequency-input"
      />
      <span class="input-unit">Hz</span>
    </div>
    {#if state.validationErrors.centerFrequency}
      <div class="error-message">{state.validationErrors.centerFrequency}</div>
    {/if}
  </div>

  <!-- Sample Rate Controls -->
  <div class="control-section">
    <label class="control-label" for="sample-rate">
      Sample Rate
      <span class="current-value">{formatSampleRate(currentSettings.sampleRate)}</span>
    </label>
    <div class="input-group">
      <input
        id="sample-rate"
        type="number"
        class="control-input {state.validationErrors.sampleRate ? 'error' : ''}"
        placeholder={currentSettings.sampleRate.toString()}
        min="250000"
        max="20000000"
        step="250000"
        disabled={state.isLoading}
        on:input={(e) => handleInputChange('sampleRate', e)}
        data-testid="sample-rate-input"
      />
      <span class="input-unit">S/s</span>
    </div>
    {#if state.validationErrors.sampleRate}
      <div class="error-message">{state.validationErrors.sampleRate}</div>
    {/if}
  </div>

  <!-- Gain Controls -->
  <div class="control-section">
    <label class="control-label" for="gain">
      Gain
      <span class="current-value">{currentSettings.gain} dB</span>
    </label>
    <div class="input-group">
      <input
        id="gain"
        type="range"
        class="control-range"
        min="0"
        max="50"
        step="1"
        value={state.pendingSettings.gain ?? currentSettings.gain}
        disabled={state.isLoading}
        on:input={(e) => handleInputChange('gain', e)}
        data-testid="gain-input"
      />
      <input
        type="number"
        class="control-input-small {state.validationErrors.gain ? 'error' : ''}"
        min="0"
        max="50"
        step="1"
        value={state.pendingSettings.gain ?? currentSettings.gain}
        disabled={state.isLoading}
        on:input={(e) => handleInputChange('gain', e)}
      />
      <span class="input-unit">dB</span>
    </div>
    {#if state.validationErrors.gain}
      <div class="error-message">{state.validationErrors.gain}</div>
    {/if}
  </div>

  <!-- Advanced Controls Toggle -->
  <div class="control-section">
    <button
      class="control-button secondary small"
      on:click={() => (state.showAdvanced = !state.showAdvanced)}
      data-testid="advanced-toggle"
    >
      {state.showAdvanced ? '▼' : '▶'} Advanced Settings
    </button>
  </div>

  <!-- Advanced Controls -->
  {#if state.showAdvanced}
    <div class="advanced-controls">
      <!-- Bandwidth Controls -->
      <div class="control-section">
        <label class="control-label" for="bandwidth">
          Bandwidth
          <span class="current-value">{formatFrequency(currentSettings.bandwidth)}</span>
        </label>
        <div class="input-group">
          <input
            id="bandwidth"
            type="number"
            class="control-input {state.validationErrors.bandwidth ? 'error' : ''}"
            placeholder={currentSettings.bandwidth.toString()}
            min="200000"
            max="20000000"
            step="100000"
            disabled={state.isLoading}
            on:input={(e) => handleInputChange('bandwidth', e)}
            data-testid="bandwidth-input"
          />
          <span class="input-unit">Hz</span>
        </div>
        {#if state.validationErrors.bandwidth}
          <div class="error-message">{state.validationErrors.bandwidth}</div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Apply/Reset Controls -->
  {#if Object.keys(state.pendingSettings).length > 0}
    <div class="control-section">
      <div class="button-group">
        <button
          class="control-button primary small"
          disabled={Object.keys(state.validationErrors).length > 0 || state.isLoading}
          on:click={applySettings}
          data-testid="apply-settings"
        >
          Apply Settings
        </button>
        <button
          class="control-button secondary small"
          disabled={state.isLoading}
          on:click={resetSettings}
          data-testid="reset-settings"
        >
          Reset
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .sdr-controls {
    display: flex;
    flex-direction: column;
    gap: calc(var(--layout-spacing_unit) * 1.5);
    padding: calc(var(--layout-spacing_unit) * 2);
    background-color: var(--color-background_secondary);
    border: var(--layout-border_width) solid var(--component-sdr-grid_line_color);
    border-radius: var(--layout-border_radius);
    min-width: 300px;
    max-width: 400px;
  }

  .controls-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: var(--layout-spacing_unit);
    border-bottom: var(--layout-border_width) solid var(--component-sdr-grid_line_color);
  }

  .controls-title {
    font-size: var(--typography-font_size_base);
    font-weight: 600;
    color: var(--color-text_primary);
    margin: 0;
  }

  .connection-status {
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

  .control-section {
    display: flex;
    flex-direction: column;
    gap: calc(var(--layout-spacing_unit) / 2);
  }

  .control-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--typography-font_size_sm);
    font-weight: 500;
    color: var(--color-text_primary);
  }

  .current-value {
    font-family: var(--typography-font_family_mono);
    color: var(--color-accent_blue);
    font-weight: 600;
  }

  .control-select,
  .control-input {
    width: 100%;
    padding: calc(var(--layout-spacing_unit) / 2) var(--layout-spacing_unit);
    background-color: var(--color-background_primary);
    border: var(--layout-border_width) solid var(--component-sdr-grid_line_color);
    border-radius: var(--layout-border_radius);
    color: var(--color-text_primary);
    font-family: var(--typography-font_family_mono);
    font-size: var(--typography-font_size_sm);
  }

  .control-select:focus,
  .control-input:focus {
    outline: none;
    border-color: var(--color-accent_blue);
    box-shadow: 0 0 0 2px rgba(0, 191, 255, 0.2);
  }

  .control-input.error {
    border-color: var(--color-accent_red);
  }

  .input-group {
    display: flex;
    align-items: center;
    gap: calc(var(--layout-spacing_unit) / 2);
  }

  .input-unit {
    font-size: var(--typography-font_size_sm);
    color: var(--color-text_secondary);
    font-family: var(--typography-font_family_mono);
    min-width: 30px;
  }

  .control-range {
    flex: 1;
    margin: 0;
  }

  .control-input-small {
    width: 80px;
    padding: calc(var(--layout-spacing_unit) / 3) calc(var(--layout-spacing_unit) / 2);
    background-color: var(--color-background_primary);
    border: var(--layout-border_width) solid var(--component-sdr-grid_line_color);
    border-radius: var(--layout-border_radius);
    color: var(--color-text_primary);
    font-family: var(--typography-font_family_mono);
    font-size: var(--typography-font_size_sm);
  }

  .button-group {
    display: flex;
    gap: var(--layout-spacing_unit);
  }

  .control-button {
    padding: calc(var(--layout-spacing_unit) / 2) var(--layout-spacing_unit);
    border: var(--layout-border_width) solid transparent;
    border-radius: var(--layout-border_radius);
    font-size: var(--typography-font_size_sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--animations-transition_duration) var(--animations-easing_function);
    flex: 1;
  }

  .control-button.primary {
    background-color: var(--color-accent_blue);
    color: white;
  }

  .control-button.primary:hover:not(:disabled) {
    background-color: var(--color-accent_blue);
    filter: brightness(1.1);
  }

  .control-button.secondary {
    background-color: var(--color-background_tertiary);
    color: var(--color-text_primary);
    border-color: var(--component-sdr-grid_line_color);
  }

  .control-button.secondary:hover:not(:disabled) {
    background-color: var(--color-background_primary);
  }

  .control-button.recording {
    background-color: var(--color-accent_red);
    color: white;
  }

  .control-button.recording:hover:not(:disabled) {
    background-color: var(--color-accent_red);
    filter: brightness(1.1);
  }

  .control-button.small {
    padding: calc(var(--layout-spacing_unit) / 3) calc(var(--layout-spacing_unit) / 2);
    font-size: calc(var(--typography-font_size_sm) * 0.9);
  }

  .control-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .advanced-controls {
    display: flex;
    flex-direction: column;
    gap: calc(var(--layout-spacing_unit) * 1.5);
    padding: var(--layout-spacing_unit);
    background-color: var(--color-background_primary);
    border: var(--layout-border_width) solid var(--component-sdr-grid_line_color);
    border-radius: var(--layout-border_radius);
  }

  .error-message {
    font-size: calc(var(--typography-font_size_sm) * 0.9);
    color: var(--color-accent_red);
    margin-top: calc(var(--layout-spacing_unit) / 4);
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .sdr-controls {
      min-width: unset;
      max-width: unset;
      width: 100%;
    }

    .controls-header {
      flex-direction: column;
      gap: var(--layout-spacing_unit);
      align-items: flex-start;
    }

    .button-group {
      flex-direction: column;
    }

    .input-group {
      flex-wrap: wrap;
    }

    .control-input-small {
      width: 100px;
    }
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .control-button,
    .status-indicator {
      transition: none;
    }
  }

  /* Focus styles for accessibility */
  .control-button:focus {
    outline: 2px solid var(--color-accent_blue);
    outline-offset: 2px;
  }

  .control-range:focus {
    outline: 2px solid var(--color-accent_blue);
    outline-offset: 2px;
  }
</style>
