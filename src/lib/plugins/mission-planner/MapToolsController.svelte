<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import DraggableContainer from '$lib/components/ui/DraggableContainer.svelte';
  import { LocationEntry } from '$lib/map-features/location-entry';
  import { CrosshairTab } from '$lib/map-features/crosshair';
  import { MeasuringTab } from '$lib/map-features/measuring';
  import { ADSBTab } from '$lib/map-features/adsb';
  import { WeatherTab } from '$lib/map-features/weather';
  import type { Coordinate, LatLng, CrosshairSettings, MapViewport } from '$lib/map-features/types';
  
  export let id = 'map-tools';
  export let title = 'Map Tools';
  export let initialX = 20;
  export let initialY = 100;
  export let minWidth = 350;
  export let minHeight = 200;
  
  // Props for map features
  export const viewport: MapViewport | null = null; // Used by parent components
  
  const dispatch = createEventDispatcher<{
    coordinateSelect: { coordinate: Coordinate; latLng: LatLng };
    minimize: { minimized: boolean };
    crosshairSettings: { settings: Partial<CrosshairSettings> };
    measuringTool: { tool: 'line' | 'area' | null };
    adsbSettings: { settings: any };
    weatherLayers: { layers: any };
  }>();
  
  let activeTab = 'location';
  let isMinimized = false;
  
  // Feature states
  let crosshairSettings: Partial<CrosshairSettings> = {};
  let showRing = false;
  let ringDistance = 1000;
  let measuringTool: 'line' | 'area' | null = null;
  let measuringUnit: 'metric' | 'imperial' = 'metric';
  let measurements: Array<any> = [];
  let adsbShowLabels = true;
  let adsbShowTrails = true;
  let adsbMaxAircraft = 100;
  let weatherLayers = {
    radar: true,
    satellite: false,
    temperature: false,
    wind: false
  };
  let weatherOpacity = 0.7;
  
  // Handle coordinate selection from LocationEntry
  async function handleCoordinateSelect(event: CustomEvent<{ coordinate: Coordinate }>) {
    const { coordinate } = event.detail;
    
    // Convert to LatLng for map integration
    if (coordinate.format === 'latlong' && 'lat' in coordinate.value && 'lng' in coordinate.value) {
      const latLng = coordinate.value as LatLng;
      dispatch('coordinateSelect', { coordinate, latLng });
    }
  }
  
  // Handle minimize events from DraggableContainer
  function handleMinimize(event: CustomEvent<{ minimized: boolean }>) {
    isMinimized = event.detail.minimized;
    dispatch('minimize', { minimized: isMinimized });
  }
</script>

<DraggableContainer
  {id}
  {title}
  {initialX}
  {initialY}
  initialWidth={400}
  initialHeight={250}
  {minWidth}
  {minHeight}
  snapToGrid={true}
  snapToEdges={true}
  resizable={true}
  minimizable={true}
  on:minimize={handleMinimize}
>
  <div class="map-tools-content">
    <div class="tabs">
      <button
        class="tab"
        class:active={activeTab === 'location'}
        on:click={() => activeTab = 'location'}
      >
        Location Entry
      </button>
      <button
        class="tab"
        class:active={activeTab === 'crosshair'}
        on:click={() => activeTab = 'crosshair'}
        title="Crosshair (1.5ms)"
      >
        Crosshair
      </button>
      <button
        class="tab"
        class:active={activeTab === 'measure'}
        on:click={() => activeTab = 'measure'}
        title="Measuring (1.0ms)"
      >
        Measure
      </button>
      <button
        class="tab"
        class:active={activeTab === 'adsb'}
        on:click={() => activeTab = 'adsb'}
        title="ADS-B (2.0ms)"
      >
        ADS-B
      </button>
      <button
        class="tab"
        class:active={activeTab === 'weather'}
        on:click={() => activeTab = 'weather'}
        title="Weather (1.5ms)"
      >
        Weather
      </button>
    </div>
    
    <div class="tab-content">
      {#if activeTab === 'location'}
        <LocationEntry
          formats={['latlong', 'utm', 'mgrs']}
          defaultFormat="latlong"
          placeholder="Enter coordinates or click on map..."
          on:select={handleCoordinateSelect}
        />
      {:else if activeTab === 'crosshair'}
        <CrosshairTab
          bind:settings={crosshairSettings}
          bind:showRing
          bind:ringDistance
          on:settingsChange={(e) => {
            dispatch('crosshairSettings', { settings: e.detail.settings });
          }}
          on:ringToggle
          on:ringDistanceChange
        />
      {:else if activeTab === 'measure'}
        <MeasuringTab
          bind:activeTool={measuringTool}
          bind:unit={measuringUnit}
          bind:measurements
          on:toolChange={(e) => dispatch('measuringTool', { tool: e.detail.tool })}
          on:unitChange
          on:clear
        />
      {:else if activeTab === 'adsb'}
        <ADSBTab
          bind:showLabels={adsbShowLabels}
          bind:showTrails={adsbShowTrails}
          bind:maxAircraft={adsbMaxAircraft}
          aircraftCount={0}
          on:settingsChange={(e) => dispatch('adsbSettings', { settings: e.detail })}
        />
      {:else if activeTab === 'weather'}
        <WeatherTab
          bind:layers={weatherLayers}
          bind:opacity={weatherOpacity}
          on:layersChange={(e) => dispatch('weatherLayers', { layers: e.detail })}
          on:opacityChange
          on:settingsChange
        />
      {/if}
    </div>
  </div>
</DraggableContainer>

<style>
  .map-tools-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 1rem;
  }
  
  .tabs {
    display: flex;
    gap: 0.25rem;
    background: var(--color-surface-variant);
    padding: 0.25rem;
    border-radius: 0.5rem;
  }
  
  .tab {
    flex: 1;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    background: transparent;
    border: none;
    border-radius: 0.375rem;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .tab:hover:not(:disabled) {
    background: var(--color-surface);
    color: var(--color-text);
  }
  
  .tab.active {
    background: var(--color-primary);
    color: white;
  }
  
  .tab:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }
  
</style>