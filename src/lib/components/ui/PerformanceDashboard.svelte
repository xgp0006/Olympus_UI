<!--
  Performance Monitoring Dashboard
  Real-time performance metrics display for aerospace-grade monitoring
  Tracks FPS, memory usage, render times, and optimization efficiency
  
  NASA JPL Compliant: Bounded data collection and safe visualization
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    performanceMonitor,
    currentFPS,
    isPerformanceCritical,
    performanceWarning,
    PERFORMANCE_CONSTANTS
  } from '$lib/utils/performance-optimizations';
  import { browser } from '$app/environment';

  // Component props
  export let position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'top-right';
  export let minimized: boolean = false;
  export let autoHide: boolean = false;
  export let updateInterval: number = 1000; // ms

  // Internal state
  let visible = true;
  let stats = {
    avgFPS: 0,
    avgFrameTime: 0,
    maxFrameTime: 0,
    memoryUsage: 0,
    sampleCount: 0
  };
  let hideTimeout: number | null = null;

  // Performance history for mini chart
  let fpsHistory: number[] = [];
  let memoryHistory: number[] = [];
  const MAX_HISTORY_LENGTH = 60; // 1 minute at 1s intervals

  /**
   * Update performance statistics
   */
  function updateStats(): void {
    if (!browser) return;

    stats = performanceMonitor.getStats();

    // Update history arrays
    fpsHistory.push($currentFPS || 0);
    memoryHistory.push(stats.memoryUsage);

    // Bounded arrays (NASA JPL Rule 2)
    if (fpsHistory.length > MAX_HISTORY_LENGTH) {
      fpsHistory.shift();
    }
    if (memoryHistory.length > MAX_HISTORY_LENGTH) {
      memoryHistory.shift();
    }

    // Auto-hide logic
    if (autoHide && !$isPerformanceCritical && !$performanceWarning) {
      if (hideTimeout === null) {
        hideTimeout = window.setTimeout(() => {
          visible = false;
        }, 5000); // Hide after 5s of good performance
      }
    } else {
      if (hideTimeout !== null) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      visible = true;
    }
  }

  /**
   * Format memory usage for display
   */
  function formatMemory(bytes: number): string {
    if (bytes === 0) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
  }

  /**
   * Get performance status color
   */
  function getPerformanceColor(fps: number): string {
    if (fps >= PERFORMANCE_CONSTANTS.TARGET_FPS * 0.9)
      return 'var(--color-status_success, #4caf50)';
    if (fps >= 60) return 'var(--color-status_warning, #ff9800)';
    return 'var(--color-status_error, #f44336)';
  }

  /**
   * Toggle minimized state
   */
  function toggleMinimized(): void {
    minimized = !minimized;
  }

  /**
   * Clear performance history
   */
  function clearHistory(): void {
    fpsHistory = [];
    memoryHistory = [];
    performanceMonitor.clear();
  }

  // Update interval management
  let updateIntervalId: number | null = null;

  onMount(() => {
    if (browser) {
      updateIntervalId = window.setInterval(updateStats, updateInterval);
      updateStats(); // Initial update
    }
  });

  onDestroy(() => {
    if (updateIntervalId !== null) {
      clearInterval(updateIntervalId);
    }
    if (hideTimeout !== null) {
      clearTimeout(hideTimeout);
    }
  });

  // Reactive updates
  $: if ($isPerformanceCritical || $performanceWarning) {
    visible = true;
  }
</script>

