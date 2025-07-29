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
   * Initialize the MapLibre GL JS map
   */
  function initializeMap(): void {
    try {
      map = new Map({
        container: mapContainer,
        style: {
          version: 8,
          sources: {
            'raster-tiles': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'simple-tiles',
              type: 'raster',
              source: 'raster-tiles',
              minzoom: 0,
              maxzoom: 22
            }
          ],
          // Add glyphs for text rendering
          glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf'
        },
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

      // Add navigation controls (hide on mobile to save space)
      if (!$isMobile) {
        map.addControl(new NavigationControl(), 'top-right');
      }
      map.addControl(new ScaleControl(), 'bottom-left');

      // Set up event listeners
      map.on('load', handleMapLoad);
      map.on('click', handleMapClick);
      map.on('touchstart', handleMapTouchStart);
      map.on('error', handleMapError);

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
   * Handle map errors
   */
  function handleMapError(e: { error?: { message?: string } }): void {
    const errorMessage = e.error?.message || 'Map error occurred';
    error = errorMessage;
    dispatch('error', errorMessage);
    console.error('Map error:', e);
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

      onTap: (gesture) => {
        // Convert screen coordinates to map coordinates
        if (map) {
          const lngLat = map.unproject([gesture.point.x, gesture.point.y]);
          dispatch('tap', gesture);
          dispatch('mapclick', {
            lngLat: [lngLat.lng, lngLat.lat],
            point: [gesture.point.x, gesture.point.y]
          });
        }
      },

      onDoubleTap: (gesture) => {
        // Zoom in on double tap
        if (map) {
          const lngLat = map.unproject([gesture.point.x, gesture.point.y]);
          map.flyTo({
            center: [lngLat.lng, lngLat.lat],
            zoom: map.getZoom() + 1,
            duration: 300
          });
        }
      },

      onSwipe: (gesture) => {
        dispatch('swipe', gesture);

        // Handle swipe gestures for map navigation
        if (map) {
          const currentCenter = map.getCenter();
          const currentZoom = map.getZoom();

          // Calculate pan distance based on swipe velocity and direction
          const panDistance = Math.min(gesture.velocity * 100, 0.01); // Limit max pan

          let newCenter: [number, number] = [currentCenter.lng, currentCenter.lat];
          switch (gesture.direction) {
            case 'up':
              newCenter = [currentCenter.lng, currentCenter.lat + panDistance];
              break;
            case 'down':
              newCenter = [currentCenter.lng, currentCenter.lat - panDistance];
              break;
            case 'left':
              newCenter = [currentCenter.lng + panDistance, currentCenter.lat];
              break;
            case 'right':
              newCenter = [currentCenter.lng - panDistance, currentCenter.lat];
              break;
          }

          map.flyTo({
            center: newCenter,
            zoom: currentZoom,
            duration: 300
          });
        }
      },

      onPinch: (gesture) => {
        dispatch('pinch', gesture);

        // Handle pinch-to-zoom
        if (map) {
          const currentZoom = map.getZoom();
          const zoomDelta = Math.log2(gesture.scale);
          const newZoom = Math.max(0, Math.min(22, currentZoom + zoomDelta));

          // Convert screen center to map coordinates
          const lngLat = map.unproject([gesture.center.x, gesture.center.y]);

          map.flyTo({
            center: [lngLat.lng, lngLat.lat],
            zoom: newZoom,
            duration: 100
          });
        }
      },

      onLongPress: (gesture) => {
        // Show context menu or waypoint creation on long press
        if (map) {
          const lngLat = map.unproject([gesture.point.x, gesture.point.y]);

          // Haptic feedback if supported
          if ('vibrate' in navigator) {
            navigator.vibrate(50);
          }

          // Dispatch as a special map click for waypoint creation
          dispatch('mapclick', {
            lngLat: [lngLat.lng, lngLat.lat],
            point: [gesture.point.x, gesture.point.y],
            isLongPress: true
          } as MapClickEvent & { isLongPress: boolean });
        }
      }
    });

    console.log('Touch gestures set up for map');
  }

  /**
   * Add mission-related layers to the map
   */
  function addMissionLayers(): void {
    if (!map || !mapLoaded) return;

    try {
      // Add mission items source
      if (!map.getSource('mission-items')) {
        map.addSource('mission-items', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });
      }

      // Add mission path source
      if (!map.getSource('mission-path')) {
        map.addSource('mission-path', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });
      }

      // Add waypoint circles layer
      if (!map.getLayer('waypoints')) {
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
      }

      // Add selected waypoint layer
      if (!map.getLayer('waypoints-selected')) {
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
      }

      // Add mission path layer
      if (!map.getLayer('mission-path')) {
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
      }

      // Add waypoint labels layer
      if (!map.getLayer('waypoint-labels')) {
        map.addLayer({
          id: 'waypoint-labels',
          type: 'symbol',
          source: 'mission-items',
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Noto Sans Regular', 'Arial Unicode MS Regular'],
            'text-offset': [0, 1.5],
            'text-anchor': 'top',
            'text-size': 12
          },
          paint: {
            'text-color': $theme?.colors.text_primary || '#ffffff',
            'text-halo-color': $theme?.colors.background_primary || '#000000',
            'text-halo-width': 1
          }
        });
      }

      console.log('Mission layers added to map');
    } catch (err) {
      console.error('Failed to add mission layers:', err);
    }
  }

  /**
   * Update map styling based on current theme
   */
  function updateMapTheme(): void {
    if (!map || !mapLoaded || !$theme) return;

    try {
      // Update waypoint colors
      if (map.getLayer('waypoints')) {
        map.setPaintProperty(
          'waypoints',
          'circle-color',
          $theme.components.map.waypoint_color_default
        );
      }

      if (map.getLayer('waypoints-selected')) {
        map.setPaintProperty(
          'waypoints-selected',
          'circle-color',
          $theme.components.map.waypoint_color_selected
        );
      }

      // Update path color
      if (map.getLayer('mission-path')) {
        map.setPaintProperty('mission-path', 'line-color', $theme.components.map.path_color);
      }

      // Update label colors
      if (map.getLayer('waypoint-labels')) {
        map.setPaintProperty('waypoint-labels', 'text-color', $theme.colors.text_primary);
        map.setPaintProperty(
          'waypoint-labels',
          'text-halo-color',
          $theme.colors.background_primary
        );
      }

      console.log('Map theme updated');
    } catch (err) {
      console.error('Failed to update map theme:', err);
    }
  }

  /**
   * Update mission items on the map
   */
  function updateMissionItems(): void {
    if (!map || !mapLoaded) return;

    try {
      // Convert mission items to GeoJSON features
      const features = missionItems
        .filter((item) => item.position)
        .map((item) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [item.position!.lng, item.position!.lat]
          },
          properties: {
            id: item.id,
            name: item.name,
            type: item.type,
            selected: item.id === selectedItemId
          }
        }));

      // Update mission items source
      const source = map.getSource('mission-items');
      if (source && source.type === 'geojson') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (source as any).setData({
          type: 'FeatureCollection',
          features
        });
      }

      // Create path line if we have multiple waypoints
      if (features.length > 1) {
        const pathFeature = {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: features.map((f) => f.geometry.coordinates)
          },
          properties: {}
        };

        const pathSource = map.getSource('mission-path');
        if (pathSource && pathSource.type === 'geojson') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (pathSource as any).setData({
            type: 'FeatureCollection',
            features: [pathFeature]
          });
        }
      }

      console.log(`Updated ${features.length} mission items on map`);
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
   * Cleanup map resources
   */
  function cleanup(): void {
    if (touchGestureCleanup) {
      touchGestureCleanup();
      touchGestureCleanup = null;
    }

    if (map) {
      map.remove();
      map = null;
      mapLoaded = false;
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
