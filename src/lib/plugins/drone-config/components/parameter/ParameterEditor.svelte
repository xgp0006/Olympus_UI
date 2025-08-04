<!--
  Parameter Editor Component
  NASA JPL Rule 4 compliant - handles individual parameter editing
  Component size: <60 lines per function
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Import the proper type from drone-types
  import type { DroneParameter } from '../../types/drone-types';

  // Props
  export let parameter: DroneParameter;
  export let readonly: boolean = false;
  export let loading: boolean = false;

  const dispatch = createEventDispatcher();

  // NASA JPL compliant function: Update parameter value
  function updateParameter(newValue: number): void {
    if (readonly || loading) return;
    dispatch('parameterUpdate', { parameter, value: newValue });
  }

  // NASA JPL compliant function: Handle input change
  function handleInputChange(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const value = parseFloat(target.value);
    if (!isNaN(value)) {
      updateParameter(value);
    }
  }
</script>

<div class="parameter-row">
  <div class="parameter-info">
    <div class="parameter-name">{parameter.name}</div>
    <div class="parameter-description">
      {parameter.description || 'No description available'}
    </div>
  </div>

  <div class="parameter-value">
    {#if parameter.type === 'enum' || parameter.options}
      <select
        value={parameter.value}
        on:change={handleInputChange}
        disabled={readonly || loading}
        class="parameter-select"
      >
        {#each parameter.options || [] as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    {:else}
      <input
        type="number"
        value={parameter.value}
        min={parameter.min}
        max={parameter.max}
        step={parameter.increment || 0.1}
        on:blur={handleInputChange}
        disabled={readonly || loading}
        class="parameter-input"
      />
    {/if}

    <span class="parameter-unit">{parameter.units || ''}</span>
  </div>
</div>

<style>
  .parameter-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border_secondary);
  }

  .parameter-row:last-child {
    border-bottom: none;
  }

  .parameter-info {
    flex: 1;
    margin-right: 1rem;
  }

  .parameter-name {
    font-weight: 500;
    color: var(--color-text_primary);
    font-size: 0.9rem;
  }

  .parameter-description {
    font-size: 0.8rem;
    color: var(--color-text_secondary);
    margin-top: 0.25rem;
  }

  .parameter-value {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .parameter-input,
  .parameter-select {
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--color-border_primary);
    border-radius: 4px;
    background: var(--color-background_primary);
    color: var(--color-text_primary);
    min-width: 80px;
  }

  .parameter-unit {
    font-size: 0.8rem;
    color: var(--color-text_secondary);
    min-width: 30px;
  }
</style>
