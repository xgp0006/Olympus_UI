<!--
  Waterfall Visualization Component
  Canvas-based rendering for waterfall visualization of spectrum data over time
  Requirements: 5.3, 5.4
-->
<script lang="ts">
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import { theme } from '$lib/stores/theme';
  import type { FFTData } from './types';

  // ===== PROPS =====
  export let data: FFTData | null = null;
  export let maxHistory: number = 200; // Maximum number of waterfall lines to keep
  export let colorIntensity: number = 1.0; // Color intensity multiplier
  export let showFrequencyLabels: boolean = true;
  export let showTimeLabels: boolean = true;

  // ===== STATE =====
  interface WaterfallState {
    canvas: HTMLCanvasElement | null;
    ctx: CanvasRenderingContext2D | null;
    animationFrame: number | null;
    lastRenderTime: number;
    isResizing: boolean;
    waterfallHistory: number[][];
    colorMap: ImageData | null;
    minMagnitude: number;
    maxMagnitude: number;
  }

  let state: WaterfallState = {
    canvas: null,
    ctx: null,
    animationFrame: null,
    lastRenderTime: 0,
    isResizing: false,
    waterfallHistory: [],
    colorMap: null,
    minMagnitude: -100,
    maxMagnitude: 0
  };

  let containerElement: HTMLDivElement;
  let canvasElement: HTMLCanvasElement;

  // ===== REACTIVE STATEMENTS =====
  $: if (data && state.ctx && !state.isResizing) {
    addDataToHistory(data);
    scheduleRender();
  }

  $: if ($theme && state.ctx) {
    updateColorMap();
    scheduleRender();
  }

  // Process data for better visualization
  $: processedData = data ? processWaterfallData(data) : null;

  // ===== FUNCTIONS =====

  /**
   * Process FFT data for waterfall visualization
   */
  function processWaterfallData(fftData: FFTData): FFTData {
    if (!fftData.magnitudes || fftData.magnitudes.length === 0) {
      return fftData;
    }

    // Apply dynamic range compression for better visualization
    const compressedMagnitudes = applyDynamicRangeCompression(fftData.magnitudes);

    return {
      ...fftData,
      magnitudes: compressedMagnitudes
    };
  }

  /**
   * Apply dynamic range compression to improve waterfall visibility
   */
  function applyDynamicRangeCompression(
    magnitudes: number[],
    compressionRatio: number = 0.7
  ): number[] {
    const minMag = Math.min(...magnitudes);
    const maxMag = Math.max(...magnitudes);
    const range = maxMag - minMag;

    if (range === 0) return magnitudes;

    return magnitudes.map((mag) => {
      const normalized = (mag - minMag) / range;
      const compressed = Math.pow(normalized, compressionRatio);
      return minMag + compressed * range;
    });
  }

  /**
   * Adds new FFT data to the waterfall history
   */
  function addDataToHistory(fftData: FFTData): void {
    if (!fftData.magnitudes || fftData.magnitudes.length === 0) {
      return;
    }

    // Add new data to the beginning of the history
    state.waterfallHistory.unshift([...fftData.magnitudes]);

    // Update magnitude range for better color mapping
    const currentMin = Math.min(...fftData.magnitudes);
    const currentMax = Math.max(...fftData.magnitudes);

    // Use exponential moving average for smooth range adaptation
    const alpha = 0.1;
    state.minMagnitude = state.minMagnitude * (1 - alpha) + currentMin * alpha;
    state.maxMagnitude = state.maxMagnitude * (1 - alpha) + currentMax * alpha;

    // Trim history to maximum size
    if (state.waterfallHistory.length > maxHistory) {
      state.waterfallHistory = state.waterfallHistory.slice(0, maxHistory);
    }
  }

  /**
   * Creates a color map for signal strength visualization
   */
  function updateColorMap(): void {
    if (!state.ctx) {
      return;
    }

    const colorMapSize = 256;
    const imageData = state.ctx.createImageData(colorMapSize, 1);
    const data = imageData.data;

    // Get theme colors for gradient
    const gradientColors = parseGradientColors();

    for (let i = 0; i < colorMapSize; i++) {
      const intensity = i / (colorMapSize - 1);
      const color = interpolateGradientColor(gradientColors, intensity);

      const pixelIndex = i * 4;
      data[pixelIndex] = color.r; // Red
      data[pixelIndex + 1] = color.g; // Green
      data[pixelIndex + 2] = color.b; // Blue
      data[pixelIndex + 3] = Math.floor(255 * colorIntensity); // Alpha
    }

    state.colorMap = imageData;
  }

  /**
   * Parses gradient colors from theme
   */
  function parseGradientColors(): Array<{ r: number; g: number; b: number; position: number }> {
    const defaultColors = [
      { r: 0, g: 0, b: 0, position: 0 }, // Black (low signal)
      { r: 0, g: 0, b: 255, position: 0.25 }, // Blue
      { r: 0, g: 255, b: 255, position: 0.5 }, // Cyan
      { r: 255, g: 255, b: 0, position: 0.75 }, // Yellow
      { r: 255, g: 0, b: 0, position: 1.0 } // Red (high signal)
    ];

    if (!$theme?.components?.sdr?.waterfall_color_gradient) {
      return defaultColors;
    }

    // Parse CSS gradient string (simplified parsing)
    const gradient = $theme.components.sdr.waterfall_color_gradient;
    const colorMatches = gradient.match(/#[0-9a-fA-F]{6}|rgb\([^)]+\)|rgba\([^)]+\)/g);

    if (!colorMatches || colorMatches.length < 2) {
      return defaultColors;
    }

    return colorMatches.map((colorStr, index) => {
      const color = parseColor(colorStr);
      const position = index / (colorMatches.length - 1);
      return { ...color, position };
    });
  }

  /**
   * Parses a color string to RGB values
   */
  function parseColor(colorStr: string): { r: number; g: number; b: number } {
    // Handle hex colors
    if (colorStr.startsWith('#')) {
      const hex = colorStr.slice(1);
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
      };
    }

    // Handle rgb/rgba colors (simplified)
    const rgbMatch = colorStr.match(/(\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1]),
        g: parseInt(rgbMatch[2]),
        b: parseInt(rgbMatch[3])
      };
    }

    // Default to black
    return { r: 0, g: 0, b: 0 };
  }

  /**
   * Interpolates color from gradient based on intensity
   */
  function interpolateGradientColor(
    colors: Array<{ r: number; g: number; b: number; position: number }>,
    intensity: number
  ): { r: number; g: number; b: number } {
    // Clamp intensity
    intensity = Math.max(0, Math.min(1, intensity));

    // Find the two colors to interpolate between
    let lowerColor = colors[0];
    let upperColor = colors[colors.length - 1];

    for (let i = 0; i < colors.length - 1; i++) {
      if (intensity >= colors[i].position && intensity <= colors[i + 1].position) {
        lowerColor = colors[i];
        upperColor = colors[i + 1];
        break;
      }
    }

    // Calculate interpolation factor
    const range = upperColor.position - lowerColor.position;
    const factor = range === 0 ? 0 : (intensity - lowerColor.position) / range;

    // Interpolate RGB values
    return {
      r: Math.round(lowerColor.r + (upperColor.r - lowerColor.r) * factor),
      g: Math.round(lowerColor.g + (upperColor.g - lowerColor.g) * factor),
      b: Math.round(lowerColor.b + (upperColor.b - lowerColor.b) * factor)
    };
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

      // Throttle rendering to ~30fps for waterfall (less frequent than spectrum)
      if (now - state.lastRenderTime >= 33) {
        renderWaterfall();
        state.lastRenderTime = now;
      }

      state.animationFrame = null;
    });
  }

  /**
   * Main rendering function for the waterfall visualization
   */
  function renderWaterfall(): void {
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
    const backgroundColor = getThemeColor('background_primary', '#000000');
    const axisLabelColor = getThemeColor('axis_label_color', '#cccccc');
    const gridLineColor = getThemeColor('grid_line_color', '#333333');

    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw waterfall data if available
    if (state.waterfallHistory.length > 0 && state.colorMap) {
      drawWaterfallData(ctx, rect.width, rect.height);
    } else {
      drawNoDataMessage(ctx, rect.width, rect.height, axisLabelColor);
    }

    // Draw labels if enabled
    if (showFrequencyLabels || showTimeLabels) {
      drawLabels(ctx, rect.width, rect.height, axisLabelColor, gridLineColor);
    }
  }

  /**
   * NASA JPL Rule 4: Split function - Calculate safe waterfall dimensions
   */
  function calculateWaterfallDimensions(width: number, height: number, historyLength: number): {
    safeWidth: number;
    safeHeight: number;
    startX: number;
    startY: number;
  } | null {
    const waterfallHeight = Math.min(height - 40, historyLength);
    const waterfallWidth = width - 60;
    const startX = 30;
    const startY = 20;

    if (waterfallWidth <= 0 || waterfallHeight <= 0) {
      console.warn('Waterfall: Invalid dimensions', { waterfallWidth, waterfallHeight });
      return null;
    }

    const MAX_DIMENSION = 4096; // NASA JPL Rule 2: Bounded memory
    const safeWidth = Math.min(Math.max(1, Math.floor(waterfallWidth)), MAX_DIMENSION);
    const safeHeight = Math.min(Math.max(1, Math.floor(waterfallHeight)), MAX_DIMENSION);

    if (safeWidth !== waterfallWidth || safeHeight !== waterfallHeight) {
      console.warn('Waterfall: Dimensions clamped', {
        original: { waterfallWidth, waterfallHeight },
        clamped: { safeWidth, safeHeight }
      });
    }

    return { safeWidth, safeHeight, startX, startY };
  }

  /**
   * NASA JPL Rule 4: Split function - Render waterfall pixels
   */
  function renderWaterfallPixels(
    pixels: Uint8ClampedArray,
    history: (Float32Array | number[])[],
    safeWidth: number,
    safeHeight: number,
    dataLength: number
  ): void {
    if (!state.colorMap) return;
    
    for (let y = 0; y < safeHeight && y < history.length; y++) {
      const magnitudes = history[y];

      for (let x = 0; x < safeWidth; x++) {
        const binIndex = Math.floor((x / safeWidth) * dataLength);
        const magnitude = magnitudes[binIndex] || state.minMagnitude;

        const normalizedMagnitude = Math.max(
          0,
          Math.min(1, (magnitude - state.minMagnitude) / (state.maxMagnitude - state.minMagnitude))
        );

        const colorIndex = Math.floor(normalizedMagnitude * 255);
        const colorMapPixel = colorIndex * 4;

        const pixelIndex = (y * safeWidth + x) * 4;
        pixels[pixelIndex] = state.colorMap.data[colorMapPixel];
        pixels[pixelIndex + 1] = state.colorMap.data[colorMapPixel + 1];
        pixels[pixelIndex + 2] = state.colorMap.data[colorMapPixel + 2];
        pixels[pixelIndex + 3] = state.colorMap.data[colorMapPixel + 3];
      }
    }
  }

  /**
   * Draws the waterfall data using efficient pixel manipulation
   * NASA JPL Rule 4: Function refactored to be ≤60 lines
   */
  function drawWaterfallData(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!state.colorMap || state.waterfallHistory.length === 0) {
      return;
    }

    const history = state.waterfallHistory;
    const dataLength = history[0]?.length || 0;

    if (dataLength === 0) {
      return;
    }

    // Calculate safe dimensions
    const dims = calculateWaterfallDimensions(width, height, history.length);
    if (!dims) return;

    const { safeWidth, safeHeight, startX, startY } = dims;

    // Create image data for efficient pixel manipulation
    const imageData = ctx.createImageData(safeWidth, safeHeight);
    
    // Render pixels
    renderWaterfallPixels(imageData.data, history, safeWidth, safeHeight, dataLength);

    // Draw the image data to canvas
    ctx.putImageData(imageData, startX, startY);

    // Draw border around waterfall
    ctx.strokeStyle = getThemeColor('grid_line_color', '#333333');
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, startY, safeWidth, safeHeight);
  }

  /**
   * NASA JPL Rule 4: Split function - Draw frequency labels and grid
   */
  function drawFrequencyLabels(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    waterfallWidth: number,
    waterfallHeight: number,
    startX: number,
    startY: number,
    labelColor: string
  ): void {
    if (!showFrequencyLabels || !processedData?.centerFrequency || !processedData?.sampleRate) {
      return;
    }

    const startFreq = processedData.centerFrequency - processedData.sampleRate / 2;
    const endFreq = processedData.centerFrequency + processedData.sampleRate / 2;
    const freqLabels = 5;

    ctx.textAlign = 'center';

    for (let i = 0; i <= freqLabels; i++) {
      const freq = startFreq + ((endFreq - startFreq) * i) / freqLabels;
      const x = startX + (waterfallWidth * i) / freqLabels;
      const freqMHz = (freq / 1000000).toFixed(1);

      ctx.fillText(`${freqMHz}`, x, height - 5);

      if (i > 0 && i < freqLabels) {
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, startY + waterfallHeight);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Center frequency marker
    ctx.strokeStyle = labelColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(startX + waterfallWidth / 2, startY);
    ctx.lineTo(startX + waterfallWidth / 2, startY + waterfallHeight);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /**
   * NASA JPL Rule 4: Split function - Draw time labels and grid
   */
  function drawTimeLabels(
    ctx: CanvasRenderingContext2D,
    waterfallWidth: number,
    waterfallHeight: number,
    startX: number,
    startY: number,
    gridColor: string
  ): void {
    if (!showTimeLabels || state.waterfallHistory.length === 0) {
      return;
    }

    ctx.textAlign = 'right';
    const timeLabels = Math.min(8, Math.floor(waterfallHeight / 30));

    for (let i = 0; i <= timeLabels; i++) {
      const timeIndex = (state.waterfallHistory.length * i) / timeLabels;
      const y = startY + (waterfallHeight * i) / timeLabels;

      const secondsAgo = timeIndex / 30; // ~30fps update rate
      const timeLabel = secondsAgo < 60 ? `${secondsAgo.toFixed(0)}s` : `${(secondsAgo / 60).toFixed(1)}m`;

      ctx.fillText(timeLabel, startX - 5, y + 4);

      if (i > 0 && i < timeLabels) {
        ctx.strokeStyle = gridColor;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + waterfallWidth, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  /**
   * Draws labels for frequency and time axes
   * NASA JPL Rule 4: Function refactored to be ≤60 lines
   */
  function drawLabels(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    labelColor: string,
    gridColor: string
  ): void {
    ctx.fillStyle = labelColor;
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.font = '11px var(--typography-font_family_mono)';

    const waterfallWidth = Math.max(0, width - 60);
    const waterfallHeight = Math.max(0, Math.min(height - 40, state.waterfallHistory.length));
    const startX = 30;
    const startY = 20;

    // Draw frequency labels and vertical grid
    drawFrequencyLabels(ctx, width, height, waterfallWidth, waterfallHeight, startX, startY, labelColor);

    // Draw time labels and horizontal grid
    drawTimeLabels(ctx, waterfallWidth, waterfallHeight, startX, startY, gridColor);

    // Color scale legend (right side)
    drawColorScale(ctx, width - 25, startY, 15, waterfallHeight, labelColor);
  }

  /**
   * Draws a color scale legend
   */
  function drawColorScale(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    labelColor: string
  ): void {
    if (!state.colorMap) {
      return;
    }

    // Validate dimensions to prevent canvas errors
    if (!width || width <= 0 || !height || height <= 0) {
      console.warn('Invalid dimensions for color scale:', { width, height });
      return;
    }

    // Draw color gradient
    const scaleImageData = ctx.createImageData(width, height);
    const pixels = scaleImageData.data;

    for (let row = 0; row < height; row++) {
      const intensity = 1 - row / height; // Invert so high values are at top
      const colorIndex = Math.floor(intensity * 255);
      const colorMapPixel = colorIndex * 4;

      for (let col = 0; col < width; col++) {
        const pixelIndex = (row * width + col) * 4;
        pixels[pixelIndex] = state.colorMap.data[colorMapPixel];
        pixels[pixelIndex + 1] = state.colorMap.data[colorMapPixel + 1];
        pixels[pixelIndex + 2] = state.colorMap.data[colorMapPixel + 2];
        pixels[pixelIndex + 3] = state.colorMap.data[colorMapPixel + 3];
      }
    }

    ctx.putImageData(scaleImageData, x, y);

    // Draw border
    ctx.strokeStyle = labelColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Draw scale labels
    ctx.fillStyle = labelColor;
    ctx.font = '10px var(--typography-font_family_mono)';
    ctx.textAlign = 'left';

    const scaleLabels = 3;
    for (let i = 0; i <= scaleLabels; i++) {
      const value =
        state.maxMagnitude - ((state.maxMagnitude - state.minMagnitude) * i) / scaleLabels;
      const labelY = y + (height * i) / scaleLabels;

      ctx.fillText(`${value.toFixed(0)}`, x + width + 3, labelY + 3);
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

    ctx.fillText('No waterfall data available', width / 2, height / 2);

    ctx.font = '12px var(--typography-font_family_sans)';
    ctx.fillText('Waiting for SDR data stream...', width / 2, height / 2 + 25);
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
    const generalKey = colorKey.replace('waterfall_', '').replace('_color', '');
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
      console.error('Failed to get 2D rendering context for waterfall visualizer');
      return;
    }

    // Initialize color map
    updateColorMap();

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

<div class="waterfall-visualizer" bind:this={containerElement} data-testid="waterfall-visualizer">
  <div class="waterfall-header">
    <h3 class="waterfall-title">Waterfall Display</h3>
    {#if data}
      <div class="waterfall-info">
        <span class="info-item">
          History: {state.waterfallHistory.length}/{maxHistory}
        </span>
        <span class="info-item">
          Range: {state.minMagnitude.toFixed(0)} to {state.maxMagnitude.toFixed(0)} dB
        </span>
        <span class="info-item">
          Rate: {processedData?.sampleRate
            ? (processedData.sampleRate / 1000000).toFixed(1) + ' MHz'
            : 'N/A'}
        </span>
      </div>
    {/if}
  </div>

  <div class="canvas-container">
    <canvas bind:this={canvasElement} class="waterfall-canvas" data-testid="waterfall-canvas"
    ></canvas>
  </div>
</div>

<style>
  .waterfall-visualizer {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background-color: var(--color-background_secondary);
    border: var(--layout-border_width) solid var(--component-sdr-grid_line_color);
    border-radius: var(--layout-border_radius);
    overflow: hidden;
  }

  .waterfall-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: calc(var(--layout-spacing_unit) * 1.5);
    background-color: var(--color-background_tertiary);
    border-bottom: var(--layout-border_width) solid var(--component-sdr-grid_line_color);
  }

  .waterfall-title {
    font-size: var(--typography-font_size_base);
    font-weight: 600;
    color: var(--color-text_primary);
    margin: 0;
  }

  .waterfall-info {
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

  .waterfall-canvas {
    width: 100%;
    height: 100%;
    display: block;
    cursor: crosshair;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .waterfall-header {
      flex-direction: column;
      gap: var(--layout-spacing_unit);
      align-items: flex-start;
    }

    .waterfall-info {
      gap: var(--layout-spacing_unit);
      flex-wrap: wrap;
    }

    .info-item {
      font-size: calc(var(--typography-font_size_sm) * 0.9);
      padding: calc(var(--layout-spacing_unit) / 3) calc(var(--layout-spacing_unit) / 2);
    }
  }

  @media (max-width: 480px) {
    .waterfall-header {
      padding: var(--layout-spacing_unit);
    }

    .waterfall-title {
      font-size: var(--typography-font_size_sm);
    }

    .waterfall-info {
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
    .waterfall-canvas {
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
  }

  /* Dark mode specific adjustments */
  @media (prefers-color-scheme: dark) {
    .waterfall-canvas {
      filter: brightness(1.1);
    }
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .waterfall-canvas {
      transition: none;
    }
  }

  /* Focus styles for accessibility */
  .waterfall-canvas:focus {
    outline: 2px solid var(--color-accent_blue);
    outline-offset: 2px;
  }
</style>
