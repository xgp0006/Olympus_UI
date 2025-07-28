<!--
  Spectrum Visualizer Component
  Canvas-based rendering for FFT spectrum data with responsive design
  Requirements: 5.2, 5.4
-->
<script lang="ts">
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import { theme } from '$lib/stores/theme';
  import type { FFTData } from './types';

  // ===== PROPS =====
  export let data: FFTData | null = null;
  export let showGrid: boolean = true;
  export let showLabels: boolean = true;

  // ===== STATE =====
  interface VisualizerState {
    canvas: HTMLCanvasElement | null;
    ctx: CanvasRenderingContext2D | null;
    animationFrame: number | null;
    lastRenderTime: number;
    isResizing: boolean;
  }

  let state: VisualizerState = {
    canvas: null,
    ctx: null,
    animationFrame: null,
    lastRenderTime: 0,
    isResizing: false
  };

  let containerElement: HTMLDivElement;
  let canvasElement: HTMLCanvasElement;

  // ===== REACTIVE STATEMENTS =====
  $: if (data && state.ctx && !state.isResizing) {
    scheduleRender();
  }

  $: if ($theme && state.ctx) {
    scheduleRender();
  }

  // Update data processing for better performance
  $: processedData = data ? processFFTData(data) : null;

  // ===== FUNCTIONS =====

  /**
   * Process FFT data for visualization
   */
  function processFFTData(fftData: FFTData): FFTData {
    if (!fftData.magnitudes || fftData.magnitudes.length === 0) {
      return fftData;
    }

    // Apply smoothing to reduce noise
    const smoothedMagnitudes = applySmoothingFilter(fftData.magnitudes);

    return {
      ...fftData,
      magnitudes: smoothedMagnitudes
    };
  }

  /**
   * Apply simple moving average smoothing filter
   */
  function applySmoothingFilter(magnitudes: number[], windowSize: number = 3): number[] {
    if (windowSize <= 1) return magnitudes;

    const smoothed = new Array(magnitudes.length);
    const halfWindow = Math.floor(windowSize / 2);

    for (let i = 0; i < magnitudes.length; i++) {
      let sum = 0;
      let count = 0;

      for (
        let j = Math.max(0, i - halfWindow);
        j <= Math.min(magnitudes.length - 1, i + halfWindow);
        j++
      ) {
        sum += magnitudes[j];
        count++;
      }

      smoothed[i] = sum / count;
    }

    return smoothed;
  }

  /**
   * Schedules a render using requestAnimationFrame for smooth performance
   */
  function scheduleRender(): void {
    if (state.animationFrame) {
      return; // Already scheduled
    }

    state.animationFrame = requestAnimationFrame(() => {
      const now = performance.now();

      // Throttle rendering to ~60fps
      if (now - state.lastRenderTime >= 16) {
        renderSpectrum();
        state.lastRenderTime = now;
      }

      state.animationFrame = null;
    });
  }

  /**
   * Main rendering function for the spectrum visualization
   */
  function renderSpectrum(): void {
    if (!state.ctx || !state.canvas) {
      return;
    }

    const canvas = state.canvas;
    const ctx = state.ctx;
    const rect = canvas.getBoundingClientRect();

    // Set canvas size to match display size for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Get theme colors
    const spectrumLineColor = getThemeColor('spectrum_line_color', '#00bfff');
    const spectrumFillColor = getThemeColor('spectrum_fill_color', 'rgba(0, 191, 255, 0.3)');
    const gridLineColor = getThemeColor('grid_line_color', '#333333');
    const axisLabelColor = getThemeColor('axis_label_color', '#cccccc');
    const backgroundColor = getThemeColor('background_primary', '#000000');

    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw grid if enabled
    if (showGrid) {
      drawGrid(ctx, rect.width, rect.height, gridLineColor);
    }

    // Draw spectrum data if available
    if (processedData && processedData.magnitudes && processedData.magnitudes.length > 0) {
      drawSpectrumData(ctx, rect.width, rect.height, spectrumLineColor, spectrumFillColor);
    } else {
      drawNoDataMessage(ctx, rect.width, rect.height, axisLabelColor);
    }

    // Draw labels if enabled
    if (showLabels) {
      drawLabels(ctx, rect.width, rect.height, axisLabelColor);
    }
  }

  /**
   * Draws the grid lines for the spectrum display
   */
  function drawGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    color: string
  ): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    // Vertical grid lines (frequency)
    const verticalLines = 10;
    for (let i = 1; i < verticalLines; i++) {
      const x = (width * i) / verticalLines;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal grid lines (magnitude)
    const horizontalLines = 8;
    for (let i = 1; i < horizontalLines; i++) {
      const y = (height * i) / horizontalLines;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }

  /**
   * Draws the actual spectrum data
   */
  function drawSpectrumData(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    lineColor: string,
    fillColor: string
  ): void {
    if (!processedData || !processedData.magnitudes || processedData.magnitudes.length === 0) {
      return;
    }

    const magnitudes = processedData.magnitudes;
    const dataLength = magnitudes.length;

    // Find min/max for scaling
    const minMagnitude = Math.min(...magnitudes);
    const maxMagnitude = Math.max(...magnitudes);
    const magnitudeRange = maxMagnitude - minMagnitude || 1; // Avoid division by zero

    // Create path for spectrum line
    ctx.beginPath();

    for (let i = 0; i < dataLength; i++) {
      const x = (width * i) / (dataLength - 1);
      const normalizedMagnitude = (magnitudes[i] - minMagnitude) / magnitudeRange;
      const y = height - normalizedMagnitude * height * 0.9 - height * 0.05; // Leave 5% margin

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    // Draw filled area under the spectrum
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Draw spectrum line
    ctx.beginPath();
    for (let i = 0; i < dataLength; i++) {
      const x = (width * i) / (dataLength - 1);
      const normalizedMagnitude = (magnitudes[i] - minMagnitude) / magnitudeRange;
      const y = height - normalizedMagnitude * height * 0.9 - height * 0.05;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /**
   * Draws labels for frequency and magnitude axes
   */
  function drawLabels(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    color: string
  ): void {
    ctx.fillStyle = color;
    ctx.font = '12px var(--typography-font_family_mono)';
    ctx.textAlign = 'center';

    if (processedData && processedData.centerFrequency && processedData.sampleRate) {
      // Frequency labels (bottom axis)
      const startFreq = processedData.centerFrequency - processedData.sampleRate / 2;
      const endFreq = processedData.centerFrequency + processedData.sampleRate / 2;

      const freqLabels = 5;
      for (let i = 0; i <= freqLabels; i++) {
        const freq = startFreq + ((endFreq - startFreq) * i) / freqLabels;
        const x = (width * i) / freqLabels;
        const freqMHz = (freq / 1000000).toFixed(1);

        ctx.fillText(`${freqMHz} MHz`, x, height - 5);
      }

      // Center frequency marker
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height - 20);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Magnitude labels (left axis)
    if (processedData && processedData.magnitudes && processedData.magnitudes.length > 0) {
      const minMagnitude = Math.min(...processedData.magnitudes);
      const maxMagnitude = Math.max(...processedData.magnitudes);

      ctx.textAlign = 'right';
      const magLabels = 4;
      for (let i = 0; i <= magLabels; i++) {
        const mag = minMagnitude + ((maxMagnitude - minMagnitude) * i) / magLabels;
        const y = height - (height * i) / magLabels;

        ctx.fillText(`${mag.toFixed(0)} dB`, width - 5, y + 4);
      }
    }
  }

  /**
   * Draws a message when no data is available
   */
  function drawNoDataMessage(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    color: string
  ): void {
    ctx.fillStyle = color;
    ctx.font = '16px var(--typography-font_family_sans)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText('No spectrum data available', width / 2, height / 2);

    ctx.font = '12px var(--typography-font_family_sans)';
    ctx.fillText('Waiting for SDR connection...', width / 2, height / 2 + 25);
  }

  /**
   * Gets theme color with fallback
   */
  function getThemeColor(colorKey: string, fallback: string): string {
    if (!$theme) {
      return fallback;
    }

    // Try SDR-specific colors first
    if ($theme.components?.sdr && colorKey in $theme.components.sdr) {
      return ($theme.components.sdr as Record<string, string>)[colorKey];
    }

    // Try general colors
    const generalKey = colorKey.replace('spectrum_', '').replace('_color', '');
    if ($theme.colors && generalKey in $theme.colors) {
      return ($theme.colors as Record<string, string>)[generalKey];
    }

    return fallback;
  }

  /**
   * Handles canvas resize with debouncing
   */
  function handleResize(): void {
    if (state.isResizing) {
      return;
    }

    state.isResizing = true;

    // Debounce resize to avoid excessive re-renders
    setTimeout(() => {
      state.isResizing = false;
      if (state.ctx) {
        scheduleRender();
      }
    }, 100);
  }

  /**
   * Initializes the canvas and rendering context
   */
  function initializeCanvas(): void {
    if (!canvasElement) {
      return;
    }

    state.canvas = canvasElement;
    state.ctx = canvasElement.getContext('2d');

    if (!state.ctx) {
      console.error('Failed to get 2D rendering context for spectrum visualizer');
      return;
    }

    // Initial render
    scheduleRender();
  }

  // ===== LIFECYCLE =====
  onMount(() => {
    initializeCanvas();

    // Set up resize observer for responsive behavior
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerElement) {
      resizeObserver.observe(containerElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  });

  afterUpdate(() => {
    if (canvasElement && !state.canvas) {
      initializeCanvas();
    }
  });

  onDestroy(() => {
    if (state.animationFrame) {
      cancelAnimationFrame(state.animationFrame);
    }
  });
</script>

<div class="spectrum-visualizer" bind:this={containerElement} data-testid="spectrum-visualizer">
  <div class="spectrum-header">
    <h3 class="spectrum-title">Spectrum Analyzer</h3>
    {#if data}
      <div class="spectrum-info">
        <span class="info-item">
          Center: {(data.centerFrequency / 1000000).toFixed(3)} MHz
        </span>
        <span class="info-item">
          Span: {(data.sampleRate / 1000000).toFixed(3)} MHz
        </span>
        <span class="info-item">
          Points: {data.magnitudes?.length || 0}
        </span>
      </div>
    {/if}
  </div>

  <div class="canvas-container">
    <canvas bind:this={canvasElement} class="spectrum-canvas" data-testid="spectrum-canvas"
    ></canvas>
  </div>
</div>

<style>
  .spectrum-visualizer {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background-color: var(--color-background_secondary);
    border: var(--layout-border_width) solid var(--component-sdr-grid_line_color);
    border-radius: var(--layout-border_radius);
    overflow: hidden;
  }

  .spectrum-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: calc(var(--layout-spacing_unit) * 1.5);
    background-color: var(--color-background_tertiary);
    border-bottom: var(--layout-border_width) solid var(--component-sdr-grid_line_color);
  }

  .spectrum-title {
    font-size: var(--typography-font_size_base);
    font-weight: 600;
    color: var(--color-text_primary);
    margin: 0;
  }

  .spectrum-info {
    display: flex;
    gap: calc(var(--layout-spacing_unit) * 2);
    align-items: center;
  }

  .info-item {
    font-size: var(--typography-font_size_sm);
    font-family: var(--typography-font_family_mono);
    color: var(--component-sdr-axis_label_color);
    background-color: var(--color-background_primary);
    padding: calc(var(--layout-spacing_unit) / 2) var(--layout-spacing_unit);
    border-radius: calc(var(--layout-border_radius) / 2);
    border: var(--layout-border_width) solid var(--component-sdr-grid_line_color);
  }

  .canvas-container {
    flex: 1;
    position: relative;
    overflow: hidden;
    background-color: var(--color-background_primary);
  }

  .spectrum-canvas {
    width: 100%;
    height: 100%;
    display: block;
    cursor: crosshair;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .spectrum-header {
      flex-direction: column;
      gap: var(--layout-spacing_unit);
      align-items: flex-start;
    }

    .spectrum-info {
      gap: var(--layout-spacing_unit);
      flex-wrap: wrap;
    }

    .info-item {
      font-size: calc(var(--typography-font_size_sm) * 0.9);
      padding: calc(var(--layout-spacing_unit) / 3) calc(var(--layout-spacing_unit) / 2);
    }
  }

  @media (max-width: 480px) {
    .spectrum-header {
      padding: var(--layout-spacing_unit);
    }

    .spectrum-title {
      font-size: var(--typography-font_size_sm);
    }

    .spectrum-info {
      width: 100%;
      justify-content: space-between;
    }

    .info-item {
      flex: 1;
      text-align: center;
      font-size: calc(var(--typography-font_size_sm) * 0.8);
    }
  }

  /* High DPI display optimization */
  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    .spectrum-canvas {
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
  }

  /* Dark mode specific adjustments */
  @media (prefers-color-scheme: dark) {
    .spectrum-canvas {
      filter: brightness(1.1);
    }
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .spectrum-canvas {
      transition: none;
    }
  }

  /* Focus styles for accessibility */
  .spectrum-canvas:focus {
    outline: 2px solid var(--color-accent_blue);
    outline-offset: 2px;
  }
</style>
