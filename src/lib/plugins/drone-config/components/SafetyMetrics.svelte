<!-- SafetyMetrics Component - Real-time safety performance monitoring -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getEmergencyMetrics } from '../services/emergency-stop';

  // Metrics state
  let maxResponseTime = 0;
  let avgResponseTime = 0;
  let violations = 0;
  let updateInterval: number | null = null;

  // Update metrics
  function updateMetrics(): void {
    const metrics = getEmergencyMetrics();
    maxResponseTime = metrics.maxResponseTime;
    avgResponseTime = metrics.avgResponseTime;
    violations = metrics.violations;
  }

  // Lifecycle
  onMount(() => {
    updateMetrics();
    updateInterval = window.setInterval(updateMetrics, 100);
  });

  onDestroy(() => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
  });

  // Color coding for response times
  $: responseColor =
    maxResponseTime < 0.5
      ? 'var(--color-status_success)'
      : maxResponseTime < 1.0
        ? 'var(--color-status_warning)'
        : 'var(--color-status_error)';
</script>

<div class="safety-metrics">
  <h4>Safety Performance</h4>

  <div class="metric-grid">
    <div class="metric">
      <span class="label">Max Response</span>
      <span class="value" style="color: {responseColor}">
        {maxResponseTime.toFixed(3)}ms
      </span>
    </div>

    <div class="metric">
      <span class="label">Avg Response</span>
      <span class="value">
        {avgResponseTime.toFixed(3)}ms
      </span>
    </div>

    <div class="metric">
      <span class="label">Violations</span>
      <span class="value" class:error={violations > 0}>
        {violations}
      </span>
    </div>

    <div class="metric">
      <span class="label">Target</span>
      <span class="value success"> &lt; 1.0ms </span>
    </div>
  </div>

  {#if violations > 0}
    <div class="warning-banner">⚠️ Emergency stop response time violations detected!</div>
  {/if}
</div>

<style>
  .safety-metrics {
    padding: 1rem;
    background: var(--color-background_secondary);
    border: 1px solid var(--color-border_primary);
    border-radius: 8px;
    margin-top: 1rem;
  }

  .safety-metrics h4 {
    margin: 0 0 0.75rem 0;
    color: var(--color-text_secondary);
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .metric-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }

  .metric {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .metric .label {
    font-size: 0.75rem;
    color: var(--color-text_secondary);
    margin-bottom: 0.25rem;
  }

  .metric .value {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text_primary);
  }

  .metric .value.error {
    color: var(--color-status_error);
  }

  .metric .value.success {
    color: var(--color-status_success);
  }

  .warning-banner {
    margin-top: 1rem;
    padding: 0.75rem;
    background: var(--color-status_warning_bg);
    border: 1px solid var(--color-status_warning);
    border-radius: 6px;
    color: var(--color-status_warning);
    text-align: center;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    .metric-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
