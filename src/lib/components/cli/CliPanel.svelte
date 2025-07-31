<!--
  CLI Panel Component for the Modular C2 Frontend
  Provides persistent CLI access at the bottom of the screen with xterm.js integration
  Mobile-first responsive design with touch optimization
  Requirements: 2.1, 2.2, 2.3, 2.4, 4.1
-->
<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import { isMobile, isTablet } from '../../utils/responsive';
  import { addTouchGestures } from '../../utils/touch';
  import CliView from './CliView.svelte';

  // Props
  export let collapsed = false;

  // State
  let isExpanded = !collapsed;
  let panelHeight = 200; // Default height in pixels
  let isDragging = false;
  let dragStartY = 0;
  let dragStartHeight = 0;
  let touchGestureCleanup: (() => void) | null = null;
  let resizeHandle: HTMLElement;

  // Component references
  let cliView: CliView | undefined;

  // Event dispatcher
  const dispatch = createEventDispatcher();

  // Responsive state
  $: isMobileDevice = $isMobile;
  $: isTabletDevice = $isTablet;

  // Responsive panel heights
  $: responsivePanelHeight = browser
    ? isMobileDevice
      ? parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(
            '--responsive-mobile-cli-mobile_height'
          ) || '200px'
        )
      : isTabletDevice
        ? parseInt(
            getComputedStyle(document.documentElement).getPropertyValue(
              '--responsive-tablet-cli-tablet_height'
            ) || '250px'
          )
        : parseInt(
            getComputedStyle(document.documentElement).getPropertyValue(
              '--responsive-desktop-cli-desktop_height'
            ) || '300px'
          )
    : isMobileDevice
      ? 200
      : isTabletDevice
        ? 250
        : 300;

  // Update expansion state when collapsed prop changes
  $: isExpanded = !collapsed;

  // Toggle panel expansion
  function togglePanel() {
    isExpanded = !isExpanded;
    dispatch('toggle', { expanded: isExpanded });

    // Focus terminal when expanded
    if (isExpanded && cliView) {
      setTimeout(() => {
        cliView?.focusTerminal();
      }, 100);
    }
  }

  // Handle keyboard shortcut (Ctrl+~)
  function handleKeydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key === '`') {
      event.preventDefault();
      togglePanel();
    }
  }

  // Handle resize drag start
  function handleResizeStart(event: MouseEvent) {
    if (!isExpanded) return;

    isDragging = true;
    dragStartY = event.clientY;
    dragStartHeight = panelHeight;

    if (browser) {
      document.addEventListener('mousemove', handleResizeDrag);
      document.addEventListener('mouseup', handleResizeEnd);
    }

    event.preventDefault();
  }

  // Handle resize drag
  function handleResizeDrag(event: MouseEvent) {
    if (!isDragging) return;

    const deltaY = dragStartY - event.clientY; // Inverted because we're dragging up to increase height
    const minHeight = isMobileDevice ? 150 : 100;
    const maxHeight = isMobileDevice ? 400 : 600;
    const newHeight = Math.max(minHeight, Math.min(maxHeight, dragStartHeight + deltaY));

    panelHeight = newHeight;

    // Resize terminal
    if (cliView) {
      setTimeout(() => {
        cliView?.resizeTerminal();
      }, 0);
    }
  }

  // Handle resize drag end
  function handleResizeEnd() {
    isDragging = false;
    if (browser) {
      document.removeEventListener('mousemove', handleResizeDrag);
      document.removeEventListener('mouseup', handleResizeEnd);
    }
  }

  // Set up touch gestures for handle
  function setupTouchGestures(): void {
    if (!resizeHandle || touchGestureCleanup) return;

    touchGestureCleanup = addTouchGestures(resizeHandle, {
      onLongPress: () => {
        // Long press to toggle expansion
        togglePanel();

        // Haptic feedback if supported
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      },

      onTap: () => {
        // Single tap to toggle when collapsed
        if (!isExpanded) {
          togglePanel();
        }
      },

      onDoubleTap: () => {
        // Double tap to toggle in any state
        togglePanel();

        // Haptic feedback if supported
        if ('vibrate' in navigator) {
          navigator.vibrate([30, 30, 30]);
        }
      },

      onPan: (gesture) => {
        // Pan up/down to resize or expand/collapse
        if (!isExpanded && gesture.deltaY < -20) {
          // Pan up when collapsed to expand
          togglePanel();
        } else if (isExpanded && gesture.deltaY > 0) {
          // Pan down when expanded to resize
          const newHeight = Math.max(100, panelHeight - gesture.deltaY);
          panelHeight = newHeight;

          if (cliView) {
            setTimeout(() => {
              cliView?.resizeTerminal();
            }, 0);
          }
        }
      }
    });
  }

  // Set up keyboard listener
  onMount(() => {
    window.addEventListener('keydown', handleKeydown);

    // Set initial height based on device
    panelHeight = responsivePanelHeight;

    // Set up touch gestures for mobile devices - delay to ensure handle is bound
    if (isMobileDevice) {
      setTimeout(() => {
        if (resizeHandle) {
          setupTouchGestures();
        }
      }, 0);
    }

    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  });

  onDestroy(() => {
    // Clean up any remaining event listeners
    if (browser) {
      document.removeEventListener('mousemove', handleResizeDrag);
      document.removeEventListener('mouseup', handleResizeEnd);
    }

    // Clean up touch gestures
    if (touchGestureCleanup) {
      touchGestureCleanup();
    }
  });
