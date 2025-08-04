<!-- SafetyControls Component - NASA JPL Compliant -->
<script context="module" lang="ts">
  // Safety stage definitions
  export enum SafetyStage {
    LOCKED = 0,
    STAGE_1 = 1, // 25% max
    STAGE_2 = 2, // 50% max
    STAGE_3 = 3, // 75% max
    STAGE_4 = 4 // 100% max
  }
</script>

<script lang="ts">
  import type { Writable } from 'svelte/store';
  import { showNotification } from '$lib/stores/notifications';

  const STAGE_LIMITS: Record<SafetyStage, number> = {
    [SafetyStage.LOCKED]: 0,
    [SafetyStage.STAGE_1]: 25,
    [SafetyStage.STAGE_2]: 50,
    [SafetyStage.STAGE_3]: 75,
    [SafetyStage.STAGE_4]: 100
  };

  const STAGE_NAMES: Record<SafetyStage, string> = {
    [SafetyStage.LOCKED]: 'LOCKED - No Motor Control',
    [SafetyStage.STAGE_1]: 'Stage 1 - 25% Maximum',
    [SafetyStage.STAGE_2]: 'Stage 2 - 50% Maximum',
    [SafetyStage.STAGE_3]: 'Stage 3 - 75% Maximum',
    [SafetyStage.STAGE_4]: 'Stage 4 - 100% Maximum'
  };

  // Props
  export let currentStage: Writable<SafetyStage>;
  export let propellerRemoved: Writable<boolean>;
  export let countdownTime: Writable<number>;
  export let isEmergencyStopping: Writable<boolean>;
  export let testActive: Writable<boolean>;
  export let onEmergencyStop: () => Promise<void>;
  export let onProgressStage: (stage: SafetyStage) => void;
  export let playWarningSound: (frequency: number, duration: number) => void;

  // Mobile gesture handling with precise timing
  let gestureStartTime: number = 0;
  let gestureTimer: number | null = null;
  let gestureInProgress: boolean = false;

  // Stage progression mutex to prevent race conditions
  let stageTransitionInProgress = false;
  let lastTransitionTime = 0;

  // NASA JPL compliant function: Handle gesture start
  function handleGestureStart(): void {
    // Use high-precision timing
    gestureStartTime = performance.now();
    gestureInProgress = true;

    gestureTimer = window.setTimeout(() => {
      if (gestureInProgress) {
        // 3 second hold confirmed
        playWarningSound(550, 100);
      }
    }, 3000);
  }

  // NASA JPL compliant function: Handle gesture end
  function handleGestureEnd(targetStage: SafetyStage): void {
    gestureInProgress = false;

    if (gestureTimer) {
      clearTimeout(gestureTimer);
      gestureTimer = null;
    }

    // Prevent timing manipulation with precise measurement
    const holdDuration = performance.now() - gestureStartTime;
    const requiredDuration = 3000;

    // Add tolerance for timing precision
    if (holdDuration >= requiredDuration - 10 && holdDuration <= requiredDuration + 1000) {
      // Confirmed - progress stage with mutex protection
      progressStageAtomic(targetStage);
    } else if (holdDuration > requiredDuration + 1000) {
      // Suspiciously long hold - potential manipulation
      showNotification({
        type: 'warning',
        message: 'Gesture timeout - please try again',
        timeout: 3000
      });
    } else {
      showNotification({
        type: 'info',
        message: `Hold for 3 seconds to confirm (held ${(holdDuration / 1000).toFixed(1)}s)`,
        timeout: 2000
      });
    }
  }

  // NASA JPL compliant function: Atomic stage progression
  function progressStageAtomic(targetStage: SafetyStage): void {
    // Mutex check - prevent concurrent transitions
    if (stageTransitionInProgress) {
      showNotification({
        type: 'warning',
        message: 'Stage transition already in progress',
        timeout: 2000
      });
      return;
    }

    // Rate limiting - prevent rapid transitions
    const now = performance.now();
    if (now - lastTransitionTime < 1000) {
      showNotification({
        type: 'warning',
        message: 'Please wait before changing stages',
        timeout: 2000
      });
      return;
    }

    // Set mutex
    stageTransitionInProgress = true;
    lastTransitionTime = now;

    // Perform stage transition
    onProgressStage(targetStage);

    // Release mutex after transition
    setTimeout(() => {
      stageTransitionInProgress = false;
    }, 100);
  }

  // Derived store for max throttle
  $: maxThrottle = STAGE_LIMITS[$currentStage];
</script>

<!-- Emergency Stop Button - Always Visible -->
<button
  class="emergency-stop"
  class:active={$isEmergencyStopping}
  on:click={onEmergencyStop}
  disabled={$isEmergencyStopping}
>
  <span class="emergency-icon">⚠</span>
  EMERGENCY STOP
</button>

