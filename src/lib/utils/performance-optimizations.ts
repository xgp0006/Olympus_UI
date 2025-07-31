/**
 * Performance Optimization Utilities
 * Aerospace-grade performance tools for 144fps rendering
 * NASA JPL compliant with bounded execution and memory management
 */

import { browser } from '$app/environment';
import { writable, derived, type Writable } from 'svelte/store';

// Performance constants for aerospace applications
export const PERFORMANCE_CONSTANTS = {
  TARGET_FPS: 144,
  FRAME_BUDGET_MS: 6.94, // 1000ms / 144fps
  WARNING_FRAME_TIME: 10, // ms - warn if frame takes longer
  CRITICAL_FRAME_TIME: 16.67, // ms - critical if exceeds 60fps budget
  MAX_RAF_CALLBACKS: 100, // NASA JPL Rule 2: Bounded callbacks
  MEMORY_SAMPLE_INTERVAL: 5000, // ms - sample memory every 5s
  PERFORMANCE_BUFFER_SIZE: 1000, // Maximum performance samples to keep
} as const;

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  renderCount: number;
  skipCount: number;
  timestamp: number;
  warning?: string;
  critical?: boolean;
}

/**
 * RAF-based throttling for smooth 144fps updates
 */
export class RAFThrottler {
  private callbacks: Map<string, () => void> = new Map();
  private rafId: number | null = null;
  private lastFrameTime = 0;
  private frameCount = 0;
  private isRunning = false;

  constructor(private targetFPS: number = PERFORMANCE_CONSTANTS.TARGET_FPS) {}

  /**
   * Register a callback to be executed on next frame
   * NASA JPL Rule 4: Bounded function with single responsibility
   */
  schedule(id: string, callback: () => void): void {
    if (this.callbacks.size >= PERFORMANCE_CONSTANTS.MAX_RAF_CALLBACKS) {
      console.warn('RAFThrottler: Maximum callbacks reached, dropping request');
      return;
    }

    this.callbacks.set(id, callback);
    
    if (!this.isRunning) {
      this.start();
    }
  }

  /**
   * Cancel a scheduled callback
   */
  cancel(id: string): void {
    this.callbacks.delete(id);
    
    if (this.callbacks.size === 0) {
      this.stop();
    }
  }

  /**
   * Start the RAF loop
   */
  private start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.tick();
  }

  /**
   * Stop the RAF loop
   */
  private stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.isRunning = false;
  }

  /**
   * RAF tick function with frame rate control
   */
  private tick(): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    const targetFrameTime = 1000 / this.targetFPS;

    // Frame rate limiting for consistent performance
    if (deltaTime >= targetFrameTime) {
      this.executeCallbacks(currentTime);
      this.lastFrameTime = currentTime;
      this.frameCount++;
    }

    if (this.isRunning && this.callbacks.size > 0) {
      this.rafId = requestAnimationFrame(() => this.tick());
    } else {
      this.stop();
    }
  }

  /**
   * Execute all registered callbacks
   */
  private executeCallbacks(currentTime: number): void {
    const startTime = performance.now();
    
    for (const [id, callback] of this.callbacks) {
      try {
        callback();
      } catch (error) {
        console.error(`RAFThrottler callback error for ${id}:`, error);
      }
    }

    const executionTime = performance.now() - startTime;
    
    // Performance warning for aerospace debugging
    if (executionTime > PERFORMANCE_CONSTANTS.WARNING_FRAME_TIME) {
      console.warn(`RAFThrottler: Frame execution took ${executionTime.toFixed(2)}ms (target: ${PERFORMANCE_CONSTANTS.FRAME_BUDGET_MS}ms)`);
    }
  }

  /**
   * Get current FPS
   */
  getCurrentFPS(): number {
    const currentTime = performance.now();
    const elapsedTime = currentTime - this.lastFrameTime;
    return elapsedTime > 0 ? 1000 / elapsedTime : 0;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stop();
    this.callbacks.clear();
  }
}

/**
 * Performance monitoring store
 */
