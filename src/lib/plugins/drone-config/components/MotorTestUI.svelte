<!-- 
  MotorTestUI Component - UI layout for motor testing
  NASA JPL Rule 4 compliant: < 60 lines
-->
<script lang="ts">
  import type { Readable } from 'svelte/store';

  export let isConnected: Readable<boolean>;
  export let countdownTime: Readable<number>;
  export let currentStage: number;

  const stageDescriptions: Record<number, string> = {
    0: 'LOCKED - Enable safety features to proceed',
    1: 'Stage 1 - Motor spin test (max 25%)',
    2: 'Stage 2 - Medium power test (max 50%)',
    3: 'Stage 3 - High power test (max 75%)',
    4: 'Stage 4 - Full power test (max 100%)'
  };
</script>

<div class="motor-test-ui">
  {#if !$isConnected}
    <div class="warning-message">⚠ No drone connection - connect to enable motor testing</div>
  {/if}

  <div class="status-bar">
    <div class="stage-indicator">
      <span class="stage-label">Current Stage:</span>
      <span class="stage-value stage-{currentStage}">
        {stageDescriptions[currentStage]}
      </span>
    </div>

    {#if $countdownTime > 0}
      <div class="countdown-timer">
        <span class="countdown-label">Time remaining:</span>
        <span class="countdown-value" class:urgent={$countdownTime <= 3}>
          {$countdownTime}s
        </span>
      </div>
    {/if}
  </div>
</div>

<style>
  .motor-test-ui {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .warning-message {
    padding: 0.75rem;
    background: var(--color-status_warning_bg);
    border: 1px solid var(--color-status_warning);
    border-radius: 6px;
    color: var(--color-status_warning);
    text-align: center;
  }

  .status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: var(--color-surface_secondary);
    border-radius: 4px;
  }

  .countdown-value.urgent {
    color: var(--color-status_error);
    font-weight: bold;
  }
</style>
