<!--
  PID Tuning Container Component
  NASA JPL Rule 4 compliant - orchestrates all PID sub-components
  Component size: <60 lines per function
-->
<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { derived } from 'svelte/store';
  import { droneConnectionStore, isConnected } from '../../stores/drone-connection';
  import { safeInvoke } from '$lib/utils/tauri';
  import { showNotification } from '$lib/stores/notifications';
  import { spring } from 'svelte/motion';

  import PIDAxisControls from './PIDAxisControls.svelte';
  import PIDPresetManager from './PIDPresetManager.svelte';
  import PIDTuningChart from './PIDTuningChart.svelte';
  import PIDAdvancedSettings from './PIDAdvancedSettings.svelte';
  import PIDMasterGain from './PIDMasterGain.svelte';

  // Types
  interface PIDValues {
    p: number;
    i: number;
    d: number;
  }

  interface PIDProfile {
    id: number;
    name: string;
    roll: PIDValues;
    pitch: PIDValues;
    yaw: PIDValues;
    masterGain: number;
    gyroFilter: number;
    dtermFilter: number;
    feedForward: number;
    iTermRelax: number;
    antiGravity: number;
    tpaRate: number;
    tpaBreakpoint: number;
  }

  interface StepResponse {
    time: number;
    setpoint: number;
    actual: number;
    error: number;
  }

  // Props
  export let onClose: (() => void) | undefined = undefined;

  // State
  let selectedProfile = 0;
  let syncAxes = true;
  let showAdvanced = false;
  let isLoading = false;
  let hasUnsavedChanges = false;
  let responseHistory: StepResponse[] = [];

  // Profile management
  let profiles: PIDProfile[] = [
    {
      id: 0,
      name: 'Profile 1',
      roll: { p: 40, i: 30, d: 23 },
      pitch: { p: 40, i: 30, d: 23 },
      yaw: { p: 85, i: 45, d: 0 },
      masterGain: 1.0,
      gyroFilter: 100,
      dtermFilter: 100,
      feedForward: 0,
      iTermRelax: 30,
      antiGravity: 3.5,
      tpaRate: 65,
      tpaBreakpoint: 1350
    }
  ];

  let currentProfile: PIDProfile = { ...profiles[selectedProfile] };
  let originalProfile: PIDProfile = { ...profiles[selectedProfile] };

  // Spring animations for smooth value transitions
  const rollSpring = spring({
    p: currentProfile.roll.p,
    i: currentProfile.roll.i,
    d: currentProfile.roll.d
  });
  const pitchSpring = spring({
    p: currentProfile.pitch.p,
    i: currentProfile.pitch.i,
    d: currentProfile.pitch.d
  });
  const yawSpring = spring({
    p: currentProfile.yaw.p,
    i: currentProfile.yaw.i,
    d: currentProfile.yaw.d
  });

  const dispatch = createEventDispatcher();

  // NASA JPL compliant function: Load PID values from drone
  async function loadPIDValues(): Promise<void> {
    if (!$isConnected) return;

    try {
      isLoading = true;
      const pidData = await safeInvoke<PIDProfile[]>('get_pid_profiles');

      if (pidData && pidData.length > 0) {
        profiles = pidData;
        currentProfile = { ...profiles[selectedProfile] };
        originalProfile = { ...profiles[selectedProfile] };
        updateSprings();
      }
    } catch (error) {
      console.error('Failed to load PID values:', error);
      showNotification({
        type: 'error',
        message: 'Failed to load PID values from drone',
        timeout: 3000
      });
    } finally {
      isLoading = false;
    }
  }

  // NASA JPL compliant function: Save PID values to drone
  async function savePIDValues(): Promise<void> {
    if (!$isConnected || !hasUnsavedChanges) return;

    try {
      isLoading = true;

      profiles[selectedProfile] = { ...currentProfile };

      await safeInvoke('set_pid_profile', {
        profileId: selectedProfile,
        profile: currentProfile
      });

      originalProfile = { ...currentProfile };
      hasUnsavedChanges = false;

      showNotification({
        type: 'success',
        message: 'PID values saved successfully',
        timeout: 2000
      });
    } catch (error) {
      console.error('Failed to save PID values:', error);
      showNotification({
        type: 'error',
        message: 'Failed to save PID values to drone',
        timeout: 3000
      });
    } finally {
      isLoading = false;
    }
  }

  // NASA JPL compliant function: Update value with validation
  function updateValue(
    axis: 'roll' | 'pitch' | 'yaw',
    param: 'p' | 'i' | 'd',
    value: number
  ): void {
    const clampedValue = Math.max(0, Math.min(200, value));

    currentProfile[axis][param] = clampedValue;

    if (syncAxes && axis !== 'yaw') {
      if (axis === 'roll') {
        currentProfile.pitch[param] = clampedValue;
      } else if (axis === 'pitch') {
        currentProfile.roll[param] = clampedValue;
      }
    }

    updateSprings();
    hasUnsavedChanges = true;

    dispatch('pidChange', { axis, param, value: clampedValue });
  }

  // NASA JPL compliant function: Update profile setting
  function updateProfileSetting(field: string, value: unknown): void {
    const profile = currentProfile as unknown as Record<string, unknown>;
    profile[field] = value;
    hasUnsavedChanges = true;
  }

  // NASA JPL compliant function: Update spring animations
  function updateSprings(): void {
    rollSpring.set(currentProfile.roll);
    pitchSpring.set(currentProfile.pitch);
    yawSpring.set(currentProfile.yaw);
  }

  // NASA JPL compliant function: Handle profile change
  function handleProfileChange(): void {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Switch profile anyway?')) {
        selectedProfile = profiles.findIndex((p) => p.id === currentProfile.id);
        return;
      }
    }

    currentProfile = { ...profiles[selectedProfile] };
    originalProfile = { ...profiles[selectedProfile] };
    hasUnsavedChanges = false;
    updateSprings();
    responseHistory = [];
  }

  // NASA JPL compliant function: Copy profile
  function copyProfile(fromId: number): void {
    if (fromId === selectedProfile) return;

    const sourceProfile = profiles[fromId];
    currentProfile = {
      ...currentProfile,
      ...sourceProfile,
      id: currentProfile.id,
      name: currentProfile.name
    };

    updateSprings();
    hasUnsavedChanges = true;
  }

  // NASA JPL compliant function: Reset to defaults
  function resetToDefaults(): void {
    if (!confirm('Reset current profile to defaults? This will discard unsaved changes.')) return;

    currentProfile = {
      ...currentProfile,
      roll: { p: 40, i: 30, d: 23 },
      pitch: { p: 40, i: 30, d: 23 },
      yaw: { p: 85, i: 45, d: 0 },
      masterGain: 1.0,
      gyroFilter: 100,
      dtermFilter: 100,
      feedForward: 0,
      iTermRelax: 30,
      antiGravity: 3.5,
      tpaRate: 65,
      tpaBreakpoint: 1350
    };

    updateSprings();
    hasUnsavedChanges = true;
  }

  // NASA JPL compliant function: Apply master gain
  function applyMasterGain(): void {
    const gain = currentProfile.masterGain;

    (['roll', 'pitch', 'yaw'] as const).forEach((axis) => {
      const pidValues = currentProfile[axis] as PIDValues;
      pidValues.p *= gain;
      pidValues.i *= gain;
      pidValues.d *= gain;
    });

    updateSprings();
    hasUnsavedChanges = true;
  }

  // NASA JPL compliant function: Update response data
  async function updateResponseData(): Promise<void> {
    if (!$isConnected) return;

    try {
      const response = await safeInvoke<StepResponse>('get_pid_response');
      if (response) {
        responseHistory.push(response);
        if (responseHistory.length > 200) {
          responseHistory = responseHistory.slice(-200);
        }
      }
    } catch (error) {
      console.error('Failed to get PID response data:', error);
    }
  }

  // Handle keyboard shortcuts
  function handleKeyDown(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 's':
          e.preventDefault();
          savePIDValues();
          break;
        case 'z':
          e.preventDefault();
          if (hasUnsavedChanges) {
            currentProfile = { ...originalProfile };
            updateSprings();
            hasUnsavedChanges = false;
          }
          break;
      }
    }
  }

  onMount(() => {
    loadPIDValues();

    const responseInterval = setInterval(updateResponseData, 50);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(responseInterval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  });

  onDestroy(() => {
    // Clean up handled in onMount return
  });

  // Reactive statements
  $: if (!$isConnected) {
    responseHistory = [];
  }
</script>

<div class="pid-tuning-panel">
  <div class="panel-header">
    <h2>PID Tuning</h2>
    <div class="header-controls">
      <label class="sync-toggle">
        <input type="checkbox" bind:checked={syncAxes} />
        <span>Sync Roll/Pitch</span>
      </label>
      <button
        class="btn-icon"
        on:click={() => (showAdvanced = !showAdvanced)}
        title="{showAdvanced ? 'Hide' : 'Show'} advanced settings"
      >
        <i class="fas fa-cog"></i>
      </button>
      {#if onClose}
        <button class="btn-icon" on:click={onClose} title="Close panel">
          <i class="fas fa-times"></i>
        </button>
      {/if}
    </div>
  </div>

  <div class="panel-content">
    <!-- Profile selector -->
    <PIDPresetManager
      {profiles}
      {selectedProfile}
      {isLoading}
      on:profileChange={handleProfileChange}
      on:copyProfile={(e) => copyProfile(e.detail.fromId)}
      on:resetDefaults={resetToDefaults}
    />

    <!-- PID Controls -->
    <div class="pid-controls">
      <PIDAxisControls
        axisName="Roll"
        values={currentProfile.roll}
        springValues={$rollSpring}
        disabled={isLoading || !$isConnected}
        on:valueChange={(e) => updateValue(e.detail.axis, e.detail.param, e.detail.value)}
      />

      <PIDAxisControls
        axisName="Pitch"
        values={currentProfile.pitch}
        springValues={$pitchSpring}
        disabled={isLoading || !$isConnected}
        on:valueChange={(e) => updateValue(e.detail.axis, e.detail.param, e.detail.value)}
      />

      <PIDAxisControls
        axisName="Yaw"
        values={currentProfile.yaw}
        springValues={$yawSpring}
        disabled={isLoading || !$isConnected}
        on:valueChange={(e) => updateValue(e.detail.axis, e.detail.param, e.detail.value)}
      />

      <PIDMasterGain
        masterGain={currentProfile.masterGain}
        disabled={isLoading || !$isConnected}
        on:gainChange={(e) => {
          currentProfile.masterGain = e.detail.value;
          hasUnsavedChanges = true;
        }}
        on:applyGain={applyMasterGain}
      />
    </div>

    <!-- Response Graph -->
    <PIDTuningChart {responseHistory} />

    <!-- Advanced Settings -->
    {#if showAdvanced}
      <PIDAdvancedSettings
        profile={currentProfile}
        disabled={isLoading || !$isConnected}
        on:settingChange={(e) => {
          const { field, value } = e.detail;
          if (field in currentProfile) {
            updateProfileSetting(field, value);
          }
        }}
      />
    {/if}

    <!-- Action buttons -->
    <div class="action-buttons">
      <button
        class="btn-primary"
        on:click={savePIDValues}
        disabled={!hasUnsavedChanges || isLoading || !$isConnected}
      >
        {#if isLoading}
          <i class="fas fa-spinner fa-spin"></i>
        {:else}
          <i class="fas fa-save"></i>
        {/if}
        Save to Drone
      </button>
      <button class="btn-secondary" on:click={loadPIDValues} disabled={isLoading || !$isConnected}>
        <i class="fas fa-sync-alt"></i>
        Refresh from Drone
      </button>
    </div>

    {#if !$isConnected}
      <div class="connection-warning">
        <i class="fas fa-exclamation-triangle"></i>
        Connect to drone to enable PID tuning
      </div>
    {/if}
  </div>
</div>

<style>
  .pid-tuning-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-background_secondary);
    color: var(--color-text_primary);
    font-family: var(--typography-font_family_sans);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--color-background_tertiary);
    border-bottom: 1px solid var(--color-border_primary);
  }

  .panel-content {
    flex: 1;
    padding: 1.5rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .pid-controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .action-buttons {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }
</style>
