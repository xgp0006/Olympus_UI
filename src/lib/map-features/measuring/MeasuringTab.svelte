<!--
  Measuring Tab Component
  Controls for measuring tools
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let activeTool: 'line' | 'area' | null = null;
  export let unit: 'metric' | 'imperial' = 'metric';
  export let measurements: Array<{ type: string; value: number; unit: string; timestamp: number }> = [];
  
  const dispatch = createEventDispatcher<{
    toolChange: { tool: 'line' | 'area' | null };
    unitChange: { unit: 'metric' | 'imperial' };
    clear: void;
  }>();
  
  function selectTool(tool: 'line' | 'area' | null) {
    activeTool = tool;
    dispatch('toolChange', { tool });
  }
  
  function toggleUnit() {
    unit = unit === 'metric' ? 'imperial' : 'metric';
    dispatch('unitChange', { unit });
  }
  
  function clearMeasurements() {
    measurements = [];
    dispatch('clear');
  }
  
  function formatValue(value: number, unitStr: string): string {
    if (unitStr === 'm' || unitStr === 'ft') {
      if (unit === 'metric') {
        if (value < 1000) {
          return `${value.toFixed(1)} m`;
        } else {
          return `${(value / 1000).toFixed(2)} km`;
        }
      } else {
        const feet = value * 3.28084;
        if (feet < 5280) {
          return `${feet.toFixed(1)} ft`;
        } else {
          return `${(feet / 5280).toFixed(2)} mi`;
        }
      }
    } else {
      if (unit === 'metric') {
        if (value < 10000) {
          return `${value.toFixed(0)} m²`;
        } else if (value < 1000000) {
          return `${(value / 10000).toFixed(2)} ha`;
        } else {
          return `${(value / 1000000).toFixed(2)} km²`;
        }
      } else {
        const sqFeet = value * 10.7639;
        if (sqFeet < 43560) {
          return `${sqFeet.toFixed(0)} ft²`;
        } else {
          const acres = sqFeet / 43560;
          if (acres < 640) {
            return `${acres.toFixed(2)} acres`;
          } else {
            return `${(acres / 640).toFixed(2)} mi²`;
          }
        }
      }
    }
  }
</script>

<div class="measuring-controls">
  <div class="tool-buttons">
    <button
      class="tool-btn"
      class:active={activeTool === 'line'}
      on:click={() => selectTool(activeTool === 'line' ? null : 'line')}
      title="Measure distance"
    >
      <span class="icon">📏</span>
      <span>Distance</span>
    </button>
    
    <button
      class="tool-btn"
      class:active={activeTool === 'area'}
      on:click={() => selectTool(activeTool === 'area' ? null : 'area')}
      title="Measure area"
    >
      <span class="icon">⬜</span>
      <span>Area</span>
    </button>
  </div>
  
  <div class="unit-toggle">
    <label>
      Units:
      <button class="unit-btn" on:click={toggleUnit}>
        {unit === 'metric' ? 'Metric' : 'Imperial'}
      </button>
    </label>
  </div>
  
  {#if activeTool}
    <div class="instructions">
      <p>
        {#if activeTool === 'line'}
          Click to add points along the path. Double-click to finish.
        {:else}
          Click to add vertices. Double-click to close the area.
        {/if}
      </p>
    </div>
  {/if}
  
  {#if measurements.length > 0}
    <div class="measurements-list">
      <div class="list-header">
        <h3>Recent Measurements</h3>
        <button class="clear-btn" on:click={clearMeasurements}>Clear</button>
      </div>
      <ul>
        {#each measurements.slice(-5).reverse() as measurement}
          <li>
            <span class="measurement-type">{measurement.type}</span>
            <span class="measurement-value">{formatValue(measurement.value, measurement.unit)}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .measuring-controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.5rem;
  }
  
  .tool-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  
  .tool-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.75rem;
    background: var(--color-surface-variant);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .tool-btn:hover {
    background: var(--color-surface);
    border-color: var(--color-primary);
  }
  
  .tool-btn.active {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }
  
  .tool-btn .icon {
    font-size: 1.5rem;
  }
  
  .tool-btn span:last-child {
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .unit-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .unit-toggle label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }
  
  .unit-btn {
    padding: 0.25rem 0.75rem;
    background: var(--color-surface-variant);
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
    color: var(--color-text);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .unit-btn:hover {
    background: var(--color-surface);
    border-color: var(--color-primary);
  }
  
  .instructions {
    padding: 0.75rem;
    background: var(--color-surface-variant);
    border-radius: 0.25rem;
    border-left: 3px solid var(--color-primary);
  }
  
  .instructions p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }
  
  .measurements-list {
    background: var(--color-surface-variant);
    border-radius: 0.25rem;
    padding: 0.75rem;
  }
  
  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .list-header h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
  }
  
  .clear-btn {
    padding: 0.125rem 0.5rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .clear-btn:hover {
    background: var(--color-surface);
    border-color: var(--color-primary);
    color: var(--color-primary);
  }
  
  .measurements-list ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  
  .measurements-list li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--color-border);
    font-size: 0.875rem;
  }
  
  .measurements-list li:last-child {
    border-bottom: none;
  }
  
  .measurement-type {
    text-transform: capitalize;
    color: var(--color-text-secondary);
  }
  
  .measurement-value {
    font-weight: 500;
    color: var(--color-text);
  }
</style>