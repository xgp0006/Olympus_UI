<!--
  Optimized Parameter Row Component
  High-performance parameter display with memoization and minimal re-renders
  Designed for virtual scrolling and 144fps performance targets
  
  NASA JPL Compliant: Single responsibility and bounded execution
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { DroneParameter } from '../types/drone-types';
  import { measurePerformance } from '$lib/utils/performance-optimizations';

  // Component props
  export let parameter: DroneParameter;
  export let readonly: boolean = false;
  export let loading: boolean = false;
  export let isVisible: boolean = true; // From virtual scrolling
  export let enablePerformanceMonitoring: boolean = false;

  // Internal state - minimal for performance
  let inputValue = parameter.value;
  let isDirty = false;
  let validationError: string | null = null;

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    update: { parameter: DroneParameter; value: number };
    focus: { parameter: DroneParameter };
    blur: { parameter: DroneParameter };
  }>();

  // Reactive value sync (only when parameter changes)
  $: if (parameter.value !== inputValue && !isDirty) {
    inputValue = parameter.value;
  }

  /**
   * Handle input change with validation
   * NASA JPL Rule 4: Function ≤60 lines with single responsibility
   */
  function handleInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const newValue = parseFloat(target.value);
    
    // Validate input
    if (isNaN(newValue)) {
      validationError = 'Invalid number';
      return;
    }

    // Range validation
    if (parameter.min !== undefined && newValue < parameter.min) {
      validationError = `Minimum value: ${parameter.min}`;
      return;
    }

    if (parameter.max !== undefined && newValue > parameter.max) {
      validationError = `Maximum value: ${parameter.max}`;
      return;
    }

    // Clear validation error and update state
    validationError = null;
    inputValue = newValue;
    isDirty = true;
  }

  /**
   * Handle input blur - commit changes
   */
  function handleBlur(): void {
    if (isDirty && validationError === null) {
      if (enablePerformanceMonitoring) {
        const { duration } = measurePerformance(
          () => dispatch('update', { parameter, value: inputValue }),
          `Parameter update: ${parameter.name}`
        );
      } else {
        dispatch('update', { parameter, value: inputValue });
      }
      isDirty = false;
    }
    
    dispatch('blur', { parameter });
  }

  /**
   * Handle input focus
   */
  function handleFocus(): void {
    dispatch('focus', { parameter });
  }

  /**
   * Handle select change for enum parameters
   */
  function handleSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newValue = parseFloat(target.value);
    
    inputValue = newValue;
    dispatch('update', { parameter, value: newValue });
  }

  /**
   * Format display value for better UX
   */
  function formatDisplayValue(value: number): string {
    if (parameter.type === 'float' || parameter.type === 'double') {
      return value.toFixed(parameter.increment ? Math.max(0, -Math.log10(parameter.increment)) : 2);
    }
    return value.toString();
  }

  /**
   * Get input step value for precise control
   */
  function getInputStep(): number {
    return parameter.increment || (parameter.type === 'float' || parameter.type === 'double' ? 0.1 : 1);
  }
</script>

<!-- Parameter row container -->
<div 
  class="parameter-row"
  class:dirty={isDirty}
  class:error={validationError !== null}
  class:loading
  class:hidden={!isVisible}
