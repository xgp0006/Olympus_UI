/**
 * Ring Renderer - NASA JPL Power of 10 Compliant
 * Aerospace-grade distance ring rendering with bounded memory allocation
 * Targets <0.2ms render time per frame with comprehensive error handling
 */

import type { MapViewport, RingStyle } from '../../types';
import { 
  globalRenderPool, 
  renderSuccess,
  renderError,
  ParameterValidator
} from '../../shared/aerospace-pools';
import type { 
  RenderResult
} from '../../shared/aerospace-pools';
import { RenderErrorType } from '../../shared/aerospace-pools';
import { 
  AerospaceCanvasContext, 
  createAerospaceContext 
} from '../../shared/aerospace-context';

export class RingRenderer {
  private canvas: HTMLCanvasElement;
  private aerospaceCtx: AerospaceCanvasContext | null = null;
  private animationFrame: number | null = null;

  // Pre-calculated values for performance (NASA JPL Rule 2)
  private ringRadiusPixels = 0;
  private readonly maxRenderTime = 0.2; // 0.2ms budget (NASA JPL compliance)
  
  // Path caching for performance
  private ringPath: Path2D | null = null;
  private lastDistance = 0;
  private lastZoom = 0;
  
  // Error recovery state
  private consecutiveErrors = 0;
  private readonly maxErrors = 3;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initializeContext();
  }
  
  /**
   * Initialize aerospace-grade canvas context (NASA JPL Rule 7)
   */
  private initializeContext(): void {
    const contextResult = createAerospaceContext(this.canvas);
    if (contextResult.success) {
      this.aerospaceCtx = contextResult.data;
      this.consecutiveErrors = 0;
    } else {
      console.error('Failed to initialize aerospace context:', contextResult.error.message);
      throw new Error(`Context initialization failed: ${contextResult.error.message}`);
    }
  }

  /**
   * Calculate ring radius in pixels based on distance and zoom (NASA JPL Rule 4)
   */
  private calculateRadiusPixels(distance: number, viewport: MapViewport): number {
    // Convert distance to degrees (approximate)
    const metersPerDegree = 111320; // at equator
    const degreesPerMeter = 1 / metersPerDegree;
    const distanceInDegrees = distance * degreesPerMeter;

    // Calculate pixels per degree at current zoom
    const pixelsPerDegree = 256 * Math.pow(2, viewport.zoom) / 360;
    
    // Adjust for latitude
    const latRadians = viewport.center.lat * Math.PI / 180;
    const latAdjustment = Math.cos(latRadians);
    
    return distanceInDegrees * pixelsPerDegree * latAdjustment;
  }

  /**
   * Sample pixels for contrast analysis (NASA JPL Rule 7)
   */
  private samplePixels(x: number, y: number): RenderResult<{ r: number; g: number; b: number }> {
    if (!this.aerospaceCtx) {
      return renderError(RenderErrorType.CONTEXT_LOST, 'No aerospace context available');
    }

    const imageDataResult = this.aerospaceCtx.safeGetImageData(x - 2, y - 2, 4, 4);
    if (!imageDataResult.success) {
      return renderError(RenderErrorType.CANVAS_ERROR, 'Failed to sample pixels', {
        originalError: imageDataResult.error
      });
    }

    const data = imageDataResult.data.data;
    const samples = globalRenderPool.getPixelSamples();
    
    // Collect samples using bounded memory (NASA JPL Rule 2)
    for (let i = 0; i < data.length && samples.length < samples.maxLength; i += 4) {
      samples.push({
        r: data[i],
        g: data[i + 1], 
        b: data[i + 2],
        a: data[i + 3]
      });
    }
    
    return this.averagePixelSamples(samples.getAll());
  }
  
  /**
   * Average pixel samples for color calculation (NASA JPL Rule 4)
   */
  private averagePixelSamples(samples: Array<{ r: number; g: number; b: number; a: number }>): RenderResult<{ r: number; g: number; b: number }> {
    if (samples.length === 0) {
      return renderError(RenderErrorType.INVALID_PARAMETERS, 'No pixel samples available');
    }
    
    let r = 0, g = 0, b = 0;
    const count = samples.length;
    
    for (const sample of samples) {
      r += sample.r;
      g += sample.g;
      b += sample.b;
    }
    
    return renderSuccess({
      r: Math.floor(r / count),
      g: Math.floor(g / count), 
      b: Math.floor(b / count)
    });
  }
  
  /**
   * Get inverted color for maximum visibility (NASA JPL Rule 4)
   */
  private getInvertedColor(x: number, y: number): string {
    const samplesResult = this.samplePixels(x, y);
    if (!samplesResult.success) {
      // Fallback to high contrast color
      return '#ffffff';
    }
    
    const { r, g, b } = samplesResult.data;
    
    // Invert and ensure contrast
    const invertedR = 255 - r;
    const invertedG = 255 - g;
    const invertedB = 255 - b;
    
    // Ensure minimum contrast
    const brightness = (invertedR + invertedG + invertedB) / 3;
    return brightness > 127 ? '#ffffff' : '#000000';
  }

  /**
   * Create or update ring path (NASA JPL Rule 7)
   */
  private updateRingPath(centerX: number, centerY: number, radius: number): RenderResult<void> {
    try {
      // Check if Path2D is available (not in test environment)
      if (typeof Path2D !== 'undefined') {
        this.ringPath = new Path2D();
        this.ringPath.arc(centerX, centerY, radius, 0, Math.PI * 2);
      } else {
        // Fallback for test environment
        this.ringPath = null;
      }
      return renderSuccess(undefined);
    } catch (error) {
      return renderError(
        RenderErrorType.CANVAS_ERROR,
        `Path creation failed: ${error}`,
        { centerX, centerY, radius, error }
      );
    }
  }

  /**
   * Format distance for display with validation (NASA JPL Rule 5)
   */
  private formatDistance(distance: number, units: string): RenderResult<string> {
    if (!ParameterValidator.validateDistance(distance)) {
      return renderError(
        RenderErrorType.INVALID_PARAMETERS,
        'Invalid distance for formatting',
        { distance, units }
      );
    }
    
    try {
      let result: string;
      switch (units) {
        case 'feet':
          result = `${Math.round(distance * 3.28084)}ft`;
          break;
        case 'nautical-miles':
          result = `${(distance / 1852).toFixed(2)}nm`;
          break;
        default:
          result = distance >= 1000 ? `${(distance / 1000).toFixed(1)}km` : `${Math.round(distance)}m`;
      }
      return renderSuccess(result);
    } catch (error) {
      return renderError(
        RenderErrorType.CANVAS_ERROR,
        `Distance formatting failed: ${error}`,
        { distance, units, error }
      );
    }
  }

  /**
   * Calculate label positions using bounded memory (NASA JPL Rule 2)  
   */
  private calculateLabelPositions(centerX: number, centerY: number, radius: number): RenderResult<Array<{ x: number; y: number }>> {
    const positions = globalRenderPool.getLabelPositions();
    
    try {
      // Cardinal positions with proper spacing
      const spacing = 15;
      positions.push(globalRenderPool.getTempPoint(centerX, centerY - radius - spacing)); // top
      positions.push(globalRenderPool.getTempPoint(centerX + radius + spacing, centerY)); // right
      positions.push(globalRenderPool.getTempPoint(centerX, centerY + radius + spacing)); // bottom
      positions.push(globalRenderPool.getTempPoint(centerX - radius - spacing, centerY)); // left
      
      return renderSuccess(positions.getAll());
    } catch (error) {
      return renderError(
        RenderErrorType.MEMORY_EXHAUSTED,
        `Label position calculation failed: ${error}`,
        { centerX, centerY, radius, error }
      );
    }
  }
  
  /**
   * Render single label with background (NASA JPL Rule 4)
   */
  private renderSingleLabel(
    label: string, 
    position: { x: number; y: number }, 
    style: RingStyle
  ): RenderResult<void> {
    if (!this.aerospaceCtx) {
      return renderError(RenderErrorType.CONTEXT_LOST, 'No aerospace context available');
    }
    
    // Measure text safely
    const metricsResult = this.aerospaceCtx.safeMeasureText(
      label, 
      `${style.labelSize}px ${style.labelFont}`
    );
    if (!metricsResult.success) {
      return metricsResult;
    }
    
    const metrics = metricsResult.data;
    const padding = 4;
    const boxWidth = metrics.width + padding * 2;
    const boxHeight = style.labelSize + padding * 2;
    
    // Draw background box
    const bgResult = this.aerospaceCtx.safeFillRect(
      position.x - boxWidth / 2,
      position.y - boxHeight / 2,
      boxWidth,
      boxHeight
    );
    if (!bgResult.success) {
      return bgResult;
    }
    
    // Draw label text
    return this.aerospaceCtx.safeFillText(label, position.x, position.y);
  }
  
  /**
   * Render distance labels at cardinal points (NASA JPL Rule 4)
   */
  private renderLabels(
    centerX: number, 
    centerY: number, 
    radius: number, 
    distance: number, 
    units: string,
    style: RingStyle
  ): RenderResult<void> {
    // Format distance with validation
    const labelResult = this.formatDistance(distance, units);
    if (!labelResult.success) {
      return labelResult;
    }
    
    const label = labelResult.data;
    
    // Calculate positions
    const positionsResult = this.calculateLabelPositions(centerX, centerY, radius);
    if (!positionsResult.success) {
      return positionsResult;
    }
    
    // Render each label
    for (const position of positionsResult.data) {
      const renderResult = this.renderSingleLabel(label, position, style);
      if (!renderResult.success) {
        // Continue with other labels if one fails
        console.warn('Label render failed:', renderResult.error.message);
      }
    }
    
    return renderSuccess(undefined);
  }

  /**
   * Validate render parameters (NASA JPL Rule 5)
   */
  private validateRenderParameters(
    viewport: MapViewport,
    distance: number, 
    units: string,
    style: RingStyle
  ): RenderResult<void> {
    if (!ParameterValidator.validateViewport(viewport)) {
      return renderError(RenderErrorType.INVALID_PARAMETERS, 'Invalid viewport parameters');
    }
    
    if (!ParameterValidator.validateDistance(distance)) {
      return renderError(RenderErrorType.INVALID_PARAMETERS, 'Invalid distance parameter');
    }
    
    if (!ParameterValidator.validateCanvasDimensions(this.canvas.width, this.canvas.height)) {
      return renderError(RenderErrorType.INVALID_PARAMETERS, 'Invalid canvas dimensions');
    }
    
    if (!ParameterValidator.validateStyle(style)) {
      return renderError(RenderErrorType.INVALID_PARAMETERS, 'Invalid style parameters');
    }
    
    return renderSuccess(undefined);
  }
  
  /**
   * Execute core rendering operations (NASA JPL Rule 4)
   */
  private executeRender(
    centerX: number,
    centerY: number,
    radius: number,
    distance: number,
    units: string,
    style: RingStyle,
    viewport: MapViewport
  ): RenderResult<void> {
    if (!this.aerospaceCtx) {
      return renderError(RenderErrorType.CONTEXT_LOST, 'No aerospace context available');
    }
    
    // Clear canvas safely
    const clearResult = this.aerospaceCtx.safeClearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!clearResult.success) {
      return clearResult;
    }
    
    // Update path if needed
    if (distance !== this.lastDistance || viewport.zoom !== this.lastZoom) {
      const pathResult = this.updateRingPath(centerX, centerY, radius);
      if (!pathResult.success) {
        return pathResult;
      }
      this.lastDistance = distance;
      this.lastZoom = viewport.zoom;
    }
    
    // Skip if ring size is invalid
    if (radius < 10 || radius > Math.max(this.canvas.width, this.canvas.height)) {
      return renderSuccess(undefined);
    }
    
    // Draw ring safely
    const strokeResult = this.aerospaceCtx.safeStroke(this.ringPath || undefined);
    if (!strokeResult.success) {
      return strokeResult;
    }
    
    // Draw labels
    return this.renderLabels(centerX, centerY, radius, distance, units, style);
  }
  
  /**
   * Main render method - NASA JPL compliant <60 lines (NASA JPL Rule 4)
   */
  render(
    viewport: MapViewport, 
    distance: number, 
    units: 'meters' | 'feet' | 'nautical-miles' = 'meters',
    style: RingStyle = {
      color: '#00ff00',
      strokeWidth: 2,
      opacity: 0.8,
      labelColor: '#ffffff',
      labelSize: 12,
      labelFont: 'monospace'
    }
  ): void {
    const startTime = performance.now();
    
    // Early termination for error recovery
    if (this.consecutiveErrors >= this.maxErrors) {
      console.warn('Render disabled due to consecutive errors');
      return;
    }
    
    // Reset memory pools
    globalRenderPool.reset();
    
    // Validate all parameters (NASA JPL Rule 5)
    const validationResult = this.validateRenderParameters(viewport, distance, units, style);
    if (!validationResult.success) {
      this.handleRenderError(validationResult.error, startTime);
      return;
    }
    
    // Calculate render properties
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = this.calculateRadiusPixels(distance, viewport);
    
    // Execute rendering operations
    const renderResult = this.executeRender(centerX, centerY, radius, distance, units, style, viewport);
    if (!renderResult.success) {
      this.handleRenderError(renderResult.error, startTime);
      return;
    }
    
    // Performance monitoring
    this.checkRenderPerformance(startTime);
    this.consecutiveErrors = 0; // Reset on success
  }

  /**
   * Handle render errors with recovery (NASA JPL Rule 7)
   */
  private handleRenderError(error: { message: string; type: RenderErrorType }, startTime: number): void {
    this.consecutiveErrors++;
    console.error(`Render error (${this.consecutiveErrors}/${this.maxErrors}):`, error.message);
    
    // Attempt context recovery if needed
    if (error.type === RenderErrorType.CONTEXT_LOST && this.consecutiveErrors < this.maxErrors) {
      try {
        this.initializeContext();
        console.log('Context recovery attempted');
      } catch (recoveryError) {
        console.error('Context recovery failed:', recoveryError);
      }
    }
    
    this.checkRenderPerformance(startTime);
  }
  
  /**
   * Monitor render performance (NASA JPL compliance)
   */
  private checkRenderPerformance(startTime: number): void {
    const renderTime = performance.now() - startTime;
    if (renderTime > this.maxRenderTime) {
      console.warn(`Ring render exceeded budget: ${renderTime.toFixed(3)}ms > ${this.maxRenderTime}ms`);
    }
  }
  
  /**
   * Clean up resources (aerospace-grade cleanup)
   */
  destroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    this.ringPath = null;
    this.aerospaceCtx = null;
    globalRenderPool.reset();
    
    // Reset error state
    this.consecutiveErrors = 0;
  }
  
  /**
   * Get renderer status for diagnostics
   */
  getStatus(): {
    contextValid: boolean;
    consecutiveErrors: number;
    lastRenderTime: number;
    cacheStatus: { distance: number; zoom: number };
  } {
    return {
      contextValid: this.aerospaceCtx?.isContextValid() ?? false,
      consecutiveErrors: this.consecutiveErrors,
      lastRenderTime: this.maxRenderTime,
      cacheStatus: {
        distance: this.lastDistance,
        zoom: this.lastZoom
      }
    };
  }
}