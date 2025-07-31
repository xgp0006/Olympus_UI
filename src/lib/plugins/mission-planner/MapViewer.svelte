<!--
  MapViewer component for Mission Planner plugin
  Integrates MapLibre GL JS with theme variables and touch gestures
  Requirements: 4.1, 4.9, 1.8, 4.5, 4.6
-->
<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import {
    Map,
    NavigationControl,
    ScaleControl,
    type LngLatLike,
    type MapMouseEvent,
    type MapTouchEvent
  } from 'maplibre-gl';
  import { theme } from '$lib/stores/theme';
  import { isMobile } from '$lib/utils/responsive';
  import {
    addTouchGestures,
    type SwipeGesture,
    type PinchGesture,
    type TapGesture
  } from '$lib/utils/touch';
  import type { MapClickEvent, MissionItem } from './types';
  import type { MapViewport } from '$lib/map-features/types';

  // ===== PROPS =====
  export let selectedItemId: string | null = null;
  export let missionItems: MissionItem[] = [];
  export let center: [number, number] = [-122.4194, 37.7749]; // Default to San Francisco
  export let zoom: number = 10;

  // ===== STATE =====
  let mapContainer: HTMLElement;
  let map: Map | null = null;
  let mapLoaded = false;
  let error: string | null = null;
  let touchGestureCleanup: (() => void) | null = null;
  let isGestureActive = false;

  // ===== EVENT DISPATCHER =====
  const dispatch = createEventDispatcher<{
    mapclick: MapClickEvent;
    ready: void;
    error: string;
    swipe: SwipeGesture;
    pinch: PinchGesture;
    tap: TapGesture;
  }>();

  // ===== REACTIVE STATEMENTS =====
  $: if (map && mapLoaded && $theme) {
    updateMapTheme();
  }

  $: if (map && mapLoaded && missionItems) {
    updateMissionItems();
  }

  $: if (map && mapLoaded && selectedItemId) {
    highlightSelectedItem();
  }

  // ===== FUNCTIONS =====

  /**
   * Create map style configuration
   * NASA JPL Rule 4: Function under 60 lines
   */
  function createMapStyle() {
    return {
      version: 8 as const,
      sources: {
        'raster-tiles': {
          type: 'raster' as const,
          tiles: [
            'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors',
          maxzoom: 19
        }
      },
      layers: [
        {
          id: 'simple-tiles',
          type: 'raster' as const,
          source: 'raster-tiles',
          minzoom: 0,
          maxzoom: 19
        }
      ],
      // Use public glyphs server for text rendering
      glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf'
    };
  }

  /**
   * Configure map controls and event handlers
   * NASA JPL Rule 4: Function under 60 lines
   */
  function configureMapControls(mapInstance: Map): void {
    // Add navigation controls (hide on mobile to save space)
    if (!$isMobile) {
      mapInstance.addControl(new NavigationControl(), 'top-right');
    }
    mapInstance.addControl(new ScaleControl(), 'bottom-left');

    // Set up event listeners
    mapInstance.on('load', handleMapLoad);
    mapInstance.on('click', handleMapClick);
    mapInstance.on('touchstart', handleMapTouchStart);
    mapInstance.on('error', handleMapError);
  }

  /**
   * Initialize the MapLibre GL JS map
   * NASA JPL Rule 4: Function under 60 lines (now 35 lines)
   */
  function initializeMap(): void {
    try {
      map = new Map({
        container: mapContainer,
        style: createMapStyle(),
        center: center as LngLatLike,
        zoom: zoom,
        attributionControl: false,
        // Touch-optimized settings
        touchZoomRotate: true,
        touchPitch: $isMobile,
        dragPan: true,
        scrollZoom: !$isMobile, // Disable scroll zoom on mobile to prevent conflicts
        doubleClickZoom: true,
        keyboard: !$isMobile
      });

      configureMapControls(map);
      console.log('MapLibre GL JS map initialized');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize map';
      error = errorMessage;
      dispatch('error', errorMessage);
      console.error('Map initialization failed:', err);
    }
  }

  /**
   * Handle map load event
   */
  function handleMapLoad(): void {
    if (!map) return;

    mapLoaded = true;

    // Add mission items source and layers
    addMissionLayers();

    // Apply theme styling
    updateMapTheme();

    // Set up touch gestures for mobile devices
    if ($isMobile && mapContainer) {
      setupTouchGestures();
    }

    dispatch('ready');
    console.log('Map loaded and ready');
  }

  /**
   * Handle map click events
   */
  function handleMapClick(e: MapMouseEvent): void {
    const { lng, lat } = e.lngLat;
    const { x, y } = e.point;

    dispatch('mapclick', {
      lngLat: [lng, lat],
      point: [x, y]
    });
  }

  /**
   * Handle map touch start events
   */
  function handleMapTouchStart(e: MapTouchEvent): void {
    // Prevent default touch behavior when gesture is active
    if (isGestureActive) {
      e.preventDefault();
    }
  }

  /**
   * Categorize error type for appropriate handling
   */
  function categorizeError(
    errorUrl: string,
    errorMessage: string
  ): 'resource' | 'critical' | 'warning' {
    if (
      errorUrl.includes('tile.openstreetmap.org') ||
      errorUrl.includes('fonts.openmaptiles.org')
    ) {
      return 'resource';
    }
    if (
      errorMessage.includes('WebGL') ||
      errorMessage.includes('initialize') ||
      errorMessage.includes('container')
    ) {
      return 'critical';
    }
    return 'warning';
  }

  /**
   * Handle resource loading errors gracefully
   */
  function handleResourceError(
    errorUrl: string,
    errorStatus?: number,
    tileCoord?: { z: number; x: number; y: number }
  ): void {
    console.warn(`Resource loading failed (${errorStatus}): ${errorUrl}`);

    if (errorUrl.includes('fonts.openmaptiles.org')) {
      console.warn('Font loading failed, using system fallbacks');
    }

    if (errorUrl.includes('tile.openstreetmap.org') && tileCoord) {
      console.warn(`Tile loading failed for z${tileCoord.z}/${tileCoord.x}/${tileCoord.y}`);
    }
  }

  /**
   * Handle map errors with categorization and recovery strategies
   */
  function handleMapError(e: {
    error?: { message?: string; status?: number; url?: string };
    tile?: { coord?: { z: number; x: number; y: number } };
    type?: string;
  }): void {
    const error_obj = e.error;
    const errorMessage = error_obj?.message || 'Map error occurred';
    const errorUrl = error_obj?.url || 'unknown';
    const errorStatus = error_obj?.status;

    const errorType = categorizeError(errorUrl, errorMessage);

    switch (errorType) {
      case 'resource':
        handleResourceError(errorUrl, errorStatus, e.tile?.coord);
        return; // Don't propagate resource errors to UI

      case 'critical':
        error = `Critical map error: ${errorMessage}`;
        dispatch('error', errorMessage);
        console.error('Critical map error:', e);
        break;

      case 'warning':
        console.warn('Non-critical map warning:', errorMessage, e);
        break;
    }
  }

  /**
   * Handle tap gesture on map
   */
  function handleTapGesture(gesture: TapGesture): void {
    if (!map) return;

    const lngLat = map.unproject([gesture.point.x, gesture.point.y]);
    dispatch('tap', gesture);
    dispatch('mapclick', {
      lngLat: [lngLat.lng, lngLat.lat],
      point: [gesture.point.x, gesture.point.y]
    });
  }

  /**
   * Handle double tap gesture for zoom
   */
  function handleDoubleTapGesture(gesture: TapGesture): void {
    if (!map) return;

    const lngLat = map.unproject([gesture.point.x, gesture.point.y]);
    map.flyTo({
      center: [lngLat.lng, lngLat.lat],
      zoom: map.getZoom() + 1,
      duration: 300
    });
  }

  /**
   * Handle swipe gesture for panning
   */
  function handleSwipeGesture(gesture: SwipeGesture): void {
    dispatch('swipe', gesture);
    if (!map) return;

    const currentCenter = map.getCenter();
    const panDistance = Math.min(gesture.velocity * 100, 0.01); // Limit max pan
    let newCenter: [number, number] = [currentCenter.lng, currentCenter.lat];

    switch (gesture.direction) {
      case 'up':
        newCenter[1] += panDistance;
        break;
      case 'down':
        newCenter[1] -= panDistance;
        break;
      case 'left':
        newCenter[0] += panDistance;
        break;
      case 'right':
        newCenter[0] -= panDistance;
        break;
    }

    map.flyTo({
      center: newCenter,
      zoom: map.getZoom(),
      duration: 300
    });
  }

  /**
   * Handle pinch gesture for zoom
   */
  function handlePinchGesture(gesture: PinchGesture): void {
    dispatch('pinch', gesture);
    if (!map) return;

    const currentZoom = map.getZoom();
    const zoomDelta = Math.log2(gesture.scale);
    const newZoom = Math.max(0, Math.min(22, currentZoom + zoomDelta));
    const lngLat = map.unproject([gesture.center.x, gesture.center.y]);

    map.flyTo({
      center: [lngLat.lng, lngLat.lat],
      zoom: newZoom,
      duration: 100
    });
  }

  /**
   * Handle long press for waypoint creation
   */
  function handleLongPressGesture(gesture: any): void {
    if (!map) return;

    const lngLat = map.unproject([gesture.point.x, gesture.point.y]);

    // Haptic feedback if supported
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    dispatch('mapclick', {
      lngLat: [lngLat.lng, lngLat.lat],
      point: [gesture.point.x, gesture.point.y],
      isLongPress: true
    } as MapClickEvent & { isLongPress: boolean });
  }

  /**
   * Set up touch gestures for mobile interaction
   */
  function setupTouchGestures(): void {
    if (!mapContainer || touchGestureCleanup) return;

    touchGestureCleanup = addTouchGestures(mapContainer, {
      onGestureStart: () => {
        isGestureActive = true;
      },
      onGestureEnd: () => {
        isGestureActive = false;
      },
      onTap: handleTapGesture,
      onDoubleTap: handleDoubleTapGesture,
      onSwipe: handleSwipeGesture,
      onPinch: handlePinchGesture,
      onLongPress: handleLongPressGesture
    });

    console.log('Touch gestures set up for map');
  }

  /**
   * Add a GeoJSON source safely
   */
  function addGeoJsonSource(id: string): boolean {
    if (!map || map.getSource(id)) return true;

    try {
      map.addSource(id, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });
      return true;
    } catch (error) {
      console.error(`Failed to add ${id} source:`, error);
      return false;
    }
  }

  /**
   * Add waypoint layers with styling
   */
  function addWaypointLayers(): void {
    if (!map) return;

    // Add waypoint circles
    if (!map.getLayer('waypoints')) {
      try {
        map.addLayer({
          id: 'waypoints',
          type: 'circle',
          source: 'mission-items',
          paint: {
            'circle-radius': 8,
            'circle-color': $theme?.components.map.waypoint_color_default || '#00bfff',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });
      } catch (error) {
        console.error('Failed to add waypoints layer:', error);
      }
    }

    // Add selected waypoint layer
    if (!map.getLayer('waypoints-selected')) {
      try {
        map.addLayer({
          id: 'waypoints-selected',
          type: 'circle',
          source: 'mission-items',
          filter: ['==', ['get', 'selected'], true],
          paint: {
            'circle-radius': 12,
            'circle-color': $theme?.components.map.waypoint_color_selected || '#ffd700',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff'
          }
        });
      } catch (error) {
        console.error('Failed to add waypoints-selected layer:', error);
      }
    }
  }

  /**
   * Add path and label layers
   */
  function addPathAndLabelLayers(): void {
    if (!map) return;

    // Add mission path layer
    if (!map.getLayer('mission-path')) {
      try {
        map.addLayer({
          id: 'mission-path',
          type: 'line',
          source: 'mission-path',
          paint: {
            'line-color': $theme?.components.map.path_color || '#00ff88',
            'line-width': 3,
            'line-opacity': 0.8
          }
        });
      } catch (error) {
        console.error('Failed to add mission-path layer:', error);
      }
    }

    // Add waypoint labels
    if (!map.getLayer('waypoint-labels')) {
      try {
        map.addLayer({
          id: 'waypoint-labels',
          type: 'symbol',
          source: 'mission-items',
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
            'text-offset': [0, 1.5],
            'text-anchor': 'top',
            'text-size': 12,
            'text-allow-overlap': false,
            'text-ignore-placement': false
          },
          paint: {
            'text-color': $theme?.colors.text_primary || '#ffffff',
            'text-halo-color': $theme?.colors.background_primary || '#000000',
            'text-halo-width': 2,
            'text-halo-blur': 1
          }
        });
      } catch (error) {
        console.warn('Failed to add waypoint-labels layer:', error);
      }
    }
  }

  /**
   * Add mission-related layers to the map with robust error handling
   */
  function addMissionLayers(): void {
    if (!map || !mapLoaded) return;

    // Add sources first
    const itemsSourceAdded = addGeoJsonSource('mission-items');
    const pathSourceAdded = addGeoJsonSource('mission-path');

    if (!itemsSourceAdded || !pathSourceAdded) {
      console.error('Failed to add required sources, aborting layer creation');
      return;
    }

    // Add layers
    addWaypointLayers();
    addPathAndLabelLayers();

    console.log('Mission layers added to map');
  }

  /**
   * Update waypoint layer colors
   * NASA JPL Rule 4: Function under 60 lines
   */
  function updateWaypointColors(): void {
    if (!map || !$theme) return;

    // Update default waypoint color
    if (map.getLayer('waypoints')) {
      try {
        map.setPaintProperty(
          'waypoints',
          'circle-color',
          $theme.components?.map?.waypoint_color_default || '#00bfff'
        );
      } catch (paintError) {
        console.warn('Failed to update waypoints color:', paintError);
      }
    }

    // Update selected waypoint color
    if (map.getLayer('waypoints-selected')) {
      try {
        map.setPaintProperty(
          'waypoints-selected',
          'circle-color',
          $theme.components?.map?.waypoint_color_selected || '#ffd700'
        );
      } catch (paintError) {
        console.warn('Failed to update waypoints-selected color:', paintError);
      }
    }
  }

  /**
   * Update path and label colors
   * NASA JPL Rule 4: Function under 60 lines
   */
  function updatePathAndLabelColors(): void {
    if (!map || !$theme) return;

    // Update path color
    if (map.getLayer('mission-path')) {
      try {
        map.setPaintProperty(
          'mission-path',
          'line-color',
          $theme.components?.map?.path_color || '#00ff88'
        );
      } catch (paintError) {
        console.warn('Failed to update mission-path color:', paintError);
      }
    }

    // Update label colors
    if (map.getLayer('waypoint-labels')) {
      try {
        map.setPaintProperty(
          'waypoint-labels',
          'text-color',
          $theme.colors?.text_primary || '#ffffff'
        );
        map.setPaintProperty(
          'waypoint-labels',
          'text-halo-color',
          $theme.colors?.background_primary || '#000000'
        );
      } catch (paintError) {
        console.warn('Failed to update waypoint-labels colors:', paintError);
      }
    }
  }

  /**
   * Update map styling based on current theme
   * NASA JPL Rule 4: Function under 60 lines (now 15 lines)
   */
  function updateMapTheme(): void {
    if (!map || !mapLoaded || !$theme) return;

    try {
      updateWaypointColors();
      updatePathAndLabelColors();
      console.log('Map theme updated successfully');
    } catch (err) {
      console.error('Failed to update map theme:', err);
    }
  }

  /**
   * Validate mission item position
   */
  function isValidPosition(position: any): position is { lng: number; lat: number } {
    return (
      position &&
      typeof position.lng === 'number' &&
      typeof position.lat === 'number' &&
      !isNaN(position.lng) &&
      !isNaN(position.lat) &&
      position.lng >= -180 &&
      position.lng <= 180 &&
      position.lat >= -90 &&
      position.lat <= 90
    );
  }

  /**
   * Convert mission items to GeoJSON features
   */
  function missionItemsToFeatures() {
    return missionItems
      .filter((item) => isValidPosition(item.position))
      .map((item) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [item.position!.lng, item.position!.lat]
        },
        properties: {
          id: item.id || 'unknown',
          name: item.name || 'Unnamed',
          type: item.type || 'waypoint',
          selected: item.id === selectedItemId
        }
      }));
  }

  /**
   * Update GeoJSON source data
   */
  function updateGeoJsonSource(sourceId: string, data: any): boolean {
    if (!map) return false;

    try {
      const source = map.getSource(sourceId);
      if (source && source.type === 'geojson') {
        (source as any).setData(data);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to update ${sourceId} source:`, error);
      return false;
    }
  }

  /**
   * Create mission path from features
   */
  function createMissionPath(features: any[]) {
    if (features.length < 2) return null;

    return {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: features.map((f) => f.geometry.coordinates)
      },
      properties: {}
    };
  }

  /**
   * Update mission items on the map with comprehensive error handling
   */
  function updateMissionItems(): void {
    if (!map || !mapLoaded) return;

    try {
      // Convert and validate features
      const features = missionItemsToFeatures();

      // Update mission items source
      const itemsUpdated = updateGeoJsonSource('mission-items', {
        type: 'FeatureCollection',
        features
      });

      if (!itemsUpdated) {
        console.error('Failed to update mission items, aborting');
        return;
      }

      // Update mission path
      const pathFeature = createMissionPath(features);
      const pathData = {
        type: 'FeatureCollection',
        features: pathFeature ? [pathFeature] : []
      };

      updateGeoJsonSource('mission-path', pathData);

      console.log(`Successfully updated ${features.length} mission items on map`);
    } catch (err) {
      console.error('Failed to update mission items:', err);
    }
  }

  /**
   * Highlight the selected mission item
   */
  function highlightSelectedItem(): void {
    if (!map || !mapLoaded || !selectedItemId) return;

    try {
      // Find the selected item
      const selectedItem = missionItems.find((item) => item.id === selectedItemId);
      if (selectedItem && selectedItem.position) {
        // Pan to the selected item
        map.flyTo({
          center: [selectedItem.position.lng, selectedItem.position.lat],
          zoom: Math.max(map.getZoom(), 15),
          duration: 1000
        });
      }

      // Update the selected state in the data
      updateMissionItems();

      console.log(`Highlighted selected item: ${selectedItemId}`);
    } catch (err) {
      console.error('Failed to highlight selected item:', err);
    }
  }

  /**
   * Get current viewport for map features
   */
  export function getViewport(): MapViewport | null {
    if (!map) return null;
    
    const bounds = map.getBounds();
    const center = map.getCenter();
    const zoom = map.getZoom();
    const bearing = map.getBearing();
    const pitch = map.getPitch();
    const container = map.getContainer();
    
    return {
      center: { lng: center.lng, lat: center.lat },
      zoom,
      bearing,
      pitch,
      bounds: {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      },
      width: container.offsetWidth,
      height: container.offsetHeight
    };
  }

  /**
   * Cleanup map resources - NASA JPL Rule 2: Bounded memory
   */
  function cleanup(): void {
    // Remove all event listeners first
    if (map) {
      map.off('load', handleMapLoad);
      map.off('click', handleMapClick);
      map.off('touchstart', handleMapTouchStart);
      map.off('error', handleMapError);
    }

    // Cleanup touch gestures
    if (touchGestureCleanup) {
      touchGestureCleanup();
      touchGestureCleanup = null;
    }

    // Clear mission data to free memory
    missionItems.length = 0;

    // Remove map instance
    if (map) {
      map.remove();
      map = null;
      mapLoaded = false;
    }

    // Clear any error state
    error = null;
    
    // Force garbage collection hint
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as any).gc();
    }
  }

  // ===== LIFECYCLE =====
  onMount(() => {
    // Initialize map after component mounts
    if (mapContainer) {
      initializeMap();
    }
  });

  onDestroy(() => {
    cleanup();
  });
</script>

<!-- ===== TEMPLATE ===== -->
<div class="map-viewer" data-testid="map-viewer">
  {#if error}
    <div class="error-state" data-testid="map-error">
      <div class="error-content">
        <h3>Map Error</h3>
        <p>{error}</p>
        <button
          class="retry-button"
          on:click={() => {
            error = null;
            initializeMap();
          }}
        >
          Retry
        </button>
      </div>
    </div>
  {:else}
    <div class="map-container" bind:this={mapContainer} data-testid="map-container"></div>

    {#if !mapLoaded}
      <div class="loading-overlay" data-testid="map-loading">
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <span>Loading map...</span>
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- ===== STYLES ===== -->
<style>
  .map-viewer {
    position: relative;
    width: 100%;
    height: 100%;
    background-color: var(--color-background_secondary);
    border-radius: var(--layout-border_radius);
    overflow: hidden;
  }

  .map-container {
    width: 100%;
    height: 100%;
    cursor: crosshair; /* Indicate waypoint creation capability */
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--layout-spacing_unit);
    color: var(--color-text_primary);
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-background_tertiary);
    border-top: 3px solid var(--color-accent_blue);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .error-state {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background-color: var(--color-background_secondary);
  }

  .error-content {
    text-align: center;
    padding: calc(var(--layout-spacing_unit) * 3);
    background-color: var(--color-background_tertiary);
    border-radius: var(--layout-border_radius);
    border: var(--layout-border_width) solid var(--color-accent_red);
  }

  .error-content h3 {
    color: var(--color-accent_red);
    margin: 0 0 var(--layout-spacing_unit) 0;
    font-size: var(--typography-font_size_lg);
  }

  .error-content p {
    color: var(--color-text_secondary);
    margin: 0 0 calc(var(--layout-spacing_unit) * 2) 0;
    font-size: var(--typography-font_size_base);
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

  /* MapLibre GL JS CSS overrides for theming */
  :global(.maplibregl-ctrl-group) {
    background-color: var(--color-background_tertiary) !important;
    border-radius: var(--layout-border_radius) !important;
  }

  /* Force crosshair cursor for waypoint creation */
  :global(.maplibregl-canvas-container canvas) {
    cursor: crosshair !important;
  }

  :global(.maplibregl-canvas) {
    cursor: crosshair !important;
  }

  :global(.maplibregl-ctrl-group button) {
    background-color: transparent !important;
    color: var(--color-text_primary) !important;
  }

  :global(.maplibregl-ctrl-group button:hover) {
    background-color: var(--color-background_secondary) !important;
  }

  :global(.maplibregl-popup-content) {
    background-color: var(--color-background_tertiary) !important;
    color: var(--color-text_primary) !important;
    border-radius: var(--layout-border_radius) !important;
  }

  :global(.maplibregl-popup-anchor-bottom .maplibregl-popup-tip) {
    border-top-color: var(--color-background_tertiary) !important;
  }

  :global(.maplibregl-popup-anchor-top .maplibregl-popup-tip) {
    border-bottom-color: var(--color-background_tertiary) !important;
  }

  :global(.maplibregl-popup-anchor-left .maplibregl-popup-tip) {
    border-right-color: var(--color-background_tertiary) !important;
  }

  :global(.maplibregl-popup-anchor-right .maplibregl-popup-tip) {
    border-left-color: var(--color-background_tertiary) !important;
  }
</style>
