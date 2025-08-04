<!--
  Crosshair Tab Component
  Controls for crosshair overlay settings
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { CrosshairSettings } from '../types';

  export let settings: Partial<CrosshairSettings> = {};
  export let showRing = false;
  export let ringDistance = 1000;

  const dispatch = createEventDispatcher<{
    settingsChange: { settings: Partial<CrosshairSettings> };
    ringToggle: { show: boolean };
    ringDistanceChange: { distance: number };
  }>();

  // Default settings
  const defaultSettings: CrosshairSettings = {
    style: {
      type: 'simple',
      color: 'auto',
      size: 40,
      opacity: 0.8
    },
    ringUnits: 'meters',
    gridFormat: {
      type: 'decimal',
      precision: 6
    },
    iconPacks: {
      nato: true,
      civilian: false,
      nerdfont: false
    },
    showRing: false,
    ringDistance: 1000,
    keybindings: {}
  };

  $: mergedSettings = { ...defaultSettings, ...settings };

  function updateRingUnits(units: string) {
    if (['meters', 'feet', 'nautical-miles'].includes(units)) {
      dispatch('settingsChange', {
        settings: { ...mergedSettings, ringUnits: units as 'meters' | 'feet' | 'nautical-miles' }
      });
    }
  }

  function updateGridFormatType(formatType: string) {
    if (['decimal', 'dms', 'mgrs', 'utm'].includes(formatType)) {
      dispatch('settingsChange', {
        settings: {
          ...mergedSettings,
          gridFormat: {
            ...mergedSettings.gridFormat,
            type: formatType as 'decimal' | 'dms' | 'mgrs' | 'utm'
          }
        }
      });
    }
  }

  function updateStyle(field: string, value: any) {
    const newSettings = {
      ...mergedSettings,
      style: {
        ...mergedSettings.style,
        [field]: value
      }
    };
    dispatch('settingsChange', { settings: newSettings });
  }

  function updateRingDistance(value: number) {
    ringDistance = value;
    dispatch('ringDistanceChange', { distance: value });
  }

  function toggleRing() {
    showRing = !showRing;
    dispatch('ringToggle', { show: showRing });
  }
</script>

<div class="crosshair-controls">
  <div class="control-group">
    <label for="crosshair-style">Style</label>
    <select
      id="crosshair-style"
      value={mergedSettings.style.type}
      on:change={(e) => updateStyle('type', e.currentTarget.value)}
    >
      <option value="simple">Simple</option>
      <option value="mil-dot">Mil-Dot</option>
      <option value="aviation">Aviation</option>
    </select>
  </div>

  <div class="control-group">
    <label for="crosshair-color">Color</label>
    <select
      id="crosshair-color"
      value={mergedSettings.style.color}
      on:change={(e) => updateStyle('color', e.currentTarget.value)}
    >
      <option value="auto">Auto</option>
      <option value="white">White</option>
      <option value="black">Black</option>
      <option value="red">Red</option>
    </select>
  </div>

  <div class="control-group">
    <label for="crosshair-size">Size</label>
    <input
      id="crosshair-size"
      type="range"
      min="20"
      max="100"
      value={mergedSettings.style.size}
      on:input={(e) => updateStyle('size', parseInt(e.currentTarget.value))}
    />
    <span class="value">{mergedSettings.style.size}px</span>
  </div>

  <div class="control-group">
    <label for="crosshair-opacity">Opacity</label>
    <input
      id="crosshair-opacity"
      type="range"
      min="0"
      max="100"
      value={mergedSettings.style.opacity * 100}
      on:input={(e) => updateStyle('opacity', parseInt(e.currentTarget.value) / 100)}
    />
    <span class="value">{Math.round(mergedSettings.style.opacity * 100)}%</span>
  </div>

  <div class="divider"></div>

  <div class="control-group">
    <label>
      <input type="checkbox" checked={showRing} on:change={toggleRing} />
      Show Distance Ring
    </label>
  </div>

  {#if showRing}
    <div class="control-group">
      <label for="ring-distance">Ring Distance</label>
      <input
        id="ring-distance"
        type="number"
        min="10"
        max="50000"
        step="10"
        value={ringDistance}
        on:input={(e) => updateRingDistance(parseInt(e.currentTarget.value))}
      />
      <select
        value={mergedSettings.ringUnits}
        on:change={(e) => {
          const units = e.currentTarget?.value;
          if (units) updateRingUnits(units);
        }}
      >
        <option value="meters">Meters</option>
        <option value="feet">Feet</option>
        <option value="nautical-miles">Nautical Miles</option>
      </select>
    </div>
  {/if}

  <div class="divider"></div>

  <div class="control-group">
    <label for="grid-format">Grid Format</label>
    <select
      id="grid-format"
      value={mergedSettings.gridFormat.type}
      on:change={(e) => {
        const formatType = e.currentTarget?.value;
        if (formatType) updateGridFormatType(formatType);
      }}
    >
      <option value="decimal">Decimal</option>
      <option value="dms">DMS</option>
      <option value="mgrs">MGRS</option>
      <option value="utm">UTM</option>
    </select>
  </div>

  <div class="info">
    <p>Alt + Scroll to adjust ring distance</p>
  </div>
</div>

<style>
  .crosshair-controls {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.5rem;
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

  .control-group select,
  .control-group input[type='number'] {
    padding: 0.375rem 0.5rem;
    font-size: 0.875rem;
    background: var(--color-surface-variant);
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
    color: var(--color-text);
  }

  .control-group input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    height: 0.25rem;
    background: var(--color-surface-variant);
    border-radius: 0.125rem;
    outline: none;
  }

  .control-group input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 1rem;
    height: 1rem;
    background: var(--color-primary);
    border-radius: 50%;
    cursor: pointer;
  }

  .control-group input[type='range']::-moz-range-thumb {
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

  .control-group input[type='checkbox'] {
    margin-right: 0.5rem;
  }

  .divider {
    height: 1px;
    background: var(--color-border);
    margin: 0.25rem 0;
  }

  .info {
    padding: 0.5rem;
    background: var(--color-surface-variant);
    border-radius: 0.25rem;
    margin-top: 0.5rem;
  }

  .info p {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    margin: 0;
  }
</style>
