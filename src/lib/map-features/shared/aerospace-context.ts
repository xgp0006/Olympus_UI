/**
 * Aerospace-Grade Canvas Context Operations
 * NASA JPL Rule 7 Compliance: All return values must be checked
 * Provides safe wrappers with comprehensive error handling
 */

import { 
  renderSuccess, 
  renderError 
} from './aerospace-pools';
import type { 
  RenderResult, 
  RenderError
} from './aerospace-pools';
import { RenderErrorType } from './aerospace-pools';

/**
 * Safe canvas context operations with aerospace-grade error handling
 */
export class AerospaceCanvasContext {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private lastKnownState: CanvasRenderingContext2D['globalCompositeOperation'] = 'source-over';
  
  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
  }
  
  /**
   * Safe canvas clearing with error checking (NASA JPL Rule 7)
   */
  safeClearRect(x: number, y: number, width: number, height: number): RenderResult<void> {
    try {
      // Validate context state
      if (this.ctx.isContextLost && this.ctx.isContextLost()) {
        return renderError(RenderErrorType.CONTEXT_LOST, 'Canvas context is lost');
      }
      
      // Validate parameters
      if (!Number.isFinite(x) || !Number.isFinite(y) || 
          !Number.isFinite(width) || !Number.isFinite(height)) {
        return renderError(
          RenderErrorType.INVALID_PARAMETERS, 
          'Invalid clearRect parameters',
          { x, y, width, height }
        );
      }
      
      // Perform operation with state verification
      const beforeComposite = this.ctx.globalCompositeOperation;
      this.ctx.clearRect(x, y, width, height);
      
      // Verify context state hasn't been corrupted
      if (this.ctx.globalCompositeOperation !== beforeComposite) {
        this.ctx.globalCompositeOperation = beforeComposite;
      }
      
      return renderSuccess(undefined);
    } catch (error) {
      return renderError(
        RenderErrorType.CANVAS_ERROR, 
        `clearRect failed: ${error}`,
        { x, y, width, height, error }
      );
    }
  }
  
  /**
   * Safe image data retrieval with bounds checking (NASA JPL Rule 7)
   */
  safeGetImageData(x: number, y: number, width: number, height: number): RenderResult<ImageData> {
    try {
      // Validate context
      if (this.ctx.isContextLost && this.ctx.isContextLost()) {
        return renderError(RenderErrorType.CONTEXT_LOST, 'Canvas context is lost');
      }
      
      // Validate and clamp parameters to canvas bounds
      const clampedX = Math.max(0, Math.min(x, this.canvas.width - 1));
      const clampedY = Math.max(0, Math.min(y, this.canvas.height - 1));
      const maxWidth = this.canvas.width - clampedX;
      const maxHeight = this.canvas.height - clampedY;
      const clampedWidth = Math.max(1, Math.min(width, maxWidth));
      const clampedHeight = Math.max(1, Math.min(height, maxHeight));
      
      if (clampedWidth <= 0 || clampedHeight <= 0) {
        return renderError(
          RenderErrorType.INVALID_PARAMETERS,
          'Invalid image data dimensions',
          { x, y, width, height, clampedWidth, clampedHeight }
        );
      }
      
      const imageData = this.ctx.getImageData(clampedX, clampedY, clampedWidth, clampedHeight);
      
      // Verify returned data
      if (!imageData || !imageData.data || imageData.data.length === 0) {
        return renderError(
          RenderErrorType.CANVAS_ERROR,
          'getImageData returned invalid data'
        );
      }
      
      return renderSuccess(imageData);
    } catch (error) {
      return renderError(
        RenderErrorType.CANVAS_ERROR,
        `getImageData failed: ${error}`,
        { x, y, width, height, error }
      );
    }
  }
  
  /**
   * Safe text measurement with validation (NASA JPL Rule 7)
   */
  safeMeasureText(text: string, font?: string): RenderResult<TextMetrics> {
    try {
      // Validate context
      if (this.ctx.isContextLost && this.ctx.isContextLost()) {
        return renderError(RenderErrorType.CONTEXT_LOST, 'Canvas context is lost');
      }
      
      // Validate parameters
      if (typeof text !== 'string') {
        return renderError(RenderErrorType.INVALID_PARAMETERS, 'Text must be a string');
      }
      
      if (text.length > 1000) { // Reasonable limit
        return renderError(
          RenderErrorType.INVALID_PARAMETERS, 
          'Text too long for measurement',
          { textLength: text.length }
        );
      }
      
      // Set font if provided
      if (font) {
        const previousFont = this.ctx.font;
        try {
          this.ctx.font = font;
        } catch (fontError) {
          return renderError(
            RenderErrorType.INVALID_PARAMETERS,
            `Invalid font: ${font}`,
            { font, error: fontError }
          );
        }
      }
      
      const metrics = this.ctx.measureText(text);
      
      // Validate returned metrics
      if (!metrics || typeof metrics.width !== 'number' || !Number.isFinite(metrics.width)) {
        return renderError(RenderErrorType.CANVAS_ERROR, 'measureText returned invalid metrics');
      }
      
      return renderSuccess(metrics);
    } catch (error) {
      return renderError(
        RenderErrorType.CANVAS_ERROR,
        `measureText failed: ${error}`,
        { text, font, error }
      );
    }
  }
  
  /**
   * Safe path stroke with state management (NASA JPL Rule 7)
   */
  safeStroke(path?: Path2D): RenderResult<void> {
    try {
      // Validate context
      if (this.ctx.isContextLost && this.ctx.isContextLost()) {
        return renderError(RenderErrorType.CONTEXT_LOST, 'Canvas context is lost');
      }
      
      // Store current state for recovery
      const currentState = {
        strokeStyle: this.ctx.strokeStyle,
        lineWidth: this.ctx.lineWidth,
        globalAlpha: this.ctx.globalAlpha
      };
      
      // Perform stroke operation
      if (path) {
        this.ctx.stroke(path);
      } else {
        this.ctx.stroke();
      }
      
      // Verify state integrity
      if (this.ctx.strokeStyle !== currentState.strokeStyle ||
          this.ctx.lineWidth !== currentState.lineWidth ||
          this.ctx.globalAlpha !== currentState.globalAlpha) {
        // State corruption detected - restore
        this.ctx.strokeStyle = currentState.strokeStyle;
        this.ctx.lineWidth = currentState.lineWidth;
        this.ctx.globalAlpha = currentState.globalAlpha;
      }
      
      return renderSuccess(undefined);
    } catch (error) {
      return renderError(
        RenderErrorType.CANVAS_ERROR,
        `stroke failed: ${error}`,
        { hasPath: !!path, error }
      );
    }
  }
  
  /**
   * Safe fill operations with state management (NASA JPL Rule 7)
   */
  safeFillRect(x: number, y: number, width: number, height: number): RenderResult<void> {
    try {
      // Validate context
      if (this.ctx.isContextLost && this.ctx.isContextLost()) {
        return renderError(RenderErrorType.CONTEXT_LOST, 'Canvas context is lost');
      }
      
      // Validate parameters
      if (!Number.isFinite(x) || !Number.isFinite(y) || 
          !Number.isFinite(width) || !Number.isFinite(height)) {
        return renderError(
          RenderErrorType.INVALID_PARAMETERS,
          'Invalid fillRect parameters',
          { x, y, width, height }
        );
      }
      
      // Store state
      const currentFillStyle = this.ctx.fillStyle;
      
      this.ctx.fillRect(x, y, width, height);
      
      // Verify state
      if (this.ctx.fillStyle !== currentFillStyle) {
        this.ctx.fillStyle = currentFillStyle;
      }
      
      return renderSuccess(undefined);
    } catch (error) {
      return renderError(
        RenderErrorType.CANVAS_ERROR,
        `fillRect failed: ${error}`,
        { x, y, width, height, error }
      );
    }
  }
  
  /**
   * Safe fill text with comprehensive validation (NASA JPL Rule 7)
   */
  safeFillText(text: string, x: number, y: number, maxWidth?: number): RenderResult<void> {
    try {
      // Validate context
      if (this.ctx.isContextLost && this.ctx.isContextLost()) {
        return renderError(RenderErrorType.CONTEXT_LOST, 'Canvas context is lost');
      }
      
      // Validate parameters
      if (typeof text !== 'string' || text.length === 0) {
        return renderError(RenderErrorType.INVALID_PARAMETERS, 'Invalid text parameter');
      }
      
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return renderError(
          RenderErrorType.INVALID_PARAMETERS,
          'Invalid position parameters',
          { x, y }
        );
      }
      
      if (maxWidth !== undefined && (!Number.isFinite(maxWidth) || maxWidth <= 0)) {
        return renderError(
          RenderErrorType.INVALID_PARAMETERS,
          'Invalid maxWidth parameter',
          { maxWidth }
        );
      }
      
      // Store state
      const currentFillStyle = this.ctx.fillStyle;
      
      // Perform operation
      if (maxWidth !== undefined) {
        this.ctx.fillText(text, x, y, maxWidth);
      } else {
        this.ctx.fillText(text, x, y);
      }
      
      // Verify state
      if (this.ctx.fillStyle !== currentFillStyle) {
        this.ctx.fillStyle = currentFillStyle;
      }
      
      return renderSuccess(undefined);
    } catch (error) {
      return renderError(
        RenderErrorType.CANVAS_ERROR,
        `fillText failed: ${error}`,
        { text, x, y, maxWidth, error }
      );
    }
  }
  
  /**
   * Check if context is in valid state
   */
  isContextValid(): boolean {
    try {
      return this.ctx && (!this.ctx.isContextLost || !this.ctx.isContextLost());
    } catch {
      return false;
    }
  }
  
  /**
   * Attempt context recovery
   */
  attemptContextRecovery(): RenderResult<void> {
    try {
      // Try to get a new context
      const newCtx = this.canvas.getContext('2d', {
        alpha: true,
        desynchronized: true,
        willReadFrequently: false
      });
      
      if (!newCtx) {
        return renderError(RenderErrorType.CONTEXT_LOST, 'Cannot recover canvas context');
      }
      
      this.ctx = newCtx;
      return renderSuccess(undefined);
    } catch (error) {
      return renderError(
        RenderErrorType.CONTEXT_LOST,
        `Context recovery failed: ${error}`,
        { error }
      );
    }
  }
}

/**
 * Factory function for creating aerospace canvas context
 */
export function createAerospaceContext(canvas: HTMLCanvasElement): RenderResult<AerospaceCanvasContext> {
  try {
    const ctx = canvas.getContext('2d', {
      alpha: true,
      desynchronized: true,
      willReadFrequently: false
    });
    
    if (!ctx) {
      return renderError(RenderErrorType.CONTEXT_LOST, 'Failed to get 2D context');
    }
    
    return renderSuccess(new AerospaceCanvasContext(canvas, ctx));
  } catch (error) {
    return renderError(
      RenderErrorType.CONTEXT_LOST,
      `Context creation failed: ${error}`,
      { error }
    );
  }
}