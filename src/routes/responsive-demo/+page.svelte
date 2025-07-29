<!--
  Responsive Design Demo Page
  Demonstrates mobile-first responsive design implementation
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { responsiveStore, isMobile, isTablet, currentBreakpoint } from '$lib/utils/responsive';
  import PluginDashboard from '$lib/components/plugins/PluginDashboard.svelte';
  import CliPanel from '$lib/components/cli/CliPanel.svelte';
  import MissionPlanner from '$lib/plugins/mission-planner/MissionPlanner.svelte';
  import SdrDashboard from '$lib/plugins/sdr-suite/SdrDashboard.svelte';

  // Responsive state
  $: isMobileDevice = $isMobile;
  $: isTabletDevice = $isTablet;
  $: breakpoint = $currentBreakpoint;

  // Demo state
  let activeDemo = 'dashboard';
  let showResponsiveInfo = true;

  onMount(() => {
    const cleanup = responsiveStore.initialize();
    return cleanup;
  });

  function setDemo(demo: string) {
    activeDemo = demo;
  }
</script>

<svelte:head>
  <title>Responsive Design Demo - Modular C2 Frontend</title>
  <meta name="description" content="Demonstration of mobile-first responsive design" />
</svelte:head>

<div class="demo-container">
  <!-- Responsive Info Panel -->
  {#if showResponsiveInfo}
    <div class="responsive-info">
      <div class="info-content">
        <h2>Responsive Design Demo</h2>
        <div class="current-state">
          <div class="state-item">
            <span class="label">Breakpoint:</span>
            <span class="value {breakpoint}">{breakpoint}</span>
          </div>
          <div class="state-item">
            <span class="label">Device Type:</span>
            <span class="value">
              {isMobileDevice ? 'Mobile' : isTabletDevice ? 'Tablet' : 'Desktop'}
            </span>
          </div>
          <div class="state-item">
            <span class="label">Viewport:</span>
            <span class="value">{window?.innerWidth || 0} × {window?.innerHeight || 0}</span>
          </div>
        </div>
        <button
          class="close-info"
          on:click={() => (showResponsiveInfo = false)}
          aria-label="Close responsive info"
        >
          ×
        </button>
      </div>
    </div>
  {/if}

  <!-- Demo Navigation -->
  <nav class="demo-nav">
    <button
      class="nav-button {activeDemo === 'dashboard' ? 'active' : ''}"
      on:click={() => setDemo('dashboard')}
    >
      Plugin Dashboard
    </button>
    <button
      class="nav-button {activeDemo === 'mission' ? 'active' : ''}"
      on:click={() => setDemo('mission')}
    >
      Mission Planner
    </button>
    <button
      class="nav-button {activeDemo === 'sdr' ? 'active' : ''}"
      on:click={() => setDemo('sdr')}
    >
      SDR Suite
    </button>
    <button
      class="nav-button {activeDemo === 'cli' ? 'active' : ''}"
      on:click={() => setDemo('cli')}
    >
      CLI Panel
    </button>
  </nav>

  <!-- Demo Content -->
  <main class="demo-content">
    {#if activeDemo === 'dashboard'}
      <div class="demo-section">
        <h3>Plugin Dashboard - Responsive Grid</h3>
        <p class="demo-description">
          Mobile: Single column | Tablet: 2 columns | Desktop: Auto-fill grid
        </p>
        <PluginDashboard />
      </div>
    {:else if activeDemo === 'mission'}
      <div class="demo-section">
        <h3>Mission Planner - Adaptive Layout</h3>
        <p class="demo-description">Mobile: Stacked with toggle | Tablet/Desktop: Side-by-side</p>
        <MissionPlanner />
      </div>
    {:else if activeDemo === 'sdr'}
      <div class="demo-section">
        <h3>SDR Suite - Flexible Layout</h3>
        <p class="demo-description">Mobile: Stacked controls | Tablet/Desktop: Side controls</p>
        <SdrDashboard />
      </div>
    {:else if activeDemo === 'cli'}
      <div class="demo-section">
        <h3>CLI Panel - Touch Optimized</h3>
        <p class="demo-description">Mobile: Overlay with gestures | Desktop: Persistent panel</p>
        <CliPanel collapsed={false} />
      </div>
    {/if}
  </main>

  <!-- Responsive Instructions -->
  <aside class="instructions">
    <h4>Test Instructions</h4>
    <ul>
      <li>Resize your browser window to see responsive changes</li>
      <li>Try different device sizes: 375px (mobile), 768px (tablet), 1024px+ (desktop)</li>
      <li>On mobile, look for touch-optimized controls and gestures</li>
      <li>Notice how layouts adapt and components reflow</li>
    </ul>
  </aside>
</div>

<style>
  .demo-container {
    min-height: 100vh;
    background-color: var(--color-background_primary);
    color: var(--color-text_primary);
    font-family: var(--typography-font_family_sans);
  }

  .responsive-info {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    background-color: var(--color-background_secondary);
    border: var(--layout-border_width) solid var(--color-accent_blue);
    border-radius: var(--layout-border_radius);
    padding: var(--layout-spacing_unit);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    min-width: 250px;
  }

  .info-content h2 {
    margin: 0 0 var(--layout-spacing_unit) 0;
    font-size: var(--typography-font_size_lg);
    color: var(--color-accent_blue);
  }

  .current-state {
    display: flex;
    flex-direction: column;
    gap: calc(var(--layout-spacing_unit) / 2);
  }

  .state-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .label {
    font-size: var(--typography-font_size_sm);
    color: var(--color-text_secondary);
  }

  .value {
    font-family: var(--typography-font_family_mono);
    font-size: var(--typography-font_size_sm);
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 3px;
    background-color: var(--color-background_tertiary);
  }

  .value.xs {
    color: var(--color-accent_red);
  }
  .value.sm {
    color: var(--color-accent_yellow);
  }
  .value.md {
    color: var(--color-accent_blue);
  }
  .value.lg {
    color: var(--color-accent_green);
  }
  .value.xl {
    color: var(--color-accent_blue);
  }
  .value.\32 xl {
    color: var(--color-accent_green);
  }

  .close-info {
    position: absolute;
    top: 8px;
    right: 8px;
    background: none;
    border: none;
    color: var(--color-text_secondary);
    font-size: 18px;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all var(--animations-transition_duration);
  }

  .close-info:hover {
    background-color: var(--color-background_tertiary);
    color: var(--color-text_primary);
  }

  .demo-nav {
    display: flex;
    gap: var(--layout-spacing_unit);
    padding: var(--layout-spacing_unit);
    background-color: var(--color-background_secondary);
    border-bottom: var(--layout-border_width) solid var(--color-background_tertiary);
    overflow-x: auto;
  }

  .nav-button {
    background-color: var(--color-background_tertiary);
    border: var(--layout-border_width) solid var(--color-background_tertiary);
    color: var(--color-text_secondary);
    padding: calc(var(--layout-spacing_unit) / 2) var(--layout-spacing_unit);
    border-radius: var(--layout-border_radius);
    cursor: pointer;
    font-family: inherit;
    font-size: var(--typography-font_size_sm);
    transition: all var(--animations-transition_duration);
    white-space: nowrap;
    min-height: 44px; /* Touch-friendly */
  }

  .nav-button:hover {
    background-color: var(--color-background_primary);
    color: var(--color-text_primary);
  }

  .nav-button.active {
    background-color: var(--color-accent_blue);
    border-color: var(--color-accent_blue);
    color: white;
  }

  .demo-content {
    flex: 1;
    padding: var(--layout-spacing_unit);
  }

  .demo-section {
    margin-bottom: calc(var(--layout-spacing_unit) * 2);
  }

  .demo-section h3 {
    margin: 0 0 calc(var(--layout-spacing_unit) / 2) 0;
    font-size: var(--typography-font_size_lg);
    color: var(--color-text_primary);
  }

  .demo-description {
    margin: 0 0 var(--layout-spacing_unit) 0;
    font-size: var(--typography-font_size_sm);
    color: var(--color-text_secondary);
    font-style: italic;
  }

  .instructions {
    background-color: var(--color-background_secondary);
    padding: var(--layout-spacing_unit);
    border-top: var(--layout-border_width) solid var(--color-background_tertiary);
  }

  .instructions h4 {
    margin: 0 0 var(--layout-spacing_unit) 0;
    font-size: var(--typography-font_size_base);
    color: var(--color-accent_yellow);
  }

  .instructions ul {
    margin: 0;
    padding-left: calc(var(--layout-spacing_unit) * 2);
  }

  .instructions li {
    margin-bottom: calc(var(--layout-spacing_unit) / 2);
    font-size: var(--typography-font_size_sm);
    color: var(--color-text_secondary);
    line-height: 1.4;
  }

  /* Mobile responsive adjustments */
  @media (max-width: 767px) {
    .responsive-info {
      position: relative;
      top: 0;
      right: 0;
      margin: var(--layout-spacing_unit);
      min-width: unset;
    }

    .demo-nav {
      padding: calc(var(--layout-spacing_unit) / 2);
    }

    .nav-button {
      font-size: var(--typography-font_size_base);
      padding: var(--layout-spacing_unit);
    }

    .demo-content {
      padding: calc(var(--layout-spacing_unit) / 2);
    }

    .instructions {
      padding: calc(var(--layout-spacing_unit) / 2);
    }
  }

  /* Tablet adjustments */
  @media (min-width: 768px) and (max-width: 1023px) {
    .responsive-info {
      min-width: 280px;
    }
  }
</style>
