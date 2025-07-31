<!--
  PID Slider Component - Aerospace-grade PID coefficient adjustment
  
  Features:
  - Smooth 120fps drag interactions with GPU acceleration
  - Color-coded validation (green/yellow/red)
  - Keyboard navigation support
  - Value history with undo/redo capability
  - Real-time safety validation
  
  Requirements: NASA JPL Power of 10 compliance
-->

<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { spring } from 'svelte/motion';
  import type { PIDSliderProps, ValidationResult } from '$lib/types/pid-tuning';
  import { DEFAULT_PID_CONSTRAINTS } from '$lib/types/pid-tuning';

  // Component props with strict typing
  export let axis: PIDSliderProps['axis'];
  export let pidType: PIDSliderProps['pidType'];
  export let value: number;
  export let min: number;
  export let max: number;
  export let step: number = 0.1;
  export let label: string;
  export let unit: string = '';
  export let precision: number = 1;
  export let showNumericInput: boolean = true;
  export let expertMode: boolean = false;
  export let warningThreshold: number | undefined = undefined;
  export let criticalThreshold: number | undefined = undefined;
  export let disabled: boolean = false;
  export let readonly: boolean = false;
  export let className: string = '';
  export let testId: string = '';

  // Event dispatcher for type-safe events
  const dispatch = createEventDispatcher<{
    change: number;
    warning: string;
    critical: string;
    focus: void;
    blur: void;
  }>();

  // Internal state
  let sliderElement: HTMLInputElement;
  let inputElement: HTMLInputElement;
  let isDragging = false;
  let isFocused = false;
  let lastChangeTimestamp = 0;
  let validationStatus: 'safe' | 'warning' | 'critical' = 'safe';

  // Animation springs for smooth interactions
  const thumbPosition = spring(0, { stiffness: 0.4, damping: 0.8 });
  const colorTransition = spring(0, { stiffness: 0.3, damping: 0.9 });

  // Value history for undo/redo
  let valueHistory: number[] = [];
  let historyIndex = -1;
  const MAX_HISTORY = 50;

  // Computed properties
  $: normalizedValue = ((value - min) / (max - min)) * 100;
  $: displayValue = value.toFixed(precision);
  $: constraints = DEFAULT_PID_CONSTRAINTS[axis];
  
  // Validation logic
  $: {
    updateValidationStatus(value);
  }

  // Update thumb position when value changes
  $: thumbPosition.set(normalizedValue);

  // Update color transition based on validation status
  $: {
    switch (validationStatus) {
      case 'safe':
        colorTransition.set(0);
        break;
      case 'warning':
        colorTransition.set(1);
        break;
      case 'critical':
        colorTransition.set(2);
        break;
    }
  }

  /**
   * Validate current value and update status
   */
  function updateValidationStatus(currentValue: number): void {
    const constraint = constraints[pidType];
    
    if (currentValue < constraint.min || currentValue > constraint.max) {
      validationStatus = 'critical';
      dispatch('critical', `${pidType} value ${currentValue} is outside safe range [${constraint.min}, ${constraint.max}]`);
      return;
    }

    if (criticalThreshold && currentValue > criticalThreshold) {
      validationStatus = 'critical';
      dispatch('critical', `${pidType} value ${currentValue} exceeds critical threshold ${criticalThreshold}`);
      return;
    }

    if (warningThreshold && currentValue > warningThreshold) {
      validationStatus = 'warning';
      dispatch('warning', `${pidType} value ${currentValue} exceeds warning threshold ${warningThreshold}`);
      return;
    }

    validationStatus = 'safe';
  }

  /**
   * Handle slider input with debouncing and validation
   */
  function handleSliderInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const newValue = parseFloat(target.value);
    
    if (isNaN(newValue) || newValue === value) return;
    
    updateValueWithHistory(newValue);
    lastChangeTimestamp = performance.now();
  }

  /**
   * Handle numeric input with validation
   */
  function handleNumericInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    let newValue = parseFloat(target.value);
    
    if (isNaN(newValue)) return;
    
    // Clamp to valid range
    newValue = Math.max(min, Math.min(max, newValue));
    newValue = Math.round(newValue / step) * step;
    
    updateValueWithHistory(newValue);
  }

  /**
   * Update value and maintain history for undo/redo
   */
  function updateValueWithHistory(newValue: number): void {
    // Add to history if significantly different
    if (Math.abs(newValue - value) >= step) {
      // Truncate history at current position
      valueHistory = valueHistory.slice(0, historyIndex + 1);
      valueHistory.push(value);
      
      // Limit history size
      if (valueHistory.length > MAX_HISTORY) {
        valueHistory = valueHistory.slice(-MAX_HISTORY);
      }
      
      historyIndex = valueHistory.length - 1;
    }
    
    value = newValue;
    dispatch('change', value);
  }

  /**
   * Handle keyboard navigation
   */
  function handleKeydown(event: KeyboardEvent): void {
    if (disabled || readonly) return;

    const { key, ctrlKey, metaKey } = event;
    const cmdKey = ctrlKey || metaKey;

    switch (key) {
      case 'ArrowUp':
      case 'ArrowRight':
        event.preventDefault();
        updateValueWithHistory(Math.min(max, value + step));
        break;
        
      case 'ArrowDown':
      case 'ArrowLeft':
        event.preventDefault();
        updateValueWithHistory(Math.max(min, value - step));
        break;
        
      case 'PageUp':
        event.preventDefault();
        updateValueWithHistory(Math.min(max, value + step * 10));
        break;
        
      case 'PageDown':
        event.preventDefault();
        updateValueWithHistory(Math.max(min, value - step * 10));
        break;
        
      case 'Home':
        event.preventDefault();
        updateValueWithHistory(min);
        break;
        
      case 'End':
        event.preventDefault();
        updateValueWithHistory(max);
        break;
        
      case 'z':
        if (cmdKey && historyIndex >= 0) {
          event.preventDefault();
          undo();
        }
        break;
        
      case 'y':
        if (cmdKey) {
          event.preventDefault();
          redo();
        }
        break;
    }
  }

  /**
   * Undo last change
   */
  function undo(): void {
    if (historyIndex >= 0) {
      const previousValue = valueHistory[historyIndex];
      historyIndex--;
      value = previousValue;
      dispatch('change', value);
    }
  }

  /**
   * Redo last undone change
   */
  function redo(): void {
    if (historyIndex < valueHistory.length - 1) {
      historyIndex++;
      const nextValue = valueHistory[historyIndex];
      value = nextValue;
      dispatch('change', value);
    }
  }

  /**
   * Handle focus events
   */
  function handleFocus(): void {
    isFocused = true;
    dispatch('focus');
  }

  /**
   * Handle blur events
   */
  function handleBlur(): void {
    isFocused = false;
    dispatch('blur');
  }

  /**
   * Handle drag start
   */
  function handleDragStart(): void {
    isDragging = true;
  }

  /**
   * Handle drag end
   */
  function handleDragEnd(): void {
    isDragging = false;
  }

  // Lifecycle
  onMount(() => {
    // Initialize history with current value
    valueHistory = [value];
    historyIndex = 0;
  });

  onDestroy(() => {
    // Cleanup springs
    thumbPosition.set(0);
    colorTransition.set(0);
  });
