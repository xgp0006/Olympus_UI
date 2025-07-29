<!--
  Mission Accordion Component
  Displays mission items in a re-arrangeable, borderless accordion panel
  Enhanced with touch gestures and mobile optimization
  Requirements: 4.3, 4.4, 4.7, 6.10, 1.8, 4.5, 4.6
-->
<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { flip } from 'svelte/animate';
  import { dndzone, SOURCES } from 'svelte-dnd-action';
  import WaypointItem from './WaypointItem.svelte';
  import MinimizedCoin from './MinimizedCoin.svelte';
  import { reorderMissionItem, selectMissionItem } from '$lib/stores/mission';
  import { isMobile } from '$lib/utils/responsive';
  import { addTouchGestures, type SwipeGesture } from '$lib/utils/touch';
  import type { MissionItem, WaypointParams } from './types';

  // ===== PROPS =====
  export let items: MissionItem[] = [];
  export let selectedItemId: string | null = null;
  export let isDocked: boolean = true;
  export let isMinimized: boolean = false;

  // ===== EVENT DISPATCHER =====
  const dispatch = createEventDispatcher<{
    select: { itemId: string };
    minimize: { itemId: string };
    expand: { itemId: string };
    update: { itemId: string; params: WaypointParams };
    addWaypoint: void;
    error: string;
    dock: void;
    undock: void;
    minimizeComponent: void;
    expandComponent: void;
  }>();

  // ===== STATE =====
  let dragDisabled = false;
  let accordionItems: Array<MissionItem & { id: string }> = [];
  let accordionElement: HTMLElement;
  let touchGestureCleanup: (() => void) | null = null;
  let componentPosition: { x: number; y: number } = { x: 0, y: 0 };
  let isDragging = false;

  /**
   * Calculate a good default position for the MinimizedCoin
   */
  function calculateDefaultCoinPosition(): { x: number; y: number } {
    // Position in center-right of screen, away from other UI elements
    const defaultX = typeof window !== 'undefined' ? window.innerWidth - 150 : 200;
    const defaultY = typeof window !== 'undefined' ? window.innerHeight / 2 : 150;

    return {
      x: Math.max(100, defaultX), // Ensure it's at least 100px from left edge
      y: Math.max(
        100,
        Math.min(defaultY, typeof window !== 'undefined' ? window.innerHeight - 100 : 400)
      ) // Keep it within bounds
    };
  }

  // ===== REACTIVE STATEMENTS =====
  $: accordionItems = items.map((item) => ({ ...item, id: item.id }));

  // ===== FUNCTIONS =====

  /**
   * Handle drag and drop events
   */
  function handleDndConsider(e: CustomEvent): void {
    // Safeguard against undefined items
    if (!e.detail || !e.detail.items) {
      console.warn('DND consider event missing items:', e.detail);
      return;
    }
    accordionItems = e.detail.items;
  }

  /**
   * Handle drag and drop finalize
   */
  async function handleDndFinalize(e: CustomEvent): Promise<void> {
    // Safeguard against undefined items
    if (!e.detail || !e.detail.items) {
      console.warn('DND finalize event missing items:', e.detail);
      return;
    }
    accordionItems = e.detail.items;

    // Only reorder if the event was triggered by pointer (user drag)
    if (e.detail.info.source === SOURCES.POINTER) {
      const draggedItem = e.detail.info.id;
      const newIndex = accordionItems.findIndex((item) => item.id === draggedItem);

      if (newIndex !== -1) {
        try {
          await reorderMissionItem(draggedItem, newIndex);
          console.log(`Reordered mission item ${draggedItem} to index ${newIndex}`);
        } catch (error) {
          console.error('Failed to reorder mission item:', error);
          dispatch('error', error instanceof Error ? error.message : 'Failed to reorder item');
        }
      }
    }
  }

  /**
   * Handle item selection
   */
  function handleItemSelect(itemId: string): void {
    selectMissionItem(itemId);
    dispatch('select', { itemId });
  }

  /**
   * Handle component dock/undock
   */
  function handleToggleDock(): void {
    if (isDocked) {
      dispatch('undock');
    } else {
      dispatch('dock');
    }
  }

  /**
   * Handle component minimize/expand
   */
  function handleToggleMinimize(): void {
    if (isMinimized) {
      dispatch('expandComponent');
    } else {
      // Set a good position for the MinimizedCoin when first minimizing
      if (componentPosition.x === 0 && componentPosition.y === 0) {
        componentPosition = calculateDefaultCoinPosition();
      }
      dispatch('minimizeComponent');
    }
  }

  /**
   * Handle component dragging
   */
  function handleComponentDragStart(event: MouseEvent): void {
    if (isDocked) return; // Can't drag when docked

    isDragging = true;
    const startX = event.clientX - componentPosition.x;
    const startY = event.clientY - componentPosition.y;

    function handleDrag(e: MouseEvent): void {
      componentPosition = {
        x: e.clientX - startX,
        y: e.clientY - startY
      };
    }

    function handleDragEnd(): void {
      isDragging = false;
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
    }

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
  }

  /**
   * Handle item parameter updates
   */
  function handleItemUpdate(event: CustomEvent<{ itemId: string; params: WaypointParams }>): void {
    dispatch('update', event.detail);
  }

  /**
   * Handle keyboard navigation
   */
  function handleKeyDown(event: KeyboardEvent, itemId: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleItemSelect(itemId);
    }
  }

  /**
   * Get item type icon
   */
  function getItemTypeIcon(type: MissionItem['type']): string {
    switch (type) {
      case 'takeoff':
        return '🛫';
      case 'waypoint':
        return '📍';
      case 'loiter':
        return '🔄';
      case 'land':
        return '🛬';
      default:
        return '📍';
    }
  }

  /**
   * Get item type color
   */
  function getItemTypeColor(type: MissionItem['type']): string {
    switch (type) {
      case 'takeoff':
        return 'var(--color-accent_green)';
      case 'waypoint':
        return 'var(--color-accent_blue)';
      case 'loiter':
        return 'var(--color-accent_yellow)';
      case 'land':
        return 'var(--color-accent_red)';
      default:
        return 'var(--color-accent_blue)';
    }
  }

  /**
   * Set up touch gestures for mobile interaction
   */
  function setupTouchGestures(): void {
    if (!accordionElement || touchGestureCleanup) return;

    touchGestureCleanup = addTouchGestures(accordionElement, {
      onSwipe: (gesture: SwipeGesture) => {
        handleSwipeGesture(gesture);
      },

      onTap: (gesture) => {
        // Handle tap on accordion background
        console.log('Accordion tapped at:', gesture.point);
      }
    });

    console.log('Touch gestures set up for mission accordion');
  }

  /**
   * Handle swipe gestures on accordion
   */
  function handleSwipeGesture(gesture: SwipeGesture): void {
    const { direction, velocity } = gesture;

    // Handle horizontal swipes for item actions
    if (direction === 'left' || direction === 'right') {
      // Find the item being swiped
      const target = document.elementFromPoint(gesture.startPoint.x, gesture.startPoint.y);
      const itemElement = target?.closest('[data-testid^="accordion-item-"]');

      if (itemElement) {
        const itemId = itemElement.getAttribute('data-testid')?.replace('accordion-item-', '');

        if (itemId && velocity > 0.5) {
          if (direction === 'right') {
            // Swipe right to select
            handleItemSelect(itemId);
          }
          // Note: Individual waypoint minimization removed - swipe left now does nothing
        }
      }
    }

    // Handle vertical swipes for scrolling assistance
    if (direction === 'up' || direction === 'down') {
      const scrollContainer = accordionElement.querySelector('.accordion-content');
      if (scrollContainer && velocity > 0.3) {
        const scrollAmount = Math.min(velocity * 200, 300);
        const scrollDirection = direction === 'up' ? -scrollAmount : scrollAmount;

        scrollContainer.scrollBy({
          top: scrollDirection,
          behavior: 'smooth'
        });
      }
    }
  }

  // ===== LIFECYCLE =====
  onMount(() => {
    // Set up touch gestures for mobile devices
    if ($isMobile && accordionElement) {
      setupTouchGestures();
    }
  });

  onDestroy(() => {
    if (touchGestureCleanup) {
      touchGestureCleanup();
    }
  });
