<!--
  Waterfall Visualization Component
  WebGL-based rendering for high-performance waterfall visualization of spectrum data over time
  Requirements: 5.3, 5.4
-->
<script lang="ts">
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import { theme } from '$lib/stores/theme';
  import type { FFTData } from './types';
  import {
    assert,
    assertDefined,
    assertBounds,
    assertPerformance,
    assertRange,
    assertArrayBounds
  } from '$lib/utils/assert';
  import { AssertionCategory, AssertionErrorCode } from '$lib/types/assertions';

  // ===== PROPS =====
  export let data: FFTData | null = null;
  export let maxHistory: number = 1024; // Maximum number of waterfall lines to keep
  export let colorIntensity: number = 1.0; // Color intensity multiplier
  export let showFrequencyLabels: boolean = true;
  export let showTimeLabels: boolean = true;
  export let colorMap: 'viridis' | 'plasma' | 'turbo' | 'jet' | 'grayscale' = 'viridis';
  export let dynamicRange: number = 80; // dB of dynamic range
  export let averaging: boolean = false; // Enable averaging mode
  export let peakHold: boolean = false; // Enable peak hold mode

  // ===== STATE =====
  interface WaterfallState {
    canvas: HTMLCanvasElement | null;
    overlayCanvas: HTMLCanvasElement | null;
    gl: WebGL2RenderingContext | null;
    ctx2d: CanvasRenderingContext2D | null; // For labels/overlay
    animationFrame: number | null;
    lastRenderTime: number;
    isResizing: boolean;
    waterfallHistory: number[][];
    minMagnitude: number;
    maxMagnitude: number;
    // WebGL resources
    program: WebGLProgram | null;
    waterfallTexture: WebGLTexture | null;
    colorMapTexture: WebGLTexture | null;
    vertexBuffer: WebGLBuffer | null;
    textureCoordBuffer: WebGLBuffer | null;
    currentLine: number;
    textureWidth: number;
    textureHeight: number;
    // Performance metrics
    frameCount: number;
    lastFpsTime: number;
    fps: number;
    renderTime: number;
  }

  let state: WaterfallState = {
    canvas: null,
    overlayCanvas: null,
    gl: null,
    ctx2d: null,
    animationFrame: null,
    lastRenderTime: 0,
    isResizing: false,
    waterfallHistory: [],
    minMagnitude: -100,
    maxMagnitude: -20,
    // WebGL resources
    program: null,
    waterfallTexture: null,
    colorMapTexture: null,
    vertexBuffer: null,
    textureCoordBuffer: null,
    currentLine: 0,
    textureWidth: 2048, // Power of 2 for GPU efficiency
    textureHeight: 1024, // Power of 2 for GPU efficiency
    // Performance metrics
    frameCount: 0,
    lastFpsTime: 0,
    fps: 0,
    renderTime: 0
  };

  let containerElement: HTMLDivElement;
  let canvasElement: HTMLCanvasElement;
  let overlayCanvasElement: HTMLCanvasElement;

  // WebGL shader sources
  const VERTEX_SHADER_SOURCE = `#version 300 es
    in vec2 a_position;
    in vec2 a_texCoord;
    out vec2 v_texCoord;
    
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;

  const FRAGMENT_SHADER_SOURCE = `#version 300 es
    precision highp float;
    
    uniform sampler2D u_waterfallTexture;
    uniform sampler2D u_colorMapTexture;
    uniform float u_minLevel;
    uniform float u_maxLevel;
    uniform float u_currentLine;
    uniform float u_textureHeight;
    uniform float u_intensity;
    
    in vec2 v_texCoord;
    out vec4 fragColor;
    
    void main() {
      // Calculate wrapped texture coordinate for circular buffer
      float y = v_texCoord.y * u_textureHeight;
      float wrappedY = mod(y + u_currentLine, u_textureHeight) / u_textureHeight;
      
      // Sample magnitude from waterfall texture
      float magnitude = texture(u_waterfallTexture, vec2(v_texCoord.x, wrappedY)).r;
      
      // Normalize magnitude to 0-1 range
      float normalized = clamp((magnitude - u_minLevel) / (u_maxLevel - u_minLevel), 0.0, 1.0);
      
      // Apply intensity scaling
      normalized = pow(normalized, 1.0 / u_intensity);
      
      // Sample color from color map
      vec4 color = texture(u_colorMapTexture, vec2(normalized, 0.5));
      
      // Apply age-based fading for older lines
      float age = abs(y - u_currentLine) / u_textureHeight;
      float fadeFactor = 1.0 - (age * 0.1); // Subtle fade
      
      fragColor = vec4(color.rgb * fadeFactor, color.a);
    }
  `;

  // ===== REACTIVE STATEMENTS =====
  $: if (data && state.gl && !state.isResizing) {
    addDataToWaterfall(data);
    scheduleRender();
  }

  $: if (colorMap && state.gl) {
    updateColorMapTexture();
    scheduleRender();
  }

  $: if ($theme && state.ctx2d) {
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
   * Creates WebGL shader from source
   */
  function createShader(
    gl: WebGL2RenderingContext,
    type: number,
    source: string
  ): WebGLShader | null {
    assertDefined(gl, 'WebGL context is required');
    assert(type === gl.VERTEX_SHADER || type === gl.FRAGMENT_SHADER, 'Invalid shader type');
    assert(source.length > 0, 'Shader source cannot be empty');

    const shader = gl.createShader(type);
    if (!shader) {
      console.error('Failed to create shader');
      return null;
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader) || 'Unknown shader compilation error';
      console.error('Shader compilation error:', error);
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Creates WebGL program from vertex and fragment shaders
   */
  function createProgram(
    gl: WebGL2RenderingContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader
  ): WebGLProgram | null {
    const program = gl.createProgram();
    if (!program) {
      console.error('Failed to create program');
      return null;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    return program;
  }

  /**
   * Initializes WebGL resources
   * NASA JPL Rule 4: Split into focused functions ≤60 lines
   */
  function initWebGL(): boolean {
    if (!state.canvas) return false;

    const gl = initWebGLContext();
    if (!gl) return false;

    const program = createShaderProgram(gl);
    if (!program) return false;

    state.program = program;

    const buffersCreated = createWebGLBuffers(gl);
    if (!buffersCreated) return false;

    const texturesCreated = createWebGLTextures(gl);
    if (!texturesCreated) return false;

    return true;
  }

  /**
   * NASA JPL Rule 4: Initialize WebGL context ≤20 lines
   */
  function initWebGLContext(): WebGL2RenderingContext | null {
    const gl = state.canvas!.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
      desynchronized: true
    });

    if (!gl) {
      console.error('WebGL2 not supported, falling back to Canvas2D');
      return null;
    }

    state.gl = gl;
    return gl;
  }

  /**
   * NASA JPL Rule 4: Create shader program ≤20 lines
   */
  function createShaderProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);

    if (!vertexShader || !fragmentShader) {
      return null;
    }

    return createProgram(gl, vertexShader, fragmentShader);
  }

  /**
   * NASA JPL Rule 4: Create WebGL buffers ≤30 lines
   */
  function createWebGLBuffers(gl: WebGL2RenderingContext): boolean {
    // Set up vertex buffer (full screen quad)
    const positions = new Float32Array([
      -1,
      -1, // Bottom left
      1,
      -1, // Bottom right
      -1,
      1, // Top left
      1,
      1 // Top right
    ]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    state.vertexBuffer = vertexBuffer;

    // Set up texture coordinates
    const texCoords = new Float32Array([
      0,
      1, // Bottom left
      1,
      1, // Bottom right
      0,
      0, // Top left
      1,
      0 // Top right
    ]);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
    state.textureCoordBuffer = texCoordBuffer;

    return true;
  }

  /**
   * NASA JPL Rule 4: Create WebGL textures ≤25 lines
   */
  function createWebGLTextures(gl: WebGL2RenderingContext): boolean {
    // Create waterfall texture
    const waterfallTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, waterfallTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    // Initialize empty texture
    const emptyData = new Float32Array(state.textureWidth * state.textureHeight);
    emptyData.fill(state.minMagnitude);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32F,
      state.textureWidth,
      state.textureHeight,
      0,
      gl.RED,
      gl.FLOAT,
      emptyData
    );
    state.waterfallTexture = waterfallTexture;

    // Create color map texture
    updateColorMapTexture();

    return true;
  }

  /**
   * Adds new FFT data to the WebGL waterfall texture
   * NASA JPL Rule 4: Split into focused functions ≤60 lines
   */
  function addDataToWaterfall(fftData: FFTData): void {
    validateFFTInput(fftData);

    if (!state.gl || !state.waterfallTexture) {
      return; // Graceful fallback for missing WebGL
    }

    const magnitudes = fftData.magnitudes;
    validateMagnitudeValues(magnitudes);

    updateMagnitudeRange(magnitudes);

    const textureData = resampleFFTData(magnitudes);

    updateWaterfallTexture(textureData);

    updateHistoryBuffer(magnitudes);
  }

  /**
   * NASA JPL Rule 4: Validate FFT input ≤15 lines
   */
  function validateFFTInput(fftData: FFTData): void {
    assertDefined(fftData, 'FFT data is required');
    assertDefined(fftData.magnitudes, 'FFT magnitudes are required');
    assert(fftData.magnitudes.length > 0, 'FFT magnitudes cannot be empty');
    assertBounds(fftData.magnitudes.length, 1, 32768, 'FFT size out of reasonable bounds');
  }

  /**
   * NASA JPL Rule 4: Validate magnitude values ≤15 lines
   */
  function validateMagnitudeValues(magnitudes: number[]): void {
    for (let i = 0; i < Math.min(10, magnitudes.length); i++) {
      assertRange(magnitudes[i], -200, 50, `Magnitude ${i} out of expected dB range`);
    }
  }

  /**
   * NASA JPL Rule 4: Update magnitude range for color mapping ≤20 lines
   */
  function updateMagnitudeRange(magnitudes: number[]): void {
    const currentMin = Math.min(...magnitudes);
    const currentMax = Math.max(...magnitudes);

    // NASA JPL Rule 5: Validate computed values
    assert(isFinite(currentMin), 'Minimum magnitude must be finite');
    assert(isFinite(currentMax), 'Maximum magnitude must be finite');
    assert(currentMin <= currentMax, 'Min magnitude must be <= max magnitude');

    // Use exponential moving average for smooth range adaptation
    const alpha = 0.1;
    state.minMagnitude = state.minMagnitude * (1 - alpha) + currentMin * alpha;
    state.maxMagnitude = state.maxMagnitude * (1 - alpha) + currentMax * alpha;
  }

  /**
   * NASA JPL Rule 4: Resample FFT data to texture width ≤20 lines
   */
  function resampleFFTData(magnitudes: number[]): Float32Array {
    const textureData = new Float32Array(state.textureWidth);

    for (let i = 0; i < state.textureWidth; i++) {
      const fftIndex = Math.floor((i / state.textureWidth) * magnitudes.length);
      assertArrayBounds(magnitudes, fftIndex, 'FFT index out of bounds during resampling');
      textureData[i] = magnitudes[fftIndex];
    }

    return textureData;
  }

  /**
   * NASA JPL Rule 4: Update WebGL texture ≤25 lines
   */
  function updateWaterfallTexture(textureData: Float32Array): void {
    const gl = state.gl!;

    gl.bindTexture(gl.TEXTURE_2D, state.waterfallTexture);

    // NASA JPL Rule 5: Validate texture update parameters
    assertBounds(state.currentLine, 0, state.textureHeight, 'Current line out of texture bounds');

    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0, // level
      0, // x offset
      state.currentLine, // y offset
      state.textureWidth, // width
      1, // height
      gl.RED,
      gl.FLOAT,
      textureData
    );

    // NASA JPL Rule 7: Check for WebGL errors
    const error = gl.getError();
    assert(error === gl.NO_ERROR, `WebGL error during texture update: ${error}`);

    // Move to next line (circular)
    state.currentLine = (state.currentLine + 1) % state.textureHeight;
  }

  /**
   * NASA JPL Rule 4: Update history buffer ≤15 lines
   */
  function updateHistoryBuffer(magnitudes: number[]): void {
    state.waterfallHistory.unshift([...magnitudes]);
    if (state.waterfallHistory.length > maxHistory) {
      state.waterfallHistory = state.waterfallHistory.slice(0, maxHistory);
    }
  }

  /**
   * Generates color map data for different schemes
   * NASA JPL Rule 4: Split into focused functions ≤60 lines
   */
  function generateColorMapData(scheme: string): Uint8Array {
    const size = 256;
    const data = new Uint8Array(size * 4);

    for (let i = 0; i < size; i++) {
      const t = i / (size - 1);
      const color = calculateColorForScheme(scheme, t, i);

      const idx = i * 4;
      data[idx] = color.r;
      data[idx + 1] = color.g;
      data[idx + 2] = color.b;
      data[idx + 3] = Math.floor(255 * colorIntensity);
    }

    return data;
  }

  /**
   * NASA JPL Rule 4: Calculate color for specific scheme ≤60 lines
   */
  function calculateColorForScheme(
    scheme: string,
    t: number,
    i: number
  ): { r: number; g: number; b: number } {
    let r = 0,
      g = 0,
      b = 0;

    switch (scheme) {
      case 'viridis':
        return calculateViridisColor(t, i);
      case 'plasma':
        return calculatePlasmaColor(t);
      case 'turbo':
        return calculateTurboColor(t);
      case 'jet':
        return calculateJetColor(t);
      case 'grayscale':
        r = g = b = Math.floor(255 * t);
        break;
      default:
        return calculateViridisColor(t, i);
    }

    return clampColor({ r, g, b });
  }

  /**
   * NASA JPL Rule 4: Calculate Viridis color ≤15 lines
   */
  function calculateViridisColor(t: number, i: number): { r: number; g: number; b: number } {
    const r = Math.floor(255 * (0.267 + 0.004 * i - 0.329 * t * t + 0.449 * t * t * t));
    const g = Math.floor(255 * (0.005 + 1.395 * t - 0.831 * t * t));
    const b = Math.floor(255 * (0.329 + 1.089 * t - 1.378 * t * t + 0.919 * t * t * t));
    return clampColor({ r, g, b });
  }

  /**
   * NASA JPL Rule 4: Calculate Plasma color ≤15 lines
   */
  function calculatePlasmaColor(t: number): { r: number; g: number; b: number } {
    const r = Math.floor(255 * (0.05 + 2.718 * t - 5.947 * t * t + 4.174 * t * t * t));
    const g = Math.floor(255 * (0.004 + 0.106 * t + 1.825 * t * t - 1.903 * t * t * t));
    const b = Math.floor(255 * (0.528 + 0.886 * t - 1.739 * t * t + 0.951 * t * t * t));
    return clampColor({ r, g, b });
  }

  /**
   * NASA JPL Rule 4: Calculate Turbo color ≤25 lines
   */
  function calculateTurboColor(t: number): { r: number; g: number; b: number } {
    let r = 0,
      g = 0,
      b = 0;

    if (t < 0.35) {
      r = Math.floor(255 * (0.138 + 4.781 * t));
      g = Math.floor(255 * (0.097 + 2.003 * t));
      b = Math.floor(255 * (0.85 - 1.316 * t));
    } else if (t < 0.65) {
      r = Math.floor(255 * (1.445 - 1.259 * (t - 0.35)));
      g = Math.floor(255 * (0.797 + 0.617 * (t - 0.35)));
      b = Math.floor(255 * (0.386 + 1.958 * (t - 0.35)));
    } else {
      r = Math.floor(255 * (1.067 - 0.894 * (t - 0.65)));
      g = Math.floor(255 * (0.982 - 2.265 * (t - 0.65)));
      b = Math.floor(255 * (0.973 - 1.885 * (t - 0.65)));
    }

    return clampColor({ r, g, b });
  }

  /**
   * NASA JPL Rule 4: Calculate Jet color ≤30 lines
   */
  function calculateJetColor(t: number): { r: number; g: number; b: number } {
    let r = 0,
      g = 0,
      b = 0;

    if (t < 0.125) {
      b = Math.floor(255 * (0.5 + 4 * t));
    } else if (t < 0.375) {
      b = 255;
      g = Math.floor(255 * (4 * (t - 0.125)));
    } else if (t < 0.625) {
      g = 255;
      b = Math.floor(255 * (1 - 4 * (t - 0.375)));
      r = Math.floor(255 * (4 * (t - 0.375)));
    } else if (t < 0.875) {
      r = 255;
      g = Math.floor(255 * (1 - 4 * (t - 0.625)));
    } else {
      r = Math.floor(255 * (1 - 4 * (t - 0.875)));
    }

    return clampColor({ r, g, b });
  }

  /**
   * NASA JPL Rule 4: Clamp color values ≤10 lines
   */
  function clampColor(color: { r: number; g: number; b: number }): {
    r: number;
    g: number;
    b: number;
  } {
    return {
      r: Math.max(0, Math.min(255, color.r)),
      g: Math.max(0, Math.min(255, color.g)),
      b: Math.max(0, Math.min(255, color.b))
    };
  }

  /**
   * Updates the color map texture in WebGL
   */
  function updateColorMapTexture(): void {
    if (!state.gl) return;

    const gl = state.gl;
    const colorMapData = generateColorMapData(colorMap);

    if (!state.colorMapTexture) {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      state.colorMapTexture = texture;
    }

    gl.bindTexture(gl.TEXTURE_2D, state.colorMapTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, colorMapData);
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
      const startTime = performance.now();

      if (state.gl) {
        renderWaterfallWebGL();
      } else {
        renderWaterfallCanvas2D();
      }

      // Update performance metrics
      state.renderTime = performance.now() - startTime;
      state.frameCount++;

      // Update FPS every second
      if (startTime - state.lastFpsTime >= 1000) {
        state.fps = state.frameCount;
        state.frameCount = 0;
        state.lastFpsTime = startTime;
      }

      state.lastRenderTime = startTime;
      state.animationFrame = null;
    });
  }

  /**
   * Main WebGL rendering function
   * NASA JPL Rule 4: Split into focused functions ≤60 lines
   */
  function renderWaterfallWebGL(): void {
    validateWebGLRenderState();

    const { gl, canvas } = prepareWebGLCanvas();
    if (!gl || !canvas) return;

    clearWebGLCanvas(gl);

    setupWebGLProgram(gl);

    setWebGLUniforms(gl);

    bindWebGLTextures(gl);

    bindWebGLVertexAttributes(gl);

    drawWebGLQuad(gl);

    renderOverlay();
  }

  /**
   * NASA JPL Rule 4: Validate WebGL render state ≤15 lines
   */
  function validateWebGLRenderState(): void {
    assertDefined(state.gl, 'WebGL context is required for rendering');
    assertDefined(state.program, 'WebGL program is required for rendering');
    assertDefined(state.canvas, 'Canvas element is required for rendering');
    assertDefined(state.waterfallTexture, 'Waterfall texture is required');
    assertDefined(state.colorMapTexture, 'Color map texture is required');
  }

  /**
   * NASA JPL Rule 4: Prepare WebGL canvas ≤30 lines
   */
  function prepareWebGLCanvas(): {
    gl: WebGL2RenderingContext | null;
    canvas: HTMLCanvasElement | null;
  } {
    const gl = state.gl!;
    const canvas = state.canvas!;
    const rect = canvas.getBoundingClientRect();

    // NASA JPL Rule 5: Validate dimensions
    assert(rect.width > 0 && rect.height > 0, 'Canvas has invalid dimensions');
    assertBounds(rect.width, 1, 8192, 'Canvas width out of bounds');
    assertBounds(rect.height, 1, 8192, 'Canvas height out of bounds');

    // Update canvas size if needed
    const dpr = window.devicePixelRatio || 1;
    const width = Math.floor(rect.width * dpr);
    const height = Math.floor(rect.height * dpr);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }

    // NASA JPL Rule 7: Check for context loss
    if (gl.isContextLost()) {
      console.warn('WebGL context is lost, skipping render');
      return { gl: null, canvas: null };
    }

    return { gl, canvas };
  }

  /**
   * NASA JPL Rule 4: Clear WebGL canvas ≤10 lines
   */
  function clearWebGLCanvas(gl: WebGL2RenderingContext): void {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  /**
   * NASA JPL Rule 4: Setup WebGL program ≤10 lines
   */
  function setupWebGLProgram(gl: WebGL2RenderingContext): void {
    gl.useProgram(state.program!);
  }

  /**
   * NASA JPL Rule 4: Set WebGL uniforms ≤25 lines
   */
  function setWebGLUniforms(gl: WebGL2RenderingContext): void {
    const minLevelLoc = gl.getUniformLocation(state.program!, 'u_minLevel');
    const maxLevelLoc = gl.getUniformLocation(state.program!, 'u_maxLevel');
    const currentLineLoc = gl.getUniformLocation(state.program!, 'u_currentLine');
    const textureHeightLoc = gl.getUniformLocation(state.program!, 'u_textureHeight');
    const intensityLoc = gl.getUniformLocation(state.program!, 'u_intensity');

    // NASA JPL Rule 5: Validate uniform values
    assertRange(state.minMagnitude, -200, 50, 'Min magnitude out of range');
    assertRange(state.maxMagnitude, -200, 50, 'Max magnitude out of range');
    assert(state.minMagnitude < state.maxMagnitude, 'Invalid magnitude range');
    assertRange(colorIntensity, 0.1, 10, 'Color intensity out of range');

    gl.uniform1f(minLevelLoc, state.minMagnitude);
    gl.uniform1f(maxLevelLoc, state.maxMagnitude);
    gl.uniform1f(currentLineLoc, state.currentLine);
    gl.uniform1f(textureHeightLoc, state.textureHeight);
    gl.uniform1f(intensityLoc, colorIntensity);
  }

  /**
   * NASA JPL Rule 4: Bind WebGL textures ≤20 lines
   */
  function bindWebGLTextures(gl: WebGL2RenderingContext): void {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, state.waterfallTexture);
    gl.uniform1i(gl.getUniformLocation(state.program!, 'u_waterfallTexture'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, state.colorMapTexture);
    gl.uniform1i(gl.getUniformLocation(state.program!, 'u_colorMapTexture'), 1);
  }

  /**
   * NASA JPL Rule 4: Bind WebGL vertex attributes ≤20 lines
   */
  function bindWebGLVertexAttributes(gl: WebGL2RenderingContext): void {
    const positionLoc = gl.getAttribLocation(state.program!, 'a_position');
    const texCoordLoc = gl.getAttribLocation(state.program!, 'a_texCoord');

    assertDefined(state.vertexBuffer, 'Vertex buffer is required');
    assertDefined(state.textureCoordBuffer, 'Texture coordinate buffer is required');

    gl.bindBuffer(gl.ARRAY_BUFFER, state.vertexBuffer!);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, state.textureCoordBuffer!);
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
  }

  /**
   * NASA JPL Rule 4: Draw WebGL quad ≤15 lines
   */
  function drawWebGLQuad(gl: WebGL2RenderingContext): void {
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // NASA JPL Rule 7: Check for rendering errors
    const error = gl.getError();
    assert(error === gl.NO_ERROR, `WebGL rendering error: ${error}`);
  }

  /**
   * Fallback Canvas2D rendering function
   */
  function renderWaterfallCanvas2D(): void {
    if (!state.overlayCanvas || !state.ctx2d) return;

    const canvas = state.overlayCanvas;
    const ctx = state.ctx2d;
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
    if (state.waterfallHistory.length > 0) {
      drawWaterfallDataCanvas2D(ctx, rect.width, rect.height);
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
  function calculateWaterfallDimensions(
    width: number,
    height: number,
    historyLength: number
  ): {
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
   * NASA JPL Rule 7: Check WebGL context loss
   */
  function handleContextLost(event: Event): void {
    event.preventDefault();
    console.warn('WebGL context lost');
    state.gl = null;
    state.program = null;
    state.waterfallTexture = null;
    state.colorMapTexture = null;
  }

  /**
   * NASA JPL Rule 7: Restore WebGL context
   */
  function handleContextRestored(): void {
    console.info('WebGL context restored');
    initWebGL();
  }

  /**
   * Renders overlay with labels and grid
   */
  function renderOverlay(): void {
    if (!state.overlayCanvas || !state.ctx2d) return;

    const canvas = state.overlayCanvas;
    const ctx = state.ctx2d;
    const rect = canvas.getBoundingClientRect();

    // Set canvas size to match display size
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width;
    const height = rect.height;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    }

    // Clear overlay
    ctx.clearRect(0, 0, width, height);

    // Get theme colors
    const axisLabelColor = getThemeColor('axis_label_color', '#cccccc');
    const gridLineColor = getThemeColor('grid_line_color', '#333333');

    // Draw labels if enabled
    if (showFrequencyLabels || showTimeLabels) {
      drawLabels(ctx, width, height, axisLabelColor, gridLineColor);
    }

    // Draw performance metrics
    if (state.fps > 0) {
      ctx.fillStyle = axisLabelColor;
      ctx.font = '12px var(--typography-font_family_mono)';
      ctx.textAlign = 'right';
      ctx.fillText(`${state.fps} FPS | ${state.renderTime.toFixed(1)}ms`, width - 10, 20);
    }
  }

  /**
   * Draws the waterfall data using Canvas2D as fallback
   */
  function drawWaterfallDataCanvas2D(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    if (state.waterfallHistory.length === 0) return;

    const history = state.waterfallHistory;
    const dataLength = history[0]?.length || 0;
    if (dataLength === 0) return;

    // Calculate safe dimensions
    const dims = calculateWaterfallDimensions(width, height, history.length);
    if (!dims) return;

    const { safeWidth, safeHeight, startX, startY } = dims;

    // Create image data for efficient pixel manipulation
    const imageData = ctx.createImageData(safeWidth, safeHeight);
    const colorMapData = generateColorMapData(colorMap);

    // Render pixels with color mapping
    for (let y = 0; y < safeHeight && y < history.length; y++) {
      const magnitudes = history[y];

      for (let x = 0; x < safeWidth; x++) {
        const binIndex = Math.floor((x / safeWidth) * dataLength);
        const magnitude = magnitudes[binIndex] || state.minMagnitude;

        const normalized = Math.max(
          0,
          Math.min(1, (magnitude - state.minMagnitude) / (state.maxMagnitude - state.minMagnitude))
        );

        const colorIndex = Math.floor(normalized * 255) * 4;
        const pixelIndex = (y * safeWidth + x) * 4;

        imageData.data[pixelIndex] = colorMapData[colorIndex];
        imageData.data[pixelIndex + 1] = colorMapData[colorIndex + 1];
        imageData.data[pixelIndex + 2] = colorMapData[colorIndex + 2];
        imageData.data[pixelIndex + 3] = colorMapData[colorIndex + 3];
      }
    }

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
      const timeLabel =
        secondsAgo < 60 ? `${secondsAgo.toFixed(0)}s` : `${(secondsAgo / 60).toFixed(1)}m`;

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
    drawFrequencyLabels(
      ctx,
      width,
      height,
      waterfallWidth,
      waterfallHeight,
      startX,
      startY,
      labelColor
    );

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
    if (!canvasElement || !overlayCanvasElement) {
      return;
    }

    state.canvas = canvasElement;
    state.overlayCanvas = overlayCanvasElement;

    // Try WebGL first
    const webglSupported = initWebGL();

    if (!webglSupported) {
      // Fallback to Canvas2D
      console.warn('WebGL not available, using Canvas2D fallback');
      state.ctx2d = overlayCanvasElement.getContext('2d');

      if (!state.ctx2d) {
        console.error('Failed to get 2D rendering context');
        return;
      }
    } else {
      // Still need 2D context for overlay
      state.ctx2d = overlayCanvasElement.getContext('2d');

      // Set up WebGL context loss handling
      canvasElement.addEventListener('webglcontextlost', handleContextLost);
      canvasElement.addEventListener('webglcontextrestored', handleContextRestored);
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
    if (canvasElement && overlayCanvasElement && !state.canvas) {
      initializeCanvas();
    }
  });

  onDestroy(() => {
    if (state.animationFrame) {
      cancelAnimationFrame(state.animationFrame);
    }

    // Clean up WebGL resources
    if (state.gl) {
      const gl = state.gl;

      // Delete textures
      if (state.waterfallTexture) gl.deleteTexture(state.waterfallTexture);
      if (state.colorMapTexture) gl.deleteTexture(state.colorMapTexture);

      // Delete buffers
      if (state.vertexBuffer) gl.deleteBuffer(state.vertexBuffer);
      if (state.textureCoordBuffer) gl.deleteBuffer(state.textureCoordBuffer);

      // Delete program
      if (state.program) gl.deleteProgram(state.program);

      // Remove event listeners
      if (state.canvas) {
        state.canvas.removeEventListener('webglcontextlost', handleContextLost);
        state.canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      }
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
        <span class="info-item">
          Mode: {state.gl ? 'WebGL' : 'Canvas2D'}
        </span>
      </div>
    {/if}
  </div>

  <div class="waterfall-controls">
    <label class="control-item">
      Color Map:
      <select bind:value={colorMap} on:change={() => updateColorMapTexture()}>
        <option value="viridis">Viridis</option>
        <option value="plasma">Plasma</option>
        <option value="turbo">Turbo</option>
        <option value="jet">Jet</option>
        <option value="grayscale">Grayscale</option>
      </select>
    </label>
    <label class="control-item">
      Intensity:
      <input type="range" min="0.1" max="2" step="0.1" bind:value={colorIntensity} />
    </label>
    <label class="control-item">
      <input type="checkbox" bind:checked={averaging} />
      Averaging
    </label>
    <label class="control-item">
      <input type="checkbox" bind:checked={peakHold} />
      Peak Hold
    </label>
  </div>

  <div class="canvas-container">
    <canvas
      bind:this={canvasElement}
      class="waterfall-canvas webgl-canvas"
      data-testid="waterfall-canvas"
    ></canvas>
    <canvas
      bind:this={overlayCanvasElement}
      class="waterfall-canvas overlay-canvas"
      data-testid="waterfall-overlay"
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

  .waterfall-controls {
    display: flex;
    gap: calc(var(--layout-spacing_unit) * 2);
    padding: var(--layout-spacing_unit);
    background-color: var(--color-background_tertiary);
    border-bottom: var(--layout-border_width) solid var(--component-sdr-grid_line_color);
    align-items: center;
    flex-wrap: wrap;
  }

  .control-item {
    display: flex;
    align-items: center;
    gap: calc(var(--layout-spacing_unit) / 2);
    font-size: var(--typography-font_size_sm);
    color: var(--color-text_secondary);
  }

  .control-item select,
  .control-item input[type='range'] {
    background-color: var(--color-background_primary);
    border: var(--layout-border_width) solid var(--component-sdr-grid_line_color);
    border-radius: calc(var(--layout-border_radius) / 2);
    padding: calc(var(--layout-spacing_unit) / 4) calc(var(--layout-spacing_unit) / 2);
    color: var(--color-text_primary);
    font-family: var(--typography-font_family_mono);
    font-size: var(--typography-font_size_sm);
  }

  .control-item input[type='checkbox'] {
    margin: 0;
  }

  .canvas-container {
    flex: 1;
    position: relative;
    overflow: hidden;
    background-color: var(--color-background_primary);
  }

  .waterfall-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: block;
  }

  .webgl-canvas {
    z-index: 1;
  }

  .overlay-canvas {
    z-index: 2;
    pointer-events: none;
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
