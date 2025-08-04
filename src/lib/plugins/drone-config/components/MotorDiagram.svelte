<!-- MotorDiagram Component - NASA JPL Compliant -->

<script lang="ts">
  import { flip } from 'svelte/animate';
  import type { Motor, MotorConfig } from '../types/motor-types';

  // Motor layouts following Betaflight standards
  const MOTOR_LAYOUTS: Record<MotorConfig, Motor[]> = {
    quad: [
      { id: 1, x: 75, y: 25, direction: 'CW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
      { id: 2, x: 25, y: 25, direction: 'CCW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
      { id: 3, x: 25, y: 75, direction: 'CW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
      { id: 4, x: 75, y: 75, direction: 'CCW', throttle: 0, rpm: 0, current: 0, temperature: 0 }
    ],
    hex: [
      { id: 1, x: 75, y: 15, direction: 'CW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
      { id: 2, x: 25, y: 15, direction: 'CCW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
      { id: 3, x: 0, y: 50, direction: 'CW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
      { id: 4, x: 25, y: 85, direction: 'CCW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
      { id: 5, x: 75, y: 85, direction: 'CW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
      { id: 6, x: 100, y: 50, direction: 'CCW', throttle: 0, rpm: 0, current: 0, temperature: 0 }
    ],
    octo: [
      { id: 1, x: 70, y: 10, direction: 'CW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
      { id: 2, x: 30, y: 10, direction: 'CCW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
      { id: 3, x: 10, y: 30, direction: 'CW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
      { id: 4, x: 10, y: 70, direction: 'CCW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
      { id: 5, x: 30, y: 90, direction: 'CW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
      { id: 6, x: 70, y: 90, direction: 'CCW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
      { id: 7, x: 90, y: 70, direction: 'CW', throttle: 0, rpm: 0, current: 0, temperature: 0 },
      { id: 8, x: 90, y: 30, direction: 'CCW', throttle: 0, rpm: 0, current: 0, temperature: 0 }
    ]
  };

  // Props
  export let motorConfig: MotorConfig = 'quad';
  export let motors: Motor[] = [...MOTOR_LAYOUTS.quad];
  export let selectedMotors: Set<number> = new Set();
  export let testActive: boolean = false;
  export let onToggleMotorSelection: (motorId: number) => void;
  export let onChangeMotorConfig: (config: MotorConfig) => void;

  // Helper function to avoid type assertion in template
  function handleConfigChange(config: string) {
    if (config === 'quad' || config === 'hex' || config === 'octo') {
      onChangeMotorConfig(config);
    }
  }
</script>

<!-- Motor Configuration -->
<div class="motor-config">
  <h3>Motor Configuration</h3>
  <div class="config-buttons">
    {#each ['quad', 'hex', 'octo'] as config}
      <button
        class="config-button"
        class:active={motorConfig === config}
        on:click={() => handleConfigChange(config)}
        disabled={testActive}
      >
        {config.toUpperCase()}
      </button>
    {/each}
  </div>
</div>

<!-- Motor Visualization -->
<div class="motor-visualization">
  <svg viewBox="0 0 100 100" class="motor-diagram">
    <!-- Frame outline -->
    <circle cx="50" cy="50" r="45" class="frame-outline" />

    <!-- Motors -->
    {#each motors as motor}
      <g
        class="motor"
        class:selected={selectedMotors.has(motor.id)}
        transform="translate({motor.x}, {motor.y})"
        on:click={() => onToggleMotorSelection(motor.id)}
        on:keydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleMotorSelection(motor.id);
          }
        }}
        role="button"
        tabindex="0"
      >
        <circle
          r="8"
          class="motor-body"
          class:cw={motor.direction === 'CW'}
          class:ccw={motor.direction === 'CCW'}
          style="opacity: {0.3 + (motor.throttle / 100) * 0.7}"
        />
        <text class="motor-number" text-anchor="middle" dy="0.3em">
          {motor.id}
        </text>
        {#if motor.throttle > 0}
          <circle
            r="10"
            class="motor-spinning"
            style="animation-duration: {2 - (motor.throttle / 100) * 1.5}s"
          />
        {/if}
      </g>
    {/each}
  </svg>

  <div class="motor-legend">
    <span class="legend-item">
      <span class="cw-indicator"></span> Clockwise
    </span>
    <span class="legend-item">
      <span class="ccw-indicator"></span> Counter-Clockwise
    </span>
  </div>
</div>

<style>
  /* Motor Configuration */
  .motor-config {
    margin-top: 1rem;
  }

  .motor-config h3 {
    margin-bottom: 0.5rem;
    color: var(--color-text_secondary);
  }

  .config-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .config-button {
    flex: 1;
    padding: 0.5rem 1rem;
    background: var(--color-background_tertiary);
    border: 1px solid var(--color-border_primary);
    border-radius: 4px;
    color: var(--color-text_primary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .config-button:hover:not(:disabled) {
    background: var(--color-background_quaternary);
  }

  .config-button.active {
    background: var(--color-accent_blue);
    color: var(--color-text_inverse);
    border-color: var(--color-accent_blue);
  }

  .config-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Motor Visualization */
  .motor-visualization {
    flex: 1;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .motor-diagram {
    flex: 1;
    max-height: 300px;
    background: var(--color-background_secondary);
    border: 1px solid var(--color-border_primary);
    border-radius: 8px;
    padding: 1rem;
  }

  .frame-outline {
    fill: none;
    stroke: var(--color-border_secondary);
    stroke-width: 0.5;
    stroke-dasharray: 2, 2;
  }

  .motor {
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .motor:hover .motor-body {
    stroke-width: 2;
    stroke: var(--color-accent_blue);
  }

  .motor.selected .motor-body {
    stroke-width: 3;
    stroke: var(--color-accent_green);
  }

  .motor-body {
    fill: var(--color-background_quaternary);
    stroke: var(--color-border_primary);
    stroke-width: 1;
    transition: all 0.2s ease;
  }

  .motor-body.cw {
    fill: var(--color-accent_blue);
  }

  .motor-body.ccw {
    fill: var(--color-accent_purple);
  }

  .motor-number {
    fill: var(--color-text_primary);
    font-size: 4px;
    font-weight: 700;
    pointer-events: none;
    user-select: none;
  }

  .motor-spinning {
    fill: none;
    stroke: var(--color-text_tertiary_alpha);
    stroke-width: 0.5;
    stroke-dasharray: 3, 1;
    animation: motor-spin linear infinite;
    pointer-events: none;
  }

  @keyframes motor-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .motor-legend {
    display: flex;
    justify-content: center;
    gap: 2rem;
    font-size: 0.875rem;
    color: var(--color-text_secondary);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .cw-indicator {
    width: 16px;
    height: 16px;
    background: var(--color-accent_blue);
    border-radius: 50%;
  }

  .ccw-indicator {
    width: 16px;
    height: 16px;
    background: var(--color-accent_purple);
    border-radius: 50%;
  }

  /* Mobile optimizations */
  @media (max-width: 768px) {
    .motor-diagram {
      max-height: 250px;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .motor-spinning {
      animation: none;
    }

    * {
      transition-duration: 0.01ms !important;
    }
  }
</style>
