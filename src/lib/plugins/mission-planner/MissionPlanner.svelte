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
  import WaypointCardManager from './WaypointCardManager.svelte';
  import NotificationSystem from '$lib/map-features/messaging/NotificationSystem.svelte';
  import { notify } from '$lib/map-features/messaging/notification-store';
  import ContextMenu from '$lib/components/ui/ContextMenu.svelte';
  import type { ContextMenuItem } from '$lib/components/ui/ContextMenu.svelte';
  import ComponentPalette from '$lib/components/ui/ComponentPalette.svelte';
  import type { PaletteComponent } from '$lib/components/ui/ComponentPalette.svelte';
  import DraggableContainer144fps from '$lib/components/ui/DraggableContainer144fps.svelte';
  import DynamicComponentLoader from './DynamicComponentLoader.svelte';
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

  // Context menu state
  let contextMenuVisible = false;
  let contextMenuX = 0;
  let contextMenuY = 0;
  let contextMenuItems: ContextMenuItem[] = [];

  // Component palette state
  let showComponentPalette = false;
  let paletteCollapsed = true;

  // Header visibility
  let showHeader = true;

  // Dynamic components
  let dynamicComponents: Array<{
    id: string;
    component: any;
    props: Record<string, any>;
    position: { x: number; y: number };
  }> = [];

  // Waypoint card manager
  let waypointCardManager: WaypointCardManager;
  let showWaypointCards: Set<string> = new Set();

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
  async function handleCoordinateSelect(
    event: CustomEvent<{ coordinate: Coordinate; latLng: LatLng }>
  ) {
    const { latLng } = event.detail;

    try {
      // Create a new waypoint at the selected location
      const newWaypoint: MissionItem = {
        id: `waypoint-${Date.now()}`,
        type: 'waypoint',
        name: `Waypoint ${$missionItems.length + 1}`,
        sequence: $missionItems.length + 1,
        lat: latLng.lat,
        lng: latLng.lng,
        altitude: 100,
        params: {
          lat: latLng.lat,
          lng: latLng.lng,
          alt: 100,
          speed: 10,
          hold_time: 5,
          acceptance_radius: 10,
          pass_radius: 5,
          yaw_angle: 0
        } as WaypointParams,
        position: {
          lat: latLng.lat,
          lng: latLng.lng,
          alt: 100
        }
      };

      await addMissionItem(newWaypoint);
      await selectMissionItem(newWaypoint.id);

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
        sequence: $missionItems.length + 1,
        lat: lngLat[1], // lat is second element
        lng: lngLat[0], // lng is first element
        altitude: 100, // Default altitude
        params: {
          lat: lngLat[1],
          lng: lngLat[0],
          alt: 100,
          speed: 10,
          hold_time: 5,
          acceptance_radius: 10,
          pass_radius: 5,
          yaw_angle: 0
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
      await selectMissionItem(newWaypoint.id);

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
  async function handleSelectItem(event: CustomEvent<{ id: string | null }>): Promise<void> {
    await selectMissionItem(event.detail.id);
  }

  /**
   * Handle mission item update
   */
  async function handleUpdateItem(event: CustomEvent<{ id: string; params: any }>): Promise<void> {
    try {
      const item = $missionItems.find((i) => i.id === event.detail.id);
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
  async function handleReorderItems(event: CustomEvent<{ items: MissionItem[] }>): Promise<void> {
    // Update store with reordered items
    await setMissionItems(event.detail.items);
  }

  /**
   * Handle waypoint card events
   */
  function handleWaypointCardUpdate(event: CustomEvent<{ id: string; params: any }>) {
    handleUpdateItem(event);
  }

  function handleWaypointCardDelete(event: CustomEvent<{ id: string }>) {
    handleDeleteItem(event);
  }

  function handleWaypointCardSelect(event: CustomEvent<{ id: string | null }>) {
    handleSelectItem(event);
  }

  function handleWaypointCardMinimized(event: CustomEvent<{ id: string; minimized: boolean }>) {
    console.log(`Waypoint card ${event.detail.id} minimized: ${event.detail.minimized}`);
  }

  /**
   * Handle waypoint card creation
   */
  function handleCreateWaypointCard(event: CustomEvent<{ itemId: string }>) {
    const itemId = event.detail.itemId;
    showWaypointCards.add(itemId);
    showWaypointCards = showWaypointCards; // Trigger reactivity

    notify({
      type: 'info',
      title: 'Waypoint Card Created',
      message: `Individual waypoint card created for ${$missionItems.find((i) => i.id === itemId)?.name || 'waypoint'}`
    });
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
   * NASA JPL Rule 5: Enhanced map ready handling with mission data validation
   */
  function handleMapReady(): void {
    console.log('Map is ready');
    
    // Initialize viewport
    updateViewport();
    
    // Log current mission items state for debugging
    console.log(`Map ready: ${$missionItems.length} mission items available`);
    if ($missionItems.length === 0) {
      console.warn('No mission items found - map will appear empty');
    } else {
      console.log('Mission items ready for map display:', $missionItems.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        position: item.position,
        hasParams: !!(item.params?.lat && item.params?.lng),
        hasLegacy: !!(item.lat && item.lng)
      })));
    }
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
   * NASA JPL Rule 5: Enhanced initialization with better error handling and debugging
   */
  async function initializeMissionPlanner(): Promise<void> {
    try {
      console.log('Initializing Mission Planner...');
      
      // Load mission data from backend
      const loadedItems = await loadMissionData();
      console.log(`Mission Planner initialized with ${loadedItems.length} mission items:`);
      
      // Log each mission item for debugging
      loadedItems.forEach((item, index) => {
        const hasPosition = item.position ? 'with position' : 'no position';
        const hasParams = item.params?.lat && item.params?.lng ? 'with params coords' : 'no params coords';
        const hasLegacy = item.lat && item.lng ? 'with legacy coords' : 'no legacy coords';
        console.log(`  ${index + 1}. ${item.name} (${item.type}) - ${hasPosition}, ${hasParams}, ${hasLegacy}`);
      });

      // Show component palette on first launch
      if (loadedItems.length > 0) {
        showComponentPalette = true;
        paletteCollapsed = false;
      }
      
      console.log('Mission Planner initialization complete');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to initialize Mission Planner';
      console.error('Mission Planner initialization failed:', err);
    }
  }

  /**
   * Handle context menu on header/top bar
   */
  function handleHeaderContextMenu(event: MouseEvent): void {
    event.preventDefault();

    contextMenuItems = [
      {
        id: 'hide-header',
        label: 'Hide This Bar',
        icon: '👁️',
        action: () => {
          showHeader = false;
        }
      },
      {
        id: 'toggle-palette',
        label: showComponentPalette ? 'Hide Component Library' : 'Show Component Library',
        icon: '🧩',
        action: () => {
          showComponentPalette = !showComponentPalette;
          if (showComponentPalette) {
            paletteCollapsed = false;
          }
        }
      },
      {
        id: 'divider-1',
        divider: true,
        label: ''
      },
      {
        id: 'ui-components',
        label: 'Core Components',
        icon: 'components',
        submenu: [
          {
            id: 'show-mission',
            label: showMissionAccordion ? 'Hide Mission List' : 'Show Mission List',
            icon: '📋',
            action: () => {
              showMissionAccordion = !showMissionAccordion;
            }
          },
          {
            id: 'show-tools',
            label: showMapTools ? 'Hide Map Tools' : 'Show Map Tools',
            icon: '🛠️',
            action: () => {
              showMapTools = !showMapTools;
            }
          },
          {
            id: 'show-messaging',
            label: showMessaging ? 'Hide Messages' : 'Show Messages',
            icon: '💬',
            action: () => {
              showMessaging = !showMessaging;
            }
          }
        ]
      },
      {
        id: 'add-components',
        label: 'Add Components',
        icon: '➕',
        submenu: [
          {
            id: 'add-telemetry',
            label: 'Telemetry Panel',
            icon: '📊',
            action: () => spawnComponent('telemetry-panel', 'TelemetryPanel', 'Telemetry')
          },
          {
            id: 'add-attitude',
            label: 'Attitude Indicator',
            icon: '✈️',
            action: () => spawnComponent('attitude-indicator', 'AttitudeIndicator', 'Attitude')
          },
          {
            id: 'add-flight-params',
            label: 'Flight Parameters',
            icon: '⚙️',
            action: () => spawnComponent('flight-params', 'FlightParamsPanel', 'Flight Parameters')
          },
          {
            id: 'add-performance',
            label: 'Performance Monitor',
            icon: '📈',
            action: () => spawnComponent('performance', 'PerformanceDashboard', 'Performance')
          },
          {
            id: 'add-waypoint-card',
            label: 'Waypoint Card',
            icon: '📍',
            action: () => spawnComponent('waypoint-card', 'WaypointCard', 'Waypoint')
          }
        ]
      },
      {
        id: 'map-features',
        label: 'Map Features',
        icon: '🗺️',
        submenu: [
          {
            id: 'toggle-crosshair',
            label: showCrosshair ? 'Hide Crosshair' : 'Show Crosshair',
            icon: '✚',
            action: () => {
              showCrosshair = !showCrosshair;
            }
          },
          {
            id: 'toggle-adsb',
            label: showADSB ? 'Hide ADS-B' : 'Show ADS-B',
            icon: '✈️',
            action: () => {
              showADSB = !showADSB;
            }
          },
          {
            id: 'toggle-weather',
            label: showWeather ? 'Hide Weather' : 'Show Weather',
            icon: '🌦️',
            action: () => {
              showWeather = !showWeather;
            }
          }
        ]
      },
      {
        id: 'divider-2',
        divider: true,
        label: ''
      },
      {
        id: 'layout-actions',
        label: 'Layout',
        icon: '📐',
        submenu: [
          {
            id: 'save-layout',
            label: 'Save Layout',
            icon: '💾',
            shortcut: 'Ctrl+S',
            action: saveLayout
          },
          {
            id: 'load-layout',
            label: 'Load Layout',
            icon: '📂',
            shortcut: 'Ctrl+O',
            action: loadLayout
          },
          {
            id: 'reset-layout',
            label: 'Reset Layout',
            icon: '🔄',
            action: resetLayout
          }
        ]
      },
      {
        id: 'fullscreen',
        label: 'Toggle Fullscreen',
        icon: '🔳',
        shortcut: 'F11',
        action: toggleFullscreen
      }
    ];

    contextMenuX = event.clientX;
    contextMenuY = event.clientY;
    contextMenuVisible = true;
  }

  /**
   * Handle long touch on header
   */
  let touchTimer: number | null = null;
  let touchStartX = 0;
  let touchStartY = 0;

  function handleHeaderTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;

    touchTimer = window.setTimeout(() => {
      event.preventDefault();
      contextMenuX = touchStartX;
      contextMenuY = touchStartY;
      contextMenuVisible = true;
      handleHeaderContextMenu(
        new MouseEvent('contextmenu', {
          clientX: touchStartX,
          clientY: touchStartY
        })
      );
    }, 600); // 600ms for long touch
  }

  function handleHeaderTouchEnd(): void {
    if (touchTimer) {
      clearTimeout(touchTimer);
      touchTimer = null;
    }
  }

  function handleHeaderTouchMove(): void {
    if (touchTimer) {
      clearTimeout(touchTimer);
      touchTimer = null;
    }
  }

  /**
   * Handle component spawn from palette
   */
  function handleComponentSpawn(
    event: CustomEvent<{ component: PaletteComponent; position: { x: number; y: number } }>
  ): void {
    const { component, position } = event.detail;

    // Create unique ID for the dynamic component
    const componentId = `${component.id}-${Date.now()}`;

    // Add to dynamic components array
    dynamicComponents = [
      ...dynamicComponents,
      {
        id: componentId,
        component: component.component,
        props: {
          id: componentId,
          title: component.name,
          initialX: position.x,
          initialY: position.y,
          ...component.defaultProps
        },
        position
      }
    ];

    notify({
      type: 'success',
      message: `Added ${component.name} to workspace`,
      duration: 2000
    });
  }

  /**
   * Spawn a component programmatically from context menu
   */
  function spawnComponent(id: string, component: string, title: string): void {
    const componentId = `${id}-${Date.now()}`;

    // Calculate spawn position (center of viewport with some offset)
    const centerX = window.innerWidth / 2 - 200 + dynamicComponents.length * 30;
    const centerY = window.innerHeight / 2 - 150 + dynamicComponents.length * 30;

    dynamicComponents = [
      ...dynamicComponents,
      {
        id: componentId,
        component,
        props: {
          id: componentId,
          title,
          initialX: centerX,
          initialY: centerY,
          initialWidth: 400,
          initialHeight: 300
        },
        position: { x: centerX, y: centerY }
      }
    ];

    notify({
      type: 'success',
      message: `Added ${title} to workspace`,
      duration: 2000
    });
  }

  /**
   * Save current layout
   */
  function saveLayout(): void {
    const layout = {
      showMapTools,
      showMissionAccordion,
      showMessaging,
      showComponentPalette,
      paletteCollapsed,
      dynamicComponents: dynamicComponents.map((c) => ({
        id: c.id,
        component: c.component,
        props: c.props
      }))
    };

    localStorage.setItem('missionPlannerLayout', JSON.stringify(layout));
    notify({
      type: 'success',
      message: 'Layout saved successfully',
      duration: 2000
    });
  }

  /**
   * Load saved layout
   */
  function loadLayout(): void {
    const saved = localStorage.getItem('missionPlannerLayout');
    if (saved) {
      try {
        const layout = JSON.parse(saved);
        showMapTools = layout.showMapTools ?? true;
        showMissionAccordion = layout.showMissionAccordion ?? true;
        showMessaging = layout.showMessaging ?? true;
        showComponentPalette = layout.showComponentPalette ?? false;
        paletteCollapsed = layout.paletteCollapsed ?? true;
        dynamicComponents = layout.dynamicComponents || [];

        notify({
          type: 'success',
          message: 'Layout loaded successfully',
          duration: 2000
        });
      } catch (err) {
        notify({
          type: 'error',
          message: 'Failed to load saved layout',
          duration: 3000
        });
      }
    }
  }

  /**
   * Reset to default layout
   */
  function resetLayout(): void {
    showMapTools = true;
    showMissionAccordion = true;
    showMessaging = true;
    showComponentPalette = true;
    paletteCollapsed = false;
    dynamicComponents = [];

    notify({
      type: 'info',
      message: 'Layout reset to defaults',
      duration: 2000
    });
  }

  /**
   * Toggle fullscreen mode
   */
  function toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  // ===== LIFECYCLE =====
  onMount(() => {
    initializeMissionPlanner();
  });

  onDestroy(async () => {
    // Clear any selected items
    await selectMissionItem(null);
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
    <!-- Header bar for context menu -->
    {#if showHeader}
      <header
        class="mission-planner-header"
        on:contextmenu={handleHeaderContextMenu}
        on:touchstart={handleHeaderTouchStart}
        on:touchend={handleHeaderTouchEnd}
        on:touchmove={handleHeaderTouchMove}
      >
        <div class="header-content">
          <h2 class="header-title">Mission Planner</h2>
          <div class="header-hint">Right-click or long-touch for options</div>
        </div>
      </header>
    {:else}
      <!-- Small show header button when hidden -->
      <button
        class="show-header-button"
        on:click={() => (showHeader = true)}
        title="Show header bar"
      >
        ☰
      </button>
    {/if}

    <!-- Component palette -->
    {#if showComponentPalette}
      <ComponentPalette
        visible={showComponentPalette}
        position="top"
        collapsed={paletteCollapsed}
        on:spawn={handleComponentSpawn}
        on:toggle={(e) => (paletteCollapsed = e.detail.collapsed)}
      />
    {/if}

    <!-- Map fills remaining space -->
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
            showWeather = Object.values(e.detail.layers).some((v) => v);
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
          on:createWaypointCard={handleCreateWaypointCard}
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

      <!-- Individual Waypoint Cards -->
      <WaypointCardManager
        bind:this={waypointCardManager}
        missionItems={$missionItems}
        selectedItemId={$selectedMissionItem?.id || null}
        showAsCards={showWaypointCards}
        on:updateItem={handleWaypointCardUpdate}
        on:deleteItem={handleWaypointCardDelete}
        on:selectItem={handleWaypointCardSelect}
        on:cardMinimized={handleWaypointCardMinimized}
      />

      <!-- Dynamic components spawned from palette -->
      {#each dynamicComponents as dynComp (dynComp.id)}
        <DraggableContainer144fps
          {...dynComp.props}
          on:close={() => {
            dynamicComponents = dynamicComponents.filter((c) => c.id !== dynComp.id);
          }}
        >
          <DynamicComponentLoader component={dynComp.component} title={dynComp.props.title} />
        </DraggableContainer144fps>
      {/each}
    </div>
  {/if}

  <!-- Context Menu -->
  <ContextMenu
    visible={contextMenuVisible}
    x={contextMenuX}
    y={contextMenuY}
    items={contextMenuItems}
    on:close={() => (contextMenuVisible = false)}
  />

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

  /* Header bar */
  .mission-planner-header {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 48px;
    background: var(--color-background_secondary, #1a1a1a);
    border-bottom: 1px solid var(--color-border_primary, #333);
    z-index: 100;
    display: flex;
    align-items: center;
    padding: 0 20px;
    cursor: context-menu;
    user-select: none;
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .header-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-accent_blue, #00bfff);
    margin: 0;
  }

  .header-hint {
    font-size: 12px;
    color: var(--color-text_secondary, #999);
    opacity: 0.7;
  }

  /* Show header button */
  .show-header-button {
    position: absolute;
    top: 10px;
    left: 10px;
    width: 36px;
    height: 36px;
    background: var(--color-background_secondary, #1a1a1a);
    border: 1px solid var(--color-border_primary, #333);
    border-radius: 6px;
    color: var(--color-text_primary, #fff);
    font-size: 18px;
    cursor: pointer;
    z-index: 101;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .show-header-button:hover {
    background: var(--color-background_tertiary, #2a2a2a);
    border-color: var(--color-accent_blue, #00bfff);
    transform: scale(1.05);
  }

  .show-header-button:active {
    transform: scale(0.95);
  }

  /* Map fills remaining space below header and palette */
  .map-container {
    position: absolute;
    top: 48px; /* Account for header */
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
  }

  /* Map without header */
  .mission-planner:not(:has(.mission-planner-header)) .map-container {
    top: 0;
  }

  /* Adjust map when palette is visible */
  .mission-planner:has(.component-palette:not(.collapsed)) .map-container {
    top: 168px; /* Header (48px) + Expanded palette (120px) */
  }

  .mission-planner:has(.component-palette.collapsed) .map-container {
    top: 88px; /* Header (48px) + Collapsed palette (40px) */
  }

  /* Draggable components layer */
  .draggable-layer {
    position: absolute;
    top: 0; /* Start from top to ensure icons are above map */
    left: 0;
    right: 0;
    bottom: 0;
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

  /* Dynamic component placeholder */
  .dynamic-component-placeholder {
    padding: 20px;
    text-align: center;
    color: var(--color-text_secondary, #999);
  }

  .dynamic-component-placeholder h3 {
    color: var(--color-text_primary, #fff);
    margin-bottom: 10px;
  }

  .dynamic-component-placeholder p {
    margin: 5px 0;
    font-size: 14px;
  }

  /* Component palette should be in draggable layer to appear above map */
  .component-palette {
    position: relative;
    z-index: 15;
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .mission-planner * {
      transition-duration: var(--animations-reduced_motion_duration, 0ms) !important;
    }
  }
</style>
