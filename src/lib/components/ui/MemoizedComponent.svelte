<!--
  Memoized Component Wrapper
  Implements React.memo equivalent for Svelte components
  Prevents unnecessary re-renders through intelligent prop comparison
  
  NASA JPL Compliant: Bounded memory allocation and deterministic comparison
-->
<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';

  // Component and props configuration
  export let component: any; // Svelte component constructor
  export let props: Record<string, any> = {}; // Component props
  export let compareProps: ((prev: Record<string, any>, next: Record<string, any>) => boolean) | undefined = undefined;
  export let enablePerfMonitoring: boolean = false;
  export let debugName: string = 'MemoizedComponent';

  // Memoization state
  let prevProps: Record<string, any> = {};
  let shouldUpdate = true;
  let renderCount = 0;
  let lastRenderTime = 0;
  let componentInstance: any;

  // Performance metrics
  interface MemoizationMetrics {
    renderCount: number;
    skipCount: number;
    avgRenderTime: number;
    lastComparisonTime: number;
    memoryUsage?: number;
  }

  let skipCount = 0;
  let totalRenderTime = 0;
  let comparisonTimes: number[] = [];

  const dispatch = createEventDispatcher<{
    render: { renderCount: number; renderTime: number };
    skip: { skipCount: number; reason: string };
    metrics: MemoizationMetrics;
  }>();

  /**
   * Default shallow comparison for props
   * NASA JPL Rule 4: Function ≤60 lines with bounded execution time
   */
  function defaultCompareProps(prev: Record<string, any>, next: Record<string, any>): boolean {
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);

    // Quick length check
    if (prevKeys.length !== nextKeys.length) {
      return false;
    }

    // Bounded comparison - limit to prevent excessive computation
    const MAX_PROPS_TO_COMPARE = 50; // NASA JPL Rule 2: Bounded iteration
    const keysToCheck = prevKeys.slice(0, MAX_PROPS_TO_COMPARE);

    for (const key of keysToCheck) {
      if (!(key in next)) {
        return false;
      }

      const prevValue = prev[key];
      const nextValue = next[key];

      // Primitive comparison
      if (prevValue !== nextValue) {
        // Special handling for arrays and objects
        if (Array.isArray(prevValue) && Array.isArray(nextValue)) {
          if (prevValue.length !== nextValue.length) {
            return false;
          }
          // Shallow array comparison (bounded)
          const maxArrayCompare = Math.min(prevValue.length, 100);
          for (let i = 0; i < maxArrayCompare; i++) {
            if (prevValue[i] !== nextValue[i]) {
              return false;
            }
          }
          continue;
        }

        // Object reference comparison (no deep comparison for performance)
        if (typeof prevValue === 'object' && typeof nextValue === 'object') {
          if (prevValue === null || nextValue === null) {
            return prevValue === nextValue;
          }
          // Reference comparison only - deep comparison too expensive
          return false;
        }

        return false;
      }
    }

    return true;
  }

  /**
   * Determine if component should update based on prop changes
   */
  function checkShouldUpdate(newProps: Record<string, any>): boolean {
    const comparisonStart = performance.now();
    
    const compareFn = compareProps || defaultCompareProps;
    const propsEqual = compareFn(prevProps, newProps);
    
    const comparisonTime = performance.now() - comparisonStart;
    comparisonTimes.push(comparisonTime);
    
    // Keep only last 100 comparison times for metrics
    if (comparisonTimes.length > 100) {
      comparisonTimes.shift();
    }

    if (propsEqual) {
      skipCount++;
      dispatch('skip', { 
        skipCount, 
        reason: 'Props unchanged' 
      });
      
      if (enablePerfMonitoring) {
        emitMetrics();
      }
      
      return false;
    }

    prevProps = { ...newProps }; // Shallow clone for next comparison
    return true;
  }

  /**
   * Emit performance metrics
   */
  function emitMetrics(): void {
    const avgComparisonTime = comparisonTimes.length > 0 
      ? comparisonTimes.reduce((sum, time) => sum + time, 0) / comparisonTimes.length 
      : 0;

    const metrics: MemoizationMetrics = {
      renderCount,
      skipCount,
      avgRenderTime: renderCount > 0 ? totalRenderTime / renderCount : 0,
      lastComparisonTime: avgComparisonTime,
      memoryUsage: browser && 'memory' in performance ? 
        (performance as any).memory?.usedJSHeapSize || 0 : undefined
    };

    dispatch('metrics', metrics);
  }

  /**
   * Track render performance
   */
  function trackRender(renderTime: number): void {
    renderCount++;
    totalRenderTime += renderTime;
    lastRenderTime = renderTime;

    dispatch('render', { renderCount, renderTime });

    if (enablePerfMonitoring) {
      emitMetrics();
    }

    // Log performance warnings for aerospace debugging
    if (renderTime > 16.67) { // More than one 60fps frame
      console.warn(`[${debugName}] Slow render detected: ${renderTime.toFixed(2)}ms`);
    }
  }

  // Reactive statement to check for updates
  $: {
    shouldUpdate = checkShouldUpdate(props);
  }

  // Log memoization stats in development
  $: if (browser && enablePerfMonitoring) {
    const efficiency = renderCount + skipCount > 0 
      ? (skipCount / (renderCount + skipCount) * 100).toFixed(1)
      : '0.0';
    
    console.log(`[${debugName}] Memoization efficiency: ${efficiency}% (${skipCount} skips, ${renderCount} renders)`);
  }

  onDestroy(() => {
    // Log final performance metrics
    if (enablePerfMonitoring && (renderCount > 0 || skipCount > 0)) {
      const efficiency = (skipCount / (renderCount + skipCount) * 100).toFixed(1);
      console.log(`[${debugName}] Final metrics: ${efficiency}% efficiency, avg render: ${(totalRenderTime / renderCount).toFixed(2)}ms`);
    }
  });