>
  <!-- Parameter information -->
  <div class="parameter-info">
    <div class="parameter-name" title={parameter.description || parameter.name}>
      {parameter.name}
      {#if parameter.advanced}
        <span class="advanced-badge" title="Advanced parameter">ADV</span>
      {/if}
    </div>
    
    {#if parameter.description && parameter.description !== parameter.name}
      <div class="parameter-description" title={parameter.description}>
        {parameter.description}
      </div>
    {/if}
  </div>

  <!-- Parameter value controls -->
  <div class="parameter-controls">
    {#if parameter.type === 'enum' && parameter.options}
      <!-- Enum select dropdown -->
      <select
        value={inputValue}
        on:change={handleSelectChange}
        on:focus={handleFocus}
        on:blur={handleBlur}
        disabled={readonly || loading}
        class="parameter-select"
        aria-label="Parameter value for {parameter.name}"
      >
        {#each parameter.options as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    {:else}
      <!-- Numeric input -->
      <input
        type="number"
        value={formatDisplayValue(inputValue)}
        min={parameter.min}
        max={parameter.max}
        step={getInputStep()}
        on:input={handleInputChange}
        on:focus={handleFocus}
        on:blur={handleBlur}
        disabled={readonly || loading}
        class="parameter-input"
        aria-label="Parameter value for {parameter.name}"
        aria-describedby={validationError ? `${parameter.id}-error` : undefined}
      />
    {/if}

    <!-- Units display -->
    {#if parameter.units}
      <span class="parameter-units" title="Units: {parameter.units}">
        {parameter.units}
      </span>
    {/if}

    <!-- Loading indicator -->
    {#if loading}
      <div class="loading-indicator" title="Updating parameter...">
        <div class="spinner"></div>
      </div>
    {/if}
  </div>

  <!-- Validation error -->
  {#if validationError}
    <div 
      class="validation-error" 
      id="{parameter.id}-error"
      role="alert"
    >
      <span class="error-icon">⚠</span>
      {validationError}
    </div>
  {/if}
</div>

<style>
  .parameter-row {
    display: flex;
    align-items: flex-start;
    padding: 0.75rem;
    border-bottom: 1px solid var(--color-border_secondary, #404040);
    background: var(--color-background_primary, #1e1e1e);
    transition: background-color 0.15s ease;
    min-height: 60px; /* Consistent height for virtual scrolling */
    position: relative;
  }

  .parameter-row:hover {
    background: var(--color-background_quaternary, rgba(255, 255, 255, 0.03));
  }

  .parameter-row.dirty {
    background: var(--color-background_tertiary, rgba(255, 193, 7, 0.1));
    border-left: 3px solid var(--color-status_warning, #ffc107);
  }

  .parameter-row.error {
    background: var(--color-status_error_bg, rgba(244, 67, 54, 0.1));
    border-left: 3px solid var(--color-status_error, #f44336);
  }

  .parameter-row.loading {
    opacity: 0.7;
  }

  .parameter-row.hidden {
    visibility: hidden; /* For virtual scrolling - maintain layout */
  }

  .parameter-info {
    flex: 1;
    margin-right: 1rem;
    min-width: 0; /* Allow text truncation */
  }

  .parameter-name {
    font-weight: 500;
    color: var(--color-text_primary, #ffffff);
    font-size: 0.9rem;
    line-height: 1.2;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .advanced-badge {
    background: var(--color-accent_orange, #ff9800);
    color: var(--color-text_inverse, #000000);
    font-size: 0.6rem;
    font-weight: 600;
    padding: 0.1rem 0.3rem;
    border-radius: 2px;
    line-height: 1;
  }

  .parameter-description {
    font-size: 0.8rem;
    color: var(--color-text_secondary, #cccccc);
    margin-top: 0.25rem;
    line-height: 1.3;
    
    /* Truncate long descriptions */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2; /* Standard property for compatibility */
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .parameter-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .parameter-input,
  .parameter-select {
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--color-border_primary, #555555);
    border-radius: 4px;
    background: var(--color-background_primary, #1e1e1e);
    color: var(--color-text_primary, #ffffff);
    font-size: 0.9rem;
    min-width: 80px;
    max-width: 120px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .parameter-input:focus,
  .parameter-select:focus {
    outline: none;
    border-color: var(--color-accent_blue, #007acc);
    box-shadow: 0 0 0 2px var(--color-accent_blue_alpha, rgba(0, 122, 204, 0.3));
  }

  .parameter-input:disabled,
  .parameter-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .parameter-units {
    font-size: 0.8rem;
    color: var(--color-text_secondary, #cccccc);
    min-width: 30px;
    text-align: left;
  }

  .loading-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--color-border_primary, #555555);
    border-top: 2px solid var(--color-accent_blue, #007acc);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .validation-error {
    position: absolute;
    bottom: -24px;
    left: 0.75rem;
    right: 0.75rem;
    font-size: 0.75rem;
    color: var(--color-status_error, #f44336);
    background: var(--color-status_error_bg, rgba(244, 67, 54, 0.1));
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    border: 1px solid var(--color-status_error, #f44336);
    display: flex;
    align-items: center;
    gap: 0.25rem;
    z-index: 10;
  }

  .error-icon {
    font-size: 0.8rem;
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .parameter-row {
      border-bottom: 2px solid var(--color-border_primary, #ffffff);
    }
    
    .parameter-input,
    .parameter-select {
      border: 2px solid var(--color-border_primary, #ffffff);
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .parameter-row,
    .parameter-input,
    .parameter-select {
      transition: none;
    }
    
    .spinner {
      animation: none;
    }
  }

  /* Print optimization */
  @media print {
    .parameter-row {
      break-inside: avoid;
      background: white !important;
      color: black !important;
    }
    
    .loading-indicator,
    .spinner {
      display: none;
    }
  }
</style>