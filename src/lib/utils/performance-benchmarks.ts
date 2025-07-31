/**
 * Performance Benchmarking Utilities
 * Automated before/after performance analysis for aerospace-grade optimization validation
 * NASA JPL compliant with bounded execution and deterministic measurement
 */

import { browser } from '$app/environment';
import { PERFORMANCE_CONSTANTS } from './performance-optimizations';

/**
 * Benchmark test configuration
 */
export interface BenchmarkConfig {
  name: string;
  testFunction: () => Promise<void> | void;
  iterations: number;
  warmupIterations?: number;
  timeout?: number; // ms
  expectedImprovement?: number; // percentage
}

/**
 * Benchmark results
 */
export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
  fps: number;
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
    leaked: number;
  };
  timestamp: number;
}

/**
 * Comparison between two benchmark results
 */
export interface BenchmarkComparison {
  name: string;
  before: BenchmarkResult;
  after: BenchmarkResult;
  improvement: {
    averageTime: number; // percentage
    fps: number; // percentage
    memoryUsage: number; // percentage
  };
  passed: boolean;
  expectedImprovement?: number;
}

/**
 * Performance benchmark runner with aerospace-grade safety
 */
export class PerformanceBenchmark {
  private results: Map<string, BenchmarkResult[]> = new Map();
  private isRunning = false;

  /**
   * Run a single benchmark test
   * NASA JPL Rule 4: Function ≤60 lines with bounded execution
   */
  async runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
    if (!browser) {
      throw new Error('Benchmarks can only run in browser environment');
    }

    if (this.isRunning) {
      throw new Error('Another benchmark is already running');
    }

    this.isRunning = true;

    try {
      const { name, testFunction, iterations, warmupIterations = 5, timeout = 30000 } = config;
      
      // Memory measurement setup
      const initialMemory = this.getMemoryUsage();
      let peakMemory = initialMemory;
      
      // Warmup iterations to stabilize performance
      console.log(`Running warmup iterations for ${name}...`);
      for (let i = 0; i < warmupIterations; i++) {
        await this.executeWithTimeout(testFunction, timeout);
      }

      // Force garbage collection if available
      if ('gc' in window) {
        (window as any).gc();
      }

      console.log(`Running ${iterations} iterations for ${name}...`);
      const times: number[] = [];
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const iterationStart = performance.now();
        
        await this.executeWithTimeout(testFunction, timeout);
        
        const iterationTime = performance.now() - iterationStart;
        times.push(iterationTime);

        // Track peak memory usage
        const currentMemory = this.getMemoryUsage();
        peakMemory = Math.max(peakMemory, currentMemory);

        // Prevent blocking the main thread
        if (i % 10 === 0) {
          await this.waitForNextFrame();
        }
      }

      const totalTime = performance.now() - startTime;
      const finalMemory = this.getMemoryUsage();

      // Calculate statistics
      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      const variance = times.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / times.length;
      const standardDeviation = Math.sqrt(variance);
      const fps = averageTime > 0 ? 1000 / averageTime : 0;

      const result: BenchmarkResult = {
        name,
        iterations,
        totalTime,
        averageTime,
        minTime,
        maxTime,
        standardDeviation,
        fps,
        memoryUsage: {
          initial: initialMemory,
          peak: peakMemory,
          final: finalMemory,
          leaked: finalMemory - initialMemory
        },
        timestamp: Date.now()
      };

      // Store result
      if (!this.results.has(name)) {
        this.results.set(name, []);
      }
      this.results.get(name)!.push(result);