<!-- Safety Status Bar -->
<div class="safety-status" class:locked={$currentStage === SafetyStage.LOCKED}>
  <div class="status-indicator">
    <span class="stage-name">{STAGE_NAMES[$currentStage]}</span>
    {#if $countdownTime > 0}
      <span class="countdown" class:urgent={$countdownTime <= 3}>
        {$countdownTime}s
      </span>
    {/if}
  </div>

  <div class="throttle-limit">
    Max Throttle: <strong>{maxThrottle}%</strong>
  </div>
</div>

<!-- Safety Interlocks -->
<div class="safety-interlocks">
  <label class="safety-checkbox">
    <input type="checkbox" bind:checked={$propellerRemoved} disabled={$testActive} />
    <span>I confirm all propellers have been removed</span>
  </label>
</div>

<!-- Stage Progression -->
<div class="stage-controls">
  {#each [SafetyStage.STAGE_1, SafetyStage.STAGE_2, SafetyStage.STAGE_3, SafetyStage.STAGE_4] as stage}
    <button
      class="stage-button"
      class:active={$currentStage >= stage}
      disabled={!$propellerRemoved || $currentStage >= stage || $testActive}
      on:click={() => progressStageAtomic(stage)}
      on:touchstart={handleGestureStart}
      on:touchend={() => handleGestureEnd(stage)}
      on:touchcancel={() => {
        gestureInProgress = false;
        if (gestureTimer) clearTimeout(gestureTimer);
      }}
    >
      Stage {stage}: {STAGE_LIMITS[stage]}%
    </button>
  {/each}
</div>

<style>
  /* Emergency Stop - Critical Safety UI */
  .emergency-stop {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 100px;
    height: 100px;
    background: var(--color-status_error);
    border: 3px solid var(--color-text_inverse);
    border-radius: 12px;
    color: var(--color-text_inverse);
    font-weight: 700;
    font-size: 12px;
    text-align: center;
    cursor: pointer;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    box-shadow: 0 4px 12px var(--layout-shadow_dark);
    transition: all 0.1s ease;
  }

  .emergency-stop:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 6px 16px var(--layout-shadow_dark);
  }

  .emergency-stop:active:not(:disabled) {
    transform: scale(0.98);
  }

  .emergency-stop.active {
    animation: emergency-pulse 0.5s infinite;
  }

  .emergency-stop:disabled {
    opacity: 0.8;
    cursor: not-allowed;
  }

  .emergency-icon {
    font-size: 32px;
    line-height: 1;
  }

  @keyframes emergency-pulse {
    0%,
    100% {
      background: var(--color-status_error);
    }
    50% {
      background: var(--color-status_warning);
    }
  }

  /* Safety Status Bar */
  .safety-status {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--color-background_secondary);
    border: 2px solid var(--color-border_primary);
    border-radius: 8px;
    margin-top: 1rem;
    margin-right: 120px; /* Space for emergency button */
  }

  .safety-status.locked {
    border-color: var(--color-status_error);
    background: var(--color-status_error_bg);
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .stage-name {
    font-size: 1.125rem;
    font-weight: 600;
  }

  .countdown {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-accent_blue);
    min-width: 3rem;
    text-align: center;
  }

  .countdown.urgent {
    color: var(--color-status_error);
    animation: countdown-pulse 1s infinite;
  }

  @keyframes countdown-pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }

  .throttle-limit {
    font-size: 1rem;
    color: var(--color-text_secondary);
  }

  .throttle-limit strong {
    color: var(--color-accent_green);
    font-size: 1.25rem;
  }

  /* Safety Interlocks */
  .safety-interlocks {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .safety-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--color-background_tertiary);
    border: 1px solid var(--color-border_primary);
    border-radius: 6px;
    cursor: pointer;
    user-select: none;
  }

  .safety-checkbox input[type='checkbox'] {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }

  /* Stage Controls */
  .stage-controls {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .stage-button {
    padding: 1rem;
    background: var(--color-background_tertiary);
    border: 2px solid var(--color-border_primary);
    border-radius: 6px;
    color: var(--color-text_primary);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    touch-action: manipulation;
  }

  .stage-button:hover:not(:disabled) {
    background: var(--color-background_quaternary);
    border-color: var(--color-accent_blue);
  }

  .stage-button.active {
    background: var(--color-accent_blue);
    color: var(--color-text_inverse);
    border-color: var(--color-accent_blue);
  }

  .stage-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Mobile optimizations */
  @media (max-width: 768px) {
    .emergency-stop {
      width: 80px;
      height: 80px;
      font-size: 10px;
    }

    .emergency-icon {
      font-size: 24px;
    }

    .stage-controls {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* Touch-specific styles */
  @media (hover: none) {
    .stage-button {
      padding: 1.25rem;
    }
  }

  /* High contrast mode */
  @media (prefers-contrast: high) {
    .emergency-stop {
      border-width: 4px;
    }

    .safety-status {
      border-width: 3px;
    }

    .stage-button {
      border-width: 3px;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .emergency-stop,
    .countdown {
      animation: none;
    }

    * {
      transition-duration: 0.01ms !important;
    }
  }
</style>
