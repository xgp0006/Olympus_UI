<script lang="ts">
  import type { Coordinate, CoordinateFormat, LocationEntryEvents } from '$lib/map-features/types';
  import { createEventDispatcher, onMount } from 'svelte';
  import { coordinateConverter } from './utils/converter';
  import { validateInput } from './utils/validator';
  import { formatDetector } from './utils/format-detector';
  import { createOptimizedDebounce, performanceMonitor } from './utils/performance';

  export let formats: CoordinateFormat[] = ['latlong', 'utm', 'mgrs', 'what3words'];
  export let defaultFormat: CoordinateFormat = 'latlong';
  export let value: string = '';
  export let placeholder: string = 'Enter coordinates...';
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher<LocationEntryEvents>();

  let selectedFormat: CoordinateFormat = defaultFormat;
  let inputElement: HTMLInputElement;
  let isValidating = false;
  let validationError: string | null = null;
  let performanceMetrics = {
    lastValidation: 0,
    lastConversion: 0
  };

  // Debounced validation for performance with frame budget awareness
  const debouncedValidate = createOptimizedDebounce(async (input: string) => {
    performanceMonitor.startFrame();
    isValidating = true;

    try {
      // Auto-detect format if needed
      const detectedFormat = formatDetector.detect(input);
      if (detectedFormat && detectedFormat !== selectedFormat) {
        selectedFormat = detectedFormat;
        dispatch('formatChange', { format: detectedFormat });
      }

      // Validate input
      const validation = await validateInput(input, selectedFormat);
      performanceMetrics.lastValidation = performanceMonitor.endFrame();

      if (validation.valid) {
        validationError = null;

        // Convert to coordinate
        performanceMonitor.startFrame();
        const result = await coordinateConverter.convert(input, selectedFormat);
        performanceMetrics.lastConversion = performanceMonitor.endFrame();

        if (result.success && result.coordinate) {
          dispatch('select', { coordinate: result.coordinate });
        }
      } else {
        validationError = validation.error || 'Invalid input';
        dispatch('validation', { result: validation });
      }
    } catch (error) {
      validationError = error instanceof Error ? error.message : 'Validation error';
      dispatch('error', { message: validationError });
    } finally {
      isValidating = false;
    }
  }, 16); // 16ms debounce for 60fps

  function handleInput(event: Event) {
    const input = (event.target as HTMLInputElement).value;
    value = input;

    if (input.trim()) {
      debouncedValidate(input);
    } else {
      validationError = null;
    }
  }

  function handleFormatChange(format: CoordinateFormat) {
    selectedFormat = format;
    dispatch('formatChange', { format });

    if (value.trim()) {
      debouncedValidate(value);
    }
  }

  function handlePaste(event: ClipboardEvent) {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain');

    if (text) {
      value = text.trim();
      if (inputElement) {
        inputElement.value = value;
      }
      debouncedValidate(value);
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !validationError && value.trim()) {
      event.preventDefault();
      debouncedValidate.flush();
    }
  }

  onMount(() => {
    // Performance monitoring in dev
    if (import.meta.env.DEV) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure' && entry.name.startsWith('location-entry')) {
            console.debug(`[LocationEntry] ${entry.name}: ${entry.duration.toFixed(2)}ms`);
          }
        }
      });
      observer.observe({ entryTypes: ['measure'] });

      return () => observer.disconnect();
    }
  });
</script>

<div class="location-entry" class:has-error={validationError}>
  <div class="format-selector">
    {#each formats as format}
      <button
        type="button"
        class="format-btn"
        class:active={selectedFormat === format}
        on:click={() => handleFormatChange(format)}
        {disabled}
      >
        {format.toUpperCase()}
      </button>
    {/each}
  </div>

  <div class="input-wrapper">
    <input
      bind:this={inputElement}
      type="text"
      {value}
      {placeholder}
      {disabled}
      class="coordinate-input"
      class:validating={isValidating}
      on:input={handleInput}
      on:paste={handlePaste}
      on:keydown={handleKeyDown}
      aria-label="Coordinate input"
      aria-invalid={!!validationError}
      aria-describedby={validationError ? 'validation-error' : undefined}
    />

    {#if isValidating}
      <div class="validation-indicator" aria-label="Validating...">
        <svg class="spinner" width="16" height="16" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2" />
        </svg>
      </div>
    {/if}
  </div>

  {#if validationError}
    <div id="validation-error" class="error-message" role="alert">
      {validationError}
    </div>
  {/if}

  {#if import.meta.env.DEV && (performanceMetrics.lastValidation > 0 || performanceMetrics.lastConversion > 0)}
    <div class="perf-metrics">
      Validation: {performanceMetrics.lastValidation.toFixed(1)}ms | Conversion: {performanceMetrics.lastConversion.toFixed(
        1
      )}ms
    </div>
  {/if}
</div>

<style>
  .location-entry {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    max-width: 400px;
  }

  .format-selector {
    display: flex;
    gap: 0.25rem;
    background: var(--color-surface);
    padding: 0.25rem;
    border-radius: 0.375rem;
  }

  .format-btn {
    flex: 1;
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
    background: transparent;
    border: none;
    border-radius: 0.25rem;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .format-btn:hover:not(:disabled) {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  .format-btn.active {
    background: var(--color-primary);
    color: white;
  }

  .format-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .coordinate-input {
    flex: 1;
    padding: 0.625rem 0.875rem;
    font-size: 0.875rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.375rem;
    color: var(--color-text);
    transition: all 0.15s ease;
  }

  .coordinate-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-alpha);
  }

  .coordinate-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .has-error .coordinate-input {
    border-color: var(--color-error);
  }

  .has-error .coordinate-input:focus {
    box-shadow: 0 0 0 3px var(--color-error-alpha);
  }

  .validation-indicator {
    position: absolute;
    right: 0.75rem;
    color: var(--color-primary);
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  .spinner circle {
    stroke-dasharray: 28;
    stroke-dashoffset: 7;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-message {
    font-size: 0.75rem;
    color: var(--color-error);
    margin-top: 0.25rem;
  }

  .perf-metrics {
    font-size: 0.625rem;
    color: var(--color-text-tertiary);
    font-family: monospace;
    text-align: right;
    margin-top: 0.25rem;
  }

  /* Performance optimizations */
  .location-entry * {
    will-change: auto;
  }

  .coordinate-input.validating {
    will-change: border-color;
  }
</style>
