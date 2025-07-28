<!--
  Minimized Coin Component
  Hexagonal coin representation of minimized mission items with dragging, pinning, and snapping
  Enhanced with touch gestures and mobile optimization
  Requirements: 4.5, 4.6, 4.10, 1.8
-->
<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { spring } from 'svelte/motion';
  import { isMobile } from '$lib/utils/responsive';
  import { createTouchDragHandler, enhanceButtonTouch, type PanGesture, type TouchPoint } from '$lib/utils/touch';
  import type { MissionItem } from './types';

  // ===== PROPS =====
  export let item: MissionItem;
  export let isPinned: boolean = false;
  export let snapPoints: Array<{ x: number; y: number; id: string }> = [];
  export let initialPosition: { x: number; y: number } = { x: 0, y: 0 };

  // ===== EVENT DISPATCHER =====
  const dispatch = createEventDispatcher<{
    expand: { itemId: string };
    pin: { itemId: string; position: { x: number; y: number } };
    unpin: { itemId: string };
    snap: { itemId: string; snapToId: string; position: { x: number; y: number } };
    move: { itemId: string; position: { x: number; y: number } };
    error: string;
  }>();

  // ===== STATE =====
  let coinElement: HTMLElement;
  let dragging = false;
  let dragOffset = { x: 0, y: 0 };
  let nearestSnapPoint: { x: number; y: number; id: string } | null = null;
  let isHovering = false;
  let mounted = false;
  let touchDragCleanup: (() => void) | null = null;
  let touchButtonCleanup: (() => void) | null = null;
  let dragStartPosition = { x: 0, y: 0 };

  // ===== MOTION =====
  // Position spring for smooth dragging and snapping
  const position = spring(initialPosition, {
    stiffness: 0.3,
    damping: 0.6
  });

  // Scale spring for hover and interaction effects
  const scale = spring(1, {
    stiffness: 0.4,
    damping: 0.8
  });

  // ===== REACTIVE STATEMENTS =====
  $: if (mounted && !dragging) {
    position.set(initialPosition);
  }

  $: if (isHovering && !dragging) {
    scale.set(1.1);
  } else if (dragging) {
    scale.set(1.05);
  } else {
    scale.set(1);
  }

  // ===== CONSTANTS =====
  const SNAP_THRESHOLD = 30; // pixels
  const DOUBLE_CLICK_THRESHOLD = 300; // milliseconds

  // ===== FUNCTIONS =====

  /**
   * Get icon SVG path based on mission item type
   */
  function getIconPath(type: MissionItem['type']): string {
    switch (type) {
      case 'takeoff':
        return 'M8 2l8 6-8 6V2z'; // Arrow up/takeoff icon
      case 'waypoint':
        return 'M8 2a6 6 0 100 12A6 6 0 008 2zm0 2a4 4 0 110 8 4 4 0 010-8z'; // Circle/waypoint icon
      case 'loiter':
        return 'M8 2a6 6 0 100 12A6 6 0 008 2zm0 2a4 4 0 110 8 4 4 0 010-8zM6 8a2 2 0 114 0 2 2 0 01-4 0z'; // Circle with dot/loiter icon
      case 'land':
        return 'M8 14l-8-6 8-6v12z'; // Arrow down/land icon
      default:
        return 'M8 2a6 6 0 100 12A6 6 0 008 2z'; // Default circle
    }
  }

  /**
   * Get type-specific color
   */
  function getTypeColor(type: MissionItem['type']): string {
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
        return 'var(--component-hex_coin-icon_color)';
    }
  }

  /**
   * Calculate distance between two points
   */
  function calculateDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  /**
   * Find nearest snap point
   */
  function findNearestSnapPoint(currentPos: { x: number; y: number }): {
    x: number;
    y: number;
    id: string;
  } | null {
    if (snapPoints.length === 0) return null;

    let nearest: { point: { x: number; y: number; id: string }; distance: number } | null = null;

    for (const snapPoint of snapPoints) {
      const distance = calculateDistance(currentPos, snapPoint);
      if (distance <= SNAP_THRESHOLD && (!nearest || distance < nearest.distance)) {
        nearest = { point: snapPoint, distance };
      }
    }

    return nearest?.point || null;
  }

  /**
   * Handle drag start (touch or mouse)
   */
  function handleDragStart(point: TouchPoint): void {
    if (isPinned) return;

    dragging = true;
    dragStartPosition = { x: point.x, y: point.y };
    
    const rect = coinElement.getBoundingClientRect();
    dragOffset = {
      x: point.x - rect.left - rect.width / 2,
      y: point.y - rect.top - rect.height / 2
    };

    console.log(`Started dragging coin for item: ${item.id}`);
  }

  /**
   * Handle mouse down - start dragging (fallback for non-touch devices)
   */
  function handleMouseDown(event: MouseEvent): void {
    if (isPinned || $isMobile) return; // Use touch handler on mobile

    event.preventDefault();
    event.stopPropagation();

    const point: TouchPoint = {
      x: event.clientX,
      y: event.clientY,
      timestamp: Date.now(),
      identifier: 0
    };

    handleDragStart(point);

    // Add global event listeners for mouse
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  /**
   * Handle drag movement (touch or mouse)
   */
  function handleDrag(gesture: PanGesture): void {
    if (!dragging || isPinned) return;

    const newPosition = {
      x: dragStartPosition.x + gesture.totalDeltaX - dragOffset.x,
      y: dragStartPosition.y + gesture.totalDeltaY - dragOffset.y
    };

    // Find nearest snap point
    nearestSnapPoint = findNearestSnapPoint(newPosition);

    // Update position (snap if near a snap point)
    const targetPosition = nearestSnapPoint || newPosition;
    position.set(targetPosition, { hard: true });

    // Dispatch move event
    dispatch('move', { itemId: item.id, position: targetPosition });
  }

  /**
   * Handle mouse move - update position while dragging (fallback for non-touch devices)
   */
  function handleMouseMove(event: MouseEvent): void {
    if (!dragging || isPinned || $isMobile) return;

    const gesture: PanGesture = {
      deltaX: event.clientX - dragStartPosition.x,
      deltaY: event.clientY - dragStartPosition.y,
      totalDeltaX: event.clientX - dragStartPosition.x,
      totalDeltaY: event.clientY - dragStartPosition.y,
      velocity: { x: 0, y: 0 }
    };

    handleDrag(gesture);
  }

  /**
   * Handle drag end (touch or mouse)
   */
  function handleDragEnd(point: TouchPoint): void {
    if (!dragging) return;

    dragging = false;

    // Handle snapping
    if (nearestSnapPoint) {
      dispatch('snap', {
        itemId: item.id,
        snapToId: nearestSnapPoint.id,
        position: nearestSnapPoint
      });
      console.log(`Snapped coin ${item.id} to ${nearestSnapPoint.id}`);
    }

    nearestSnapPoint = null;
    console.log(`Finished dragging coin for item: ${item.id}`);
  }

  /**
   * Handle mouse up - end dragging (fallback for non-touch devices)
   */
  function handleMouseUp(_event: MouseEvent): void {
    if (!dragging || $isMobile) return;

    // Remove global event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    const point: TouchPoint = {
      x: _event.clientX,
      y: _event.clientY,
      timestamp: Date.now(),
      identifier: 0
    };

    handleDragEnd(point);
  }

  /**
   * Handle click - toggle pin state (fallback for non-touch devices)
   */
  let lastClickTime = 0;
  function handleClick(event: MouseEvent): void {
    if ($isMobile) return; // Use touch handlers on mobile

    event.stopPropagation();

    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime;
    lastClickTime = now;

    // Handle double-click
    if (timeSinceLastClick < DOUBLE_CLICK_THRESHOLD) {
      handleDoubleClick();
      return;
    }

    // Handle single click - toggle pin
    setTimeout(() => {
      if (Date.now() - lastClickTime >= DOUBLE_CLICK_THRESHOLD) {
        handleSingleClick();
      }
    }, DOUBLE_CLICK_THRESHOLD);
  }

  /**
   * Handle single click - toggle pin state
   */
  function handleSingleClick(): void {
    try {
      if (isPinned) {
        dispatch('unpin', { itemId: item.id });
        console.log(`Unpinned coin: ${item.id}`);
      } else {
        dispatch('pin', { itemId: item.id, position: { x: $position.x, y: $position.y } });
        console.log(`Pinned coin: ${item.id}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle pin';
      dispatch('error', errorMessage);
      console.error('Error toggling pin:', error);
    }
  }

  /**
   * Handle double-click - expand back to full view
   */
  function handleDoubleClick(): void {
    try {
      dispatch('expand', { itemId: item.id });
      console.log(`Expanding coin to full view: ${item.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to expand coin';
      dispatch('error', errorMessage);
      console.error('Error expanding coin:', error);
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  function handleKeyDown(event: KeyboardEvent): void {
    if (!coinElement.contains(document.activeElement)) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleDoubleClick();
        break;
      case 'p':
      case 'P':
        event.preventDefault();
        handleSingleClick();
        break;
      case 'Escape':
        if (dragging) {
          event.preventDefault();
          // Reset position and cancel drag
          position.set(initialPosition);
          // Create a synthetic mouse event for cleanup
          const syntheticEvent = new MouseEvent('mouseup', {
            clientX: $position.x,
            clientY: $position.y
          });
          handleMouseUp(syntheticEvent);
        }
        break;
    }
  }

  /**
   * Handle mouse enter
   */
  function handleMouseEnter(): void {
    isHovering = true;
  }

  /**
   * Handle mouse leave
   */
  function handleMouseLeave(): void {
    isHovering = false;
  }

  // ===== LIFECYCLE =====
  onMount(() => {
    mounted = true;
    position.set(initialPosition, { hard: true });

    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown);

    // Set up touch interactions for mobile devices
    if ($isMobile && coinElement) {
      setupTouchInteractions();
    }

    console.log(`Mounted MinimizedCoin for item: ${item.id}`);
  });

  onDestroy(() => {
    // Clean up event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('keydown', handleKeyDown);

    // Clean up touch handlers
    if (touchDragCleanup) {
      touchDragCleanup();
    }
    if (touchButtonCleanup) {
      touchButtonCleanup();
    }

    console.log(`Destroyed MinimizedCoin for item: ${item.id}`);
  });

  /**
   * Set up touch interactions for mobile devices
   */
  function setupTouchInteractions(): void {
    if (!coinElement) return;

    // Set up touch drag handling
    touchDragCleanup = createTouchDragHandler(coinElement, {
      onDragStart: handleDragStart,
      onDrag: handleDrag,
      onDragEnd: handleDragEnd
    });

    // Enhance button with touch feedback
    touchButtonCleanup = enhanceButtonTouch(coinElement, {
      hapticFeedback: true,
      visualFeedback: true,
      preventDoubleClick: true
    });

    console.log(`Touch interactions set up for coin: ${item.id}`);
  }
</script>

<!-- ===== TEMPLATE ===== -->
<div
  bind:this={coinElement}
  class="hex-coin"
  class:pinned={isPinned}
  class:dragging
  class:hovering={isHovering}
  class:near-snap={nearestSnapPoint !== null}
  style="
    transform: translate({$position.x}px, {$position.y}px) scale({$scale});
    --type-color: {getTypeColor(item.type)};
  "
  on:mousedown={handleMouseDown}
  on:click={handleClick}
  on:keydown={handleKeyDown}
  on:mouseenter={handleMouseEnter}
  on:mouseleave={handleMouseLeave}
  tabindex="0"
  role="button"
  aria-label="Minimized {item.type} - {item.name}. Click to pin/unpin, double-click to expand"
  data-testid="minimized-coin-{item.id}"
>
  <div class="coin-content">
    <div class="icon">
      <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
        <path d={getIconPath(item.type)} />
      </svg>
    </div>

    <div class="item-info">
      <span class="item-name">{item.name}</span>
      <span class="item-type">{item.type.toUpperCase()}</span>
    </div>
  </div>

  <!-- Pin indicator -->
  {#if isPinned}
    <div class="pin-indicator" title="Pinned">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
        <path
          d="M9.828.722a.5.5 0 01.354.146l4.95 4.95a.5.5 0 010 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 01.16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 01-.707 0l-2.829-2.828-3.182 3.182c-.195.195-.42.195-.614 0L.172 11.674c-.195-.194-.195-.419 0-.614l3.182-3.182-2.828-2.829a.5.5 0 010-.707c.688-.688 1.673-.766 2.375-.72a5.922 5.922 0 011.013.16l3.134-3.133c-.021-.126-.039-.284-.039-.461 0-.431.108-1.023.589-1.503a.5.5 0 01.353-.146z"
        />
      </svg>
    </div>
  {/if}

  <!-- Snap indicator -->
  {#if nearestSnapPoint && dragging}
    <div class="snap-indicator" title="Snap point available">
      <div class="snap-ring"></div>
    </div>
  {/if}
</div>

<!-- ===== STYLES ===== -->
<style>
  .hex-coin {
    position: absolute;
    width: 60px;
    height: 60px;
    cursor: move;
    user-select: none;
    z-index: 100;
    transition: filter var(--animation-transition_duration) var(--animation-easing_function);

    /* Hexagonal shape using clip-path */
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);

    /* Base styling */
    background-color: var(--component-hex_coin-background);
    border: 2px solid var(--component-hex_coin-border_color_default);

    /* Center content */
    display: flex;
    align-items: center;
    justify-content: center;

    /* Focus styling */
    outline: none;
  }

  .hex-coin:focus {
    box-shadow: 0 0 0 3px rgba(0, 191, 255, 0.3);
  }

  .hex-coin.pinned {
    border-color: var(--component-hex_coin-border_color_pinned);
    cursor: pointer;
    box-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
  }

  .hex-coin.dragging {
    cursor: grabbing;
    filter: brightness(1.2);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .hex-coin.hovering:not(.dragging) {
    filter: brightness(1.1);
    border-color: var(--type-color);
  }

  .hex-coin.near-snap {
    border-color: var(--component-hex_coin-snap_point_color);
    box-shadow: 0 0 12px rgba(0, 255, 136, 0.6);
  }

  .coin-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 4px;
    width: 100%;
    height: 100%;
  }

  .icon {
    color: var(--type-color);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .item-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    min-height: 0;
    overflow: hidden;
  }

  .item-name {
    font-size: 8px;
    font-weight: 600;
    color: var(--color-text_primary);
    text-align: center;
    line-height: 1;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-type {
    font-size: 6px;
    font-weight: 500;
    color: var(--color-text_secondary);
    text-align: center;
    line-height: 1;
    letter-spacing: 0.5px;
  }

  .pin-indicator {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 16px;
    height: 16px;
    background-color: var(--component-hex_coin-border_color_pinned);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-background_primary);
    z-index: 1;
  }

  .snap-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: -1;
  }

  .snap-ring {
    width: 80px;
    height: 80px;
    border: 2px solid var(--component-hex_coin-snap_point_color);
    border-radius: 50%;
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.7;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .hex-coin {
      width: 50px;
      height: 50px;
    }

    .item-name {
      font-size: 7px;
    }

    .item-type {
      font-size: 5px;
    }

    .icon svg {
      width: 20px;
      height: 20px;
    }

    .pin-indicator {
      width: 14px;
      height: 14px;
    }

    .pin-indicator svg {
      width: 10px;
      height: 10px;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .hex-coin {
      border-width: 3px;
    }

    .hex-coin.pinned {
      box-shadow: 0 0 12px rgba(255, 215, 0, 0.8);
    }

    .hex-coin.near-snap {
      box-shadow: 0 0 16px rgba(0, 255, 136, 0.8);
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .hex-coin {
      transition: none;
    }

    .snap-ring {
      animation: none;
    }
  }
</style>
