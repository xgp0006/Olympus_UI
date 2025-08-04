/**
 * Aerospace-Grade Memory Pools
 * NASA JPL Rule 2 Compliance: Bounded memory allocation system
 * All allocations are pre-determined and bounded to prevent memory exhaustion
 */

import { BoundedArray } from '../utils/bounded-array';

/**
 * Memory pool for rendering operations
 * Prevents dynamic allocation during critical rendering phases
 */
export class RenderMemoryPool {
  // Pre-allocated arrays for common operations (NASA JPL Rule 2)
  private readonly labelPositions: BoundedArray<{ x: number; y: number }>;
  private readonly pixelSamples: BoundedArray<{ r: number; g: number; b: number; a: number }>;
  private readonly pathSegments: BoundedArray<{ x: number; y: number }>;

  // Reusable objects to prevent GC pressure
  private readonly tempPoint = { x: 0, y: 0 };
  private readonly tempColor = { r: 0, g: 0, b: 0, a: 255 };
  private readonly tempMetrics = { width: 0, height: 0 };

  constructor() {
    // Bounded allocations with aerospace-grade limits
    this.labelPositions = new BoundedArray(8); // Max 8 label positions per ring
    this.pixelSamples = new BoundedArray(16); // Max 16 pixel samples for color detection
    this.pathSegments = new BoundedArray(360); // Max 360 path segments for smooth circles
  }

  /**
   * Get reusable point object (NASA JPL Rule 2)
   * Prevents allocation during rendering
   */
  getTempPoint(x: number, y: number): { x: number; y: number } {
    this.tempPoint.x = x;
    this.tempPoint.y = y;
    return this.tempPoint;
  }

  /**
   * Get reusable color object (NASA JPL Rule 2)
   */
  getTempColor(
    r: number,
    g: number,
    b: number,
    a = 255
  ): { r: number; g: number; b: number; a: number } {
    this.tempColor.r = r;
    this.tempColor.g = g;
    this.tempColor.b = b;
    this.tempColor.a = a;
    return this.tempColor;
  }

  /**
   * Get reusable metrics object (NASA JPL Rule 2)
   */
  getTempMetrics(width: number, height: number): { width: number; height: number } {
    this.tempMetrics.width = width;
    this.tempMetrics.height = height;
    return this.tempMetrics;
  }

  /**
   * Get bounded label positions array
   */
  getLabelPositions(): BoundedArray<{ x: number; y: number }> {
    this.labelPositions.clear();
    return this.labelPositions;
  }

  /**
   * Get bounded pixel samples array
   */
  getPixelSamples(): BoundedArray<{ r: number; g: number; b: number; a: number }> {
    this.pixelSamples.clear();
    return this.pixelSamples;
  }

  /**
   * Get bounded path segments array
   */
  getPathSegments(): BoundedArray<{ x: number; y: number }> {
    this.pathSegments.clear();
    return this.pathSegments;
  }

  /**
   * Reset all pools for next frame
   */
  reset(): void {
    this.labelPositions.clear();
    this.pixelSamples.clear();
    this.pathSegments.clear();
  }
}

/**
 * Error types for aerospace-grade error handling
 */
export enum RenderErrorType {
  CONTEXT_LOST = 'CONTEXT_LOST',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',
  MEMORY_EXHAUSTED = 'MEMORY_EXHAUSTED',
  CANVAS_ERROR = 'CANVAS_ERROR'
}

export class RenderError extends Error {
  constructor(
    public readonly type: RenderErrorType,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(`[${type}] ${message}`);
    this.name = 'RenderError';
  }
}

/**
 * Result type for aerospace-grade error handling (NASA JPL Rule 7)
 */
export type RenderResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: RenderError;
    };

/**
 * Global memory pool instance
 */
export const globalRenderPool = new RenderMemoryPool();

/**
 * Helper function for creating successful results
 */
export function renderSuccess<T>(data: T): RenderResult<T> {
  return { success: true, data };
}

/**
 * Helper function for creating error results
 */
export function renderError<T>(
  type: RenderErrorType,
  message: string,
  context?: Record<string, unknown>
): RenderResult<T> {
  return {
    success: false,
    error: new RenderError(type, message, context)
  };
}

/**
 * Parameter validation utilities (NASA JPL Rule 5)
 */
export class ParameterValidator {
  /**
   * Validate viewport parameters
   */
  static validateViewport(viewport: unknown): viewport is {
    center: { lng: number; lat: number };
    zoom: number;
    bearing: number;
    pitch: number;
  } {
    if (!viewport || typeof viewport !== 'object') return false;

    const vp = viewport as any;

    // Check center coordinates
    if (!vp.center || typeof vp.center !== 'object') return false;
    if (typeof vp.center.lng !== 'number' || typeof vp.center.lat !== 'number') return false;
    if (vp.center.lng < -180 || vp.center.lng > 180) return false;
    if (vp.center.lat < -90 || vp.center.lat > 90) return false;

    // Check zoom level
    if (typeof vp.zoom !== 'number' || vp.zoom < 0 || vp.zoom > 24) return false;

    // Check bearing and pitch
    if (typeof vp.bearing !== 'number' || vp.bearing < 0 || vp.bearing >= 360) return false;
    if (typeof vp.pitch !== 'number' || vp.pitch < 0 || vp.pitch > 60) return false;

    return true;
  }

  /**
   * Validate distance parameter
   */
  static validateDistance(distance: unknown): distance is number {
    return (
      typeof distance === 'number' &&
      distance > 0 &&
      distance <= 100000 && // Max 100km
      Number.isFinite(distance)
    );
  }

  /**
   * Validate canvas dimensions
   */
  static validateCanvasDimensions(width: unknown, height: unknown): boolean {
    return (
      typeof width === 'number' &&
      typeof height === 'number' &&
      width > 0 &&
      height > 0 &&
      width <= 8192 &&
      height <= 8192 && // Max texture size
      Number.isInteger(width) &&
      Number.isInteger(height)
    );
  }

  /**
   * Validate style parameters
   */
  static validateStyle(style: unknown): boolean {
    if (!style || typeof style !== 'object') return false;

    const s = style as any;

    // Validate required properties
    if (typeof s.color !== 'string') return false;
    if (typeof s.strokeWidth !== 'number' || s.strokeWidth <= 0 || s.strokeWidth > 20) return false;
    if (typeof s.opacity !== 'number' || s.opacity < 0 || s.opacity > 1) return false;
    if (typeof s.labelColor !== 'string') return false;
    if (typeof s.labelSize !== 'number' || s.labelSize <= 0 || s.labelSize > 48) return false;
    if (typeof s.labelFont !== 'string') return false;

    return true;
  }
}
