<!--
  Map Tools Layer Component
  Unified render layer for all map overlay features
  Manages performance budgets and render coordination
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import MapCrosshair from '$lib/map-features/crosshair/MapCrosshair.svelte';
  import MeasuringTools from '$lib/map-features/measuring/MeasuringTools.svelte';
  import ADSBDisplay from '$lib/map-features/adsb/ADSBDisplay.svelte';
  import WeatherOverlay from '$lib/map-features/weather/WeatherOverlay.svelte';
  import type { MapViewport, CrosshairSettings } from '$lib/map-features/types';
  import { globalScheduler, performanceStore } from '$lib/map-features/shared/performance';

  export let viewport: MapViewport;
  export const mapRef: any = null; // Used by parent components

  // Feature visibility
  export let showCrosshair = false;
  export let showMeasuring = false;
  export let showADSB = false;
  export let showWeather = false;

  // Feature settings
  export let crosshairSettings: Partial<CrosshairSettings> = {};
  export let showRing = false;
  export let ringDistance = 1000;
  export let measuringTool: 'line' | 'area' | null = null;
  export let measuringUnit: 'metric' | 'imperial' = 'metric';
  export let adsbSettings = {
    showLabels: true,
    showTrails: true,
    maxAircraft: 100
  };
  export let weatherLayers = {
    radar: true,
    satellite: false,
    temperature: false,
    wind: false
  };
  export let weatherOpacity = 0.7;

  // Component references
  let measuringComponent: MeasuringTools;

  // Performance monitoring
  let performanceMonitor: HTMLDivElement;
  let showPerformance = false;

  onMount(() => {
    // Schedule performance monitoring
    globalScheduler.schedule(
      'map-tools-monitor',
      (delta) => {
        // Monitor overall frame budget usage
        const budget = globalScheduler.getBudgetReport();
        let totalUsed = 0;
        budget.forEach((time) => (totalUsed += time));

        if (totalUsed > 6.94) {
          // 144fps target
          console.warn(`Frame budget exceeded: ${totalUsed.toFixed(2)}ms`);
        }
      },
      -1
    ); // Low priority

    return () => {
      globalScheduler.unschedule('map-tools-monitor');
    };
  });

  // Handle measurement complete events
  function handleMeasurementComplete(event: CustomEvent<any>) {
    console.log('Measurement complete:', event.detail);
  }

  // Clear all measurements
  export function clearMeasurements() {
    measuringComponent?.clear();
  }
</script>

<div class="map-tools-layer">
  <!-- Crosshair overlay (1.5ms budget) -->
  {#if showCrosshair && viewport}
    <MapCrosshair {viewport} {showRing} {ringDistance} settings={crosshairSettings} />
  {/if}

  <!-- Measuring tools (1.0ms budget) -->
  {#if showMeasuring && viewport}
    <MeasuringTools
      bind:this={measuringComponent}
      {viewport}
      activeTool={measuringTool}
      unit={measuringUnit}
      on:measurementComplete={handleMeasurementComplete}
    />
  {/if}

  <!-- ADS-B display (2.0ms budget) -->
  {#if showADSB && viewport}
    <ADSBDisplay
      {viewport}
      showLabels={adsbSettings.showLabels}
      showTrails={adsbSettings.showTrails}
      maxAircraft={adsbSettings.maxAircraft}
    />
  {/if}

  <!-- Weather overlay (1.5ms budget) -->
  {#if showWeather && viewport}
    <WeatherOverlay {viewport} layers={weatherLayers} opacity={weatherOpacity} />
  {/if}

  <!-- Performance monitor -->
  {#if showPerformance}
    <div class="performance-monitor" bind:this={performanceMonitor}>
      <div class="perf-item">
        <span>FPS:</span>
        <span class:warning={$performanceStore.fps < 130}>
          {$performanceStore.fps}
        </span>
      </div>
      <div class="perf-item">
        <span>Frame:</span>
        <span class:warning={$performanceStore.frameTime.avg > 7}>
          {$performanceStore.frameTime.avg.toFixed(1)}ms
        </span>
      </div>
      <div class="perf-item">
        <span>Budget:</span>
        <span class:warning={$performanceStore.budget.percentage > 90}>
          {$performanceStore.budget.percentage.toFixed(0)}%
        </span>
      </div>
    </div>
  {/if}
</div>

<style>
  .map-tools-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 95;
  }

  .performance-monitor {
    position: absolute;
    bottom: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 12px;
    pointer-events: none;
  }

  .perf-item {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin: 2px 0;
  }

  .perf-item span:last-child {
    font-weight: bold;
    min-width: 50px;
    text-align: right;
  }

  .perf-item span.warning {
    color: #ff6b6b;
  }
</style>