</script>

<!-- ===== TEMPLATE ===== -->
{#if isMinimized}
  <!-- Use existing MinimizedCoin for the entire component -->
  <MinimizedCoin
    item={{
      id: 'waypoint-component',
      name: 'WP',
      type: 'waypoint',
      position: undefined,
      params: { lat: 0, lng: 0, alt: 0, speed: 0 }
    }}
    isPinned={!isDocked}
    snapPoints={[]}
    initialPosition={componentPosition}
    on:expand={() => dispatch('expandComponent')}
    on:pin={(e) => {
      componentPosition = e.detail.position;
      dispatch('undock');
    }}
    on:unpin={() => dispatch('dock')}
    on:move={(e) => {
      componentPosition = e.detail.position;
    }}
    on:error={(e) => dispatch('error', e.detail)}
  />
{:else}
  <!-- Full Component View -->
  <div
    class="mission-accordion"
    class:mobile={$isMobile}
    class:docked={isDocked}
    class:undocked={!isDocked}
    class:dragging={isDragging}
    style={!isDocked
      ? `position: absolute; left: ${componentPosition.x}px; top: ${componentPosition.y}px; width: 320px;`
      : ''}
    bind:this={accordionElement}
    data-testid="mission-accordion"
  >
    <div
      class="accordion-header"
      role={!isDocked ? 'button' : undefined}
      tabindex={!isDocked ? 0 : undefined}
      on:mousedown={!isDocked ? handleComponentDragStart : undefined}
      on:keydown={!isDocked
        ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              // Create a synthetic mouse event for keyboard activation
              const syntheticEvent = new MouseEvent('mousedown', {
                clientX: 0,
                clientY: 0,
                bubbles: true
              });
              handleComponentDragStart(syntheticEvent);
            }
          }
        : undefined}
      aria-label={!isDocked ? 'Drag to move component' : undefined}
    >
      <div class="header-title">
        <h3>Waypoint Component</h3>
        <div class="component-controls">
          <button
            class="control-button dock-button"
            on:click={handleToggleDock}
            title={isDocked ? 'Undock component' : 'Dock component'}
            data-testid="dock-toggle-button"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              {#if isDocked}
                <path d="M3 3h10v10H3V3zm2 2v6h6V5H5z" />
              {:else}
                <path d="M2 2h4v4H2V2zm8 0h4v4h-4V2zM2 10h4v4H2v-4zm8 0h4v4h-4v-4z" />
              {/if}
            </svg>
          </button>
          <button
            class="control-button minimize-button"
            on:click={handleToggleMinimize}
            title="Minimize to hex coin"
            data-testid="component-minimize-button"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 6h12v4H2z" />
            </svg>
          </button>
        </div>
      </div>
      <div class="header-actions">
        <button
          class="add-waypoint-button"
          on:click={() => dispatch('addWaypoint')}
          title="Add new waypoint"
          data-testid="add-waypoint-button"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2v6H2v2h6v6h2v-6h6V8h-6V2H8z" />
          </svg>
          <span>Add Waypoint</span>
        </button>
        <div class="item-count">
          {accordionItems.length} item{accordionItems.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>

    {#if accordionItems.length === 0}
      <div class="empty-state" data-testid="accordion-empty">
        <div class="empty-icon">📋</div>
        <p>No mission items</p>
        <span class="empty-hint">Click on the map to add waypoints</span>
      </div>
    {:else}
      <div
        class="accordion-content"
        use:dndzone={{
          items: accordionItems,
          dragDisabled: dragDisabled || $isMobile,
          dropTargetStyle: {},
          morphDisabled: true,
          flipDurationMs: 200,
          dropFromOthersDisabled: true
        }}
        on:consider={handleDndConsider}
        on:finalize={handleDndFinalize}
      >
        {#each accordionItems as item (item.id)}
          <div
            class="accordion-item"
            class:selected={selectedItemId === item.id}
            animate:flip={{ duration: 200 }}
            data-testid="accordion-item-{item.id}"
          >
            <div class="item-header">
              <div class="drag-handle" title="Drag to reorder">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <circle cx="3" cy="3" r="1" />
                  <circle cx="9" cy="3" r="1" />
                  <circle cx="3" cy="6" r="1" />
                  <circle cx="9" cy="6" r="1" />
                  <circle cx="3" cy="9" r="1" />
                  <circle cx="9" cy="9" r="1" />
                </svg>
              </div>

              <button
                class="item-selector"
                class:selected={selectedItemId === item.id}
                on:click={() => handleItemSelect(item.id)}
                on:keydown={(e) => handleKeyDown(e, item.id)}
                title="Select item"
              >
                <div class="item-icon" style="color: {getItemTypeColor(item.type)}">
                  {getItemTypeIcon(item.type)}
                </div>

                <div class="item-info">
                  <div class="item-name">{item.name}</div>
                  <div class="item-type">{item.type.toUpperCase()}</div>
                  {#if item.position}
                    <div class="item-coordinates">
                      {item.position.lat.toFixed(4)}, {item.position.lng.toFixed(4)}
                    </div>
                  {/if}
                </div>
              </button>
            </div>

            {#if selectedItemId === item.id}
              <div class="item-details">
                <WaypointItem {item} on:update={handleItemUpdate} />
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  /* Mission Accordion Styles */
  .mission-accordion {
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--component-accordion-background);
    color: var(--color-text_primary);
    border-radius: var(--layout-border_radius);
    transition: all var(--animation-transition_duration) var(--animation-easing_function);
  }

  .mission-accordion.undocked {
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    border: 2px solid var(--color-accent_blue);
    z-index: 1000;
  }

  .mission-accordion.dragging {
    z-index: 1001;
    transform: scale(1.02);
  }

  .accordion-header {
    display: flex;
    flex-direction: column;
    gap: var(--layout-spacing_unit);
    padding: calc(var(--layout-spacing_unit) * 2);
    border-bottom: var(--layout-border_width) solid var(--component-accordion-border_color);
    background-color: var(--color-background_secondary);
    cursor: move;
  }

  .mission-accordion.docked .accordion-header {
    cursor: default;
  }

  .header-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .component-controls {
    display: flex;
    gap: calc(var(--layout-spacing_unit) / 2);
  }

  .control-button {
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--color-text_disabled);
    color: var(--color-text_disabled);
    border-radius: var(--layout-border_radius);
    padding: calc(var(--layout-spacing_unit) / 2);
    cursor: pointer;
    width: 32px;
    height: 32px;
    transition: all var(--animation-transition_duration) var(--animation-easing_function);
  }

  .control-button:hover {
    border-color: var(--color-accent_blue);
    color: var(--color-accent_blue);
    background-color: rgba(0, 191, 255, 0.1);
  }

  .control-button:active {
    transform: scale(0.95);
  }

  .control-button svg {
    width: 16px;
    height: 16px;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--layout-spacing_unit);
  }

  .accordion-header h3 {
    margin: 0;
    font-size: var(--typography-font_size_lg);
    color: var(--component-accordion-header_text_color);
    font-weight: 600;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--layout-spacing_unit);
  }

  .add-waypoint-button {
    display: flex;
    align-items: center;
    gap: calc(var(--layout-spacing_unit) / 2);
    background-color: var(--component-button-background_accent);
    color: var(--component-button-text_color_accent);
    border: none;
    padding: calc(var(--layout-spacing_unit) / 2) var(--layout-spacing_unit);
    border-radius: var(--layout-border_radius);
    cursor: pointer;
    font-family: inherit;
    font-size: var(--typography-font_size_sm);
    transition: all var(--animation-transition_duration);
  }

  .add-waypoint-button:hover {
    background-color: var(--component-button-background_hover);
    transform: scale(1.05);
  }

  .add-waypoint-button:active {
    transform: scale(0.98);
  }

  .add-waypoint-button svg {
    width: 14px;
    height: 14px;
  }

  .item-count {
    font-size: var(--typography-font_size_sm);
    color: var(--color-text_secondary);
    background-color: var(--color-background_tertiary);
    padding: calc(var(--layout-spacing_unit) / 2) var(--layout-spacing_unit);
    border-radius: calc(var(--layout-border_radius) * 2);
  }

  .accordion-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--layout-spacing_unit);
    /* Prevent double-tap zoom and touch conflicts */
    touch-action: pan-y;
    -webkit-tap-highlight-color: transparent;
  }

  .accordion-item {
    margin-bottom: var(--layout-spacing_unit);
    background-color: var(--color-background_secondary);
    border-radius: var(--layout-border_radius);
    border: var(--layout-border_width) solid var(--component-accordion-border_color);
    transition: all var(--animation-transition_duration) var(--animation-easing_function);
    /* Prevent touch conflicts */
    touch-action: manipulation;
    user-select: none;
  }

  .accordion-item:hover {
    border-color: var(--color-accent_blue);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 191, 255, 0.1);
  }

  .accordion-item.selected {
    border-color: var(--component-map-waypoint_color_selected);
    background-color: var(--color-background_tertiary);
  }

  .item-header {
    display: flex;
    align-items: center;
    padding: var(--layout-spacing_unit);
    gap: var(--layout-spacing_unit);
  }

  .drag-handle {
    color: var(--color-text_disabled);
    cursor: grab;
    padding: calc(var(--layout-spacing_unit) / 2);
    border-radius: var(--layout-border_radius);
    transition: color var(--animation-transition_duration) var(--animation-easing_function);
  }

  .drag-handle:hover {
    color: var(--color-text_secondary);
    background-color: var(--color-background_tertiary);
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  .item-selector {
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--layout-spacing_unit);
    padding: var(--layout-spacing_unit);
    background: transparent;
    border: none;
    border-radius: var(--layout-border_radius);
    cursor: pointer;
    text-align: left;
    color: inherit;
    font-family: inherit;
    transition: background-color var(--animation-transition_duration)
      var(--animation-easing_function);
  }

  .item-selector:hover {
    background-color: var(--color-background_tertiary);
  }

  .item-selector.selected {
    background-color: rgba(0, 191, 255, 0.1);
  }

  .item-icon {
    font-size: 20px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .item-info {
    flex: 1;
    min-width: 0;
  }

  .item-name {
    font-weight: 500;
    color: var(--color-text_primary);
    margin-bottom: calc(var(--layout-spacing_unit) / 4);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-type {
    font-size: var(--typography-font_size_sm);
    color: var(--color-text_secondary);
    font-weight: 600;
    margin-bottom: calc(var(--layout-spacing_unit) / 4);
  }

  .item-coordinates {
    font-size: var(--typography-font_size_sm);
    color: var(--color-text_disabled);
    font-family: var(--typography-font_family_mono);
  }

  .item-details {
    border-top: var(--layout-border_width) solid var(--component-accordion-border_color);
    background-color: var(--color-background_primary);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: calc(var(--layout-spacing_unit) * 4);
    text-align: center;
    color: var(--color-text_disabled);
    height: 200px;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: var(--layout-spacing_unit);
    opacity: 0.5;
  }

  .empty-state p {
    margin: 0 0 calc(var(--layout-spacing_unit) / 2) 0;
    font-size: var(--typography-font_size_base);
    color: var(--color-text_secondary);
  }

  .empty-hint {
    font-size: var(--typography-font_size_sm);
    color: var(--color-text_disabled);
    font-style: italic;
  }

  /* Drag and drop styles */
  :global(.accordion-item.dnd-action-draggable-source) {
    opacity: 0.8;
    transform: rotate(2deg);
  }

  :global(.accordion-content.dnd-action-drop-target) {
    background-color: rgba(0, 191, 255, 0.05);
  }

  /* Touch-optimized styles */
  .mission-accordion.mobile .item-selector {
    min-height: 44px; /* Touch-friendly minimum size */
    padding: calc(var(--layout-spacing_unit) * 1.5);
  }

  .mission-accordion.mobile .drag-handle,
  .mission-accordion.mobile .control-button {
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mission-accordion.mobile .accordion-item {
    margin-bottom: calc(var(--layout-spacing_unit) * 1.5);
    border-radius: calc(var(--layout-border_radius) * 1.5);
  }

  /* Touch feedback */
  @media (hover: none) and (pointer: coarse) {
    .item-selector:active {
      background-color: var(--color-background_tertiary);
      transform: scale(0.98);
    }

    .control-button:active,
    .drag-handle:active {
      background-color: var(--color-background_tertiary);
      transform: scale(0.95);
    }

    .accordion-item {
      transition: transform 150ms ease-out;
    }

    .accordion-item:active {
      transform: scale(0.99);
    }
  }

  /* Swipe indicators for mobile */
  .mission-accordion.mobile .accordion-item::after {
    content: '';
    position: absolute;
    right: var(--layout-spacing_unit);
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 20px;
    background: linear-gradient(to bottom, var(--color-accent_blue), var(--color-accent_yellow));
    border-radius: 2px;
    opacity: 0.3;
    pointer-events: none;
  }

  .mission-accordion.mobile .accordion-item {
    position: relative;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .accordion-header {
      padding: var(--layout-spacing_unit);
    }

    .accordion-header h3 {
      font-size: var(--typography-font_size_base);
    }

    .item-header {
      padding: calc(var(--layout-spacing_unit) / 2);
    }

    .item-icon {
      font-size: 16px;
      width: 20px;
      height: 20px;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .mission-accordion.mobile .accordion-item::after {
      opacity: 0.6;
      width: 4px;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .accordion-item,
    .item-selector,
    .drag-handle,
    .control-button {
      transition: none;
    }
  }
</style>
