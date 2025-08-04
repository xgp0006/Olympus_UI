<!-- 
  EmergencyOverlay Component - Emergency UI overlay for motor testing
  NASA JPL Rule 4 compliant: < 60 lines
-->
<script lang="ts">
  import type { Readable } from 'svelte/store';

  export let isEmergencyStopping: Readable<boolean>;
  export let onEmergencyStop: () => Promise<void>;

  // Listen for ESC key
  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      onEmergencyStop();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if $isEmergencyStopping}
  <div class="emergency-overlay">
    <div class="emergency-message">
      <div class="emergency-icon">⚠️</div>
      <h2>EMERGENCY STOP ACTIVATED</h2>
      <p>All motors stopping...</p>
    </div>
  </div>
{/if}

<div class="emergency-button-container">
  <button class="emergency-button" on:click={onEmergencyStop} aria-label="Emergency Stop">
    <span class="emergency-text">EMERGENCY</span>
    <span class="stop-text">STOP</span>
  </button>
  <span class="emergency-hint">Press ESC key</span>
</div>

<style>
  .emergency-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  .emergency-message {
    background: var(--color-status_error_bg);
    padding: 2rem;
    border-radius: 8px;
    text-align: center;
    color: var(--color-status_error);
  }

  .emergency-button-container {
    position: absolute;
    top: 1rem;
    right: 1rem;
    text-align: center;
  }

  .emergency-button {
    background: var(--color-status_error);
    color: white;
    border: none;
    padding: 1rem 2rem;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
  }
</style>
