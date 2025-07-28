<!--
  Root Application Component for the Modular C2 Frontend
  Provides the main application structure and plugin loading mechanism
  Mobile-first responsive design with touch optimization
  Requirements: 1.1, 1.4, 4.1
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { plugins, activePluginWritable, initializePluginSystem } from '../../stores/plugins';
  import { responsiveStore, isMobile, isTablet, currentBreakpoint } from '../../utils/responsive';
  import ThemeProvider from '../theme/ThemeProvider.svelte';
  import PluginDashboard from '../plugins/PluginDashboard.svelte';
  import PluginContainer from '../plugins/PluginContainer.svelte';
  import CliPanel from '../cli/CliPanel.svelte';
  import ErrorBoundary from './ErrorBoundary.svelte';
  import NotificationCenter from '../ui/NotificationCenter.svelte';

  // Application state
  let appInitialized = false;
  let initializationError: string | null = null;
  let cliCollapsed = false;

  // Responsive state
  $: isMobileDevice = $isMobile;
  $: isTabletDevice = $isTablet;
  $: breakpoint = $currentBreakpoint;

  // Initialize application
  onMount(() => {
    let cleanupResponsive: (() => void) | undefined;

    const initializeApp = async () => {
      try {
        console.log('Initializing Modular C2 Frontend...');

        // Initialize responsive system
        cleanupResponsive = responsiveStore.initialize();

        // Initialize plugin system
        await initializePluginSystem();

        appInitialized = true;
        console.log('Application initialized successfully');

        // Auto-collapse CLI on mobile
        if (isMobileDevice) {
          cliCollapsed = true;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
        initializationError = errorMessage;
        console.error('Application initialization failed:', errorMessage);
      }
    };

    initializeApp();

    // Return cleanup function
    return () => {
      if (cleanupResponsive) {
        cleanupResponsive();
      }
    };
  });

  // Handle navigation back to dashboard
  function handleReturnToDashboard() {
    activePluginWritable.set(null);
  }

  // Handle CLI toggle for mobile
  function handleCliToggle() {
    cliCollapsed = !cliCollapsed;
  }

  // Handle swipe gestures on mobile
  function handleTouchStart(event: TouchEvent) {
    if (!isMobileDevice) return;
    
    const touch = event.touches[0];
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
  }

  function handleTouchEnd(event: TouchEvent) {
    if (!isMobileDevice) return;
    
    const touch = event.changedTouches[0];
    const deltaY = touch.clientY - touchStartY;
    const deltaTime = Date.now() - touchStartTime;
    
    // Swipe up to show CLI, swipe down to hide CLI
    if (Math.abs(deltaY) > 50 && deltaTime < 500) {
      if (deltaY < -50 && cliCollapsed) {
        cliCollapsed = false;
      } else if (deltaY > 50 && !cliCollapsed) {
        cliCollapsed = true;
      }
    }
  }

  let touchStartY = 0;
  let touchStartTime = 0;
</script>

<ThemeProvider themeName="super_amoled_black_responsive">
  <ErrorBoundary>
    <div 
      class="app-container" 
      class:mobile={isMobileDevice}
      class:tablet={isTabletDevice}
      class:cli-collapsed={cliCollapsed}
      data-testid="app-container"
      on:touchstart={handleTouchStart}
      on:touchend={handleTouchEnd}
    >
      <!-- Main Content Area -->
      <main class="main-content">
        {#if !appInitialized}
          <div class="initialization-screen">
            {#if initializationError}
              <div class="error-state">
                <h1 class="error-title">Initialization Failed</h1>
                <p class="error-message">{initializationError}</p>
                <button class="retry-button" on:click={() => window.location.reload()}>
                  Retry
                </button>
              </div>
            {:else}
              <div class="loading-state">
                <div class="loading-spinner"></div>
                <h1 class="loading-title">Modular C2 Frontend</h1>
                <p class="loading-message">Initializing aerospace command & control interface...</p>
              </div>
            {/if}
          </div>
        {:else if $activePluginWritable}
          <!-- Active Plugin View -->
          <div class="plugin-view">
            <!-- Navigation Header -->
            <header class="plugin-header">
              <button
                class="home-button"
                on:click={handleReturnToDashboard}
                data-testid="home-button"
              >
                <svg class="home-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
                {#if !isMobileDevice}
                  <span>Dashboard</span>
                {/if}
              </button>

              <div class="plugin-title">
                {$plugins.find((p) => p.id === $activePluginWritable)?.name || 'Unknown Plugin'}
              </div>

              {#if isMobileDevice}
                <button
                  class="cli-toggle-mobile"
                  on:click={handleCliToggle}
                  data-testid="cli-toggle-mobile"
                  title={cliCollapsed ? 'Show CLI' : 'Hide CLI'}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4V8h16v10zm-10-1h2v-2h-2v2zm4 0h2v-2h-2v2zm4 0h2v-2h-2v2z"/>
                  </svg>
                </button>
              {/if}
            </header>

            <!-- Plugin Content -->
            <div class="plugin-content">
              <PluginContainer pluginId={$activePluginWritable} />
            </div>
          </div>
        {:else}
          <!-- Plugin Dashboard -->
          <div class="dashboard-view">
            <header class="dashboard-header">
              <h1 class="app-title">Modular C2 Frontend</h1>
              <p class="app-subtitle">Aerospace Command & Control Interface</p>
            </header>

            <div class="dashboard-content">
              <PluginDashboard />
            </div>
          </div>
        {/if}
      </main>

      <!-- Persistent CLI Panel -->
      <div class="cli-container" class:collapsed={cliCollapsed}>
        <CliPanel collapsed={cliCollapsed} on:toggle={handleCliToggle} />
      </div>

      <!-- Notification System -->
      <NotificationCenter />
    </div>
  </ErrorBoundary>
</ThemeProvider>

<style>
  /* Mobile-first responsive design */
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background-color: var(--color-background_primary);
    color: var(--color-text_primary);
    font-family: var(--typography-font_family_sans);
    overflow: hidden;
    /* Touch optimization */
    -webkit-tap-highlight-color: var(--touch-tap_highlight_color, rgba(0, 191, 255, 0.2));
    touch-action: var(--touch-touch_action, manipulation);
    overscroll-behavior: var(--touch-overscroll_behavior, contain);
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Initialization Screen */
  .initialization-screen {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: calc(var(--layout-spacing_unit) * 4);
  }

  .loading-state {
    text-align: center;
    max-width: 400px;
  }

  .loading-spinner {
    width: 48px;
    height: 48px;
    border: 3px solid var(--color-text_disabled);
    border-top: 3px solid var(--color-accent_blue);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto calc(var(--layout-spacing_unit) * 3);
  }

  .loading-title {
    font-size: var(--typography-font_size_lg);
    color: var(--color-accent_blue);
    margin-bottom: var(--layout-spacing_unit);
  }

  .loading-message {
    color: var(--color-text_secondary);
    font-size: var(--typography-font_size_base);
  }

  .error-state {
    text-align: center;
    max-width: 500px;
  }

  .error-title {
    font-size: var(--typography-font_size_lg);
    color: var(--color-accent_red);
    margin-bottom: var(--layout-spacing_unit);
  }

  .error-message {
    color: var(--color-text_secondary);
    margin-bottom: calc(var(--layout-spacing_unit) * 2);
    padding: calc(var(--layout-spacing_unit) * 2);
    background-color: var(--color-background_secondary);
    border-radius: var(--layout-border_radius);
    border-left: 4px solid var(--color-accent_red);
  }

  .retry-button {
    background-color: var(--color-accent_red);
    color: white;
    border: none;
    padding: calc(var(--layout-spacing_unit) * 1.5) calc(var(--layout-spacing_unit) * 3);
    border-radius: var(--layout-border_radius);
    cursor: pointer;
    font-family: inherit;
    font-size: var(--typography-font_size_base);
    transition: background-color var(--animation-transition_duration);
  }

  .retry-button:hover {
    background-color: var(--color-accent_red);
    filter: brightness(1.1);
  }

  /* Plugin View */
  .plugin-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .plugin-header {
    display: flex;
    align-items: center;
    padding: var(--responsive-mobile-panel_padding, 12px);
    background-color: var(--color-background_secondary);
    border-bottom: var(--layout-border_width) solid var(--color-background_tertiary);
    gap: var(--layout-spacing_unit);
    min-height: var(--responsive-mobile-touch_target_min, 44px);
  }

  .home-button {
    display: flex;
    align-items: center;
    gap: calc(var(--layout-spacing_unit) / 2);
    background: none;
    border: var(--layout-border_width) solid var(--color-text_disabled);
    color: var(--color-text_secondary);
    padding: var(--responsive-mobile-button-mobile_padding, 12px 16px);
    border-radius: var(--layout-border_radius);
    cursor: pointer;
    font-family: inherit;
    font-size: var(--responsive-mobile-font_size_base, 16px);
    transition: all var(--animations-mobile_transition_duration, 150ms);
    min-height: var(--responsive-mobile-touch_target_min, 44px);
    min-width: var(--responsive-mobile-touch_target_min, 44px);
  }

  .home-button:hover {
    border-color: var(--color-accent_blue);
    color: var(--color-accent_blue);
    transform: scale(var(--animation-hover_scale));
  }

  .home-button:active {
    transform: scale(var(--animation-button_press_scale));
  }

  .home-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .cli-toggle-mobile {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: var(--layout-border_width) solid var(--color-text_disabled);
    color: var(--color-text_secondary);
    padding: 0;
    border-radius: var(--layout-border_radius);
    cursor: pointer;
    transition: all var(--animations-mobile_transition_duration, 150ms);
    min-height: var(--responsive-mobile-touch_target_min, 44px);
    min-width: var(--responsive-mobile-touch_target_min, 44px);
  }

  .cli-toggle-mobile:hover,
  .cli-toggle-mobile:active {
    border-color: var(--color-accent_blue);
    color: var(--color-accent_blue);
  }

  .cli-toggle-mobile svg {
    width: 20px;
    height: 20px;
  }

  .plugin-title {
    font-size: var(--responsive-mobile-font_size_lg, 18px);
    font-weight: 600;
    color: var(--color-text_primary);
    flex: 1;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .plugin-content {
    flex: 1;
    overflow: hidden;
  }

  /* Dashboard View */
  .dashboard-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .dashboard-header {
    text-align: center;
    padding: var(--responsive-mobile-panel_padding, 12px);
    padding-top: calc(var(--responsive-mobile-panel_padding, 12px) * 2);
  }

  .app-title {
    font-size: var(--responsive-mobile-font_size_2xl, 20px);
    color: var(--color-accent_blue);
    margin-bottom: calc(var(--layout-spacing_unit) / 2);
    font-weight: 700;
  }

  .app-subtitle {
    color: var(--color-text_secondary);
    font-size: var(--responsive-mobile-font_size_base, 16px);
    margin: 0;
  }

  .dashboard-content {
    flex: 1;
    overflow: auto;
    padding: 0 var(--responsive-mobile-panel_padding, 12px) var(--responsive-mobile-panel_padding, 12px);
    /* Smooth scrolling on mobile */
    -webkit-overflow-scrolling: touch;
    scroll-behavior: var(--touch-scroll_behavior, smooth);
  }

  /* CLI Container */
  .cli-container {
    flex-shrink: 0;
    transition: transform var(--animations-transition_duration, 200ms) var(--animations-easing_function);
  }

  .cli-container.collapsed {
    transform: translateY(100%);
  }

  /* Mobile-specific styles */
  .app-container.mobile .cli-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background-color: var(--color-background_primary);
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
  }

  /* Animations */
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  /* Tablet styles */
  @media (min-width: 768px) {
    .app-container {
      -webkit-tap-highlight-color: transparent;
    }

    .plugin-header {
      padding: var(--responsive-tablet-panel_padding, 16px);
      gap: calc(var(--layout-spacing_unit) * 2);
    }

    .home-button {
      padding: var(--responsive-tablet-button-tablet_padding, 10px 14px);
      font-size: var(--responsive-tablet-font_size_base, 15px);
      min-height: var(--responsive-tablet-touch_target_min, 40px);
      min-width: var(--responsive-tablet-touch_target_min, 40px);
    }

    .home-icon {
      width: 18px;
      height: 18px;
    }

    .plugin-title {
      font-size: var(--responsive-tablet-font_size_lg, 17px);
      text-align: left;
    }

    .dashboard-header {
      padding: var(--responsive-tablet-panel_padding, 16px);
      padding-top: calc(var(--responsive-tablet-panel_padding, 16px) * 2);
    }

    .app-title {
      font-size: calc(var(--responsive-tablet-font_size_lg, 17px) * 1.4);
    }

    .app-subtitle {
      font-size: var(--responsive-tablet-font_size_base, 15px);
    }

    .dashboard-content {
      padding: 0 var(--responsive-tablet-panel_padding, 16px) var(--responsive-tablet-panel_padding, 16px);
    }

    .cli-toggle-mobile {
      display: none;
    }

    .app-container.mobile .cli-container {
      position: relative;
      box-shadow: none;
    }
  }

  /* Desktop styles */
  @media (min-width: 1024px) {
    .plugin-header {
      padding: var(--responsive-desktop-panel_padding, 20px);
    }

    .home-button {
      padding: var(--responsive-desktop-button-desktop_padding, 8px 12px);
      font-size: var(--responsive-desktop-font_size_base, 14px);
      min-height: var(--responsive-desktop-touch_target_min, 32px);
      min-width: var(--responsive-desktop-touch_target_min, 32px);
    }

    .home-icon {
      width: 16px;
      height: 16px;
    }

    .plugin-title {
      font-size: var(--responsive-desktop-font_size_lg, 16px);
    }

    .dashboard-header {
      padding: var(--responsive-desktop-panel_padding, 20px);
      padding-top: calc(var(--responsive-desktop-panel_padding, 20px) * 2);
    }

    .app-title {
      font-size: calc(var(--responsive-desktop-font_size_lg, 16px) * 1.5);
    }

    .app-subtitle {
      font-size: var(--responsive-desktop-font_size_base, 14px);
    }

    .dashboard-content {
      padding: 0 var(--responsive-desktop-panel_padding, 20px) var(--responsive-desktop-panel_padding, 20px);
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .app-container,
    .cli-container,
    .home-button,
    .cli-toggle-mobile {
      transition-duration: var(--animations-reduced_motion_duration, 0ms);
    }
  }
</style>
