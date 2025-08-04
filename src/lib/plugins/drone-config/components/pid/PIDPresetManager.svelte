<!--
  PID Preset Manager Component
  NASA JPL Rule 4 compliant - handles preset save/load functionality
  Component size: <60 lines per function
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Types
  interface PIDProfile {
    id: number;
    name: string;
    roll: { p: number; i: number; d: number };
    pitch: { p: number; i: number; d: number };
    yaw: { p: number; i: number; d: number };
    masterGain: number;
    gyroFilter: number;
    dtermFilter: number;
    feedForward: number;
    iTermRelax: number;
    antiGravity: number;
    tpaRate: number;
    tpaBreakpoint: number;
  }

  // Props
  export let profiles: PIDProfile[] = [];
  export let selectedProfile: number = 0;
  export let isLoading: boolean = false;

  const dispatch = createEventDispatcher();

  // NASA JPL compliant function: Handle profile change
  function handleProfileChange(): void {
    dispatch('profileChange');
  }

  // NASA JPL compliant function: Copy profile
  function copyProfile(fromId: number): void {
    dispatch('copyProfile', { fromId });
  }

  // NASA JPL compliant function: Reset to defaults
  function resetToDefaults(): void {
    dispatch('resetDefaults');
  }
</script>

<div class="profile-section">
  <div class="profile-controls">
    <select
      bind:value={selectedProfile}
      on:change={handleProfileChange}
      class="profile-select"
      disabled={isLoading}
    >
      {#each profiles as profile}
        <option value={profile.id}>{profile.name}</option>
      {/each}
    </select>

    <div class="profile-actions">
      <button
        class="btn-small"
        on:click={() => copyProfile(0)}
        disabled={selectedProfile === 0 || isLoading}
      >
        Copy 1
      </button>
      <button
        class="btn-small"
        on:click={() => copyProfile(1)}
        disabled={selectedProfile === 1 || isLoading}
      >
        Copy 2
      </button>
      <button class="btn-small btn-warning" on:click={resetToDefaults} disabled={isLoading}>
        Reset
      </button>
    </div>
  </div>
</div>

<style>
  .profile-section {
    background: var(--color-background_tertiary);
    padding: 1rem;
    border-radius: var(--layout-border_radius);
    border: 1px solid var(--color-border_primary);
  }

  .profile-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .profile-select {
    flex: 1;
    min-width: 200px;
    padding: 0.5rem;
    background: var(--color-background_primary);
    border: 1px solid var(--color-border_primary);
    border-radius: var(--layout-border_radius);
    color: var(--color-text_primary);
    font-size: var(--typography-font_size_sm);
  }
</style>
