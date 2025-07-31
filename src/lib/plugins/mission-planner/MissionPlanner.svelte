<!--
  Mission Planner Plugin Component
  Full-screen map with draggable tool panels
  Aerospace-grade modular interface
  Requirements: 4.1, 4.2, 4.3, 4.4, 4.9
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import MapViewer from './MapViewer.svelte';
  import DraggableMissionAccordion from './DraggableMissionAccordion.svelte';
  import MapToolsController from './MapToolsController.svelte';
  import MapToolsLayer from './MapToolsLayer.svelte';
  import DraggableMessaging from './DraggableMessaging.svelte';
  import NotificationSystem from '$lib/map-features/messaging/NotificationSystem.svelte';
  import { notify } from '$lib/map-features/messaging/notification-store';
  import {
    missionItems,
    selectedMissionItem,
    loadMissionData,
    selectMissionItem,
    addMissionItem,
    updateMissionItem,
    deleteMissionItem,
    setMissionItems
  } from '$lib/stores/mission';
  import type { MapClickEvent, MissionItem, WaypointParams } from './types';
  import type { Coordinate, LatLng, MapViewport, CrosshairSettings } from '$lib/map-features/types';

  // ===== STATE =====
  let error: string | null = null;
  let mapViewerComponent: MapViewer;
  let mapToolsLayer: MapToolsLayer;
  
  // Tool visibility states
  let showMapTools = true;
  let showMissionAccordion = true;
  let showMessaging = true;
  
  // Map viewport for features
  let viewport: MapViewport | null = null;
  
  // Feature states
  let showCrosshair = false;
  let showMeasuring = false;
  let showADSB = false;
  let showWeather = false;
  let crosshairSettings: Partial<CrosshairSettings> = {};
  let showRing = false;
  let ringDistance = 1000;
  let measuringTool: 'line' | 'area' | null = null;
  let measuringUnit: 'metric' | 'imperial' = 'metric';
  let adsbSettings = {
    showLabels: true,
    showTrails: true,
    maxAircraft: 100
  };
  let weatherLayers = {
    radar: true,
    satellite: false,
    temperature: false,
    wind: false
  };
  let weatherOpacity = 0.7;

  // ===== FUNCTIONS =====

  /**
   * Handle coordinate selection from location entry tool
   */
  async function handleCoordinateSelect(event: CustomEvent<{ coordinate: Coordinate; latLng: LatLng }>) {
    const { latLng } = event.detail;
    
    try {
      // Create a new waypoint at the selected location
      const newWaypoint: MissionItem = {
        id: `waypoint-${Date.now()}`,
        type: 'waypoint',
        name: `Waypoint ${$missionItems.length + 1}`,
        params: {
          lat: latLng.lat,
          lng: latLng.lng,
          alt: 100,
          speed: 10
        } as WaypointParams,
        position: {
          lat: latLng.lat,
          lng: latLng.lng,
          alt: 100
        }
      };

      await addMissionItem(newWaypoint);
      selectMissionItem(newWaypoint.id);
      
      console.log(`Created waypoint at ${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}`);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create waypoint';
      console.error('Failed to create waypoint:', err);
    }
  }

  /**
   * Handle map click events - create waypoint at clicked location
   */
  async function handleMapClick(event: CustomEvent<MapClickEvent>): Promise<void> {
    const { lngLat } = event.detail;
    console.log('Map clicked at:', lngLat);

    try {
      // Create a new waypoint at the clicked location
      const newWaypoint: MissionItem = {
        id: `waypoint-${Date.now()}`,
        type: 'waypoint',
        name: `Waypoint ${$missionItems.length + 1}`,
        params: {
          lat: lngLat[1], // lat is second element
          lng: lngLat[0], // lng is first element
          alt: 100, // Default altitude
          speed: 10 // Default speed
        } as WaypointParams,
        position: {
          lat: lngLat[1],
          lng: lngLat[0],
          alt: 100
        }
      };

      // Add the waypoint to the mission store
      await addMissionItem(newWaypoint);

      // Select the new waypoint
      selectMissionItem(newWaypoint.id);

      console.log(`Created waypoint at ${lngLat[1].toFixed(4)}, ${lngLat[0].toFixed(4)}`);
      
      // Notify user
      notify({
        type: 'success',
        title: 'Waypoint Created',
        message: `New waypoint added at ${lngLat[1].toFixed(4)}, ${lngLat[0].toFixed(4)}`
      });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create waypoint';
      console.error('Failed to create waypoint:', err);
    }
  }

  /**
   * Handle mission item selection
   */
  function handleSelectItem(event: CustomEvent<{ id: string }>): void {
    selectMissionItem(event.detail.id);
  }

  /**
   * Handle mission item update
   */
  async function handleUpdateItem(event: CustomEvent<{ id: string; params: any }>): Promise<void> {
    try {
      const item = $missionItems.find(i => i.id === event.detail.id);
      if (item) {
        await updateMissionItem(event.detail.id, {
          ...item,
          params: event.detail.params
        });
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to update item';
      console.error('Failed to update item:', err);
    }
  }

  /**
   * Handle mission item deletion
   */
  async function handleDeleteItem(event: CustomEvent<{ id: string }>): Promise<void> {
    try {
      await deleteMissionItem(event.detail.id);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete item';
      console.error('Failed to delete item:', err);
    }
  }

  /**
   * Handle mission items reorder
   */
  function handleReorderItems(event: CustomEvent<{ items: MissionItem[] }>): void {
    // Update store with reordered items
    setMissionItems(event.detail.items);
  }

  /**
   * Handle tool minimize events
   */
  function handleMapToolsMinimize(event: CustomEvent<{ minimized: boolean }>): void {
    console.log('Map tools minimized:', event.detail.minimized);
  }

  /**
   * Handle accordion minimize events
   */
  function handleAccordionMinimize(event: CustomEvent<{ minimized: boolean }>): void {
    console.log('Mission accordion minimized:', event.detail.minimized);
  }

  /**
   * Handle map ready event
   */
  function handleMapReady(): void {
    console.log('Map is ready');
    // Initialize viewport
    updateViewport();
  }
  
  /**
   * Update viewport for map features
   */
  function updateViewport(): void {
    if (mapViewerComponent?.getViewport) {
      viewport = mapViewerComponent.getViewport();
    }
  }

  /**
   * Handle map error
   */
  function handleMapError(event: CustomEvent<string>): void {
    error = event.detail;
    console.error('Map error:', error);
  }

  /**
   * Initialize mission planner
   */
  async function initializeMissionPlanner(): Promise<void> {
    try {
      // Load mission data from backend
      await loadMissionData();
      console.log('Mission Planner initialized');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to initialize Mission Planner';
      console.error('Mission Planner initialization failed:', err);
    }
  }

  // ===== LIFECYCLE =====
  onMount(() => {
    initializeMissionPlanner();
  });

  onDestroy(() => {
    // Clear any selected items
    selectMissionItem(null);
  });
</script>

<!-- ===== TEMPLATE ===== -->
<div class="mission-planner" data-testid="mission-planner">
  {#if error}
    <div class="error-state" data-testid="mission-planner-error">
      <div class="error-content">
        <h3>Mission Planner Error</h3>
        <p>{error}</p>
        <button
          class="retry-button"
          on:click={() => {
            error = null;
            initializeMissionPlanner();
          }}
        >
          Retry
        </button>
      </div>
    </div>
  {:else}
    <!-- Map fills entire container -->
    <div class="map-container">
      <MapViewer
        bind:this={mapViewerComponent}
        selectedItemId={$selectedMissionItem?.id || null}
        missionItems={$missionItems}
        on:mapclick={handleMapClick}
        on:ready={handleMapReady}
        on:error={handleMapError}
        on:move={updateViewport}
        on:zoom={updateViewport}
      />
      
      <!-- Map tools overlay layer -->
      {#if viewport}
        <MapToolsLayer
          bind:this={mapToolsLayer}
          {viewport}
          {showCrosshair}
          {showMeasuring}
          {showADSB}
          {showWeather}
          {crosshairSettings}
          {showRing}
          {ringDistance}
          {measuringTool}
          {measuringUnit}
          {adsbSettings}
          {weatherLayers}
          {weatherOpacity}
        />
      {/if}
    </div>

    <!-- Draggable components layer -->
    <div class="draggable-layer">
      <!-- Map Tools Controller -->
      {#if showMapTools}
        <MapToolsController
          id="map-tools"
          title="Map Tools"
          initialX={20}
          initialY={100}
          {viewport}
          on:coordinateSelect={handleCoordinateSelect}
          on:minimize={handleMapToolsMinimize}
          on:crosshairSettings={(e) => {
            crosshairSettings = e.detail.settings;
            showCrosshair = true;
          }}
          on:measuringTool={(e) => {
            measuringTool = e.detail.tool;
            showMeasuring = e.detail.tool !== null;
          }}
          on:adsbSettings={(e) => {
            adsbSettings = { ...adsbSettings, ...e.detail.settings };
            showADSB = true;
          }}
          on:weatherLayers={(e) => {
            weatherLayers = e.detail.layers;
            showWeather = Object.values(e.detail.layers).some(v => v);
          }}
        />
      {/if}

      <!-- Mission Accordion -->
      {#if showMissionAccordion}
        <DraggableMissionAccordion
          id="mission-accordion"
          title="Mission Items"
          initialX={typeof window !== 'undefined' ? window.innerWidth - 450 : 800}
          initialY={100}
          missionItems={$missionItems}
          selectedItemId={$selectedMissionItem?.id || null}
          on:selectItem={handleSelectItem}
          on:updateItem={handleUpdateItem}
          on:deleteItem={handleDeleteItem}
          on:reorderItems={handleReorderItems}
          on:minimize={handleAccordionMinimize}
        />
      {/if}
      
      <!-- Messaging System -->
      {#if showMessaging}
        <DraggableMessaging
          id="messaging"
          title="Messages"
          initialX={20}
          initialY={400}
          on:minimize={(e) => console.log('Messaging minimized:', e.detail.minimized)}
        />
      {/if}
    </div>
  {/if}
  
  <!-- Global notification system -->
  <NotificationSystem />
</div>

<style>
  /* Full-screen layout with map and draggable tools */
  .mission-planner {
    position: relative;
    width: 100%;
    height: 100%;
    background-color: var(--color-background_primary);
    overflow: hidden;
  }

  /* Map fills entire container */
  .map-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
  }

  /* Draggable components layer */
  .draggable-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10;
    pointer-events: none; /* Allow map interaction through empty areas */
  }

  /* DraggableContainer components handle their own pointer events */
  .draggable-layer :global(.draggable-container) {
    pointer-events: auto;
  }

  /* Error state */
  .error-state {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-background_primary);
    z-index: 100;
  }

  .error-content {
    text-align: center;
    padding: calc(var(--layout-spacing_unit) * 3);
    background-color: var(--color-background_secondary);
    border-radius: var(--layout-border_radius);
    border: var(--layout-border_width) solid var(--color-accent_red);
    max-width: 400px;
  }

  .error-content h3 {
    color: var(--color-accent_red);
    margin: 0 0 var(--layout-spacing_unit) 0;
    font-size: var(--typography-font_size_lg);
  }

  .error-content p {
    color: var(--color-text_secondary);
    margin: 0 0 calc(var(--layout-spacing_unit) * 2) 0;
    line-height: 1.5;
  }

  .retry-button {
    background-color: var(--component-button-background_accent);
    color: var(--component-button-text_color_accent);
    border: none;
    padding: var(--layout-spacing_unit) calc(var(--layout-spacing_unit) * 2);
    border-radius: var(--layout-border_radius);
    font-size: var(--typography-font_size_base);
    cursor: pointer;
    transition: transform var(--animation-transition_duration) var(--animation-easing_function);
  }

  .retry-button:hover {
    transform: scale(var(--animation-hover_scale));
  }

  .retry-button:active {
    transform: scale(var(--animation-button_press_scale));
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .mission-planner * {
      transition-duration: var(--animations-reduced_motion_duration, 0ms) !important;
    }
  }
</style>
