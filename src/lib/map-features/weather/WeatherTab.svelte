<!--
  Weather Tab Component
  Controls for weather overlay
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let layers = {
    radar: true,
    satellite: false,
    temperature: false,
    wind: false
  };
  export let opacity = 0.7;
  export let autoUpdate = true;
  export let updateInterval = 5; // minutes
  
  const dispatch = createEventDispatcher<{
    layersChange: typeof layers;
    opacityChange: { opacity: number };
    settingsChange: {
      autoUpdate: boolean;
      updateInterval: number;
    };
  }>();
  
  function toggleLayer(layer: keyof typeof layers) {
    layers[layer] = !layers[layer];
    dispatch('layersChange', layers);
  }
  
  function updateOpacity(value: number) {
    opacity = value;
    dispatch('opacityChange', { opacity });
  }
  
  function updateSettings() {
    dispatch('settingsChange', {
      autoUpdate,
      updateInterval
    });
  }
</script>

<div class="weather-controls">
  <div class="layers-section">
    <h3>Weather Layers</h3>
    
    <div class="layer-toggle">
      <label>
        <input 
          type="checkbox"
          checked={layers.radar}
          on:change={() => toggleLayer('radar')}
        />
        <span class="layer-name">Radar</span>
        <span class="layer-desc">Precipitation</span>
      </label>
    </div>
    
    <div class="layer-toggle">
      <label>
        <input 
          type="checkbox"
          checked={layers.satellite}
          on:change={() => toggleLayer('satellite')}
        />
        <span class="layer-name">Satellite</span>
        <span class="layer-desc">Cloud cover</span>
      </label>
    </div>
    
    <div class="layer-toggle">
      <label>
        <input 
          type="checkbox"
          checked={layers.temperature}
          on:change={() => toggleLayer('temperature')}
        />
        <span class="layer-name">Temperature</span>
        <span class="layer-desc">Surface temp</span>
      </label>
    </div>
    
    <div class="layer-toggle">
      <label>
        <input 
          type="checkbox"
          checked={layers.wind}
          on:change={() => toggleLayer('wind')}
        />
        <span class="layer-name">Wind</span>
        <span class="layer-desc">Wind vectors</span>
      </label>
    </div>
  </div>
  
  <div class="divider"></div>
  
  <div class="control-group">
    <label for="weather-opacity">Opacity</label>
    <input 
      id="weather-opacity"
      type="range"
      min="0"
      max="100"
      value={opacity * 100}
      on:input={(e) => updateOpacity(parseInt(e.currentTarget.value) / 100)}
    />
    <span class="value">{Math.round(opacity * 100)}%</span>
  </div>
  
  <div class="divider"></div>
  
  <div class="auto-update-section">
    <label class="toggle-label">
      <input 
        type="checkbox"
        bind:checked={autoUpdate}
        on:change={updateSettings}
      />
      Auto-update
    </label>
    
    {#if autoUpdate}
      <div class="update-interval">
        <label for="update-interval">Update every</label>
        <select 
          id="update-interval"
          bind:value={updateInterval}
          on:change={updateSettings}
        >
          <option value={1}>1 minute</option>
          <option value={5}>5 minutes</option>
          <option value={10}>10 minutes</option>
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
        </select>
      </div>
    {/if}
  </div>
  
  <div class="info">
    <p>Weather data updates automatically when enabled.</p>
    <p>Last update: <span class="timestamp">Just now</span></p>
  </div>
</div>

<style>
  .weather-controls {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.5rem;
  }
  
  .layers-section h3 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
  }
  
  .layer-toggle {
    margin: 0.25rem 0;
  }
  
  .layer-toggle label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: var(--color-surface-variant);
    border-radius: 0.25rem;
    cursor: pointer;
    transition: background 0.2s ease;
  }
  
  .layer-toggle label:hover {
    background: var(--color-surface);
  }
  
  .layer-toggle input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
  }
  
  .layer-name {
    flex: 1;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text);
  }
  
  .layer-desc {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
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
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-secondary);
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
  
  .auto-update-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .toggle-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-text);
  }
  
  .update-interval {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: 1.5rem;
  }
  
  .update-interval label {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }
  
  .update-interval select {
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
    background: var(--color-surface-variant);
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
    color: var(--color-text);
  }
  
  .info {
    padding: 0.75rem;
    background: var(--color-surface-variant);
    border-radius: 0.25rem;
  }
  
  .info p {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    margin: 0.25rem 0;
  }
  
  .timestamp {
    color: var(--color-text);
    font-weight: 500;
  }
</style>