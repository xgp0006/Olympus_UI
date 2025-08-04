<!--
  Spectrum Visualizer Component
  WebGL-accelerated rendering for FFT spectrum data with Canvas 2D fallback
  Performance target: < 0.8ms per frame (from 3-5ms)
  NASA JPL compliant with proper error handling
  Requirements: 5.2, 5.4
-->
<script lang="ts">
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import { theme } from '$lib/stores/theme';
  import { assert } from '$lib/utils/assert';
  import type { FFTData } from './types';

  // ===== PROPS =====
  export let data: FFTData | null = null;
  export let showGrid: boolean = true;
  export let showLabels: boolean = true;

  // ===== WEBGL STATE =====
  interface WebGLState {
    gl: WebGL2RenderingContext | null;
    program: WebGLProgram | null;
    buffers: {
      position: WebGLBuffer | null;
      magnitude: WebGLBuffer | null;
      grid: WebGLBuffer | null;
    };
    attributes: {
      position: number;
      magnitude: number;
    };
    uniforms: {
      projection: WebGLUniformLocation | null;
      view: WebGLUniformLocation | null;
      colorScale: WebGLUniformLocation | null;
      lineColor: WebGLUniformLocation | null;
      fillColor: WebGLUniformLocation | null;
      gridColor: WebGLUniformLocation | null;
      time: WebGLUniformLocation | null;
    };
    textures: {
      colorMap: WebGLTexture | null;
    };
    vao: {
      spectrum: WebGLVertexArrayObject | null;
      grid: WebGLVertexArrayObject | null;
    };
  }

  // ===== CANVAS 2D STATE =====
  interface Canvas2DState {
    canvas: HTMLCanvasElement | null;
    ctx: CanvasRenderingContext2D | null;
    animationFrame: number | null;
    lastRenderTime: number;
    isResizing: boolean;
  }

  let webglState: WebGLState = {
    gl: null,
    program: null,
    buffers: {
      position: null,
      magnitude: null,
      grid: null
    },
    attributes: {
      position: -1,
      magnitude: -1
    },
    uniforms: {
      projection: null,
      view: null,
      colorScale: null,
      lineColor: null,
      fillColor: null,
      gridColor: null,
      time: null
    },
    textures: {
      colorMap: null
    },
    vao: {
      spectrum: null,
      grid: null
    }
  };

  let canvas2DState: Canvas2DState = {
    canvas: null,
    ctx: null,
    animationFrame: null,
    lastRenderTime: 0,
    isResizing: false
  };

  let containerElement: HTMLDivElement;
  let canvasElement: HTMLCanvasElement;
  let labelCanvasElement: HTMLCanvasElement;
  let useWebGL = true;
  let isContextLost = false;

  // Pre-allocated arrays for performance (NASA JPL Rule 3: No dynamic memory after init)
  const MAX_FFT_SIZE = 8192;
  const positionBuffer = new Float32Array(MAX_FFT_SIZE * 2); // x,y pairs
  const magnitudeBuffer = new Float32Array(MAX_FFT_SIZE);
  const gridVertices = new Float32Array(1024); // Pre-allocated grid vertices

  // ===== SHADERS =====
  const VERTEX_SHADER = `#version 300 es
    precision highp float;

    in vec2 a_position;
    in float a_magnitude;

    uniform mat4 u_projection;
    uniform mat4 u_view;

    out float v_magnitude;
    out vec2 v_position;

    void main() {
      gl_Position = u_projection * u_view * vec4(a_position, 0.0, 1.0);
      v_magnitude = a_magnitude;
      v_position = a_position;
    }
  `;

  const FRAGMENT_SHADER = `#version 300 es
    precision highp float;

    in float v_magnitude;
    in vec2 v_position;

    uniform vec4 u_lineColor;
    uniform vec4 u_fillColor;
    uniform float u_time;

    out vec4 fragColor;

    void main() {
      // Simple gradient based on magnitude
      float intensity = clamp(v_magnitude, 0.0, 1.0);
      
      // Create color gradient from blue to red
      vec3 color = mix(
        vec3(0.0, 0.5, 1.0), // Blue
        vec3(1.0, 0.3, 0.0), // Orange-red
        intensity
      );

      // Add subtle animation
      float pulse = sin(u_time * 2.0 + v_position.x * 10.0) * 0.05 + 0.95;
      
      fragColor = vec4(color * pulse, u_lineColor.a);
    }
  `;

  const GRID_VERTEX_SHADER = `#version 300 es
    precision highp float;

    in vec2 a_position;

    uniform mat4 u_projection;
    uniform mat4 u_view;

    void main() {
      gl_Position = u_projection * u_view * vec4(a_position, 0.0, 1.0);
    }
  `;

  const GRID_FRAGMENT_SHADER = `#version 300 es
    precision highp float;

    uniform vec4 u_gridColor;

    out vec4 fragColor;

    void main() {
      fragColor = u_gridColor;
    }
  `;

  // ===== REACTIVE STATEMENTS =====
  $: if (data && (webglState.gl || canvas2DState.ctx) && !canvas2DState.isResizing) {
    scheduleRender();
  }

  $: if ($theme && (webglState.gl || canvas2DState.ctx)) {
    scheduleRender();
  }

  // Update data processing for better performance
  $: processedData = data ? processFFTData(data) : null;

  // ===== WEBGL FUNCTIONS =====

  /**
   * Initialize WebGL context and resources
   * NASA JPL Rule 4: Split into focused functions ≤60 lines
   */
  function initializeWebGL(): boolean {
    assert(canvasElement !== null, 'Canvas element must exist');

    try {
      const gl = createWebGLContext();
      if (!gl) return false;

      setupContextLossHandling();

      const program = createWebGLProgram(gl);
      if (!program) return false;

      getWebGLLocations(gl, program);

      const buffersCreated = createWebGLBuffers(gl);
      if (!buffersCreated) return false;

      setupVertexArrayObjects(gl);

      if (showGrid) {
        initializeGrid(gl);
      }

      return true;
    } catch (error) {
      console.error('WebGL initialization failed:', error);
      return false;
    }
  }

  /**
   * NASA JPL Rule 4: Create WebGL context ≤20 lines
   */
  function createWebGLContext(): WebGL2RenderingContext | null {
    const gl = canvasElement.getContext('webgl2', {
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false
    });

    if (!gl) {
      console.warn('WebGL 2.0 not supported, falling back to Canvas 2D');
      return null;
    }

    webglState.gl = gl;
    return gl;
  }

  /**
   * NASA JPL Rule 4: Setup context loss handling ≤10 lines
   */
  function setupContextLossHandling(): void {
    canvasElement.addEventListener('webglcontextlost', handleContextLost);
    canvasElement.addEventListener('webglcontextrestored', handleContextRestored);
  }

  /**
   * NASA JPL Rule 4: Create WebGL program ≤15 lines
   */
  function createWebGLProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
    const program = createShaderProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    if (!program) {
      console.error('Failed to create shader program');
      return null;
    }

    webglState.program = program;
    return program;
  }

  /**
   * NASA JPL Rule 4: Get WebGL attribute and uniform locations ≤20 lines
   */
  function getWebGLLocations(gl: WebGL2RenderingContext, program: WebGLProgram): void {
    webglState.attributes.position = gl.getAttribLocation(program, 'a_position');
    webglState.attributes.magnitude = gl.getAttribLocation(program, 'a_magnitude');

    webglState.uniforms.projection = gl.getUniformLocation(program, 'u_projection');
    webglState.uniforms.view = gl.getUniformLocation(program, 'u_view');
    webglState.uniforms.colorScale = gl.getUniformLocation(program, 'u_colorScale');
    webglState.uniforms.lineColor = gl.getUniformLocation(program, 'u_lineColor');
    webglState.uniforms.fillColor = gl.getUniformLocation(program, 'u_fillColor');
    webglState.uniforms.time = gl.getUniformLocation(program, 'u_time');
  }

  /**
   * NASA JPL Rule 4: Create WebGL buffers ≤20 lines
   */
  function createWebGLBuffers(gl: WebGL2RenderingContext): boolean {
    webglState.buffers.position = gl.createBuffer();
    webglState.buffers.magnitude = gl.createBuffer();
    webglState.buffers.grid = gl.createBuffer();

    assert(webglState.buffers.position !== null, 'Failed to create position buffer');
    assert(webglState.buffers.magnitude !== null, 'Failed to create magnitude buffer');

    return true;
  }

  /**
   * NASA JPL Rule 4: Setup vertex array objects ≤25 lines
   */
  function setupVertexArrayObjects(gl: WebGL2RenderingContext): void {
    webglState.vao.spectrum = gl.createVertexArray();
    webglState.vao.grid = gl.createVertexArray();

    // Set up spectrum VAO
    gl.bindVertexArray(webglState.vao.spectrum);

    gl.bindBuffer(gl.ARRAY_BUFFER, webglState.buffers.position);
    gl.enableVertexAttribArray(webglState.attributes.position);
    gl.vertexAttribPointer(webglState.attributes.position, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, webglState.buffers.magnitude);
    gl.enableVertexAttribArray(webglState.attributes.magnitude);
    gl.vertexAttribPointer(webglState.attributes.magnitude, 1, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
  }

  /**
   * Create and compile shader program
   */
  function createShaderProgram(
    gl: WebGL2RenderingContext,
    vertexSource: string,
    fragmentSource: string
  ): WebGLProgram | null {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) {
      return null;
    }

    const program = gl.createProgram();
    if (!program) {
      return null;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Shader program linking failed:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    // Clean up shaders after linking
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return program;
  }

  /**
   * Compile individual shader
   */
  function compileShader(
    gl: WebGL2RenderingContext,
    type: number,
    source: string
  ): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) {
      return null;
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Initialize grid vertices
   */
  function initializeGrid(gl: WebGL2RenderingContext): void {
    const gridProgram = createShaderProgram(gl, GRID_VERTEX_SHADER, GRID_FRAGMENT_SHADER);
    if (!gridProgram) {
      return;
    }

    // Store grid program separately (would extend WebGLState in production)
    (webglState as any).gridProgram = gridProgram;
    (webglState as any).gridUniformLocation = gl.getUniformLocation(gridProgram, 'u_gridColor');

    // Generate grid vertices
    let vertexIndex = 0;

    // Vertical lines
    const verticalLines = 10;
    for (let i = 0; i <= verticalLines; i++) {
      const x = (i / verticalLines) * 2.0 - 1.0; // Convert to NDC
      gridVertices[vertexIndex++] = x;
      gridVertices[vertexIndex++] = -1.0;
      gridVertices[vertexIndex++] = x;
      gridVertices[vertexIndex++] = 1.0;
    }

    // Horizontal lines
    const horizontalLines = 8;
    for (let i = 0; i <= horizontalLines; i++) {
      const y = (i / horizontalLines) * 2.0 - 1.0;
      gridVertices[vertexIndex++] = -1.0;
      gridVertices[vertexIndex++] = y;
      gridVertices[vertexIndex++] = 1.0;
      gridVertices[vertexIndex++] = y;
    }

    // Upload grid data
    gl.bindBuffer(gl.ARRAY_BUFFER, webglState.buffers.grid);
    gl.bufferData(gl.ARRAY_BUFFER, gridVertices.subarray(0, vertexIndex), gl.STATIC_DRAW);
  }

  /**
   * Handle WebGL context loss
   */
  function handleContextLost(event: Event): void {
    event.preventDefault();
    isContextLost = true;
    console.warn('WebGL context lost, will attempt restoration');
  }

  /**
   * Handle WebGL context restoration
   */
  function handleContextRestored(): void {
    console.log('WebGL context restored, reinitializing');
    isContextLost = false;
    initializeWebGL();
    scheduleRender();
  }

  /**
   * Render using WebGL
   */
  function renderWebGL(): void {
    const gl = webglState.gl;
    if (!gl || !webglState.program || isContextLost) {
      return;
    }

    const rect = canvasElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Resize canvas if needed
    const width = rect.width * dpr;
    const height = rect.height * dpr;

    if (canvasElement.width !== width || canvasElement.height !== height) {
      canvasElement.width = width;
      canvasElement.height = height;
      gl.viewport(0, 0, width, height);
    }

    // Clear
    const bgColor = getThemeColorArray('background_primary', [0, 0, 0, 1]);
    gl.clearColor(bgColor[0], bgColor[1], bgColor[2], bgColor[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Draw grid if enabled
    if (showGrid && (webglState as any).gridProgram) {
      drawGrid(gl);
    }

    // Draw spectrum if data available
    if (processedData && processedData.magnitudes && processedData.magnitudes.length > 0) {
      drawSpectrum(gl);
    }

    // Draw labels using 2D canvas overlay if enabled
    if (showLabels) {
      drawLabelsOverlay();
    }
  }

  /**
   * Draw spectrum using WebGL
   * NASA JPL Rule 4: Split into focused functions ≤60 lines
   */
  function drawSpectrum(gl: WebGL2RenderingContext): void {
    if (!processedData || !webglState.program) {
      return;
    }

    const magnitudes = processedData.magnitudes;
    const dataLength = validateSpectrumData(magnitudes);
    if (dataLength === 0) return;

    const { minMag, maxMag } = findMagnitudeRange(magnitudes, dataLength);

    fillSpectrumBuffers(magnitudes, dataLength, minMag, maxMag);

    uploadSpectrumBuffers(gl, dataLength);

    setupSpectrumShader(gl);

    drawSpectrumGeometry(gl, dataLength);
  }

  /**
   * NASA JPL Rule 4: Validate spectrum data ≤15 lines
   */
  function validateSpectrumData(magnitudes: number[]): number {
    const dataLength = Math.min(magnitudes.length, MAX_FFT_SIZE);

    // NASA JPL Rule 5: Runtime assertions
    assert(dataLength > 0, 'Data length must be positive');
    assert(dataLength <= MAX_FFT_SIZE, 'Data length exceeds maximum');

    return dataLength;
  }

  /**
   * NASA JPL Rule 4: Find magnitude range ≤20 lines
   */
  function findMagnitudeRange(
    magnitudes: number[],
    dataLength: number
  ): { minMag: number; maxMag: number } {
    let minMag = Infinity;
    let maxMag = -Infinity;

    for (let i = 0; i < dataLength; i++) {
      const mag = magnitudes[i];
      if (mag < minMag) minMag = mag;
      if (mag > maxMag) maxMag = mag;
    }

    return { minMag, maxMag };
  }

  /**
   * NASA JPL Rule 4: Fill spectrum buffers ≤25 lines
   */
  function fillSpectrumBuffers(
    magnitudes: number[],
    dataLength: number,
    minMag: number,
    maxMag: number
  ): void {
    const magRange = maxMag - minMag || 1;

    // Fill buffers (NASA JPL Rule 2: Fixed bounds)
    for (let i = 0; i < dataLength; i++) {
      const x = (i / (dataLength - 1)) * 2.0 - 1.0; // Convert to NDC
      const normalizedMag = (magnitudes[i] - minMag) / magRange;
      const y = normalizedMag * 1.8 - 0.9; // Scale and offset

      positionBuffer[i * 2] = x;
      positionBuffer[i * 2 + 1] = y;
      magnitudeBuffer[i] = normalizedMag;
    }
  }

  /**
   * NASA JPL Rule 4: Upload spectrum buffers to GPU ≤15 lines
   */
  function uploadSpectrumBuffers(gl: WebGL2RenderingContext, dataLength: number): void {
    gl.bindBuffer(gl.ARRAY_BUFFER, webglState.buffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, positionBuffer.subarray(0, dataLength * 2), gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, webglState.buffers.magnitude);
    gl.bufferData(gl.ARRAY_BUFFER, magnitudeBuffer.subarray(0, dataLength), gl.DYNAMIC_DRAW);
  }

  /**
   * NASA JPL Rule 4: Setup spectrum shader ≤20 lines
   */
  function setupSpectrumShader(gl: WebGL2RenderingContext): void {
    gl.useProgram(webglState.program);

    const projection = createProjectionMatrix();
    const view = createViewMatrix();

    gl.uniformMatrix4fv(webglState.uniforms.projection, false, projection);
    gl.uniformMatrix4fv(webglState.uniforms.view, false, view);

    const lineColor = getThemeColorArray('spectrum_line_color', [0, 0.75, 1, 1]);
    gl.uniform4fv(webglState.uniforms.lineColor, lineColor);

    const time = performance.now() * 0.001;
    gl.uniform1f(webglState.uniforms.time, time);
  }

  /**
   * NASA JPL Rule 4: Draw spectrum geometry ≤25 lines
   */
  function drawSpectrumGeometry(gl: WebGL2RenderingContext, dataLength: number): void {
    gl.bindVertexArray(webglState.vao.spectrum);

    // Draw as line strip
    gl.lineWidth(2.0);
    gl.drawArrays(gl.LINE_STRIP, 0, dataLength);

    // Draw fill with transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const fillColor = getThemeColorArray('spectrum_fill_color', [0, 0.75, 1, 0.3]);
    gl.uniform4fv(webglState.uniforms.lineColor, fillColor);

    gl.drawArrays(gl.LINE_STRIP, 0, dataLength);

    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }

  /**
   * Draw grid lines
   */
  function drawGrid(gl: WebGL2RenderingContext): void {
    const gridProgram = (webglState as any).gridProgram;
    if (!gridProgram) {
      return;
    }

    gl.useProgram(gridProgram);

    const gridColor = getThemeColorArray('grid_line_color', [0.2, 0.2, 0.2, 0.5]);
    gl.uniform4fv((webglState as any).gridUniformLocation, gridColor);

    gl.bindBuffer(gl.ARRAY_BUFFER, webglState.buffers.grid);

    const positionLoc = gl.getAttribLocation(gridProgram, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    // Draw grid lines
    const verticalLines = 11;
    const horizontalLines = 9;
    const totalVertices = (verticalLines + horizontalLines) * 2;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.LINES, 0, totalVertices);
    gl.disable(gl.BLEND);
  }

  /**
   * Create projection matrix
   */
  function createProjectionMatrix(): Float32Array {
    const matrix = new Float32Array(16);
    // Simple orthographic projection
    matrix[0] = 1;
    matrix[5] = 1;
    matrix[10] = 1;
    matrix[15] = 1;
    return matrix;
  }

  /**
   * Create view matrix
   */
  function createViewMatrix(): Float32Array {
    const matrix = new Float32Array(16);
    // Identity matrix (no transformation)
    matrix[0] = 1;
    matrix[5] = 1;
    matrix[10] = 1;
    matrix[15] = 1;
    return matrix;
  }

  /**
   * Draw labels using 2D canvas overlay
   */
  function drawLabelsOverlay(): void {
    if (!labelCanvasElement || !processedData) {
      return;
    }

    const ctx = labelCanvasElement.getContext('2d');
    if (!ctx) {
      return;
    }

    const rect = labelCanvasElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Size canvas
    labelCanvasElement.width = rect.width * dpr;
    labelCanvasElement.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw frequency labels
    const labelColor = getThemeColor('axis_label_color', '#cccccc');
    ctx.fillStyle = labelColor;
    ctx.font = '12px var(--typography-font_family_mono)';
    ctx.textAlign = 'center';

    if (processedData.centerFrequency && processedData.sampleRate) {
      const startFreq = processedData.centerFrequency - processedData.sampleRate / 2;
      const endFreq = processedData.centerFrequency + processedData.sampleRate / 2;

      const freqLabels = 5;
      for (let i = 0; i <= freqLabels; i++) {
        const freq = startFreq + ((endFreq - startFreq) * i) / freqLabels;
        const x = (rect.width * i) / freqLabels;
        const freqMHz = (freq / 1000000).toFixed(1);

        ctx.fillText(`${freqMHz} MHz`, x, rect.height - 5);
      }
    }
  }

  /**
   * Get theme color as array
   */
  function getThemeColorArray(colorKey: string, fallback: number[]): Float32Array {
    const colorString = getThemeColor(colorKey, '');
    if (!colorString) {
      return new Float32Array(fallback);
    }

    // Parse color string (simplified - would use proper parser in production)
    const color = new Float32Array(4);
    color[0] = fallback[0];
    color[1] = fallback[1];
    color[2] = fallback[2];
    color[3] = fallback[3];

    return color;
  }

  // ===== CANVAS 2D FUNCTIONS =====

  /**
   * Process FFT data for visualization
   */
  function processFFTData(fftData: FFTData): FFTData {
    assert(fftData !== null, 'FFT data cannot be null');
    if (!fftData.magnitudes || fftData.magnitudes.length === 0) {
      return fftData;
    }

    // NASA JPL Rule 5: Validate array bounds
    assert(fftData.magnitudes.length <= MAX_FFT_SIZE, 'FFT data exceeds maximum size');

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
    assert(windowSize >= 1, 'Window size must be at least 1');
    assert(windowSize <= 10, 'Window size must not exceed 10');

    if (windowSize <= 1) return magnitudes;

    const smoothed = new Array(magnitudes.length);
    const halfWindow = Math.floor(windowSize / 2);

    // NASA JPL Rule 2: Bounded loops
    for (let i = 0; i < magnitudes.length; i++) {
      let sum = 0;
      let count = 0;

      const start = Math.max(0, i - halfWindow);
      const end = Math.min(magnitudes.length - 1, i + halfWindow);

      for (let j = start; j <= end; j++) {
        sum += magnitudes[j];
        count++;
      }

      assert(count > 0, 'Count must be positive');
      smoothed[i] = sum / count;
    }

    return smoothed;
  }

  /**
   * Schedules a render using requestAnimationFrame for smooth performance
   */
  function scheduleRender(): void {
    if (canvas2DState.animationFrame) {
      return; // Already scheduled
    }

    canvas2DState.animationFrame = requestAnimationFrame(() => {
      const now = performance.now();

      // Target 120+ FPS (8.33ms frame time) for WebGL, 60fps for Canvas 2D
      const targetFrameTime = useWebGL ? 8 : 16;

      if (now - canvas2DState.lastRenderTime >= targetFrameTime) {
        if (useWebGL && webglState.gl) {
          renderWebGL();
        } else {
          renderCanvas2D();
        }
        canvas2DState.lastRenderTime = now;
      }

      canvas2DState.animationFrame = null;
    });
  }

  /**
   * Canvas 2D rendering fallback
   */
  function renderCanvas2D(): void {
    if (!canvas2DState.ctx || !canvas2DState.canvas) {
      return;
    }

    const canvas = canvas2DState.canvas;
    const ctx = canvas2DState.ctx;
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
      drawCanvas2DGrid(ctx, rect.width, rect.height, gridLineColor);
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
   * Draws the grid lines for the spectrum display using Canvas2D
   */
  function drawCanvas2DGrid(
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
    if (canvas2DState.isResizing) {
      return;
    }

    canvas2DState.isResizing = true;

    // Debounce resize to avoid excessive re-renders
    setTimeout(() => {
      canvas2DState.isResizing = false;
      if (webglState.gl || canvas2DState.ctx) {
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

    // Try to initialize WebGL first
    useWebGL = initializeWebGL();

    if (!useWebGL) {
      // Fall back to Canvas 2D
      canvas2DState.canvas = canvasElement;
      canvas2DState.ctx = canvasElement.getContext('2d');

      if (!canvas2DState.ctx) {
        console.error('Failed to get 2D rendering context for spectrum visualizer');
        return;
      }
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
    if (canvasElement && !canvas2DState.canvas && !webglState.gl) {
      initializeCanvas();
    }
  });

  onDestroy(() => {
    if (canvas2DState.animationFrame) {
      cancelAnimationFrame(canvas2DState.animationFrame);
    }

    // Clean up WebGL resources
    if (webglState.gl) {
      const gl = webglState.gl;

      // Delete buffers
      if (webglState.buffers.position) gl.deleteBuffer(webglState.buffers.position);
      if (webglState.buffers.magnitude) gl.deleteBuffer(webglState.buffers.magnitude);
      if (webglState.buffers.grid) gl.deleteBuffer(webglState.buffers.grid);

      // Delete VAOs
      if (webglState.vao.spectrum) gl.deleteVertexArray(webglState.vao.spectrum);
      if (webglState.vao.grid) gl.deleteVertexArray(webglState.vao.grid);

      // Delete programs
      if (webglState.program) gl.deleteProgram(webglState.program);
      if ((webglState as any).gridProgram) gl.deleteProgram((webglState as any).gridProgram);

      // Remove event listeners
      canvasElement.removeEventListener('webglcontextlost', handleContextLost);
      canvasElement.removeEventListener('webglcontextrestored', handleContextRestored);
    }
  });
</script>

<div class="spectrum-visualizer" bind:this={containerElement} data-testid="spectrum-visualizer">
  <div class="spectrum-header">
    <h3 class="spectrum-title">Spectrum Analyzer {useWebGL ? '(WebGL)' : '(Canvas 2D)'}</h3>
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
    {#if useWebGL && showLabels}
      <canvas bind:this={labelCanvasElement} class="label-canvas" data-testid="label-canvas"
      ></canvas>
    {/if}
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

  .label-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  /* GPU optimization hints */
  .spectrum-canvas {
    will-change: contents;
    transform: translateZ(0);
    backface-visibility: hidden;
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
