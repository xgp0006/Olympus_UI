<!--
  PID Axis Controls Component
  NASA JPL Rule 4 compliant - handles P/I/D sliders for a single axis
  Component size: <60 lines per function
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Types
  interface PIDValues {
    p: number;
    i: number;
    d: number;
  }

  // Props
  export let axisName: string = '';
  export const values: PIDValues = { p: 0, i: 0, d: 0 };
  export let springValues: PIDValues = { p: 0, i: 0, d: 0 };
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher();

  // NASA JPL compliant function: Update PID value
  function updateValue(param: 'p' | 'i' | 'd', value: number): void {
    dispatch('valueChange', { axis: axisName.toLowerCase(), param, value });
  }
</script>

<div class="axis-control">
  <h3>{axisName}</h3>
  <div class="pid-sliders">
    <div class="slider-group">
      <label>
        <span>P</span>
        <input 
          type="range" 
          min="0" 
          max="200" 
          step="1"
          value={springValues.p}
          on:input={(e) => updateValue('p', Number(e.currentTarget.value))}
          {disabled}
        />
        <input 
          type="number" 
          min="0" 
          max="200" 
          step="1"
          value={springValues.p}
          on:input={(e) => updateValue('p', Number(e.currentTarget.value))}
          {disabled}
          class="value-input"
        />
      </label>
    </div>
    <div class="slider-group">
      <label>
        <span>I</span>
        <input 
          type="range" 
          min="0" 
          max="200" 
          step="1"
          value={springValues.i}
          on:input={(e) => updateValue('i', Number(e.currentTarget.value))}
          {disabled}
        />
        <input 
          type="number" 
          min="0" 
          max="200" 
          step="1"
          value={springValues.i}
          on:input={(e) => updateValue('i', Number(e.currentTarget.value))}
          {disabled}
          class="value-input"
        />
      </label>
    </div>
    <div class="slider-group">
      <label>
        <span>D</span>
        <input 
          type="range" 
          min="0" 
          max="100" 
          step="0.1"
          value={springValues.d}
          on:input={(e) => updateValue('d', Number(e.currentTarget.value))}
          {disabled}
        />
        <input 
          type="number" 
          min="0" 
          max="100" 
          step="0.1"
          value={springValues.d}
          on:input={(e) => updateValue('d', Number(e.currentTarget.value))}
          {disabled}
          class="value-input"
        />
      </label>
    </div>
  </div>
  
  <!-- Display original values for reference -->
  {#if values.p !== springValues.p || values.i !== springValues.i || values.d !== springValues.d}
    <div class="original-values">
      <small>Original: P:{values.p} I:{values.i} D:{values.d}</small>
    </div>
  {/if}
</div>

<style>
  .axis-control {
    background: var(--color-background_tertiary);
    padding: 1rem;
    border-radius: var(--layout-border_radius);
    border: 1px solid var(--color-border_primary);
  }

  .axis-control h3 {
    margin: 0 0 1rem 0;
    font-size: var(--typography-font_size_base);
    font-weight: 600;
    color: var(--color-text_primary);
  }

  .pid-sliders {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .slider-group label {
    display: grid;
    grid-template-columns: 20px 1fr 80px;
    gap: 0.75rem;
    align-items: center;
  }

  .original-values {
    margin-top: 0.5rem;
    padding: 0.25rem 0.5rem;
    background: var(--color-background_secondary);
    border-radius: 4px;
    border-left: 3px solid var(--color-accent_blue);
  }

  .original-values small {
    color: var(--color-text_secondary);
    font-size: 0.75rem;
  }
</style>