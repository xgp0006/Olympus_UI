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

  // ===== EVENT DISPATCHER =====
  const dispatch = createEventDispatcher<{
    select: { itemId: string };
    minimize: { itemId: string };
    expand: { itemId: string };
    update: { itemId: string; params: WaypointParams };
    addWaypoint: void;
    error: string;
  }>();

  // ===== STATE =====
  let dragDisabled = false;
  let accordionItems: Array<MissionItem & { id: string }> = [];
  let minimizedItems: Set<string> = new Set();
  let pinnedCoins: Map<string, { x: number; y: number }> = new Map();
  let coinSnapPoints: Array<{ x: number; y: number; id: string }> = [];
  let accordionElement: HTMLElement;
  let touchGestureCleanup: (() => void) | null = null;

  // ===== REACTIVE STATEMENTS =====
  $: accordionItems = items.map((item) => ({ ...item, id: item.id }));

  // Update snap points when coins are pinned
  $: coinSnapPoints = Array.from(pinnedCoins.entries()).map(([id, position]) => ({
    ...position,
    id
  }));

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
   * Handle item minimize
   */
  function handleItemMinimize(itemId: string): void {
    minimizedItems.add(itemId);
    minimizedItems = minimizedItems; // Trigger reactivity
    dispatch('minimize', { itemId });
    console.log(`Minimized item: ${itemId}`);
  }

  /**
   * Handle coin expand
   */
  function handleCoinExpand(event: CustomEvent<{ itemId: string }>): void {
    const { itemId } = event.detail;
    minimizedItems.delete(itemId);
    minimizedItems = minimizedItems; // Trigger reactivity

    // Remove from pinned coins if it was pinned
    pinnedCoins.delete(itemId);
    pinnedCoins = pinnedCoins; // Trigger reactivity

    dispatch('expand', { itemId });
    console.log(`Expanded coin to full view: ${itemId}`);
  }

  /**
   * Handle coin pin
   */
  function handleCoinPin(
    event: CustomEvent<{ itemId: string; position: { x: number; y: number } }>
  ): void {
    const { itemId, position } = event.detail;
    pinnedCoins.set(itemId, position);
    pinnedCoins = pinnedCoins; // Trigger reactivity
    console.log(`Pinned coin: ${itemId} at position`, position);
  }

  /**
   * Handle coin unpin
   */
  function handleCoinUnpin(event: CustomEvent<{ itemId: string }>): void {
    const { itemId } = event.detail;
    pinnedCoins.delete(itemId);
    pinnedCoins = pinnedCoins; // Trigger reactivity
    console.log(`Unpinned coin: ${itemId}`);
  }

  /**
   * Handle coin snap
   */
  function handleCoinSnap(
    event: CustomEvent<{ itemId: string; snapToId: string; position: { x: number; y: number } }>
  ): void {
    const { itemId, snapToId, position } = event.detail;
    console.log(`Coin ${itemId} snapped to ${snapToId} at position`, position);
    // Additional snap logic can be added here if needed
  }

  /**
   * Handle coin move
   */
  function handleCoinMove(
    event: CustomEvent<{ itemId: string; position: { x: number; y: number } }>
  ): void {
    const { itemId, position } = event.detail;
    // Update position if the coin is pinned
    if (pinnedCoins.has(itemId)) {
      pinnedCoins.set(itemId, position);
      pinnedCoins = pinnedCoins; // Trigger reactivity
    }
  }

  /**
   * Get initial coin position
   */
  function getInitialCoinPosition(itemId: string): { x: number; y: number } {
    // Return pinned position if available, otherwise default position
    return (
      pinnedCoins.get(itemId) || { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 }
    );
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
          if (direction === 'left') {
            // Swipe left to minimize
            handleItemMinimize(itemId);
          } else if (direction === 'right') {
            // Swipe right to select
            handleItemSelect(itemId);
          }
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
<div
  class="mission-accordion"
  class:mobile={$isMobile}
  bind:this={accordionElement}
  data-testid="mission-accordion"
>
  <div class="accordion-header">
    <h3>Mission Items</h3>
    <div class="header-actions">
      <button
        class="add-waypoint-button"
        on:click={() => dispatch('addWaypoint')}
        title="Add new waypoint"
        data-testid="add-waypoint-button"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 2v6H2v2h6v6h2v-6h6V8h-6V2H8z"/>
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
      {#each accordionItems.filter((item) => !minimizedItems.has(item.id)) as item (item.id)}
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

            <button
              class="minimize-button"
              on:click={() => handleItemMinimize(item.id)}
              title="Minimize to coin"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 6h12v4H2z" />
              </svg>
            </button>
          </div>

          {#if selectedItemId === item.id}
            <div class="item-details">
              <WaypointItem
                {item}
                isSelected={true}
                on:update={handleItemUpdate}
                on:minimize={() => handleItemMinimize(item.id)}
              />
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Minimized Coins Container -->
  {#if minimizedItems.size > 0}
    <div class="minimized-coins-container" data-testid="minimized-coins">
      {#each accordionItems.filter((item) => minimizedItems.has(item.id)) as item (item.id)}
        <MinimizedCoin
          {item}
          isPinned={pinnedCoins.has(item.id)}
          snapPoints={coinSnapPoints.filter((point) => point.id !== item.id)}
          initialPosition={getInitialCoinPosition(item.id)}
          on:expand={handleCoinExpand}
          on:pin={handleCoinPin}
          on:unpin={handleCoinUnpin}
          on:snap={handleCoinSnap}
          on:move={handleCoinMove}
          on:error={(e) => dispatch('error', e.detail)}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .mission-accordion {
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--component-accordion-background);
    color: var(--color-text_primary);
  }

  .accordion-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: calc(var(--layout-spacing_unit) * 2);
    border-bottom: var(--layout-border_width) solid var(--component-accordion-border_color);
    background-color: var(--color-background_secondary);
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

  .minimize-button {
    background: transparent;
    border: none;
    color: var(--color-text_disabled);
    cursor: pointer;
    padding: calc(var(--layout-spacing_unit) / 2);
    border-radius: var(--layout-border_radius);
    transition: all var(--animation-transition_duration) var(--animation-easing_function);
  }

  .minimize-button:hover {
    color: var(--color-text_secondary);
    background-color: var(--color-background_tertiary);
    transform: scale(var(--animation-hover_scale));
  }

  .minimize-button:active {
    transform: scale(var(--animation-button_press_scale));
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

  .minimized-coins-container {
    position: relative;
    width: 100%;
    height: 200px;
    background-color: var(--color-background_primary);
    border-top: var(--layout-border_width) solid var(--component-accordion-border_color);
    overflow: hidden;
  }

  /* Touch-optimized styles */
  .mission-accordion.mobile .item-selector {
    min-height: 44px; /* Touch-friendly minimum size */
    padding: calc(var(--layout-spacing_unit) * 1.5);
  }

  .mission-accordion.mobile .minimize-button,
  .mission-accordion.mobile .drag-handle {
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

    .minimize-button:active,
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

    .minimized-coins-container {
      height: 150px;
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
    .minimize-button,
    .drag-handle {
      transition: none;
    }
  }
</style>