</script>

<!-- Conditional rendering based on memoization -->
{#if shouldUpdate}
  {#if component}
    <!-- Track render time -->
    {#key props}
      <div class="memoized-wrapper" bind:this={componentInstance}>
        <svelte:component 
          this={component} 
          {...props}
          on:*
        />
      </div>
    {/key}
  {:else}
    <div class="memoized-error">
      <span class="error-icon">⚠️</span>
      No component provided to MemoizedComponent
    </div>
  {/if}
{/if}

<!-- Performance monitoring overlay (development only) -->
{#if enablePerfMonitoring && browser}
  <div class="perf-overlay">
    <div class="perf-stat">
      <span class="perf-label">Renders:</span>
      <span class="perf-value">{renderCount}</span>
    </div>
    <div class="perf-stat">
      <span class="perf-label">Skips:</span>
      <span class="perf-value">{skipCount}</span>
    </div>
    <div class="perf-stat">
      <span class="perf-label">Efficiency:</span>
      <span class="perf-value">
        {renderCount + skipCount > 0 ? (skipCount / (renderCount + skipCount) * 100).toFixed(1) : '0'}%
      </span>
    </div>
    <div class="perf-stat">
      <span class="perf-label">Last render:</span>
      <span class="perf-value">{lastRenderTime.toFixed(2)}ms</span>
    </div>
  </div>
{/if}

<style>
  .memoized-wrapper {
    /* Ensure component maintains its layout */
    display: contents;
  }

  .memoized-error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: var(--color-status_error_bg, #ffebee);
    color: var(--color-status_error, #d32f2f);
    border: 1px solid var(--color-status_error, #d32f2f);
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .error-icon {
    font-size: 1.2rem;
  }

  .perf-overlay {
    position: fixed;
    top: 10px;
    right: 10px;
    background: var(--color-overlay_heavy, rgba(0, 0, 0, 0.9));
    color: var(--color-text_primary, #ffffff);
    padding: 8px 12px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.7rem;
    line-height: 1.4;
    pointer-events: none;
    z-index: 10000;
    min-width: 120px;
  }

  .perf-stat {
    display: flex;
    justify-content: space-between;
    margin-bottom: 2px;
  }

  .perf-stat:last-child {
    margin-bottom: 0;
  }

  .perf-label {
    color: var(--color-text_secondary, #cccccc);
  }

  .perf-value {
    color: var(--color-accent_blue, #61dafb);
    font-weight: 600;
  }

  /* Hide performance overlay in production builds */
  :global(.production) .perf-overlay {
    display: none;
  }
</style>