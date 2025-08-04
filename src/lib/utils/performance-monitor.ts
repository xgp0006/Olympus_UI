/**
 * Advanced 144fps Performance Monitor - NASA JPL Power of 10 Compliant
 * Aerospace-grade performance tracking with bounded memory allocation
 * Targets sub-6.94ms frame budgets for 144fps sustained performance
 */

import { BoundedArray } from './bounded-array'; // NASA JPL Rule 2

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  lastUpdate: number;
  averageFps: number;
  minFps: number;
  maxFps: number;
}

export class PerformanceMonitor {
  // NASA JPL Rule 2: Bounded memory allocation
  private readonly MAX_HISTORY = 144; // 144 samples for 144fps
  private readonly TARGET_144FPS_BUDGET = 6.944; // ms per frame
  private readonly TARGET_60FPS_BUDGET = 16.667; // fallback

  private frames = 0;
  private lastTime = performance.now();
  private fpsHistory = new BoundedArray<number>(this.MAX_HISTORY); // NASA JPL Rule 2
  private frameTimeHistory = new BoundedArray<number>(this.MAX_HISTORY); // NASA JPL Rule 2
  private rafId: number | null = null;
  private targetFps = 144;
  private performanceAlerts = 0;

  // NASA JPL compliant: Start monitoring performance
  start(callback: (metrics: PerformanceMetrics) => void): void {
    if (this.rafId !== null) return;

    const measure = (currentTime: number) => {
      this.frames++;
      const deltaTime = currentTime - this.lastTime;

      if (deltaTime >= 1000) {
        const fps = (this.frames * 1000) / deltaTime;
        this.updateHistory(fps);

        const metrics = this.calculateMetrics(fps, deltaTime);
        callback(metrics);

        this.frames = 0;
        this.lastTime = currentTime;
      }

      this.rafId = requestAnimationFrame(measure);
    };

    this.rafId = requestAnimationFrame(measure);
  }

  // NASA JPL compliant: Stop monitoring
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.reset();
  }

  // NASA JPL Rule 2: Update FPS history with bounded allocation
  private updateHistory(fps: number): void {
    const frameTime = 1000 / fps;
    this.fpsHistory.push(fps); // Automatically bounded
    this.frameTimeHistory.push(frameTime); // Automatically bounded

    // Performance alert system for 144fps compliance
    if (frameTime > this.TARGET_144FPS_BUDGET) {
      this.performanceAlerts++;
      if (this.performanceAlerts > 10) {
        console.warn(
          `Sustained frame drops detected: ${frameTime.toFixed(2)}ms > ${this.TARGET_144FPS_BUDGET}ms`
        );
        this.performanceAlerts = 0; // Reset to avoid spam
      }
    }
  }

  // NASA JPL Rule 3: Calculate performance metrics (split for complexity)
  private calculateMetrics(currentFps: number, deltaTime: number): PerformanceMetrics {
    const averageFps = this.calculateAverage();
    const bounds = this.calculateBounds();
    const frameTime = 1000 / currentFps;

    return {
      fps: Math.round(currentFps * 100) / 100, // Higher precision for 144fps
      frameTime: Math.round(frameTime * 1000) / 1000, // Microsecond precision
      lastUpdate: performance.now(),
      averageFps: Math.round(averageFps * 100) / 100,
      minFps: bounds.min,
      maxFps: bounds.max
    };
  }

  // NASA JPL Rule 3: Separate bounds calculation
  private calculateBounds(): { min: number; max: number } {
    const history = this.fpsHistory.toArray();
    if (history.length === 0) return { min: 0, max: 0 };

    return {
      min: Math.round(Math.min(...history) * 100) / 100,
      max: Math.round(Math.max(...history) * 100) / 100
    };
  }

  // NASA JPL Rule 2: Calculate average FPS with bounded data
  private calculateAverage(): number {
    const history = this.fpsHistory.toArray();
    if (history.length === 0) return 0;
    const sum = history.reduce((a, b) => a + b, 0);
    return sum / history.length;
  }

  // NASA JPL Rule 2: Reset monitor state with bounded allocation
  private reset(): void {
    this.frames = 0;
    this.lastTime = performance.now();
    this.fpsHistory.clear(); // NASA JPL Rule 2: Use bounded clear
    this.frameTimeHistory.clear(); // NASA JPL Rule 2: Use bounded clear
    this.performanceAlerts = 0;
  }

  // NASA JPL Rule 5: Enhanced performance validation
  isOptimal(targetFps = 144): boolean {
    const history = this.fpsHistory.toArray();
    if (history.length === 0) return false;

    const average = this.calculateAverage();
    const consistency = this.calculateConsistency(targetFps);

    // Require both high average AND consistency for aerospace grade
    return average >= targetFps * 0.95 && consistency >= 0.9;
  }

  // NASA JPL Rule 3: Performance consistency calculation
  private calculateConsistency(targetFps: number): number {
    const history = this.fpsHistory.toArray();
    if (history.length === 0) return 0;

    const threshold = targetFps * 0.9; // 90% of target
    const consistentFrames = history.filter((fps) => fps >= threshold).length;
    return consistentFrames / history.length;
  }
}

// NASA JPL compliant: Create singleton instance
let monitorInstance: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!monitorInstance) {
    monitorInstance = new PerformanceMonitor();
  }
  return monitorInstance;
}

// NASA JPL Rule 5: Aerospace-grade render performance measurement
export function measureRenderPerformance(
  callback: () => void,
  label = 'Render',
  targetFps = 144
): number {
  const targetBudget = 1000 / targetFps;
  const startTime = performance.now();

  // NASA JPL Rule 7: Guarded execution
  try {
    callback();
  } catch (error) {
    console.error(`${label} execution failed:`, error);
    return -1; // Error indicator
  }

  const endTime = performance.now();
  const duration = endTime - startTime;

  // 144fps budget checking with precision
  if (duration > targetBudget) {
    const budgetPercent = ((duration / targetBudget) * 100).toFixed(1);
    console.warn(
      `${label} budget exceeded: ${duration.toFixed(3)}ms (${budgetPercent}% of ${targetBudget.toFixed(3)}ms budget)`
    );
  }

  return duration;
}

// NASA JPL compliant: RAF throttle wrapper for smooth animations
export function throttleRAF<T extends (...args: any[]) => void>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    lastArgs = args;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (lastArgs) {
          func(...lastArgs);
        }
        rafId = null;
      });
    }
  };
}
