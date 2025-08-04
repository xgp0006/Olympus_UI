<!--
  PID Advanced Settings Component
  NASA JPL Rule 4 compliant - handles advanced PID parameters
  Component size: <60 lines per function
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Types
  interface PIDProfile {
    gyroFilter: number;
    dtermFilter: number;
    feedForward: number;
    iTermRelax: number;
    antiGravity: number;
    tpaRate: number;
    tpaBreakpoint: number;
  }

  // Props
  export let profile: PIDProfile;
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher();

  // NASA JPL compliant function: Update advanced setting
  function updateSetting(field: keyof PIDProfile, value: number): void {
    dispatch('settingChange', { field, value });
  }
</script>

<div class="advanced-settings">
  <h3>Advanced Settings</h3>
  <div class="advanced-grid">
    <div class="advanced-item">
      <label>
        <span>Gyro Filter (Hz)</span>
        <input
          type="number"
          min="50"
          max="500"
          step="10"
          value={profile.gyroFilter}
          on:change={(e) => updateSetting('gyroFilter', Number(e.currentTarget.value))}
          {disabled}
        />
      </label>
    </div>
    <div class="advanced-item">
      <label>
        <span>D-term Filter (Hz)</span>
        <input
          type="number"
          min="50"
          max="500"
          step="10"
          value={profile.dtermFilter}
          on:change={(e) => updateSetting('dtermFilter', Number(e.currentTarget.value))}
          {disabled}
        />
      </label>
    </div>
    <div class="advanced-item">
      <label>
        <span>Feed Forward</span>
        <input
          type="number"
          min="0"
          max="100"
          step="5"
          value={profile.feedForward}
          on:change={(e) => updateSetting('feedForward', Number(e.currentTarget.value))}
          {disabled}
        />
      </label>
    </div>
    <div class="advanced-item">
      <label>
        <span>I-term Relax</span>
        <input
          type="number"
          min="0"
          max="100"
          step="5"
          value={profile.iTermRelax}
          on:change={(e) => updateSetting('iTermRelax', Number(e.currentTarget.value))}
          {disabled}
        />
      </label>
    </div>
  </div>
</div>

<style>
  .advanced-settings {
    background: var(--color-background_tertiary);
    padding: 1rem;
    border-radius: var(--layout-border_radius);
    border: 1px solid var(--color-border_primary);
    animation: slideDown var(--animation-duration_normal) var(--animation-easing);
  }

  .advanced-settings h3 {
    margin: 0 0 1rem 0;
    font-size: var(--typography-font_size_base);
    font-weight: 600;
  }

  .advanced-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .advanced-item label {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .advanced-item input {
    padding: 0.5rem;
    background: var(--color-background_primary);
    border: 1px solid var(--color-border_primary);
    border-radius: var(--layout-border_radius);
    color: var(--color-text_primary);
    font-size: var(--typography-font_size_sm);
  }
</style>
