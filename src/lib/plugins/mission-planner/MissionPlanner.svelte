<!--
  Mission Planner Plugin Component
  Two-panel layout with MapViewer and mission accordion
  Mobile-first responsive design with touch optimization
  Requirements: 4.1, 4.2, 4.3, 4.4, 4.9
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { isMobile, isTablet, currentBreakpoint } from '$lib/utils/responsive';
  import MapViewer from './MapViewer.svelte';
  import MissionAccordion from './MissionAccordion.svelte';
  import {
    missionItems,
    selectedMissionItem,
    loadMissionData,
    selectMissionItem,
    addMissionItem
  } from '$lib/stores/mission';
  import type { MapClickEvent, WaypointParams } from './types';

  // ===== STATE =====
  let error: string | null = null;
  let accordionCollapsed = false;

  // Responsive state
  $: isMobileDevice = $isMobile;
  $: isTabletDevice = $isTablet;
  $: breakpoint = $currentBreakpoint;

  // ===== FUNCTIONS =====

  /**
   * Handle map click events
   */
  function handleMapClick(event: CustomEvent<MapClickEvent>): void {
    const { lngLat } = event.detail;
    console.log('Map clicked at:', lngLat);

    // TODO: Add waypoint creation logic in future task
    // For now, just log the click
  }

  /**
   * Handle accordion item selection
   */
  function handleAccordionSelect(event: CustomEvent<{ itemId: string }>): void {
    selectMissionItem(event.detail.itemId);
  }

  /**
   * Handle accordion item minimize
   */
  function handleAccordionMinimize(event: CustomEvent<{ itemId: string }>): void {
    console.log('Minimize item:', event.detail.itemId);
    // TODO: Implement minimize to coin functionality in future task
  }

  /**
   * Handle accordion item update
   */
  function handleAccordionUpdate(
    event: CustomEvent<{ itemId: string; params: WaypointParams }>
  ): void {
    console.log('Update item:', event.detail.itemId, event.detail.params);
    // The update is already handled by the WaypointItem component
  }

  /**
   * Handle accordion errors
   */
  function handleAccordionError(event: CustomEvent<string>): void {
    error = event.detail;
    console.error('Accordion error:', error);
  }

  /**
   * Handle add waypoint request
   */
  async function handleAddWaypoint(): Promise<void> {
    try {
      // Create a new waypoint at the center of the current map view
      // In a real implementation, this would open a dialog or use the current map center
      const mapCenter = { lat: 37.7749, lng: -122.4194 }; // Default to San Francisco
      const newWaypoint = {
        id: `waypoint-${Date.now()}`,
        type: 'waypoint' as const,
        name: `Waypoint ${$missionItems.length + 1}`,
        params: {
          lat: mapCenter.lat,
          lng: mapCenter.lng,
          alt: 100,
          speed: 10
        },
        position: {
          lat: mapCenter.lat,
          lng: mapCenter.lng,
          alt: 100
        }
      };
      
      // Add the waypoint to the mission store
      await addMissionItem(newWaypoint);
      
      // Select the new waypoint
      selectMissionItem(newWaypoint.id);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to add waypoint';
      console.error('Failed to add waypoint:', err);
    }
  }

  /**
   * Handle map ready event
   */
  function handleMapReady(): void {
    console.log('Map is ready');
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

      // Auto-collapse accordion on mobile
      if (isMobileDevice) {
        accordionCollapsed = true;
      }

      console.log('Mission Planner initialized');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to initialize Mission Planner';
      console.error('Mission Planner initialization failed:', err);
    }
  }

  /**
   * Toggle accordion visibility on mobile
   */
  function toggleAccordion(): void {
    accordionCollapsed = !accordionCollapsed;
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
<div
  class="mission-planner"
  class:mobile={isMobileDevice}
  class:tablet={isTabletDevice}
  class:accordion-collapsed={accordionCollapsed}
  data-testid="mission-planner"
>
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
    <div class="map-container">
      <MapViewer
        selectedItemId={$selectedMissionItem?.id || null}
        missionItems={$missionItems}
        on:mapclick={handleMapClick}
        on:ready={handleMapReady}
        on:error={handleMapError}
      />

      {#if isMobileDevice}
        <button
          class="accordion-toggle"
          class:active={!accordionCollapsed}
          on:click={toggleAccordion}
          data-testid="accordion-toggle"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
          Mission Items
        </button>
      {/if}
    </div>

    <div class="accordion-container" class:collapsed={accordionCollapsed}>
      <MissionAccordion
        items={$missionItems}
        selectedItemId={$selectedMissionItem?.id || null}
        on:select={handleAccordionSelect}
        on:minimize={handleAccordionMinimize}
        on:update={handleAccordionUpdate}
        on:addWaypoint={handleAddWaypoint}
        on:error={handleAccordionError}
      />
    </div>
  {/if}
</div>

<style>
  /* Mobile-first responsive design */
  .mission-planner {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background-color: var(--color-background_primary);
    position: relative;
  }

  .map-container {
    flex: 1;
    height: 100%;
    position: relative;
  }

  .accordion-container {
    width: 100%;
    height: 50%;
    background-color: var(--color-background_secondary);
    border-top: var(--layout-border_width) solid var(--color-background_tertiary);
    overflow-y: auto;
    transition: transform var(--animations-transition_duration) var(--animations-easing_function);
  }

  .accordion-toggle {
    position: absolute;
    top: var(--responsive-mobile-panel_padding, 12px);
    right: var(--responsive-mobile-panel_padding, 12px);
    z-index: 100;
    display: flex;
    align-items: center;
    gap: calc(var(--layout-spacing_unit) / 2);
    background-color: var(--color-background_secondary);
    border: var(--layout-border_width) solid var(--color-background_tertiary);
    color: var(--color-text_primary);
    padding: var(--responsive-mobile-button-mobile_padding, 12px 16px);
    border-radius: var(--layout-border_radius);
    font-size: var(--responsive-mobile-font_size_sm, 14px);
    cursor: pointer;
    transition: all var(--animations-mobile_transition_duration, 150ms);
    min-height: var(--responsive-mobile-touch_target_min, 44px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .accordion-toggle:hover,
  .accordion-toggle.active {
    background-color: var(--color-accent_blue);
    color: white;
    border-color: var(--color-accent_blue);
  }

  .accordion-toggle svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  /* Mobile collapsed state */
  .mission-planner.mobile.accordion-collapsed .accordion-container {
    transform: translateY(100%);
  }

  .mission-planner.mobile.accordion-collapsed .map-container {
    height: 100%;
  }

  .error-state {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background-color: var(--color-background_primary);
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

  /* Tablet responsive design */
  @media (min-width: 768px) {
    .mission-planner {
      flex-direction: row;
    }

    .map-container {
      flex: 1;
      min-width: 50%;
      height: 100%;
    }

    .accordion-container {
      width: var(--responsive-tablet-accordion-tablet_width, 400px);
      height: 100%;
      border-top: none;
      border-left: var(--layout-border_width) solid var(--color-background_tertiary);
    }

    .accordion-toggle {
      display: none;
    }

    .mission-planner.tablet.accordion-collapsed .accordion-container {
      transform: none;
    }
  }

  /* Desktop responsive design */
  @media (min-width: 1024px) {
    .accordion-container {
      width: var(--responsive-desktop-accordion-desktop_width, 350px);
    }

    .accordion-toggle {
      top: var(--responsive-desktop-panel_padding, 20px);
      right: var(--responsive-desktop-panel_padding, 20px);
      padding: var(--responsive-desktop-button-desktop_padding, 8px 12px);
      font-size: var(--responsive-desktop-font_size_sm, 12px);
      min-height: var(--responsive-desktop-touch_target_min, 32px);
    }
  }

  /* Touch optimization */
  @media (hover: none) and (pointer: coarse) {
    .accordion-toggle {
      padding: calc(var(--responsive-mobile-button-mobile_padding, 12px) * 1.2);
      font-size: var(--responsive-mobile-font_size_base, 16px);
    }

    .accordion-toggle svg {
      width: 20px;
      height: 20px;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .accordion-container,
    .accordion-toggle {
      transition-duration: var(--animations-reduced_motion_duration, 0ms);
    }
  }
</style>
