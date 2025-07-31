/**
 * Shared Performance Infrastructure for 144fps Map Features
 * NASA JPL Compliant - Bounded memory, deterministic execution
 */

import { writable, derived } from 'svelte/store';

// Performance constants
export const TARGET_FPS = 144;
export const FRAME_BUDGET_MS = 1000 / TARGET_FPS; // 6.94ms

/**
 * Frame budget allocations for each feature
 */
export interface FrameBudget {
  total: number;
  allocated: {
    locationEntry: number;
    mapCrosshair: number;
    measuringTools: number;
    messaging: number;
    adsbDisplay: number;
    weatherOverlay: number;
    overhead: number;
  };
  remaining: number;
}

export const FRAME_BUDGET: FrameBudget = {
  total: FRAME_BUDGET_MS,
  allocated: {
    locationEntry: 0.5,
    mapCrosshair: 1.5,
    measuringTools: 1.0,
    messaging: 0.3,
    adsbDisplay: 2.0,
    weatherOverlay: 1.5,
    overhead: 0.14
  },
  remaining: 0
};

/**
 * Performance monitor with bounded memory allocation
 */
export class PerformanceMonitor {
  private readonly samples: Float32Array;
  private sampleIndex: number = 0;
  private readonly maxSamples: number = 144; // 1 second at 144fps
  private lastFrameTime: number = 0;
  private rafId: number | null = null;

  constructor() {
    // Pre-allocate fixed array for samples
    this.samples = new Float32Array(this.maxSamples);
  }

  start(): void {
    if (this.rafId !== null) return;
    
    const measure = (timestamp: number) => {
      if (this.lastFrameTime !== 0) {
        const delta = timestamp - this.lastFrameTime;
        this.samples[this.sampleIndex] = delta;
        this.sampleIndex = (this.sampleIndex + 1) % this.maxSamples;
      }
      this.lastFrameTime = timestamp;
      this.rafId = requestAnimationFrame(measure);
    };
    
    this.rafId = requestAnimationFrame(measure);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  getMetrics(): PerformanceMetrics {
    let sum = 0;
    let min = Infinity;
    let max = 0;
    let count = 0;

    for (let i = 0; i < this.maxSamples; i++) {
      const sample = this.samples[i];
      if (sample > 0) {
        sum += sample;
        min = Math.min(min, sample);
        max = Math.max(max, sample);
        count++;
      }
    }

    const avg = count > 0 ? sum / count : 0;
    const fps = avg > 0 ? 1000 / avg : 0;

    return {
      fps: Math.round(fps),
      frameTime: {
        avg: Math.round(avg * 100) / 100,
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100
      },
      budget: {
        used: avg,
        remaining: FRAME_BUDGET_MS - avg,
        percentage: (avg / FRAME_BUDGET_MS) * 100
      }
    };
  }
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: {
    avg: number;
    min: number;
    max: number;
  };
  budget: {
    used: number;
    remaining: number;
    percentage: number;
  };
}

/**
 * RAF scheduler for coordinated updates
 */
export class FrameScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private rafId: number | null = null;
  private lastTimestamp: number = 0;

  schedule(id: string, task: FrameTask, priority: number = 0): void {
    this.tasks.set(id, { task, priority, budget: 0 });
    this.sortTasks();
    this.start();
  }

  unschedule(id: string): void {
    this.tasks.delete(id);
    if (this.tasks.size === 0) {
      this.stop();
    }
  }

  private start(): void {
    if (this.rafId !== null) return;

    const frame = (timestamp: number) => {
      const delta = timestamp - this.lastTimestamp;
      this.lastTimestamp = timestamp;

      let budgetUsed = 0;
      const startFrame = performance.now();

      // Execute tasks in priority order
      for (const [id, scheduled] of this.tasks) {
        if (budgetUsed >= FRAME_BUDGET_MS) break;

        const taskStart = performance.now();
        scheduled.task(delta, FRAME_BUDGET_MS - budgetUsed);
        const taskTime = performance.now() - taskStart;

        scheduled.budget = taskTime;
        budgetUsed += taskTime;
      }

      this.rafId = requestAnimationFrame(frame);
    };

    this.rafId = requestAnimationFrame(frame);
  }

  private stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private sortTasks(): void {
    const sorted = Array.from(this.tasks.entries())
      .sort(([, a], [, b]) => b.priority - a.priority);
    
    this.tasks.clear();
    sorted.forEach(([id, task]) => this.tasks.set(id, task));
  }

  getBudgetReport(): Map<string, number> {
    const report = new Map<string, number>();
    this.tasks.forEach((task, id) => {
      report.set(id, task.budget);
    });
    return report;
  }
}

interface ScheduledTask {
  task: FrameTask;
  priority: number;
  budget: number;
}

type FrameTask = (delta: number, budgetRemaining: number) => void;

/**
 * Dirty rectangle optimization for canvas rendering
 */
export class DirtyRectManager {
  private dirtyRects: DOMRect[] = [];
  private readonly maxRects = 10;

  markDirty(x: number, y: number, width: number, height: number): void {
    const rect = new DOMRect(x, y, width, height);
    
    // Merge overlapping rectangles
    const merged = this.mergeRects(rect);
    
    if (this.dirtyRects.length < this.maxRects) {
      this.dirtyRects.push(merged);
    } else {
      // If too many rects, mark entire area dirty
      this.markAllDirty();
    }
  }

  getDirtyRects(): DOMRect[] {
    return this.dirtyRects;
  }

  clear(): void {
    this.dirtyRects.length = 0;
  }

  private mergeRects(newRect: DOMRect): DOMRect {
    // Simple merge algorithm - NASA JPL compliant with bounded loops
    for (let i = 0; i < this.dirtyRects.length && i < this.maxRects; i++) {
      const existing = this.dirtyRects[i];
      if (this.rectsOverlap(existing, newRect)) {
        // Remove existing and return merged
        this.dirtyRects.splice(i, 1);
        return this.combineRects(existing, newRect);
      }
    }
    return newRect;
  }

  private rectsOverlap(a: DOMRect, b: DOMRect): boolean {
    return !(a.right < b.left || b.right < a.left || 
             a.bottom < b.top || b.bottom < a.top);
  }

  private combineRects(a: DOMRect, b: DOMRect): DOMRect {
    const left = Math.min(a.left, b.left);
    const top = Math.min(a.top, b.top);
    const right = Math.max(a.right, b.right);
    const bottom = Math.max(a.bottom, b.bottom);
    return new DOMRect(left, top, right - left, bottom - top);
  }

  private markAllDirty(): void {
    this.dirtyRects = [new DOMRect(0, 0, Infinity, Infinity)];
  }
}

/**
 * Performance stores for reactive updates
 */
export const performanceStore = writable<PerformanceMetrics>({
  fps: 0,
  frameTime: { avg: 0, min: 0, max: 0 },
  budget: { used: 0, remaining: FRAME_BUDGET_MS, percentage: 0 }
});

export const performanceWarning = derived(
  performanceStore,
  $perf => $perf.fps < TARGET_FPS * 0.9 // Warn if below 90% of target
);

// Global instances
export const globalMonitor = new PerformanceMonitor();
export const globalScheduler = new FrameScheduler();

// Auto-start monitoring in browser
if (typeof window !== 'undefined') {
  globalMonitor.start();
  
  // Update store every 500ms
  setInterval(() => {
    performanceStore.set(globalMonitor.getMetrics());
  }, 500);
}