<!-- Performance dashboard container -->
{#if visible}
  <div
    class="performance-dashboard"
    class:minimized
    class:critical={$isPerformanceCritical}
    class:warning={$performanceWarning}
    class:position-top-left={position === 'top-left'}
    class:position-top-right={position === 'top-right'}
    class:position-bottom-left={position === 'bottom-left'}
    class:position-bottom-right={position === 'bottom-right'}
  >
    <!-- Dashboard header -->
    <div
      class="dashboard-header"
      on:click={toggleMinimized}
      on:keydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleMinimized();
        }
      }}
      role="button"
      tabindex="0"
      aria-label="Toggle performance dashboard"
      aria-expanded={!minimized}
    >
      <span class="dashboard-title">Performance</span>
      <div class="dashboard-controls">
        <span class="minimize-icon" class:rotated={!minimized}>▼</span>
      </div>
    </div>

    <!-- Dashboard content -->
    {#if !minimized}
      <div class="dashboard-content">
        <!-- Primary metrics -->
        <div class="metric-row">
          <div class="metric">
            <span class="metric-label">FPS:</span>
            <span class="metric-value" style="color: {getPerformanceColor($currentFPS || 0)}">
              {Math.round($currentFPS || 0)}
            </span>
          </div>
          <div class="metric">
            <span class="metric-label">Memory:</span>
            <span class="metric-value">{formatMemory(stats.memoryUsage)}</span>
          </div>
        </div>

        <!-- Secondary metrics -->
        <div class="metric-row">
          <div class="metric">
            <span class="metric-label">Avg Frame:</span>
            <span class="metric-value">{stats.avgFrameTime.toFixed(1)}ms</span>
          </div>
          <div class="metric">
            <span class="metric-label">Max Frame:</span>
            <span
              class="metric-value"
              class:warning={stats.maxFrameTime > PERFORMANCE_CONSTANTS.WARNING_FRAME_TIME}
            >
              {stats.maxFrameTime.toFixed(1)}ms
            </span>
          </div>
        </div>

        <!-- Performance warning -->
        {#if $performanceWarning}
          <div class="performance-warning">
            ⚠ {$performanceWarning}
          </div>
        {/if}

        <!-- Mini performance chart -->
        {#if fpsHistory.length > 1}
          <div class="mini-chart">
            <div class="chart-label">FPS History (60s)</div>
            <div class="chart-container">
              <svg viewBox="0 0 60 20" class="chart-svg">
                <!-- FPS line -->
                <polyline
                  points={fpsHistory
                    .map((fps, i) => `${i},${20 - (fps / PERFORMANCE_CONSTANTS.TARGET_FPS) * 20}`)
                    .join(' ')}
                  fill="none"
                  stroke={getPerformanceColor($currentFPS || 0)}
                  stroke-width="0.5"
                />
                <!-- Target FPS line -->
                <line
                  x1="0"
                  y1={20 -
                    (PERFORMANCE_CONSTANTS.TARGET_FPS / PERFORMANCE_CONSTANTS.TARGET_FPS) * 20}
                  x2="60"
                  y2={20 -
                    (PERFORMANCE_CONSTANTS.TARGET_FPS / PERFORMANCE_CONSTANTS.TARGET_FPS) * 20}
                  stroke="var(--color-accent_blue, #007acc)"
                  stroke-width="0.2"
                  stroke-dasharray="1,1"
                />
              </svg>
            </div>
          </div>
        {/if}

        <!-- Controls -->
        <div class="dashboard-controls-row">
          <button class="control-btn" on:click={clearHistory} title="Clear history"> Clear </button>
          <button class="control-btn" on:click={() => (visible = false)} title="Hide dashboard">
            Hide
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .performance-dashboard {
    position: fixed;
    z-index: 10000;
    background: var(--color-overlay_heavy, rgba(0, 0, 0, 0.9));
    border: 1px solid var(--color-border_primary, #555555);
    border-radius: 6px;
    color: var(--color-text_primary, #ffffff);
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.75rem;
    min-width: 200px;
    backdrop-filter: blur(4px);
  }

  /* Position variants */
  .position-top-left {
    top: 10px;
    left: 10px;
  }
  .position-top-right {
    top: 10px;
    right: 10px;
  }
  .position-bottom-left {
    bottom: 10px;
    left: 10px;
  }
  .position-bottom-right {
    bottom: 10px;
    right: 10px;
  }

  /* State variants */
  .performance-dashboard.critical {
    border-color: var(--color-status_error, #f44336);
    box-shadow: 0 0 10px var(--color-status_error_alpha, rgba(244, 67, 54, 0.3));
  }

  .performance-dashboard.warning {
    border-color: var(--color-status_warning, #ff9800);
  }

  .performance-dashboard.minimized {
    min-width: 150px;
  }

  .dashboard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--color-background_secondary, rgba(45, 45, 45, 0.8));
    cursor: pointer;
    user-select: none;
  }

  .dashboard-title {
    font-weight: 600;
    font-size: 0.8rem;
  }

  .minimize-icon {
    transition: transform 0.2s ease;
    font-size: 0.7rem;
  }

  .minimize-icon.rotated {
    transform: rotate(-90deg);
  }

  .dashboard-content {
    padding: 8px 12px;
  }

  .metric-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  .metric {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .metric-label {
    color: var(--color-text_secondary, #cccccc);
    font-size: 0.7rem;
  }

  .metric-value {
    font-weight: 600;
    font-size: 0.75rem;
  }

  .metric-value.warning {
    color: var(--color-status_warning, #ff9800);
  }

  .performance-warning {
    background: var(--color-status_warning_bg, rgba(255, 152, 0, 0.1));
    color: var(--color-status_warning, #ff9800);
    padding: 4px 6px;
    border-radius: 3px;
    font-size: 0.65rem;
    margin: 6px 0;
    border-left: 2px solid var(--color-status_warning, #ff9800);
  }

  .mini-chart {
    margin: 8px 0;
  }

  .chart-label {
    color: var(--color-text_secondary, #cccccc);
    font-size: 0.65rem;
    margin-bottom: 4px;
  }

  .chart-container {
    height: 20px;
    background: var(--color-background_primary, rgba(30, 30, 30, 0.5));
    border-radius: 2px;
    overflow: hidden;
  }

  .chart-svg {
    width: 100%;
    height: 100%;
  }

  .dashboard-controls-row {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }

  .control-btn {
    background: var(--color-background_tertiary, rgba(61, 61, 61, 0.8));
    color: var(--color-text_primary, #ffffff);
    border: 1px solid var(--color-border_primary, #555555);
    border-radius: 3px;
    padding: 3px 8px;
    font-size: 0.65rem;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .control-btn:hover {
    background: var(--color-background_quaternary, rgba(255, 255, 255, 0.1));
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .minimize-icon {
      transition: none;
    }
  }

  /* High contrast mode */
  @media (prefers-contrast: high) {
    .performance-dashboard {
      border: 2px solid var(--color-border_primary, #ffffff);
    }
  }

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    .performance-dashboard {
      font-size: 0.7rem;
      min-width: 180px;
    }

    .position-top-left,
    .position-bottom-left {
      left: 5px;
    }

    .position-top-right,
    .position-bottom-right {
      right: 5px;
    }

    .position-top-left,
    .position-top-right {
      top: 5px;
    }

    .position-bottom-left,
    .position-bottom-right {
      bottom: 5px;
    }
  }
</style>
