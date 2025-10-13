/**
 * Performance monitoring utilities for tracking slow operations
 */

type TimingData = {
  operation: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
};

/**
 * Simple performance timer
 * Usage:
 *   const timer = new PerformanceTimer('operation-name');
 *   // ... do work ...
 *   timer.log({ someMetadata: 'value' });
 */
export class PerformanceTimer {
  private startTime: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = performance.now();
  }

  log(metadata?: Record<string, any>): TimingData {
    const duration = performance.now() - this.startTime;
    const data: TimingData = {
      operation: this.operation,
      duration: Math.round(duration),
      timestamp: new Date(),
      metadata,
    };

    // Log to console with color coding
    const color = duration > 1000 ? "🔴" : duration > 500 ? "🟡" : "🟢";
    console.log(
      `${color} [PERF] ${this.operation}: ${data.duration}ms`,
      metadata ? metadata : ""
    );

    return data;
  }

  /**
   * Get duration without logging
   */
  getDuration(): number {
    return Math.round(performance.now() - this.startTime);
  }
}

/**
 * Async wrapper that logs timing automatically
 * Usage: const result = await timeAsync('operation', () => doWork());
 */
export async function timeAsync<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const timer = new PerformanceTimer(operation);
  try {
    const result = await fn();
    timer.log({ ...metadata, status: "success" });
    return result;
  } catch (error) {
    timer.log({ ...metadata, status: "error", error: String(error) });
    throw error;
  }
}

/**
 * Sync wrapper that logs timing automatically
 */
export function timeSync<T>(
  operation: string,
  fn: () => T,
  metadata?: Record<string, any>
): T {
  const timer = new PerformanceTimer(operation);
  try {
    const result = fn();
    timer.log({ ...metadata, status: "success" });
    return result;
  } catch (error) {
    timer.log({ ...metadata, status: "error", error: String(error) });
    throw error;
  }
}

/**
 * Aggregate timing stats for a session
 */
export class PerformanceTracker {
  private timings: TimingData[] = [];

  add(timing: TimingData) {
    this.timings.push(timing);
  }

  getSummary() {
    if (this.timings.length === 0) {
      return null;
    }

    const total = this.timings.reduce((sum, t) => sum + t.duration, 0);
    const sorted = [...this.timings].sort((a, b) => b.duration - a.duration);

    return {
      totalDuration: total,
      operationCount: this.timings.length,
      slowestOperations: sorted.slice(0, 5),
      breakdown: this.timings.map((t) => ({
        operation: t.operation,
        duration: t.duration,
        percentage: Math.round((t.duration / total) * 100),
      })),
    };
  }

  logSummary() {
    const summary = this.getSummary();
    if (!summary) {
      console.log("[PERF] No operations tracked");
      return;
    }

    console.log("\n📊 [PERF SUMMARY]");
    console.log(`Total Duration: ${summary.totalDuration}ms`);
    console.log(`Operations: ${summary.operationCount}`);
    console.log("\nSlowest Operations:");
    summary.slowestOperations.forEach((op, i) => {
      const pct = Math.round((op.duration / summary.totalDuration) * 100);
      console.log(`  ${i + 1}. ${op.operation}: ${op.duration}ms (${pct}%)`);
    });
    console.log("\n");
  }

  clear() {
    this.timings = [];
  }
}
