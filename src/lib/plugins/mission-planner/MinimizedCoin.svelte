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
  import {
    createTouchDragHandler,
    enhanceButtonTouch,
    type PanGesture,
    type TouchPoint
  } from '$lib/utils/touch';
  import type { MissionItem } from './types';
  import { telemetry144fps } from '$lib/utils/performance-telemetry-144fps';
  import { measureRenderPerformance } from '$lib/utils/performance-monitor';
  import {
    DRAG_CONFIG_144FPS,
    getDragUpdateOptions,
    calculateMagneticAttraction
  } from '$lib/utils/drag-config-144fps';

  // ===== PROPS =====
  export let item: MissionItem;
  export let isPinned: boolean = false;
  export let snapPoints: Array<{ x: number; y: number; id: string }> = [];
  export let initialPosition: { x: number; y: number } = { x: 0, y: 0 };
  export let disableOwnDragging: boolean = false; // When used inside DraggableContainerEnhanced

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
  let currentVelocity = { x: 0, y: 0 };
  let lastDragTime = 0;

  // Pre-allocated circular buffer for drag history (NASA JPL Rule 3: No dynamic allocation)
  const DRAG_HISTORY_SIZE = 5;
  const dragHistoryBuffer = new Array(DRAG_HISTORY_SIZE);
  let dragHistoryIndex = 0;
  let dragHistoryCount = 0;

  // Initialize drag history buffer
  for (let i = 0; i < DRAG_HISTORY_SIZE; i++) {
    dragHistoryBuffer[i] = { x: 0, y: 0, time: 0 };
  }

  // Animation frame tracking
  let momentumRafId: number | null = null;
  let isDestroyed = false;

  // Performance monitoring
  let showPerformanceMetrics = false;
  let currentFps = 0;
  let currentFrameTime = 0;
  let frameCount = 0;
  let lastFpsUpdate = 0;
  const FPS_UPDATE_INTERVAL = 1000; // Update FPS every second

  // ===== MOTION =====
  // Position spring for smooth dragging and snapping - optimized for 144fps
  const position = spring(initialPosition, DRAG_CONFIG_144FPS.spring);

  // Scale spring for hover and interaction effects
  const scale = spring<number>(
    DRAG_CONFIG_144FPS.visual.normalScale,
    DRAG_CONFIG_144FPS.scaleSpring
  );

  // Shadow intensity spring for depth perception
  const shadowIntensity = spring<number>(
    DRAG_CONFIG_144FPS.visual.shadowIntensityNormal,
    DRAG_CONFIG_144FPS.scaleSpring
  );

  // ===== REACTIVE STATEMENTS =====
  $: if (mounted && !dragging) {
    position.set(initialPosition);
  }

  $: if (isHovering && !dragging) {
    scale.set(DRAG_CONFIG_144FPS.visual.hoveringScale);
    shadowIntensity.set(DRAG_CONFIG_144FPS.visual.shadowIntensityHover);
  } else if (dragging) {
    scale.set(DRAG_CONFIG_144FPS.visual.draggingScale);
    shadowIntensity.set(DRAG_CONFIG_144FPS.visual.shadowIntensityDragging);
  } else {
    scale.set(DRAG_CONFIG_144FPS.visual.normalScale);
    shadowIntensity.set(DRAG_CONFIG_144FPS.visual.shadowIntensityNormal);
  }

  // ===== CONSTANTS =====
  const SNAP_THRESHOLD = DRAG_CONFIG_144FPS.drag.snapThreshold;
  const DOUBLE_CLICK_THRESHOLD = 300; // milliseconds
  const VELOCITY_SMOOTHING_PREV = DRAG_CONFIG_144FPS.momentum.velocitySmoothingPrev;
  const VELOCITY_SMOOTHING_NEW = DRAG_CONFIG_144FPS.momentum.velocitySmoothingNew;
  const MOMENTUM_FRICTION = DRAG_CONFIG_144FPS.momentum.friction;
  const MOMENTUM_MIN_VELOCITY = DRAG_CONFIG_144FPS.momentum.minVelocity;
  const ATTRACTION_STRENGTH = DRAG_CONFIG_144FPS.drag.attractionStrength;
  const FRAME_BUDGET_MS = DRAG_CONFIG_144FPS.performance.frameTimeMs;

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
    // NASA JPL Rule 5: Input validation
    if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') {
      console.error('Invalid TouchPoint in handleDragStart');
      return;
    }

    if (isPinned || disableOwnDragging) return;

    dragging = true;
    dragStartPosition = { x: $position.x, y: $position.y };

    const rect = coinElement.getBoundingClientRect();
    // Calculate offset from cursor to coin's current position
    // This maintains the grab point relative to the coin
    dragOffset = {
      x: point.x - $position.x,
      y: point.y - $position.y
    };

    // Reset velocity tracking
    currentVelocity = { x: 0, y: 0 };
    lastDragTime = Date.now();

    // Initialize drag history buffer (no allocation)
    dragHistoryIndex = 0;
    dragHistoryCount = 0;
    const entry = dragHistoryBuffer[0];
    entry.x = point.x;
    entry.y = point.y;
    entry.time = lastDragTime;
    dragHistoryCount = 1;

    // Add cursor styles
    document.body.style.cursor = 'grabbing';

    // Start performance monitoring
    telemetry144fps.recordMagneticCalculation(0);

    console.log(`Started dragging coin for item: ${item.id}`);
  }

  /**
   * Handle mouse down - start dragging (fallback for non-touch devices)
   */
  function handleMouseDown(event: MouseEvent): void {
    if (isPinned || $isMobile || disableOwnDragging) return; // Use touch handler on mobile

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
   * Handle drag movement (touch or mouse) - optimized for 144fps
   */
  function handleDrag(gesture: PanGesture): void {
    // NASA JPL Rule 5: Input validation
    if (
      !gesture ||
      typeof gesture.totalDeltaX !== 'number' ||
      typeof gesture.totalDeltaY !== 'number'
    ) {
      console.error('Invalid PanGesture in handleDrag');
      return;
    }

    if (!dragging || isPinned || isDestroyed) return;

    const frameStartTime = performance.now();
    const now = Date.now();
    const deltaTime = now - lastDragTime;

    // Calculate position with proper offset maintenance
    const newPosition = {
      x: dragStartPosition.x + gesture.totalDeltaX,
      y: dragStartPosition.y + gesture.totalDeltaY
    };

    // Track velocity for momentum (144fps optimization)
    if (deltaTime > 0) {
      const velocityX = (gesture.deltaX / deltaTime) * 16.67; // Normalize to 60fps base
      const velocityY = (gesture.deltaY / deltaTime) * 16.67;

      // Smooth velocity with exponential moving average
      currentVelocity.x =
        currentVelocity.x * VELOCITY_SMOOTHING_PREV + velocityX * VELOCITY_SMOOTHING_NEW;
      currentVelocity.y =
        currentVelocity.y * VELOCITY_SMOOTHING_PREV + velocityY * VELOCITY_SMOOTHING_NEW;
    }

    // Update drag history buffer (no allocation)
    dragHistoryIndex = (dragHistoryIndex + 1) % DRAG_HISTORY_SIZE;
    const entry = dragHistoryBuffer[dragHistoryIndex];
    entry.x = newPosition.x;
    entry.y = newPosition.y;
    entry.time = now;
    if (dragHistoryCount < DRAG_HISTORY_SIZE) {
      dragHistoryCount++;
    }

    lastDragTime = now;

    // Find nearest snap point with magnetic effect
    measureRenderPerformance(
      () => {
        nearestSnapPoint = findNearestSnapPoint(newPosition);
      },
      'findNearestSnapPoint',
      144 // Target 144fps
    );

    // Apply magnetic attraction smoothly
    let targetPosition = newPosition;
    if (nearestSnapPoint) {
      const distance = calculateDistance(newPosition, nearestSnapPoint);
      const attractionStrength = Math.max(0, 1 - distance / SNAP_THRESHOLD);
      targetPosition = {
        x:
          newPosition.x +
          (nearestSnapPoint.x - newPosition.x) * attractionStrength * ATTRACTION_STRENGTH,
        y:
          newPosition.y +
          (nearestSnapPoint.y - newPosition.y) * attractionStrength * ATTRACTION_STRENGTH
      };

      // Record magnetic calculation for telemetry
      telemetry144fps.recordMagneticCalculation(1);
    }

    // Update position with standardized options for smooth 144fps response
    position.set(targetPosition, getDragUpdateOptions(dragging));

    // Dispatch move event
    dispatch('move', { itemId: item.id, position: targetPosition });

    // Record frame time for telemetry
    const frameTime = performance.now() - frameStartTime;
    telemetry144fps.recordFrame(frameTime);

    // Update local performance metrics
    currentFrameTime = frameTime;
    frameCount++;

    // Calculate FPS every second
    const perfNow = performance.now();
    if (perfNow - lastFpsUpdate >= FPS_UPDATE_INTERVAL) {
      currentFps = Math.round((frameCount * 1000) / (perfNow - lastFpsUpdate));
      frameCount = 0;
      lastFpsUpdate = perfNow;
    }
  }

  /**
   * Handle mouse move - update position while dragging (fallback for non-touch devices)
   */
  function handleMouseMove(event: MouseEvent): void {
    if (!dragging || isPinned || $isMobile || isDestroyed) return;

    // Calculate the total delta from the start position
    const totalDeltaX = event.clientX - dragOffset.x - dragStartPosition.x;
    const totalDeltaY = event.clientY - dragOffset.y - dragStartPosition.y;

    // Get last position from circular buffer for delta calculation
    const lastIndex = dragHistoryIndex >= 0 ? dragHistoryIndex : 0;
    const lastEntry =
      dragHistoryCount > 0 ? dragHistoryBuffer[lastIndex] : { x: event.clientX, y: event.clientY };

    const deltaX = event.clientX - lastEntry.x;
    const deltaY = event.clientY - lastEntry.y;

    const gesture: PanGesture = {
      deltaX: deltaX,
      deltaY: deltaY,
      totalDeltaX: totalDeltaX,
      totalDeltaY: totalDeltaY,
      velocity: currentVelocity
    };

    handleDrag(gesture);
  }

  /**
   * Handle drag end (touch or mouse) - with momentum physics
   */
  function handleDragEnd(point: TouchPoint): void {
    // NASA JPL Rule 5: Input validation
    if (!point || typeof point.timestamp !== 'number') {
      console.error('Invalid TouchPoint in handleDragEnd');
      return;
    }

    if (!dragging || isDestroyed) return;

    dragging = false;

    // Reset cursor
    document.body.style.cursor = '';

    // Cancel any existing momentum animation
    if (momentumRafId !== null) {
      cancelAnimationFrame(momentumRafId);
      momentumRafId = null;
    }

    // Apply momentum if no snap point
    if (!nearestSnapPoint && Math.abs(currentVelocity.x) + Math.abs(currentVelocity.y) > 0.5) {
      const applyMomentum = () => {
        const frameStart = performance.now();
        
        // Check if component is destroyed
        if (isDestroyed) {
          momentumRafId = null;
          return;
        }

        if (
          Math.abs(currentVelocity.x) > MOMENTUM_MIN_VELOCITY ||
          Math.abs(currentVelocity.y) > MOMENTUM_MIN_VELOCITY
        ) {
          position.update((p) => ({
            x: p.x + currentVelocity.x,
            y: p.y + currentVelocity.y
          }));

          currentVelocity.x *= MOMENTUM_FRICTION;
          currentVelocity.y *= MOMENTUM_FRICTION;
          
          // NASA JPL Rule 5: Assert frame budget
          const frameTime = performance.now() - frameStart;
          if (frameTime > DRAG_CONFIG_144FPS.performance.frameTimeThreshold) {
            console.warn(`MinimizedCoin momentum exceeded frame budget: ${frameTime.toFixed(2)}ms`);
          }

          momentumRafId = requestAnimationFrame(applyMomentum);
        } else {
          momentumRafId = null;
        }
      };

      momentumRafId = requestAnimationFrame(applyMomentum);
    }

    // Handle snapping with smooth animation
    if (nearestSnapPoint) {
      position.set(nearestSnapPoint, getDragUpdateOptions(false)); // Smooth snap animation
      dispatch('snap', {
        itemId: item.id,
        snapToId: nearestSnapPoint.id,
        position: nearestSnapPoint
      });
      console.log(`Snapped coin ${item.id} to ${nearestSnapPoint.id}`);
    }

    nearestSnapPoint = null;
    currentVelocity = { x: 0, y: 0 };
    dragHistoryCount = 0; // Reset history count
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

    // Enable performance metrics in dev mode or with query param
    if (window.location.search.includes('debug=true') || import.meta.env.DEV) {
      showPerformanceMetrics = true;
    }

    console.log(`Mounted MinimizedCoin for item: ${item.id}`);
  });

  onDestroy(() => {
    // Set destroyed flag to prevent any further operations
    isDestroyed = true;

    // Cancel any active animations
    if (momentumRafId !== null) {
      cancelAnimationFrame(momentumRafId);
      momentumRafId = null;
    }

    // Clean up event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('keydown', handleKeyDown);

    // Clean up touch handlers
    if (touchDragCleanup) {
      touchDragCleanup();
      touchDragCleanup = null;
    }
    if (touchButtonCleanup) {
      touchButtonCleanup();
      touchButtonCleanup = null;
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
    transform: translate3d({$position.x}px, {$position.y}px, 0) scale({$scale});
    --type-color: {getTypeColor(item.type)};
    --shadow-intensity: {$shadowIntensity};
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

  <!-- Performance metrics (debug mode) -->
  {#if showPerformanceMetrics && dragging}
    <div class="performance-metrics">
      <span
        class="fps"
        class:optimal={currentFps >= 130}
        class:warning={currentFps < 130 && currentFps >= 100}
        class:critical={currentFps < 100}
      >
        {currentFps}fps
      </span>
      <span class="frame-time">{currentFrameTime.toFixed(1)}ms</span>
    </div>
  {/if}
</div>

<!-- ===== STYLES ===== -->
<style>
  .hex-coin {
    position: absolute;
    width: 60px;
    height: 60px;
    cursor: grab;
    user-select: none;
    z-index: 100;
    transition:
      filter 0.15s ease-out,
      box-shadow 0.15s ease-out;
    will-change: transform;
    transform: translateZ(0); /* Force GPU layer */

    /* Hexagonal shape using clip-path */
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);

    /* Base styling with improved gradients */
    background: linear-gradient(
      145deg,
      var(--color-surface-variant, #2a2a2a) 0%,
      var(--color-surface, #1a1a1a) 50%,
      var(--color-surface-variant, #2a2a2a) 100%
    );
    border: 2px solid var(--color-border, #333);
    box-shadow:
      0 2px 8px rgba(0, 0, 0, var(--shadow-intensity, 0.3)),
      0 1px 2px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);

    /* Center content */
    display: flex;
    align-items: center;
    justify-content: center;

    /* Focus styling */
    outline: none;

    /* Performance optimization */
    contain: layout style paint;
  }

  .hex-coin:focus {
    box-shadow: 0 0 0 3px rgba(0, 191, 255, 0.3);
  }

  .hex-coin.pinned {
    border-color: var(--color-accent_yellow, #ffd700);
    cursor: pointer;
    box-shadow: 0 0 12px rgba(255, 215, 0, 0.6);
  }

  .hex-coin.dragging {
    cursor: grabbing;
    filter: brightness(1.15) saturate(1.1);
    box-shadow:
      0 6px 20px rgba(0, 0, 0, 0.4),
      0 2px 4px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    transition: none;
  }

  .hex-coin.hovering:not(.dragging) {
    cursor: grab;
    filter: brightness(1.08) saturate(1.05);
    border-color: var(--type-color);
    box-shadow:
      0 3px 10px rgba(0, 0, 0, 0.35),
      0 1px 2px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  .hex-coin.near-snap {
    border-color: var(--color-accent_green, #00ff00);
    box-shadow: 0 0 12px rgba(0, 255, 0, 0.6);
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
    background-color: var(--color-accent_yellow, #ffd700);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-background_primary, #000);
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
    border: 2px solid var(--color-accent_green, #00ff00);
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

  /* High refresh rate optimization */
  @media (min-resolution: 2dppx) {
    .hex-coin {
      image-rendering: -webkit-optimize-contrast;
      -webkit-font-smoothing: antialiased;
    }
  }

  /* GPU acceleration hints */
  .hex-coin * {
    transform: translateZ(0);
    backface-visibility: hidden;
  }

  /* Performance metrics display */
  .performance-metrics {
    position: absolute;
    bottom: -25px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-family: monospace;
    display: flex;
    gap: 6px;
    pointer-events: none;
    white-space: nowrap;
  }

  .performance-metrics .fps {
    font-weight: bold;
  }

  .performance-metrics .fps.optimal {
    color: #00ff00;
  }

  .performance-metrics .fps.warning {
    color: #ffff00;
  }

  .performance-metrics .fps.critical {
    color: #ff0000;
  }

  .performance-metrics .frame-time {
    color: #888;
  }
</style>