</script>

<div
  class="cli-panel"
  class:expanded={isExpanded}
  class:mobile={isMobileDevice}
  class:tablet={isTabletDevice}
  data-testid="cli-panel"
>
  <!-- Resize Handle -->
  <button
    class="resize-handle"
    class:dragging={isDragging}
    bind:this={resizeHandle}
    on:mousedown={handleResizeStart}
    on:click={() => !isExpanded && togglePanel()}
    on:dblclick={togglePanel}
    aria-label={isExpanded ? 'Resize CLI panel' : 'Expand CLI panel'}
    data-testid="resize-handle"
    title={isExpanded
      ? 'Drag to resize • Double-click or long press to collapse'
      : 'Click, double-click, or long press to expand'}
  >
    <div class="resize-indicator">
      <div class="center-handle">
        <svg viewBox="0 0 24 24" fill="currentColor" class="handle-icon">
          <path d="M8 6h8v2H8V6zm0 4h8v2H8v-2zm0 4h8v2H8v-2z" />
        </svg>
      </div>
    </div>
  </button>

  <!-- Panel Header -->
  <div class="panel-header">
    <div class="header-left">
      <span class="panel-title">Command Line Interface</span>
      <span class="panel-status connected">Ready</span>
    </div>

    <div class="header-right">
      <button
        class="toggle-button"
        on:click={togglePanel}
        data-testid="cli-toggle-button"
        title={isExpanded ? 'Collapse CLI' : 'Expand CLI'}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" class="toggle-icon" class:rotated={isExpanded}>
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
        </svg>
      </button>
    </div>
  </div>

  <!-- Panel Content -->
  {#if isExpanded}
    <div class="panel-content" style="height: {panelHeight}px">
      <CliView bind:this={cliView} height={panelHeight} autoFocus={true} />
    </div>
  {/if}
</div>

<style>
  .cli-panel {
    position: relative;
    background-color: var(--component-cli-background);
    border-top: var(--layout-border_width) solid var(--color-background_tertiary);
    transition: all var(--animation-transition_duration) var(--animation-easing_function);
    z-index: 100;
  }

  .cli-panel.expanded {
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
  }

  /* Resize Handle */
  .resize-handle {
    position: absolute;
    top: -8px;
    left: 0;
    right: 0;
    height: 16px;
    cursor: ns-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 1; /* Always visible for consistency */
    transition: all var(--animation-transition_duration);
    z-index: 10;
    background: none;
    border: none;
    padding: 0;
  }

  .cli-panel:hover .resize-handle,
  .resize-handle.dragging {
    opacity: 1;
  }

  .resize-indicator {
    position: relative;
    width: 60px;
    height: 4px;
    background-color: var(--color-text_disabled);
    border-radius: 2px;
    transition: all var(--animation-transition_duration);
  }

  .center-handle {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 32px;
    height: 16px;
    background-color: var(--color-background_secondary);
    border: 1px solid var(--color-text_disabled);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--animation-transition_duration);
  }

  .handle-icon {
    width: 12px;
    height: 12px;
    color: var(--color-text_disabled);
    transition: color var(--animation-transition_duration);
  }

  .resize-handle:hover .resize-indicator,
  .resize-handle.dragging .resize-indicator {
    background-color: var(--color-accent_blue);
  }

  .resize-handle:hover .center-handle,
  .resize-handle.dragging .center-handle {
    border-color: var(--color-accent_blue);
    background-color: var(--color-background_tertiary);
  }

  .resize-handle:hover .handle-icon,
  .resize-handle.dragging .handle-icon {
    color: var(--color-accent_blue);
  }

  .resize-handle.dragging {
    cursor: ns-resize;
  }

  /* Panel Header */
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: calc(var(--layout-spacing_unit) / 2) var(--layout-spacing_unit);
    background-color: var(--color-background_secondary);
    border-bottom: var(--layout-border_width) solid var(--color-background_tertiary);
    min-height: 32px;
    transition: transform var(--animation-transition_duration);
  }

  .cli-panel.expanded .panel-header {
    transform: translateY(-1em); /* Move up 1 line when active/expanded */
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--layout-spacing_unit);
  }

  .panel-title {
    font-size: var(--typography-font_size_sm);
    font-weight: 600;
    color: var(--color-text_primary);
  }

  .panel-status {
    font-size: var(--typography-font_size_sm);
    color: var(--color-text_disabled);
    font-family: var(--typography-font_family_mono);
    transition: color var(--animation-transition_duration);
  }

  .panel-status.connected {
    color: var(--color-accent_green);
  }

  .header-right {
    display: flex;
    align-items: center;
  }

  .toggle-button {
    background: none;
    border: none;
    color: var(--color-text_secondary);
    cursor: pointer;
    padding: calc(var(--layout-spacing_unit) / 4);
    border-radius: var(--layout-border_radius);
    transition: all var(--animation-transition_duration);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .toggle-button:hover {
    color: var(--color-text_primary);
    background-color: var(--color-background_tertiary);
  }

  .toggle-icon {
    width: 16px;
    height: 16px;
    transition: transform var(--animation-transition_duration);
  }

  .toggle-icon.rotated {
    transform: rotate(180deg);
  }

  /* Panel Content */
  .panel-content {
    overflow: hidden;
    transition: height var(--animations-transition_duration) var(--animations-easing_function);
    background-color: var(--component-cli-background);
  }

  /* Mobile-specific styles */
  .cli-panel.mobile {
    border-radius: var(--layout-border_radius) var(--layout-border_radius) 0 0;
  }

  .cli-panel.mobile .panel-header {
    padding: var(--responsive-mobile-panel_padding, 12px);
    min-height: var(--responsive-mobile-touch_target_min, 44px);
  }

  .cli-panel.mobile .panel-title {
    display: none;
  }

  .cli-panel.mobile .toggle-button {
    min-height: var(--responsive-mobile-touch_target_min, 44px);
    min-width: var(--responsive-mobile-touch_target_min, 44px);
    padding: 0;
  }

  .cli-panel.mobile .resize-handle {
    height: 20px;
    top: -10px;
    opacity: 1; /* Always visible on mobile */
  }

  .cli-panel.mobile .resize-indicator {
    width: 80px;
    height: 6px;
    background-color: var(--color-text_disabled);
  }

  .cli-panel.mobile .center-handle {
    width: 40px;
    height: 20px;
    border-width: 2px;
  }

  .cli-panel.mobile .handle-icon {
    width: 16px;
    height: 16px;
  }

  /* Tablet styles */
  @media (min-width: 768px) {
    .cli-panel.tablet .panel-header {
      padding: var(--responsive-tablet-panel_padding, 16px);
    }

    .cli-panel.tablet .toggle-button {
      min-height: var(--responsive-tablet-touch_target_min, 40px);
      min-width: var(--responsive-tablet-touch_target_min, 40px);
    }
  }

  /* Desktop styles */
  @media (min-width: 1024px) {
    .cli-panel .panel-header {
      padding: var(--responsive-desktop-panel_padding, 20px);
    }

    .cli-panel .toggle-button {
      min-height: var(--responsive-desktop-touch_target_min, 32px);
      min-width: var(--responsive-desktop-touch_target_min, 32px);
    }
  }

  /* Touch optimization */
  @media (hover: none) and (pointer: coarse) {
    .resize-handle {
      opacity: 1;
      height: 24px;
      top: -12px;
    }

    .resize-indicator {
      width: 100px;
      height: 8px;
    }

    .center-handle {
      width: 48px;
      height: 24px;
      border-width: 2px;
    }

    .handle-icon {
      width: 18px;
      height: 18px;
    }

    .toggle-button {
      padding: calc(var(--layout-spacing_unit) / 2);
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .cli-panel,
    .panel-content,
    .resize-handle,
    .toggle-button {
      transition-duration: var(--animations-reduced_motion_duration, 0ms);
    }
  }
</style>