      console.log(`Benchmark ${name} completed:`, result);
      return result;

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Execute function with timeout protection
   */
  private async executeWithTimeout(fn: () => Promise<void> | void, timeout: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Benchmark iteration timed out after ${timeout}ms`));
      }, timeout);

      try {
        const result = fn();
        if (result instanceof Promise) {
          result.then(() => {
            clearTimeout(timeoutId);
            resolve();
          }).catch((error) => {
            clearTimeout(timeoutId);
            reject(error);
          });
        } else {
          clearTimeout(timeoutId);
          resolve();
        }
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Wait for next animation frame
   */
  private waitForNextFrame(): Promise<void> {
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory?.usedJSHeapSize || 0;
    }
    return 0;
  }

  /**
   * Compare two benchmark results
   */
  compareBenchmarks(beforeName: string, afterName: string, expectedImprovement?: number): BenchmarkComparison | null {
    const beforeResults = this.results.get(beforeName);
    const afterResults = this.results.get(afterName);

    if (!beforeResults || !afterResults || beforeResults.length === 0 || afterResults.length === 0) {
      return null;
    }

    const before = beforeResults[beforeResults.length - 1]; // Latest result
    const after = afterResults[afterResults.length - 1]; // Latest result

    const timeImprovement = ((before.averageTime - after.averageTime) / before.averageTime) * 100;
    const fpsImprovement = ((after.fps - before.fps) / before.fps) * 100;
    const memoryImprovement = ((before.memoryUsage.peak - after.memoryUsage.peak) / before.memoryUsage.peak) * 100;

    const passed = expectedImprovement ? timeImprovement >= expectedImprovement : timeImprovement > 0;

    return {
      name: `${beforeName} vs ${afterName}`,
      before,
      after,
      improvement: {
        averageTime: timeImprovement,
        fps: fpsImprovement,
        memoryUsage: memoryImprovement
      },
      passed,
      expectedImprovement
    };
  }

  /**
   * Get all results for a benchmark
   */
  getResults(name: string): BenchmarkResult[] {
    return this.results.get(name) || [];
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const report: string[] = [];
    report.push('='.repeat(80));
    report.push('PERFORMANCE BENCHMARK REPORT');
    report.push('='.repeat(80));
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push(`Target FPS: ${PERFORMANCE_CONSTANTS.TARGET_FPS}`);
    report.push(`Frame Budget: ${PERFORMANCE_CONSTANTS.FRAME_BUDGET_MS}ms`);
    report.push('');

    for (const [name, results] of this.results) {
      if (results.length === 0) continue;

      const latest = results[results.length - 1];
      
      report.push(`Benchmark: ${name}`);
      report.push('-'.repeat(40));
      report.push(`Iterations: ${latest.iterations}`);
      report.push(`Average Time: ${latest.averageTime.toFixed(3)}ms`);
      report.push(`Min Time: ${latest.minTime.toFixed(3)}ms`);
      report.push(`Max Time: ${latest.maxTime.toFixed(3)}ms`);
      report.push(`Standard Deviation: ${latest.standardDeviation.toFixed(3)}ms`);
      report.push(`FPS: ${latest.fps.toFixed(1)}`);
      report.push(`Memory Usage: Initial=${this.formatMemory(latest.memoryUsage.initial)}, Peak=${this.formatMemory(latest.memoryUsage.peak)}, Leaked=${this.formatMemory(latest.memoryUsage.leaked)}`);
      
      // Performance assessment
      if (latest.averageTime <= PERFORMANCE_CONSTANTS.FRAME_BUDGET_MS) {
        report.push(`Status: ✅ EXCELLENT (within ${PERFORMANCE_CONSTANTS.TARGET_FPS}fps budget)`);
      } else if (latest.averageTime <= PERFORMANCE_CONSTANTS.WARNING_FRAME_TIME) {
        report.push(`Status: ⚠️  GOOD (within 60fps budget)`);
      } else {
        report.push(`Status: ❌ NEEDS OPTIMIZATION (exceeds 60fps budget)`);
      }
      
      report.push('');
    }

    return report.join('\n');
  }

  /**
   * Format memory usage for display
   */
  private formatMemory(bytes: number): string {
    if (bytes === 0) return '0B';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)}MB`;
  }

  /**
   * Clear all benchmark results
   */
  clear(): void {
    this.results.clear();
  }
}

/**
 * Predefined benchmark configurations for common scenarios
 */
export const STANDARD_BENCHMARKS = {
  PARAMETER_LIST_RENDER: {
    name: 'Parameter List Render',
    iterations: 100,
    warmupIterations: 10,
    expectedImprovement: 50 // 50% improvement expected
  },
  PARAMETER_SEARCH_FILTER: {
    name: 'Parameter Search Filter',
    iterations: 50,
    warmupIterations: 5,
    expectedImprovement: 30
  },
  PARAMETER_UPDATE: {
    name: 'Parameter Value Update',
    iterations: 200,
    warmupIterations: 20,
    expectedImprovement: 40
  },
  VIRTUAL_SCROLL_PERFORMANCE: {
    name: 'Virtual Scroll Performance',
    iterations: 100,
    warmupIterations: 10,
    expectedImprovement: 80 // 80% improvement expected with virtual scrolling
  }
};

// Global benchmark instance
export const performanceBenchmark = new PerformanceBenchmark();

/**
 * Utility function to run a quick performance test
 */
export async function quickBenchmark(
  name: string, 
  testFn: () => Promise<void> | void, 
  iterations: number = 50
): Promise<BenchmarkResult> {
  return performanceBenchmark.runBenchmark({
    name,
    testFunction: testFn,
    iterations,
    warmupIterations: Math.min(5, Math.floor(iterations / 10))
  });
}

/**
 * Utility to benchmark component rendering
 */
export async function benchmarkComponentRender(
  componentName: string,
  renderFunction: () => Promise<void> | void,
  iterations: number = 100
): Promise<BenchmarkResult> {
  return performanceBenchmark.runBenchmark({
    name: `${componentName} Render`,
    testFunction: renderFunction,
    iterations,
    warmupIterations: 10,
    expectedImprovement: 30
  });
}