class PerformanceMonitor {
  private samples: PerformanceMetrics[] = [];
  private startTime = performance.now();
  private frameCount = 0;
  private lastSampleTime = 0;
  
  public readonly metrics: Writable<PerformanceMetrics | null> = writable(null);
  public readonly isMonitoring = writable(false);

  /**
   * Start performance monitoring
   */
  start(): void {
    if (!browser) return;
    
    this.startTime = performance.now();
    this.frameCount = 0;
    this.lastSampleTime = this.startTime;
    this.isMonitoring.set(true);
    
    console.log('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    this.isMonitoring.set(false);
    console.log('Performance monitoring stopped');
  }

  /**
   * Record a performance sample
   */
  recordSample(renderCount: number = 0, skipCount: number = 0): void {
    if (!browser) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastSampleTime;
    
    // Sample at regular intervals to avoid performance impact
    if (deltaTime < PERFORMANCE_CONSTANTS.MEMORY_SAMPLE_INTERVAL) {
      return;
    }

    this.frameCount++;
    const fps = this.frameCount / ((currentTime - this.startTime) / 1000);
    
    const metrics: PerformanceMetrics = {
      fps: Math.round(fps * 100) / 100,
      frameTime: deltaTime,
      memoryUsage: this.getMemoryUsage(),
      renderCount,
      skipCount,
      timestamp: currentTime
    };

    // Performance warnings
    if (metrics.frameTime > PERFORMANCE_CONSTANTS.CRITICAL_FRAME_TIME) {
      metrics.critical = true;
      metrics.warning = `Critical frame time: ${metrics.frameTime.toFixed(2)}ms`;
    } else if (metrics.frameTime > PERFORMANCE_CONSTANTS.WARNING_FRAME_TIME) {
      metrics.warning = `Slow frame: ${metrics.frameTime.toFixed(2)}ms`;
    }

    // Bounded array management (NASA JPL Rule 2)
    this.samples.push(metrics);
    if (this.samples.length > PERFORMANCE_CONSTANTS.PERFORMANCE_BUFFER_SIZE) {
      this.samples.shift();
    }

    this.metrics.set(metrics);
    this.lastSampleTime = currentTime;
  }

  /**
   * Get memory usage (if available)
   */
  private getMemoryUsage(): number {
    if (!browser || !('memory' in performance)) {
      return 0;
    }
    
    const memory = (performance as any).memory;
    return memory ? memory.usedJSHeapSize || 0 : 0;
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    avgFPS: number;
    avgFrameTime: number;
    maxFrameTime: number;
    memoryUsage: number;
    sampleCount: number;
  } {
    if (this.samples.length === 0) {
      return {
        avgFPS: 0,
        avgFrameTime: 0,
        maxFrameTime: 0,
        memoryUsage: 0,
        sampleCount: 0
      };
    }

    const avgFPS = this.samples.reduce((sum, s) => sum + s.fps, 0) / this.samples.length;
    const avgFrameTime = this.samples.reduce((sum, s) => sum + s.frameTime, 0) / this.samples.length;
    const maxFrameTime = Math.max(...this.samples.map(s => s.frameTime));
    const latestSample = this.samples[this.samples.length - 1];

    return {
      avgFPS: Math.round(avgFPS * 100) / 100,
      avgFrameTime: Math.round(avgFrameTime * 100) / 100,
      maxFrameTime: Math.round(maxFrameTime * 100) / 100,
      memoryUsage: latestSample.memoryUsage,
      sampleCount: this.samples.length
    };
  }

  /**
   * Clear all samples
   */
  clear(): void {
    this.samples = [];
    this.metrics.set(null);
  }
}

/**
 * Component pooling for frequently created/destroyed elements
 * NASA JPL Rule 2: Bounded pool size
 */
export class ComponentPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (item: T) => void;
  private maxSize: number;

  constructor(
    createFn: () => T,
    resetFn: (item: T) => void,
    maxSize: number = 100
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  /**
   * Get an item from the pool or create new one
   */
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }

