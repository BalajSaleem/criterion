"use client";

import { useRef, useState } from "react";

type PerformanceMetrics = {
  timeToFirstMessage: number | null;
  messageCount: number;
  totalDuration: number;
  isStreaming: boolean;
};

/**
 * Client-side performance monitoring hook
 * Tracks time from message send to first response
 */
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    timeToFirstMessage: null,
    messageCount: 0,
    totalDuration: 0,
    isStreaming: false,
  });

  const startTimeRef = useRef<number | null>(null);
  const firstMessageTimeRef = useRef<number | null>(null);

  const startTracking = () => {
    startTimeRef.current = performance.now();
    firstMessageTimeRef.current = null;
    setMetrics((prev) => ({
      ...prev,
      timeToFirstMessage: null,
      isStreaming: true,
    }));

    console.log("📊 [CLIENT] Started tracking message performance");
  };

  const recordFirstMessage = () => {
    if (startTimeRef.current && !firstMessageTimeRef.current) {
      firstMessageTimeRef.current = performance.now();
      const ttfm = Math.round(firstMessageTimeRef.current - startTimeRef.current);

      setMetrics((prev) => ({
        ...prev,
        timeToFirstMessage: ttfm,
      }));

      const color = ttfm > 2000 ? "🔴" : ttfm > 1000 ? "🟡" : "🟢";
      console.log(
        `${color} [CLIENT] Time to First Message: ${ttfm}ms`
      );
    }
  };

  const stopTracking = () => {
    if (startTimeRef.current) {
      const totalDuration = Math.round(performance.now() - startTimeRef.current);

      setMetrics((prev) => ({
        ...prev,
        totalDuration,
        messageCount: prev.messageCount + 1,
        isStreaming: false,
      }));

      const color = totalDuration > 5000 ? "🔴" : totalDuration > 3000 ? "🟡" : "🟢";
      console.log(
        `${color} [CLIENT] Total Duration: ${totalDuration}ms\n`
      );
    }

    startTimeRef.current = null;
    firstMessageTimeRef.current = null;
  };

  const reset = () => {
    startTimeRef.current = null;
    firstMessageTimeRef.current = null;
    setMetrics({
      timeToFirstMessage: null,
      messageCount: 0,
      totalDuration: 0,
      isStreaming: false,
    });
  };

  return {
    metrics,
    startTracking,
    recordFirstMessage,
    stopTracking,
    reset,
  };
}

/**
 * Display performance metrics in the UI (optional)
 */
export function PerformanceDisplay({
  metrics,
}: {
  metrics: PerformanceMetrics;
}) {
  if (!metrics.timeToFirstMessage && !metrics.isStreaming) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg border bg-background p-3 text-xs shadow-lg">
      <div className="font-semibold mb-1">⚡ Performance Metrics</div>
      {metrics.isStreaming && (
        <div className="text-yellow-600">⏳ Streaming...</div>
      )}
      {metrics.timeToFirstMessage && (
        <div>
          Time to First Message:{" "}
          <span
            className={
              metrics.timeToFirstMessage > 2000
                ? "text-red-600 font-semibold"
                : metrics.timeToFirstMessage > 1000
                  ? "text-yellow-600 font-semibold"
                  : "text-green-600 font-semibold"
            }
          >
            {metrics.timeToFirstMessage}ms
          </span>
        </div>
      )}
      {metrics.totalDuration > 0 && (
        <div>
          Total Duration:{" "}
          <span className="font-semibold">{metrics.totalDuration}ms</span>
        </div>
      )}
      <div className="text-muted-foreground mt-1">
        Messages: {metrics.messageCount}
      </div>
    </div>
  );
}
