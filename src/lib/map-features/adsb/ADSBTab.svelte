<!--
  ADS-B Tab Component
  Controls for ADS-B aircraft display
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let showLabels = true;
  export let showTrails = true;
  export let maxAircraft = 100;
  export let aircraftCount = 0;
  
  const dispatch = createEventDispatcher<{
    settingsChange: {
      showLabels: boolean;
      showTrails: boolean;
      maxAircraft: number;
    };
  }>();
  
  function updateSettings() {
    dispatch('settingsChange', {
      showLabels,
      showTrails,
      maxAircraft
    });
  }
</script>

<div class="adsb-controls">
  <div class="status">
    <div class="status-item">
      <span class="label">Aircraft Tracked:</span>
      <span class="value">{aircraftCount}</span>
    </div>
    <div class="status-item">
      <span class="label">Status:</span>
      <span class="value connected">Connected</span>
    </div>
  </div>
  
  <div class="divider"></div>
  
  <div class="control-group">
    <label>
      <input 
        type="checkbox"
        bind:checked={showLabels}
        on:change={updateSettings}
      />
      Show Labels
    </label>
  </div>
  
  <div class="control-group">
    <label>
      <input 
        type="checkbox"
        bind:checked={showTrails}
        on:change={updateSettings}
      />
      Show Trails
    </label>
  </div>
  
  <div class="control-group">
    <label for="max-aircraft">Max Aircraft</label>
    <input 
      id="max-aircraft"
      type="range"
      min="10"
      max="500"
      step="10"
      bind:value={maxAircraft}
      on:input={updateSettings}
    />
    <span class="value">{maxAircraft}</span>
  </div>
  
  <div class="info">
    <h4>Legend</h4>
    <div class="legend-item">
      <span class="aircraft-icon">▲</span>
      <span>Aircraft</span>
    </div>
    <div class="legend-item">
      <span class="trail-line"></span>
      <span>Flight Path</span>
    </div>
  </div>
  
  <div class="info">
    <p>Display shows live ADS-B aircraft data within view area.</p>
    <p>FL = Flight Level (hundreds of feet)</p>
  </div>
</div>

<style>
  .adsb-controls {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.5rem;
  }
  
  .status {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
  }
  
  .status-item .label {
    color: var(--color-text-secondary);
  }
  
  .status-item .value {
    font-weight: 500;
    color: var(--color-text);
  }
  
  .status-item .value.connected {
    color: var(--color-success, #00ff88);
  }
  
  .divider {
    height: 1px;
    background: var(--color-border);
    margin: 0.25rem 0;
  }
  
  .control-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .control-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-text);
  }
  
  .control-group input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
  }
  
  .control-group input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    height: 0.25rem;
    background: var(--color-surface-variant);
    border-radius: 0.125rem;
    outline: none;
  }
  
  .control-group input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 1rem;
    height: 1rem;
    background: var(--color-primary);
    border-radius: 50%;
    cursor: pointer;
  }
  
  .control-group input[type="range"]::-moz-range-thumb {
    width: 1rem;
    height: 1rem;
    background: var(--color-primary);
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }
  
  .control-group .value {
    font-size: 0.75rem;
    color: var(--color-text-tertiary);
    text-align: right;
  }
  
  .info {
    padding: 0.75rem;
    background: var(--color-surface-variant);
    border-radius: 0.25rem;
  }
  
  .info h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
  }
  
  .info p {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    margin: 0.25rem 0;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin: 0.25rem 0;
  }
  
  .aircraft-icon {
    color: #00ff88;
    font-size: 1rem;
  }
  
  .trail-line {
    display: inline-block;
    width: 20px;
    height: 2px;
    background: rgba(0, 255, 136, 0.3);
  }
</style>