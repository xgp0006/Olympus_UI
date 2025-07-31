<!--
  PID Master Gain Component
  NASA JPL Rule 4 compliant - handles master gain control
  Component size: <60 lines per function
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Props
  export let masterGain: number = 1.0;
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher();

  // NASA JPL compliant function: Apply master gain
  function applyMasterGain(): void {
    dispatch('applyGain', { gain: masterGain });
  }

  // NASA JPL compliant function: Update master gain
  function updateMasterGain(value: number): void {
    dispatch('gainChange', { value });
  }
</script>

<div class="master-gain">
  <h3>Master Gain</h3>
  <div class="gain-control">
    <input 
      type="range" 
      min="0.5" 
      max="2.0" 
      step="0.1"
      value={masterGain}
      on:input={(e) => updateMasterGain(Number(e.currentTarget.value))}
      {disabled}
    />
    <input 
      type="number" 
      min="0.5" 
      max="2.0" 
      step="0.1"
      value={masterGain}
      on:input={(e) => updateMasterGain(Number(e.currentTarget.value))}
      {disabled}
      class="value-input"
    />
    <button 
      class="btn-small"
      on:click={applyMasterGain}
      {disabled}
      title="Apply master gain to all values"
    >
      Apply
    </button>
  </div>
</div>

<style>
  .master-gain {
    background: var(--color-background_tertiary);
    padding: 1rem;
    border-radius: var(--layout-border_radius);
    border: 1px solid var(--color-border_primary);
  }

  .master-gain h3 {
    margin: 0 0 1rem 0;
    font-size: var(--typography-font_size_base);
    font-weight: 600;
    color: var(--color-text_primary);
  }

  .gain-control {
    display: grid;
    grid-template-columns: 1fr 80px auto;
    gap: 0.75rem;
    align-items: center;
  }

  .value-input {
    padding: 0.375rem 0.5rem;
    background: var(--color-background_primary);
    border: 1px solid var(--color-border_primary);
    border-radius: var(--layout-border_radius);
    color: var(--color-text_primary);
    font-size: var(--typography-font_size_sm);
    text-align: center;
    font-family: var(--typography-font_family_mono);
  }
</style>