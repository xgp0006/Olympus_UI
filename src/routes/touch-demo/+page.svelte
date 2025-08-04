<!--
  Touch and Gesture Demo Page
  Demonstrates touch interactions for mission planner components
  Requirements: 1.8, 4.5, 4.6
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { isMobile } from '$lib/utils/responsive';
  import MapViewer from '$lib/plugins/mission-planner/MapViewer.svelte';
  import MinimizedCoin from '$lib/plugins/mission-planner/MinimizedCoin.svelte';
  import MissionAccordion from '$lib/plugins/mission-planner/MissionAccordion.svelte';
  import {
    addTouchGestures,
    type SwipeGesture,
    type PinchGesture,
    type TapGesture
  } from '$lib/utils/touch';
  import type { MissionItem } from '$lib/plugins/mission-planner/types';
  import { BoundedArray } from '$lib/utils/bounded-array';

  // ===== STATE =====
  let activeDemo = 'overview';
  const gestureLogArray = new BoundedArray<string>(50);
  let touchDemoElement: HTMLElement;
  let touchGestureCleanup: (() => void) | null = null;

  // Demo mission items
  const demoMissionItemsArray: MissionItem[] = [
    {
      id: 'takeoff-1',
      type: 'takeoff',
      name: 'Takeoff Point',
      params: { lat: 37.7749, lng: -122.4194, alt: 50 },
      position: { lat: 37.7749, lng: -122.4194, alt: 50 }
    },
    {
      id: 'waypoint-1',
      type: 'waypoint',
      name: 'Waypoint Alpha',
      params: { lat: 37.775, lng: -122.419, alt: 100 },
      position: { lat: 37.775, lng: -122.419, alt: 100 }
    },
    {
      id: 'waypoint-2',
      type: 'waypoint',
      name: 'Waypoint Bravo',
      params: { lat: 37.7755, lng: -122.4185, alt: 120 },
      position: { lat: 37.7755, lng: -122.4185, alt: 120 }
    },
    {
      id: 'loiter-1',
      type: 'loiter',
      name: 'Loiter Point',
      params: { lat: 37.776, lng: -122.418, alt: 100 },
      position: { lat: 37.776, lng: -122.418, alt: 100 }
    },
    {
      id: 'land-1',
      type: 'land',
      name: 'Landing Zone',
      params: { lat: 37.7765, lng: -122.4175, alt: 0 },
      position: { lat: 37.7765, lng: -122.4175, alt: 0 }
    }
  ];
  const demoMissionItems = new BoundedArray<MissionItem>(10);
  demoMissionItems.pushMany(demoMissionItemsArray);

  // ===== FUNCTIONS =====

  /**
   * Add gesture to log
   */
  function logGesture(message: string): void {
    gestureLogArray.push(message); // BoundedArray automatically maintains size limit
  }

  /**
   * Clear gesture log
   */
  function clearLog(): void {
    gestureLogArray.clear();
  }

  /**
   * Set up touch gesture demo
   */
  function setupTouchDemo(): void {
    if (!touchDemoElement || touchGestureCleanup) return;

    touchGestureCleanup = addTouchGestures(touchDemoElement, {
      onTap: (gesture: TapGesture) => {
        logGesture(`Tap detected at (${gesture.point.x}, ${gesture.point.y})`);
      },

      onDoubleTap: (gesture: TapGesture) => {
        logGesture(`Double tap detected at (${gesture.point.x}, ${gesture.point.y})`);
      },

      onSwipe: (gesture: SwipeGesture) => {
        logGesture(
          `Swipe ${gesture.direction} - Distance: ${gesture.distance.toFixed(0)}px, Velocity: ${gesture.velocity.toFixed(2)}`
        );
      },

      onPinch: (gesture: PinchGesture) => {
        logGesture(
          `Pinch - Scale: ${gesture.scale.toFixed(2)}, Rotation: ${((gesture.rotation * 180) / Math.PI).toFixed(1)}°`
        );
      },

      onLongPress: (gesture) => {
        logGesture(
          `Long press at (${gesture.point.x}, ${gesture.point.y}) - Duration: ${gesture.duration}ms`
        );
      },

      onGestureStart: () => {
        logGesture('Gesture started');
      },

      onGestureEnd: () => {
        logGesture('Gesture ended');
      }
    });
  }

  /**
   * Handle map events
   */
  function handleMapClick(event: CustomEvent): void {
    const { lngLat, isLongPress } = event.detail;
    if (isLongPress) {
      logGesture(`Map long press at ${lngLat[1].toFixed(4)}, ${lngLat[0].toFixed(4)}`);
    } else {
      logGesture(`Map click at ${lngLat[1].toFixed(4)}, ${lngLat[0].toFixed(4)}`);
    }
  }

  function handleMapSwipe(event: CustomEvent<SwipeGesture>): void {
    const { direction, velocity } = event.detail;
    logGesture(`Map swipe ${direction} with velocity ${velocity.toFixed(2)}`);
  }

  function handleMapPinch(event: CustomEvent<PinchGesture>): void {
    const { scale } = event.detail;
    logGesture(`Map pinch zoom - Scale: ${scale.toFixed(2)}`);
  }

  /**
   * Handle coin events
   */
  function handleCoinExpand(event: CustomEvent): void {
    logGesture(`Coin expanded: ${event.detail.itemId}`);
  }

  function handleCoinPin(event: CustomEvent): void {
    logGesture(
      `Coin pinned: ${event.detail.itemId} at (${event.detail.position.x}, ${event.detail.position.y})`
    );
  }

  function handleCoinMove(event: CustomEvent): void {
    logGesture(
      `Coin moved: ${event.detail.itemId} to (${event.detail.position.x}, ${event.detail.position.y})`
    );
  }

  // ===== LIFECYCLE =====
  onMount(() => {
    if (activeDemo === 'gestures') {
      setupTouchDemo();
    }

    return () => {
      if (touchGestureCleanup) {
        touchGestureCleanup();
      }
    };
  });

  // Set up touch demo when switching to gestures demo
  $: if (activeDemo === 'gestures' && touchDemoElement) {
    setupTouchDemo();
  }