  /**
   * Return an item to the pool
   */
  release(item: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(item);
      this.pool.push(item);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): { size: number; maxSize: number; utilization: number } {
    return {
      size: this.pool.length,
      maxSize: this.maxSize,
      utilization: (this.maxSize - this.pool.length) / this.maxSize
    };
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this.pool = [];
  }
}

/**
 * Debounced function execution for reducing unnecessary calls
 */
export function createDebouncer<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 100
): (...args: Parameters<T>) => void {
  let timeoutId: number | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = window.setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Throttled function execution for rate limiting
 */
export function createThrottler<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 100
): (...args: Parameters<T>) => void {
  let lastCallTime = 0;
  let timeoutId: number | null = null;
  
  return (...args: Parameters<T>) => {
    const currentTime = performance.now();
    
    if (currentTime - lastCallTime >= delay) {
      fn(...args);
      lastCallTime = currentTime;
    } else if (timeoutId === null) {
      timeoutId = window.setTimeout(() => {
        fn(...args);
        lastCallTime = performance.now();
        timeoutId = null;
      }, delay - (currentTime - lastCallTime));
    }
  };
}

/**
 * Memory-efficient event listener manager
 */
export class EventListenerManager {
  private listeners: Map<string, {
    element: EventTarget;
    event: string;
    handler: EventListener;
    options?: AddEventListenerOptions;
  }> = new Map();

  /**
   * Add an event listener with automatic cleanup tracking
   */
  add(
    id: string,
    element: EventTarget,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void {
    // Remove existing listener if it exists
    this.remove(id);
    
    element.addEventListener(event, handler, options);
    this.listeners.set(id, { element, event, handler, options });
  }

  /**
   * Remove a specific event listener
   */
  remove(id: string): void {
    const listener = this.listeners.get(id);
    if (listener) {
      listener.element.removeEventListener(listener.event, listener.handler);
      this.listeners.delete(id);
    }
  }

  /**
   * Remove all managed event listeners
   */
  removeAll(): void {
    for (const [id] of this.listeners) {
      this.remove(id);
    }
  }

  /**
   * Get listener count for monitoring
   */
  getListenerCount(): number {
    return this.listeners.size;
  }
}

// Global instances
export const rafThrottler = new RAFThrottler();
export const performanceMonitor = new PerformanceMonitor();

// Derived stores for common performance metrics
export const currentFPS = derived(
  performanceMonitor.metrics,
  $metrics => $metrics?.fps || 0
);

export const isPerformanceCritical = derived(
  performanceMonitor.metrics,
  $metrics => $metrics?.critical || false
);

export const performanceWarning = derived(
  performanceMonitor.metrics,
  $metrics => $metrics?.warning || null
);

/**
 * Utility function to measure function execution time
 */
export function measurePerformance<T>(
  fn: () => T,
  label: string = 'Operation'
): { result: T; duration: number } {
  const startTime = performance.now();
  const result = fn();
  const duration = performance.now() - startTime;
  
  if (duration > PERFORMANCE_CONSTANTS.WARNING_FRAME_TIME) {
    console.warn(`${label} took ${duration.toFixed(2)}ms (target: <${PERFORMANCE_CONSTANTS.FRAME_BUDGET_MS}ms)`);
  }
  
  return { result, duration };
}

/**
 * Batch DOM updates to minimize reflows
 */
export function batchDOMUpdates(updates: (() => void)[]): void {
  // Use RAF to batch all updates in a single frame
  rafThrottler.schedule('dom-batch', () => {
    const startTime = performance.now();
    
    updates.forEach((update, index) => {
      try {
        update();
      } catch (error) {
        console.error(`DOM update ${index} failed:`, error);
      }
    });
    
    const duration = performance.now() - startTime;
    if (duration > PERFORMANCE_CONSTANTS.WARNING_FRAME_TIME) {
      console.warn(`Batch DOM updates took ${duration.toFixed(2)}ms`);
    }
  });
}

// Performance constants are already exported above via 'export const'