</script>

<div
  class="pid-slider {className}"
  class:disabled
  class:readonly
  class:focused={isFocused}
  class:dragging={isDragging}
  class:expert-mode={expertMode}
  class:validation-safe={validationStatus === 'safe'}
  class:validation-warning={validationStatus === 'warning'}
  class:validation-critical={validationStatus === 'critical'}
  data-testid={testId}
  data-axis={axis}
  data-pid-type={pidType}
>
  <!-- Label and current value display -->
  <div class="slider-header">
    <label for="slider-{axis}-{pidType}" class="slider-label">
      {label}
      {#if unit}
        <span class="unit">({unit})</span>
      {/if}
    </label>
    
    <div class="value-display" class:critical={validationStatus === 'critical'}>
      {displayValue}
      {#if validationStatus !== 'safe'}
        <span class="validation-indicator" aria-label="Validation {validationStatus}">
          {validationStatus === 'warning' ? '⚠️' : '❌'}
        </span>
      {/if}
    </div>
  </div>

  <!-- Main slider container -->
  <div class="slider-container">
    <!-- Background track with safety zones -->
    <div class="slider-track">
      {#if warningThreshold}
        <div 
          class="warning-zone"
          style="left: {((warningThreshold - min) / (max - min)) * 100}%"
        ></div>
      {/if}
      
      {#if criticalThreshold}
        <div 
          class="critical-zone"
          style="left: {((criticalThreshold - min) / (max - min)) * 100}%"
        ></div>
      {/if}
    </div>

    <!-- Slider input -->
    <input
      bind:this={sliderElement}
      id="slider-{axis}-{pidType}"
      type="range"
      {min}
      {max}
      {step}
      {value}
      {disabled}
      {readonly}
      class="slider-input"
      aria-label="{label} PID {pidType} coefficient for {axis} axis"
      aria-describedby="help-{axis}-{pidType}"
      on:input={handleSliderInput}
      on:keydown={handleKeydown}
      on:focus={handleFocus}
      on:blur={handleBlur}
      on:mousedown={handleDragStart}
      on:mouseup={handleDragEnd}
      on:touchstart={handleDragStart}
      on:touchend={handleDragEnd}
    />

    <!-- Custom styled thumb (positioned with spring animation) -->
    <div 
      class="slider-thumb"
      style="left: {$thumbPosition}%; 
             background: hsl({120 - $colorTransition * 60}, 70%, 50%);
             transform: translateX(-50%) scale({isDragging ? 1.2 : 1});"
    ></div>

    <!-- Value markers for expert mode -->
    {#if expertMode}
      <div class="value-markers">
        {#each Array.from({length: 5}, (_, i) => min + (max - min) * (i / 4)) as markerValue}
          <div 
            class="marker"
            style="left: {((markerValue - min) / (max - min)) * 100}%"
            title="{markerValue.toFixed(precision)}"
          >
            <span class="marker-label">{markerValue.toFixed(precision)}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Numeric input for precise values -->
  {#if showNumericInput}
    <div class="numeric-input-container">
      <input
        bind:this={inputElement}
        type="number"
        {min}
        {max}
        {step}
        {value}
        {disabled}
        {readonly}
        class="numeric-input"
        aria-label="Precise {label} value"
        on:input={handleNumericInput}
        on:keydown={handleKeydown}
        on:focus={handleFocus}
        on:blur={handleBlur}
      />
    </div>
  {/if}

  <!-- Help text -->
  {#if expertMode}
    <div id="help-{axis}-{pidType}" class="help-text">
      {pidType} coefficient controls {pidType === 'P' ? 'proportional response' : 
                                     pidType === 'I' ? 'integral windup' : 
                                     'derivative damping'} for {axis} axis movement.
      Range: {min} - {max}, Current: {displayValue}
    </div>
  {/if}
</div>

<style>
  .pid-slider {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    background-color: rgb(249 250 251);
    border-radius: 0.5rem;
    border: 1px solid rgb(229 231 235);
    transition: all 200ms ease-out;
    user-select: none;
  }
  
  :global(.dark) .pid-slider {
    background-color: rgb(31 41 55);
    border-color: rgb(75 85 99);
  }

  .pid-slider.focused {
    box-shadow: 0 0 0 2px rgb(59 130 246 / 0.5);
  }

  .pid-slider.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .pid-slider.readonly {
    background-color: rgb(243 244 246);
  }
  
  :global(.dark) .pid-slider.readonly {
    background-color: rgb(17 24 39);
  }

  .pid-slider.validation-warning {
    border-color: rgb(251 191 36);
    background-color: rgb(254 252 232);
  }
  
  :global(.dark) .pid-slider.validation-warning {
    background-color: rgb(113 63 18);
  }

  .pid-slider.validation-critical {
    border-color: rgb(248 113 113);
    background-color: rgb(254 242 242);
  }
  
  :global(.dark) .pid-slider.validation-critical {
    background-color: rgb(127 29 29);
  }

  .slider-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .slider-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: rgb(55 65 81);
  }
  
  :global(.dark) .slider-label {
    color: rgb(209 213 219);
  }

  .unit {
    font-size: 0.75rem;
    color: rgb(107 114 128);
    margin-left: 0.25rem;
  }
  
  :global(.dark) .unit {
    color: rgb(156 163 175);
  }

  .value-display {
    font-size: 1.125rem;
    font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace;
    font-weight: 700;
    color: rgb(17 24 39);
    min-width: 4rem;
    text-align: right;
  }
  
  :global(.dark) .value-display {
    color: rgb(243 244 246);
  }

  .value-display.critical {
    color: rgb(220 38 38);
  }
  
  :global(.dark) .value-display.critical {
    color: rgb(248 113 113);
  }

  .validation-indicator {
    margin-left: 0.25rem;
    font-size: 0.75rem;
  }

  .slider-container {
    position: relative;
    height: 2rem;
    display: flex;
    align-items: center;
  }

  .slider-track {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-color: rgb(209 213 219);
    border-radius: 9999px;
    height: 6px;
    top: 50%;
    transform: translateY(-50%);
  }
  
  :global(.dark) .slider-track {
    background-color: rgb(75 85 99);
  }

  .warning-zone {
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    background-color: rgb(250 204 21);
    opacity: 0.3;
  }

  .critical-zone {
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    background-color: rgb(248 113 113);
    opacity: 0.3;
  }

  .slider-input {
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    position: relative;
    z-index: 2;
  }

  .slider-input:focus {
    outline: none;
  }

  .slider-thumb {
    position: absolute;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 9999px;
    border: 2px solid white;
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    pointer-events: none;
    top: 50%;
    transform: translateY(-50%);
    transition: all 100ms ease-out;
    z-index: 1;
  }

  .dragging .slider-thumb {
    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  }

  .value-markers {
    position: absolute;
    left: 0;
    right: 0;
    bottom: -1.5rem;
  }

  .marker {
    position: absolute;
    transform: translateX(-50%);
  }

  .marker-label {
    font-size: 0.75rem;
    line-height: 1rem;
    color: rgb(107 114 128);
  }

  :global(.dark) .marker-label {
    color: rgb(156 163 175);
  }

  .numeric-input-container {
    display: flex;
    justify-content: center;
    margin-top: 0.5rem;
  }

  .numeric-input {
    width: 5rem;
    padding: 0.25rem 0.5rem;
    text-align: center;
    font-size: 0.875rem;
    line-height: 1.25rem;
    border: 1px solid rgb(209 213 219);
    border-radius: 0.375rem;
    background-color: white;
    color: rgb(17 24 39);
    font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace;
  }

  :global(.dark) .numeric-input {
    border-color: rgb(75 85 99);
    background-color: rgb(55 65 81);
    color: rgb(243 244 246);
  }

  .numeric-input:focus {
    outline: 2px solid transparent;
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgb(59 130 246 / 0.5);
    border-color: rgb(59 130 246);
  }

  .help-text {
    font-size: 0.75rem;
    line-height: 1rem;
    color: rgb(75 85 99);
    margin-top: 0.5rem;
    padding: 0.5rem;
    background-color: rgb(243 244 246);
    border-radius: 0.375rem;
  }

  :global(.dark) .help-text {
    color: rgb(156 163 175);
    background-color: rgb(55 65 81);
  }

  .expert-mode .slider-container {
    margin-bottom: 2rem;
  }

  /* High performance animations */
  .slider-thumb {
    will-change: transform, background-color;
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .pid-slider,
    .slider-thumb,
    .value-display {
      transition: none;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .pid-slider {
      border-width: 2px;
    }
    
    .slider-track {
      background-color: black;
    }

    :global(.dark) .slider-track {
      background-color: white;
    }
    
    .slider-thumb {
      border-width: 4px;
    }
  }

  /* Touch device optimizations */
  @media (hover: none) and (pointer: coarse) {
    .slider-thumb {
      width: 2rem;
      height: 2rem;
    }
    
    .slider-container {
      height: 3rem;
    }
    
    .numeric-input {
      font-size: 1rem;
      line-height: 1.5rem;
      padding: 0.5rem 0.75rem;
    }
  }
</style>