</script>

<!-- ===== TEMPLATE ===== -->
<div class="touch-demo-page">
  <header class="demo-header">
    <h1>Touch & Gesture Demo</h1>
    <p class="demo-subtitle">
      Interactive demonstration of touch and gesture support for mission planning components
    </p>

    {#if $isMobile}
      <div class="mobile-indicator">📱 Mobile Device Detected - Touch gestures are active</div>
    {:else}
      <div class="desktop-indicator">
        🖥️ Desktop Device - Mouse interactions with touch simulation
      </div>
    {/if}
  </header>

  <nav class="demo-nav">
    <button
      class="nav-button"
      class:active={activeDemo === 'overview'}
      on:click={() => (activeDemo = 'overview')}
    >
      Overview
    </button>
    <button
      class="nav-button"
      class:active={activeDemo === 'gestures'}
      on:click={() => (activeDemo = 'gestures')}
    >
      Basic Gestures
    </button>
    <button
      class="nav-button"
      class:active={activeDemo === 'map'}
      on:click={() => (activeDemo = 'map')}
    >
      Map Touch
    </button>
    <button
      class="nav-button"
      class:active={activeDemo === 'coins'}
      on:click={() => (activeDemo = 'coins')}
    >
      Draggable Coins
    </button>
    <button
      class="nav-button"
      class:active={activeDemo === 'accordion'}
      on:click={() => (activeDemo = 'accordion')}
    >
      Mission Accordion
    </button>
  </nav>

  <main class="demo-content">
    {#if activeDemo === 'overview'}
      <div class="demo-section">
        <h2>Touch & Gesture Support Overview</h2>

        <div class="feature-grid">
          <div class="feature-card">
            <h3>🗺️ Map Interactions</h3>
            <ul>
              <li>Tap to select locations</li>
              <li>Double-tap to zoom in</li>
              <li>Pinch to zoom</li>
              <li>Swipe to pan</li>
              <li>Long press for context menu</li>
            </ul>
          </div>

          <div class="feature-card">
            <h3>🪙 Draggable Coins</h3>
            <ul>
              <li>Touch and drag to move</li>
              <li>Tap to pin/unpin</li>
              <li>Double-tap to expand</li>
              <li>Snap to other coins</li>
              <li>Haptic feedback</li>
            </ul>
          </div>

          <div class="feature-card">
            <h3>📋 Mission Accordion</h3>
            <ul>
              <li>Swipe left to minimize items</li>
              <li>Swipe right to select items</li>
              <li>Touch-optimized buttons</li>
              <li>Smooth scrolling</li>
              <li>Drag to reorder</li>
            </ul>
          </div>

          <div class="feature-card">
            <h3>♿ Accessibility</h3>
            <ul>
              <li>Keyboard navigation fallback</li>
              <li>Screen reader support</li>
              <li>High contrast mode</li>
              <li>Reduced motion support</li>
              <li>Touch target sizing</li>
            </ul>
          </div>
        </div>

        <div class="instructions">
          <h3>How to Test</h3>
          <p>
            Navigate through the different demo sections using the tabs above. Each section
            demonstrates specific touch and gesture capabilities:
          </p>
          <ol>
            <li><strong>Basic Gestures:</strong> Try different touch gestures on the demo area</li>
            <li><strong>Map Touch:</strong> Interact with the map using touch gestures</li>
            <li><strong>Draggable Coins:</strong> Move and manipulate mission item coins</li>
            <li><strong>Mission Accordion:</strong> Use swipe gestures on mission items</li>
          </ol>
        </div>
      </div>
    {:else if activeDemo === 'gestures'}
      <div class="demo-section">
        <h2>Basic Touch Gestures</h2>

        <div class="gesture-demo-container">
          <div class="gesture-demo-area" bind:this={touchDemoElement}>
            <div class="demo-instructions">
              <h3>Try these gestures:</h3>
              <ul>
                <li>👆 Single tap</li>
                <li>👆👆 Double tap</li>
                <li>👆➡️ Swipe (any direction)</li>
                <li>👆👆 Pinch (two fingers)</li>
                <li>👆⏱️ Long press (hold)</li>
              </ul>
            </div>
          </div>

          <div class="gesture-log">
            <div class="log-header">
              <h3>Gesture Log</h3>
              <button class="clear-log-btn" on:click={clearLog}>Clear</button>
            </div>
            <div class="log-content">
              {#each gestureLogArray.getAll() as entry, index}
                <div class="log-entry" class:recent={index === 0}>
                  {entry}
                </div>
              {:else}
                <div class="log-empty">No gestures detected yet. Try touching the demo area!</div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    {:else if activeDemo === 'map'}
      <div class="demo-section">
        <h2>Map Touch Interactions</h2>

        <div class="map-demo-container">
          <div class="map-container">
            <MapViewer
              selectedItemId={null}
              missionItems={demoMissionItems.getAll()}
              center={[-122.4194, 37.7749]}
              zoom={12}
              on:mapclick={handleMapClick}
              on:swipe={handleMapSwipe}
              on:pinch={handleMapPinch}
            />
          </div>

          <div class="map-instructions">
            <h3>Map Touch Gestures</h3>
            <ul>
              <li><strong>Tap:</strong> Click on map locations</li>
              <li><strong>Double-tap:</strong> Zoom in on location</li>
              <li><strong>Pinch:</strong> Zoom in/out with two fingers</li>
              <li><strong>Swipe:</strong> Pan the map</li>
              <li><strong>Long press:</strong> Context menu (with haptic feedback)</li>
            </ul>

            <div class="gesture-log mini">
              <div class="log-header">
                <h3>Map Events</h3>
              </div>
              <div class="log-content">
                {#each gestureLogArray.getAll().slice(0, 5) as entry}
                  <div class="log-entry">{entry}</div>
                {:else}
                  <div class="log-empty">Interact with the map to see events</div>
                {/each}
              </div>
            </div>
          </div>
        </div>
      </div>
    {:else if activeDemo === 'coins'}
      <div class="demo-section">
        <h2>Draggable Mission Coins</h2>

        <div class="coins-demo-container">
          <div class="coins-area">
            {#each demoMissionItems.getAll() as item, index}
              <MinimizedCoin
                {item}
                isPinned={false}
                snapPoints={[]}
                initialPosition={{
                  x: 100 + (index % 3) * 120,
                  y: 100 + Math.floor(index / 3) * 120
                }}
                on:expand={handleCoinExpand}
                on:pin={handleCoinPin}
                on:move={handleCoinMove}
              />
            {/each}
          </div>

          <div class="coins-instructions">
            <h3>Coin Interactions</h3>
            <ul>
              <li><strong>Drag:</strong> Touch and drag to move coins</li>
              <li><strong>Tap:</strong> Pin/unpin coins in place</li>
              <li><strong>Double-tap:</strong> Expand coin to full view</li>
              <li><strong>Snap:</strong> Coins snap to each other when close</li>
            </ul>

            <div class="gesture-log mini">
              <div class="log-header">
                <h3>Coin Events</h3>
              </div>
              <div class="log-content">
                {#each gestureLogArray.getAll().slice(0, 5) as entry}
                  <div class="log-entry">{entry}</div>
                {:else}
                  <div class="log-empty">Interact with coins to see events</div>
                {/each}
              </div>
            </div>
          </div>
        </div>
      </div>
    {:else if activeDemo === 'accordion'}
      <div class="demo-section">
        <h2>Mission Accordion Touch</h2>

        <div class="accordion-demo-container">
          <div class="accordion-container">
            <MissionAccordion items={demoMissionItems.getAll()} selectedItemId={null} />
          </div>

          <div class="accordion-instructions">
            <h3>Accordion Gestures</h3>
            <ul>
              <li><strong>Swipe Left:</strong> Minimize item to coin</li>
              <li><strong>Swipe Right:</strong> Select item</li>
              <li><strong>Vertical Swipe:</strong> Scroll through items</li>
              <li><strong>Drag Handle:</strong> Reorder items</li>
              <li><strong>Touch Buttons:</strong> Optimized for finger taps</li>
            </ul>

            <div class="touch-tips">
              <h4>Touch Tips</h4>
              <p>
                All buttons are sized for easy touch interaction (minimum 44px). Swipe gestures work
                on the entire item area.
              </p>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </main>
</div>

<style>
  .touch-demo-page {
    min-height: 100vh;
    background-color: var(--color-background_primary);
    color: var(--color-text_primary);
    font-family: var(--typography-font_family_sans);
  }

  .demo-header {
    padding: calc(var(--layout-spacing_unit) * 3);
    text-align: center;
    background-color: var(--color-background_secondary);
    border-bottom: var(--layout-border_width) solid var(--color-background_tertiary);
  }

  .demo-header h1 {
    margin: 0 0 var(--layout-spacing_unit) 0;
    font-size: calc(var(--typography-font_size_lg) * 1.5);
    color: var(--color-accent_blue);
  }

  .demo-subtitle {
    margin: 0 0 calc(var(--layout-spacing_unit) * 2) 0;
    color: var(--color-text_secondary);
    font-size: var(--typography-font_size_base);
  }

  .mobile-indicator,
  .desktop-indicator {
    display: inline-block;
    padding: var(--layout-spacing_unit) calc(var(--layout-spacing_unit) * 2);
    border-radius: calc(var(--layout-border_radius) * 2);
    font-size: var(--typography-font_size_sm);
    font-weight: 600;
  }

  .mobile-indicator {
    background-color: var(--color-accent_green);
    color: white;
  }

  .desktop-indicator {
    background-color: var(--color-accent_blue);
    color: white;
  }

  .demo-nav {
    display: flex;
    justify-content: center;
    gap: var(--layout-spacing_unit);
    padding: calc(var(--layout-spacing_unit) * 2);
    background-color: var(--color-background_tertiary);
    overflow-x: auto;
  }

  .nav-button {
    padding: var(--layout-spacing_unit) calc(var(--layout-spacing_unit) * 2);
    background-color: var(--color-background_secondary);
    border: var(--layout-border_width) solid var(--color-background_tertiary);
    color: var(--color-text_primary);
    border-radius: var(--layout-border_radius);
    cursor: pointer;
    transition: all var(--animation-transition_duration) var(--animation-easing_function);
    white-space: nowrap;
    min-height: 44px; /* Touch-friendly */
  }

  .nav-button:hover {
    background-color: var(--color-background_tertiary);
    transform: translateY(-1px);
  }

  .nav-button.active {
    background-color: var(--color-accent_blue);
    color: white;
    border-color: var(--color-accent_blue);
  }

  .demo-content {
    padding: calc(var(--layout-spacing_unit) * 3);
    max-width: 1200px;
    margin: 0 auto;
  }

  .demo-section h2 {
    margin: 0 0 calc(var(--layout-spacing_unit) * 2) 0;
    color: var(--color-accent_blue);
    font-size: var(--typography-font_size_lg);
  }

  .feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: calc(var(--layout-spacing_unit) * 2);
    margin-bottom: calc(var(--layout-spacing_unit) * 3);
  }

  .feature-card {
    background-color: var(--color-background_secondary);
    padding: calc(var(--layout-spacing_unit) * 2);
    border-radius: var(--layout-border_radius);
    border: var(--layout-border_width) solid var(--color-background_tertiary);
  }

  .feature-card h3 {
    margin: 0 0 var(--layout-spacing_unit) 0;
    color: var(--color-text_primary);
    font-size: var(--typography-font_size_base);
  }

  .feature-card ul {
    margin: 0;
    padding-left: calc(var(--layout-spacing_unit) * 2);
    color: var(--color-text_secondary);
  }

  .feature-card li {
    margin-bottom: calc(var(--layout-spacing_unit) / 2);
  }

  .instructions {
    background-color: var(--color-background_secondary);
    padding: calc(var(--layout-spacing_unit) * 2);
    border-radius: var(--layout-border_radius);
    border-left: 4px solid var(--color-accent_blue);
  }

  .instructions h3 {
    margin: 0 0 var(--layout-spacing_unit) 0;
    color: var(--color-accent_blue);
  }

  .gesture-demo-container {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: calc(var(--layout-spacing_unit) * 2);
    height: 500px;
  }

  .gesture-demo-area {
    background-color: var(--color-background_secondary);
    border: 2px dashed var(--color-accent_blue);
    border-radius: var(--layout-border_radius);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    user-select: none;
    position: relative;
    overflow: hidden;
  }

  .demo-instructions {
    text-align: center;
  }

  .demo-instructions h3 {
    margin: 0 0 var(--layout-spacing_unit) 0;
    color: var(--color-accent_blue);
  }

  .demo-instructions ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .demo-instructions li {
    margin-bottom: calc(var(--layout-spacing_unit) / 2);
    font-size: var(--typography-font_size_base);
  }

  .gesture-log {
    background-color: var(--color-background_secondary);
    border-radius: var(--layout-border_radius);
    border: var(--layout-border_width) solid var(--color-background_tertiary);
    display: flex;
    flex-direction: column;
  }

  .gesture-log.mini {
    height: 200px;
  }

  .log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--layout-spacing_unit);
    border-bottom: var(--layout-border_width) solid var(--color-background_tertiary);
  }

  .log-header h3 {
    margin: 0;
    font-size: var(--typography-font_size_base);
    color: var(--color-text_primary);
  }

  .clear-log-btn {
    background-color: var(--color-accent_red);
    color: white;
    border: none;
    padding: calc(var(--layout-spacing_unit) / 2) var(--layout-spacing_unit);
    border-radius: var(--layout-border_radius);
    cursor: pointer;
    font-size: var(--typography-font_size_sm);
  }

  .log-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--layout-spacing_unit);
  }

  .log-entry {
    padding: calc(var(--layout-spacing_unit) / 2);
    margin-bottom: calc(var(--layout-spacing_unit) / 2);
    background-color: var(--color-background_tertiary);
    border-radius: var(--layout-border_radius);
    font-family: var(--typography-font_family_mono);
    font-size: var(--typography-font_size_sm);
    color: var(--color-text_secondary);
  }

  .log-entry.recent {
    background-color: var(--color-accent_blue);
    color: white;
  }

  .log-empty {
    text-align: center;
    color: var(--color-text_disabled);
    font-style: italic;
    padding: calc(var(--layout-spacing_unit) * 2);
  }

  .map-demo-container,
  .coins-demo-container,
  .accordion-demo-container {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: calc(var(--layout-spacing_unit) * 2);
    height: 600px;
  }

  .map-container,
  .accordion-container {
    background-color: var(--color-background_secondary);
    border-radius: var(--layout-border_radius);
    overflow: hidden;
  }

  .coins-area {
    background-color: var(--color-background_secondary);
    border-radius: var(--layout-border_radius);
    position: relative;
    overflow: hidden;
  }

  .map-instructions,
  .coins-instructions,
  .accordion-instructions {
    background-color: var(--color-background_secondary);
    padding: calc(var(--layout-spacing_unit) * 2);
    border-radius: var(--layout-border_radius);
    border: var(--layout-border_width) solid var(--color-background_tertiary);
  }

  .map-instructions h3,
  .coins-instructions h3,
  .accordion-instructions h3 {
    margin: 0 0 var(--layout-spacing_unit) 0;
    color: var(--color-accent_blue);
  }

  .map-instructions ul,
  .coins-instructions ul,
  .accordion-instructions ul {
    margin: 0 0 calc(var(--layout-spacing_unit) * 2) 0;
    padding-left: calc(var(--layout-spacing_unit) * 2);
  }

  .map-instructions li,
  .coins-instructions li,
  .accordion-instructions li {
    margin-bottom: calc(var(--layout-spacing_unit) / 2);
    color: var(--color-text_secondary);
  }

  .touch-tips {
    background-color: var(--color-background_tertiary);
    padding: var(--layout-spacing_unit);
    border-radius: var(--layout-border_radius);
    margin-top: var(--layout-spacing_unit);
  }

  .touch-tips h4 {
    margin: 0 0 calc(var(--layout-spacing_unit) / 2) 0;
    color: var(--color-accent_yellow);
    font-size: var(--typography-font_size_sm);
  }

  .touch-tips p {
    margin: 0;
    font-size: var(--typography-font_size_sm);
    color: var(--color-text_secondary);
    line-height: 1.4;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .demo-content {
      padding: var(--layout-spacing_unit);
    }

    .gesture-demo-container,
    .map-demo-container,
    .coins-demo-container,
    .accordion-demo-container {
      grid-template-columns: 1fr;
      height: auto;
      gap: var(--layout-spacing_unit);
    }

    .gesture-demo-area {
      height: 300px;
    }

    .map-container,
    .coins-area,
    .accordion-container {
      height: 400px;
    }

    .feature-grid {
      grid-template-columns: 1fr;
    }

    .demo-nav {
      padding: var(--layout-spacing_unit);
    }

    .nav-button {
      padding: calc(var(--layout-spacing_unit) * 1.5);
      font-size: var(--typography-font_size_sm);
    }
  }

  /* Touch device optimizations */
  @media (hover: none) and (pointer: coarse) {
    .nav-button,
    .clear-log-btn {
      min-height: 44px;
      min-width: 44px;
    }

    .gesture-demo-area {
      border-width: 3px;
    }

    .log-entry {
      padding: var(--layout-spacing_unit);
      font-size: var(--typography-font_size_base);
    }
  }
</style>
