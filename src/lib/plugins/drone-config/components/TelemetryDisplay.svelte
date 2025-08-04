<!-- TelemetryDisplay Component - NASA JPL Compliant -->
<script lang="ts">
  import type { Motor } from '../types/motor-types';

  // Props
  export let motors: Motor[] = [];
  export let totalCurrent: number = 0;
</script>

<!-- Telemetry Display -->
<div class="telemetry-display">
  <h3>Motor Telemetry</h3>
  <div class="telemetry-grid">
    {#each motors as motor}
      <div class="telemetry-card">
        <div class="telemetry-header">Motor {motor.id}</div>
        <div class="telemetry-item">
          <span>RPM:</span>
          <span>{motor.rpm}</span>
        </div>
        <div class="telemetry-item">
          <span>Current:</span>
          <span class:warning={motor.current > 20}>{motor.current.toFixed(1)}A</span>
        </div>
        <div class="telemetry-item">
          <span>Temp:</span>
          <span class:error={motor.temperature > 80}>{motor.temperature}°C</span>
        </div>
      </div>
    {/each}
  </div>

  <div class="telemetry-summary">
    <div class="summary-item">
      <span>Total Current:</span>
      <span class:warning={totalCurrent > 80}>{totalCurrent.toFixed(1)}A</span>
    </div>
  </div>
</div>

<style>
  /* Telemetry Display */
  .telemetry-display {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border_primary);
  }

  .telemetry-display h3 {
    margin-bottom: 0.5rem;
    color: var(--color-text_secondary);
  }

  .telemetry-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.5rem;
  }

  .telemetry-card {
    background: var(--color-background_secondary);
    border: 1px solid var(--color-border_primary);
    border-radius: 6px;
    padding: 0.75rem;
  }

  .telemetry-header {
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--color-text_secondary);
  }

  .telemetry-item {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  .telemetry-item span:first-child {
    color: var(--color-text_tertiary);
  }

  .telemetry-item span.warning {
    color: var(--color-status_warning);
    font-weight: 600;
  }

  .telemetry-item span.error {
    color: var(--color-status_error);
    font-weight: 600;
  }

  .telemetry-summary {
    margin-top: 1rem;
    padding: 0.75rem;
    background: var(--color-background_tertiary);
    border: 1px solid var(--color-border_primary);
    border-radius: 6px;
  }

  .summary-item {
    display: flex;
    justify-content: space-between;
    font-weight: 600;
  }

  .summary-item span.warning {
    color: var(--color-status_warning);
  }

  /* Mobile optimizations */
  @media (max-width: 768px) {
    .telemetry-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
